
-- A. Lock unreleased pieces at the data layer
DROP POLICY IF EXISTS "Anon reads published content" ON public.content_items;
DROP POLICY IF EXISTS "Auth reads published content" ON public.content_items;
CREATE POLICY "Anon reads released content" ON public.content_items FOR SELECT TO anon
  USING (status = 'published'::content_status AND (release_at IS NULL OR release_at <= now()));
CREATE POLICY "Auth reads released content" ON public.content_items FOR SELECT TO authenticated
  USING ((status = 'published'::content_status AND (release_at IS NULL OR release_at <= now())) OR public.has_role(auth.uid(), 'admin'::app_role));

-- Teaser view: published pieces incl. scheduled ones, body only once released.
CREATE OR REPLACE VIEW public.content_items_public AS
SELECT id, type, title, excerpt,
       CASE WHEN release_at IS NULL OR release_at <= now() THEN body ELSE NULL END AS body,
       scripture_reference, topic_id, shelf, author_name,
       published_at, thumbnail_url, video_url, duration_seconds, external_url, created_at,
       release_at, summary, kicker, hero_url, hero_focal_desktop, hero_focal_mobile,
       feature_new_this_month, is_featured, slug, cover_image_url, read_time_minutes
FROM public.content_items
WHERE status = 'published'::content_status;
ALTER VIEW public.content_items_public SET (security_invoker = off);
GRANT SELECT ON public.content_items_public TO anon, authenticated;

DROP POLICY IF EXISTS "days are public readable" ON public.devotional_days;
CREATE POLICY "Days of released devotionals are readable" ON public.devotional_days FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.devotional_templates t WHERE t.id = template_id
    AND ((t.status = 'published'::content_status AND (t.release_at IS NULL OR t.release_at <= now()))
         OR public.has_role(auth.uid(), 'admin'::app_role))));

-- 5. Progress, follows, reminders
CREATE TABLE public.content_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id uuid REFERENCES public.content_items(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.devotional_templates(id) ON DELETE CASCADE,
  day_number integer,
  progress real NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  response text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_progress_one_target CHECK ((content_id IS NOT NULL)::int + (template_id IS NOT NULL)::int = 1),
  CONSTRAINT content_progress_uk UNIQUE NULLS NOT DISTINCT (user_id, content_id, template_id, day_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_progress TO authenticated;
GRANT ALL ON public.content_progress TO service_role;
ALTER TABLE public.content_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own progress" ON public.content_progress FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_content_progress_updated BEFORE UPDATE ON public.content_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.series_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, collection_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.series_follows TO authenticated;
GRANT ALL ON public.series_follows TO service_role;
ALTER TABLE public.series_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own series follows" ON public.series_follows FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.release_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id uuid REFERENCES public.content_items(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.devotional_templates(id) ON DELETE CASCADE,
  collection_item_id uuid REFERENCES public.collection_items(id) ON DELETE CASCADE,
  day_number integer,
  remind_at timestamptz,
  title text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT release_reminders_uk UNIQUE NULLS NOT DISTINCT (user_id, content_id, template_id, collection_item_id, day_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.release_reminders TO authenticated;
GRANT ALL ON public.release_reminders TO service_role;
ALTER TABLE public.release_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own reminders" ON public.release_reminders FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- B. Notifications fire at release_at, never at scheduling time
CREATE OR REPLACE FUNCTION public.notify_topic_subscribers_on_publish()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE route_path TEXT; type_label TEXT;
BEGIN
  IF NEW.topic_id IS NULL OR NEW.status <> 'published' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'published' THEN RETURN NEW; END IF;
  -- Scheduled for later: the hourly release job notifies at release time.
  IF NEW.release_at IS NOT NULL AND NEW.release_at > now() THEN RETURN NEW; END IF;
  IF NEW.type = 'teaching' THEN route_path := '/teachings/$id'; type_label := 'teaching';
  ELSIF NEW.type = 'podcast' THEN route_path := '/podcasts/$id'; type_label := 'podcast';
  ELSE route_path := '/essays/$id'; type_label := 'essay'; END IF;
  INSERT INTO public.notifications (user_id, kind, title, body, link_route, link_params, dedupe_key)
  SELECT ts.user_id, 'new_content', 'New ' || type_label || ' in ' || t.name, NEW.title, route_path,
         jsonb_build_object('id', NEW.id::text), 'new_content:' || NEW.id::text
  FROM public.topic_subscriptions ts JOIN public.topics t ON t.id = ts.topic_id
  WHERE ts.topic_id = NEW.topic_id
  ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.deliver_release_notifications()
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  -- Topic followers (primary topic + content_topics)
  INSERT INTO public.notifications (user_id, kind, title, body, link_route, link_params, dedupe_key)
  SELECT DISTINCT ON (ts.user_id, c.id) ts.user_id, 'new_content',
    'New ' || CASE c.type WHEN 'teaching' THEN 'teaching' WHEN 'podcast' THEN 'podcast' ELSE 'essay' END || ' in ' || t.name,
    c.title,
    CASE c.type WHEN 'teaching' THEN '/teachings/$id' WHEN 'podcast' THEN '/podcasts/$id' ELSE '/essays/$id' END,
    jsonb_build_object('id', c.id::text), 'new_content:' || c.id::text
  FROM public.content_items c
  JOIN (SELECT content_id, topic_id FROM public.content_topics
        UNION SELECT id, topic_id FROM public.content_items WHERE topic_id IS NOT NULL) ct ON ct.content_id = c.id
  JOIN public.topic_subscriptions ts ON ts.topic_id = ct.topic_id
  JOIN public.topics t ON t.id = ct.topic_id
  WHERE c.status = 'published' AND c.release_at <= now() AND c.release_at > now() - interval '3 days'
  ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;

  -- Series followers: each newly released part
  INSERT INTO public.notifications (user_id, kind, title, body, link_route, link_params, dedupe_key)
  SELECT DISTINCT ON (f.user_id, c.id) f.user_id, 'series_part', 'New in ' || s.title, c.title,
    CASE c.type WHEN 'teaching' THEN '/teachings/$id' WHEN 'podcast' THEN '/podcasts/$id' ELSE '/essays/$id' END,
    jsonb_build_object('id', c.id::text), 'series_part:' || c.id::text
  FROM public.series_follows f
  JOIN public.collections s ON s.id = f.collection_id
  JOIN public.collection_items ci ON ci.collection_id = f.collection_id
  JOIN public.content_items c ON c.id = ci.content_id
  WHERE c.status = 'published' AND c.release_at <= now() AND c.release_at > now() - interval '3 days'
  ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;

  -- Reminders that are due (piece released, or a devotional-day time reached)
  WITH due AS (
    SELECT r.* FROM public.release_reminders r
    LEFT JOIN public.content_items c ON c.id = r.content_id
    LEFT JOIN public.devotional_templates d ON d.id = r.template_id
    WHERE r.sent_at IS NULL AND (
      (r.remind_at IS NOT NULL AND r.remind_at <= now())
      OR (r.remind_at IS NULL AND c.id IS NOT NULL AND c.status = 'published' AND c.release_at <= now())
      OR (r.remind_at IS NULL AND r.day_number IS NULL AND d.id IS NOT NULL AND d.status = 'published' AND d.release_at <= now()))
  ), ins AS (
    INSERT INTO public.notifications (user_id, kind, title, body, link_route, link_params, dedupe_key)
    SELECT due.user_id, 'reminder',
      CASE WHEN due.day_number IS NOT NULL THEN 'Day ' || due.day_number || ' is ready' ELSE 'Out now' END,
      COALESCE(due.title, c.title, d.title),
      CASE WHEN due.template_id IS NOT NULL THEN '/devotionals/$id/day/$n'
           WHEN c.type = 'teaching' THEN '/teachings/$id' WHEN c.type = 'podcast' THEN '/podcasts/$id' ELSE '/essays/$id' END,
      CASE WHEN due.template_id IS NOT NULL THEN jsonb_build_object('id', due.template_id::text, 'n', COALESCE(due.day_number, 1)::text)
           ELSE jsonb_build_object('id', due.content_id::text) END,
      'reminder:' || due.id::text
    FROM due LEFT JOIN public.content_items c ON c.id = due.content_id LEFT JOIN public.devotional_templates d ON d.id = due.template_id
    WHERE due.content_id IS NOT NULL OR due.template_id IS NOT NULL
    ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING
  )
  UPDATE public.release_reminders r SET sent_at = now() FROM due WHERE r.id = due.id;
END;
$function$;
REVOKE ALL ON FUNCTION public.deliver_release_notifications() FROM public, anon, authenticated;

SELECT cron.schedule('deliver-release-notifications', '0 * * * *', 'SELECT public.deliver_release_notifications()');

-- Most read this week (views, else saves); ids + counts only
CREATE OR REPLACE FUNCTION public.most_read_week(_now timestamptz DEFAULT now())
RETURNS TABLE (content_id uuid, n bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH v AS (
    SELECT e.content_id, count(*) n FROM public.analytics_events e
    WHERE e.event_type = 'content_view' AND e.content_id IS NOT NULL AND e.created_at > _now - interval '7 days' AND e.created_at <= _now
    GROUP BY 1
  ), s AS (
    SELECT si.content_item_id content_id, count(*) n FROM public.saved_items si
    WHERE si.content_item_id IS NOT NULL AND si.saved_at > _now - interval '7 days' AND si.saved_at <= _now
    GROUP BY 1
  ), pick AS (SELECT * FROM v UNION ALL SELECT * FROM s WHERE NOT EXISTS (SELECT 1 FROM v))
  SELECT p.content_id, p.n FROM pick p JOIN public.content_items c ON c.id = p.content_id
  WHERE c.status = 'published' AND c.release_at <= _now
  ORDER BY p.n DESC LIMIT 3;
$$;
GRANT EXECUTE ON FUNCTION public.most_read_week(timestamptz) TO anon, authenticated;
