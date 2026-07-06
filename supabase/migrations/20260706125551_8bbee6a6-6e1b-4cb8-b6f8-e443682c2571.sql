
-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, -- 'new_content' | 'pinned_reflection' | 'streak_reminder'
  title TEXT NOT NULL,
  body TEXT,
  link_route TEXT,
  link_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  dedupe_key TEXT, -- to prevent duplicates (e.g. per-day streak, per-content-per-user)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX notifications_user_dedupe_uk
  ON public.notifications (user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX notifications_user_unread_idx
  ON public.notifications (user_id) WHERE read_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users may only insert their own notifications directly (used for streak reminders from the client).
CREATE POLICY "Users insert own notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ─── Trigger: notify subscribers when new content is published ───
CREATE OR REPLACE FUNCTION public.notify_topic_subscribers_on_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  route_path TEXT;
  type_label TEXT;
BEGIN
  IF NEW.topic_id IS NULL OR NEW.published_at IS NULL THEN RETURN NEW; END IF;

  -- Only fire when transitioning to published (INSERT with published_at, or UPDATE from null->set)
  IF TG_OP = 'UPDATE' AND OLD.published_at IS NOT NULL THEN RETURN NEW; END IF;

  IF NEW.type = 'teaching' THEN route_path := '/teachings/$id'; type_label := 'teaching';
  ELSIF NEW.type = 'podcast' THEN route_path := '/podcasts/$id'; type_label := 'podcast';
  ELSE route_path := '/essays/$id'; type_label := 'essay';
  END IF;

  INSERT INTO public.notifications (user_id, kind, title, body, link_route, link_params, dedupe_key)
  SELECT
    ts.user_id,
    'new_content',
    'New ' || type_label || ' in ' || t.name,
    NEW.title,
    route_path,
    jsonb_build_object('id', NEW.id::text),
    'new_content:' || NEW.id::text
  FROM public.topic_subscriptions ts
  JOIN public.topics t ON t.id = ts.topic_id
  WHERE ts.topic_id = NEW.topic_id
  ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_topic_subscribers_on_publish() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER content_items_notify_subscribers_ins
AFTER INSERT ON public.content_items
FOR EACH ROW EXECUTE FUNCTION public.notify_topic_subscribers_on_publish();

CREATE TRIGGER content_items_notify_subscribers_upd
AFTER UPDATE OF published_at ON public.content_items
FOR EACH ROW EXECUTE FUNCTION public.notify_topic_subscribers_on_publish();

-- ─── Trigger: notify commenters when an admin pins a reflection on an essay ───
CREATE OR REPLACE FUNCTION public.notify_commenters_on_pin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  essay_title TEXT;
BEGIN
  IF NEW.is_admin_pinned IS NOT TRUE THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.is_admin_pinned IS TRUE THEN RETURN NEW; END IF;

  SELECT title INTO essay_title FROM public.content_items WHERE id = NEW.essay_id;

  INSERT INTO public.notifications (user_id, kind, title, body, link_route, link_params, dedupe_key)
  SELECT DISTINCT
    dc.user_id,
    'pinned_reflection',
    'A pinned reflection was added',
    COALESCE(essay_title, 'an essay you commented on'),
    '/essays/$id',
    jsonb_build_object('id', NEW.essay_id::text),
    'pinned_reflection:' || NEW.id::text || ':' || dc.user_id::text
  FROM public.discussion_comments dc
  WHERE dc.essay_id = NEW.essay_id
    AND dc.user_id <> NEW.user_id
  ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_commenters_on_pin() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER discussion_comments_notify_pin_ins
AFTER INSERT ON public.discussion_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_commenters_on_pin();

CREATE TRIGGER discussion_comments_notify_pin_upd
AFTER UPDATE OF is_admin_pinned ON public.discussion_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_commenters_on_pin();
