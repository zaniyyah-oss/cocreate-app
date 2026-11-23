
CREATE TABLE public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings are public" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage settings" ON public.site_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
INSERT INTO public.site_settings (key, value) VALUES ('comment_flag_threshold', '3'::jsonb) ON CONFLICT DO NOTHING;

CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid REFERENCES public.content_items(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.devotional_templates(id) ON DELETE CASCADE,
  day_number integer,
  parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  agree_count integer NOT NULL DEFAULT 0,
  flag_count integer NOT NULL DEFAULT 0,
  hidden_at timestamptz,
  hidden_by text CHECK (hidden_by IN ('auto','admin')),
  reviewed_at timestamptz,
  edited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT comments_one_target CHECK ((content_id IS NOT NULL)::int + (template_id IS NOT NULL)::int = 1),
  CONSTRAINT comments_day_needs_template CHECK (template_id IS NULL OR day_number IS NOT NULL)
);
CREATE INDEX comments_content_idx ON public.comments (content_id, created_at);
CREATE INDEX comments_day_idx ON public.comments (template_id, day_number, created_at);
CREATE INDEX comments_parent_idx ON public.comments (parent_id);
CREATE INDEX comments_user_recent_idx ON public.comments (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authors and admins read comment rows" ON public.comments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Signed-in users post own comments" ON public.comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Authors edit own, admins moderate" ON public.comments FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authors and admins delete" ON public.comments FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- Bring over the old essay discussion (before the posting rules below exist).
INSERT INTO public.comments (content_id, user_id, author_name, body, created_at, updated_at)
SELECT d.essay_id, d.user_id, p.name, left(d.body, 2000), d.created_at, d.updated_at
FROM public.discussion_comments d LEFT JOIN public.profiles p ON p.id = d.user_id
WHERE char_length(btrim(d.body)) > 0;

CREATE TABLE public.comment_agrees (
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.comment_agrees TO authenticated;
GRANT ALL ON public.comment_agrees TO service_role;
ALTER TABLE public.comment_agrees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own agrees" ON public.comment_agrees FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.comment_flags (
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text CHECK (reason IN ('unkind','off_topic','spam','other')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.comment_flags TO authenticated;
GRANT ALL ON public.comment_flags TO service_role;
ALTER TABLE public.comment_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users flag as themselves" ON public.comment_flags FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins read flags" ON public.comment_flags FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins clear flags" ON public.comment_flags FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Posting rules
CREATE OR REPLACE FUNCTION public.comments_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE par public.comments; enabled boolean;
BEGIN
  NEW.user_id := auth.uid();
  IF NEW.user_id IS NULL THEN RAISE EXCEPTION 'Sign in to comment'; END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = NEW.user_id AND u.email_confirmed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Confirm your email to join the conversation';
  END IF;
  IF (SELECT count(*) FROM public.comments c WHERE c.user_id = NEW.user_id AND c.created_at > now() - interval '10 minutes') >= 5 THEN
    RAISE EXCEPTION 'You''re commenting a lot — please wait a few minutes';
  END IF;
  IF NEW.parent_id IS NOT NULL THEN
    SELECT * INTO par FROM public.comments WHERE id = NEW.parent_id;
    IF par.id IS NULL THEN RAISE EXCEPTION 'Comment not found'; END IF;
    IF par.parent_id IS NOT NULL THEN NEW.parent_id := par.parent_id; END IF; -- one level of replies
    NEW.content_id := par.content_id; NEW.template_id := par.template_id; NEW.day_number := par.day_number;
  END IF;
  IF NEW.content_id IS NOT NULL THEN
    SELECT comments_enabled INTO enabled FROM public.content_items WHERE id = NEW.content_id
      AND status = 'published' AND (release_at IS NULL OR release_at <= now());
  ELSE
    SELECT comments_enabled INTO enabled FROM public.devotional_templates WHERE id = NEW.template_id
      AND status = 'published' AND (release_at IS NULL OR release_at <= now());
  END IF;
  IF enabled IS NOT TRUE THEN RAISE EXCEPTION 'Comments are closed here'; END IF;
  SELECT name INTO NEW.author_name FROM public.profiles WHERE id = NEW.user_id;
  NEW.agree_count := 0; NEW.flag_count := 0; NEW.hidden_at := NULL; NEW.hidden_by := NULL;
  NEW.reviewed_at := NULL; NEW.edited_at := NULL; NEW.created_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_comments_before_insert BEFORE INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.comments_before_insert();

CREATE OR REPLACE FUNCTION public.comments_before_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Structural fields never change.
  NEW.user_id := OLD.user_id; NEW.content_id := OLD.content_id; NEW.template_id := OLD.template_id;
  NEW.day_number := OLD.day_number; NEW.parent_id := OLD.parent_id; NEW.created_at := OLD.created_at;
  -- Counters are maintained by triggers only (they run with no admin check via session flag).
  IF current_setting('app.comment_counters', true) IS DISTINCT FROM 'on' THEN
    NEW.agree_count := OLD.agree_count;
    IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      NEW.flag_count := OLD.flag_count; NEW.hidden_at := OLD.hidden_at; NEW.hidden_by := OLD.hidden_by; NEW.reviewed_at := OLD.reviewed_at;
    END IF;
  END IF;
  IF NEW.body IS DISTINCT FROM OLD.body THEN
    IF OLD.user_id IS DISTINCT FROM auth.uid() THEN NEW.body := OLD.body; ELSE NEW.edited_at := now(); END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_comments_before_update BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.comments_before_update();

CREATE OR REPLACE FUNCTION public.comments_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE par public.comments; ctype text; route text; params jsonb;
BEGIN
  IF NEW.parent_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO par FROM public.comments WHERE id = NEW.parent_id;
  IF par.user_id IS NULL OR par.user_id = NEW.user_id THEN RETURN NEW; END IF;
  IF NEW.content_id IS NOT NULL THEN
    SELECT type::text INTO ctype FROM public.content_items WHERE id = NEW.content_id;
    route := CASE ctype WHEN 'teaching' THEN '/teachings/$id' WHEN 'clip' THEN '/teachings/$id' WHEN 'podcast' THEN '/podcasts/$id' ELSE '/essays/$id' END;
    params := jsonb_build_object('id', NEW.content_id::text, 'comment', NEW.id::text);
  ELSE
    route := '/devotionals/$id/day/$n';
    params := jsonb_build_object('id', NEW.template_id::text, 'n', NEW.day_number::text, 'comment', NEW.id::text);
  END IF;
  INSERT INTO public.notifications (user_id, kind, title, body, link_route, link_params, dedupe_key)
  VALUES (par.user_id, 'comment_reply', COALESCE(NEW.author_name, 'Someone') || ' replied to your comment', left(NEW.body, 140), route, params, 'comment_reply:' || NEW.id::text)
  ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_comments_after_insert AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.comments_after_insert();

CREATE OR REPLACE FUNCTION public.comment_agrees_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM set_config('app.comment_counters', 'on', true);
  UPDATE public.comments SET agree_count = (SELECT count(*) FROM public.comment_agrees a WHERE a.comment_id = COALESCE(NEW.comment_id, OLD.comment_id))
  WHERE id = COALESCE(NEW.comment_id, OLD.comment_id);
  PERFORM set_config('app.comment_counters', 'off', true);
  RETURN NULL;
END $$;
CREATE TRIGGER trg_comment_agrees_count AFTER INSERT OR DELETE ON public.comment_agrees FOR EACH ROW EXECUTE FUNCTION public.comment_agrees_count();

CREATE OR REPLACE FUNCTION public.comment_flags_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid := COALESCE(NEW.comment_id, OLD.comment_id); n int; lim int;
BEGIN
  IF TG_OP = 'INSERT' AND EXISTS (SELECT 1 FROM public.comments WHERE id = cid AND user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'You can''t flag your own comment';
  END IF;
  SELECT count(*) INTO n FROM public.comment_flags WHERE comment_id = cid;
  SELECT COALESCE((value #>> '{}')::int, 3) INTO lim FROM public.site_settings WHERE key = 'comment_flag_threshold';
  lim := COALESCE(lim, 3);
  PERFORM set_config('app.comment_counters', 'on', true);
  UPDATE public.comments SET flag_count = n,
    hidden_at = CASE WHEN TG_OP = 'INSERT' AND n >= lim AND hidden_at IS NULL THEN now() ELSE hidden_at END,
    hidden_by = CASE WHEN TG_OP = 'INSERT' AND n >= lim AND hidden_at IS NULL THEN 'auto' ELSE hidden_by END,
    reviewed_at = CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE reviewed_at END
  WHERE id = cid;
  PERFORM set_config('app.comment_counters', 'off', true);
  RETURN NULL;
END $$;
CREATE TRIGGER trg_comment_flags_count AFTER INSERT OR DELETE ON public.comment_flags FOR EACH ROW EXECUTE FUNCTION public.comment_flags_count();

-- Public read view: visible comments on released pieces; hidden bodies only for author/admins.
CREATE OR REPLACE VIEW public.comments_public AS
SELECT c.id, c.content_id, c.template_id, c.day_number, c.parent_id, c.user_id, c.author_name,
  CASE WHEN c.hidden_at IS NULL OR c.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role) THEN c.body ELSE NULL END AS body,
  c.hidden_at IS NOT NULL AS is_hidden, c.agree_count, c.edited_at, c.created_at
FROM public.comments c
LEFT JOIN public.content_items ci ON ci.id = c.content_id
LEFT JOIN public.devotional_templates dt ON dt.id = c.template_id
WHERE (ci.id IS NOT NULL AND ci.status = 'published' AND (ci.release_at IS NULL OR ci.release_at <= now()) AND ci.comments_enabled)
   OR (dt.id IS NOT NULL AND dt.status = 'published' AND (dt.release_at IS NULL OR dt.release_at <= now()) AND dt.comments_enabled)
   OR public.has_role(auth.uid(), 'admin'::app_role);
ALTER VIEW public.comments_public SET (security_invoker = off);
GRANT SELECT ON public.comments_public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon;

CREATE OR REPLACE FUNCTION public.comments_review_count()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.has_role(auth.uid(), 'admin'::app_role)
    THEN (SELECT count(*)::int FROM public.comments WHERE (flag_count > 0 OR hidden_by = 'auto') AND reviewed_at IS NULL)
    ELSE 0 END;
$$;
GRANT EXECUTE ON FUNCTION public.comments_review_count() TO authenticated;
