
-- 1. Draft/published status enum
CREATE TYPE public.content_status AS ENUM ('draft', 'published');

ALTER TABLE public.content_items
  ADD COLUMN status public.content_status NOT NULL DEFAULT 'published';

ALTER TABLE public.devotional_templates
  ADD COLUMN status public.content_status NOT NULL DEFAULT 'published';

-- 2. Tighten SELECT policies so only 'published' rows are readable to non-admins.
--    Admins keep full access via the existing "Admins manage ..." policies.
DROP POLICY IF EXISTS "Anon can read preview columns" ON public.content_items;
DROP POLICY IF EXISTS "Signed-in users read full content" ON public.content_items;

CREATE POLICY "Anon reads published content"
  ON public.content_items FOR SELECT
  TO anon
  USING (status = 'published');

CREATE POLICY "Auth reads published content"
  ON public.content_items FOR SELECT
  TO authenticated
  USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Devotional templates are viewable by everyone" ON public.devotional_templates;

CREATE POLICY "Anyone reads published templates"
  ON public.devotional_templates FOR SELECT
  USING (
    status = 'published'
    OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'))
  );

-- 3. Rebuild the public view so drafts never leak into feeds.
DROP VIEW IF EXISTS public.content_items_public;
CREATE VIEW public.content_items_public
WITH (security_invoker = true) AS
SELECT id, type, title, excerpt, topic_id, scripture_reference,
       author_name, published_at, thumbnail_url, created_at
FROM public.content_items
WHERE status = 'published';

GRANT SELECT ON public.content_items_public TO anon, authenticated;

-- 4. Notifications should only fire when a row becomes published.
CREATE OR REPLACE FUNCTION public.notify_topic_subscribers_on_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  route_path TEXT;
  type_label TEXT;
BEGIN
  IF NEW.topic_id IS NULL OR NEW.status <> 'published' THEN RETURN NEW; END IF;

  -- Only fire on transition to published
  IF TG_OP = 'UPDATE' AND OLD.status = 'published' THEN RETURN NEW; END IF;

  IF NEW.type = 'teaching' THEN route_path := '/teachings/$id'; type_label := 'teaching';
  ELSIF NEW.type = 'podcast' THEN route_path := '/podcasts/$id'; type_label := 'podcast';
  ELSE route_path := '/essays/$id'; type_label := 'essay';
  END IF;

  INSERT INTO public.notifications (user_id, kind, title, body, link_route, link_params, dedupe_key)
  SELECT ts.user_id, 'new_content',
         'New ' || type_label || ' in ' || t.name,
         NEW.title, route_path,
         jsonb_build_object('id', NEW.id::text),
         'new_content:' || NEW.id::text
  FROM public.topic_subscriptions ts
  JOIN public.topics t ON t.id = ts.topic_id
  WHERE ts.topic_id = NEW.topic_id
  ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS content_items_notify_subscribers_ins ON public.content_items;
DROP TRIGGER IF EXISTS content_items_notify_subscribers_upd ON public.content_items;

CREATE TRIGGER content_items_notify_subscribers_ins
  AFTER INSERT ON public.content_items
  FOR EACH ROW EXECUTE FUNCTION public.notify_topic_subscribers_on_publish();

CREATE TRIGGER content_items_notify_subscribers_upd
  AFTER UPDATE OF status ON public.content_items
  FOR EACH ROW EXECUTE FUNCTION public.notify_topic_subscribers_on_publish();

-- 5. Admin invites table — admins invite new admins/editors by email.
--    On signup, a trigger grants the invited role.
CREATE TABLE public.admin_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  role public.app_role NOT NULL DEFAULT 'admin',
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  accepted_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_invites TO authenticated;
GRANT ALL ON public.admin_invites TO service_role;

ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage invites"
  ON public.admin_invites FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. Extend handle_new_user to consume matching admin invites on signup.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  invite RECORD;
BEGIN
  INSERT INTO public.profiles (id, name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  FOR invite IN
    SELECT id, role FROM public.admin_invites
    WHERE lower(email) = lower(NEW.email) AND accepted_at IS NULL
  LOOP
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, invite.role)
    ON CONFLICT (user_id, role) DO NOTHING;

    UPDATE public.admin_invites
      SET accepted_at = now(), accepted_user_id = NEW.id
      WHERE id = invite.id;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- 7. Seed the first admin invite for zaniyyaheblue@gmail.com.
--    If the user already exists, grant immediately; otherwise the trigger above
--    will grant on their first sign-in.
INSERT INTO public.admin_invites (email, role)
VALUES ('zaniyyaheblue@gmail.com', 'admin')
ON CONFLICT (email) DO NOTHING;

DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE lower(email) = 'zaniyyaheblue@gmail.com' LIMIT 1;
  IF uid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    UPDATE public.admin_invites
      SET accepted_at = now(), accepted_user_id = uid
      WHERE lower(email) = 'zaniyyaheblue@gmail.com' AND accepted_at IS NULL;
  END IF;
END $$;
