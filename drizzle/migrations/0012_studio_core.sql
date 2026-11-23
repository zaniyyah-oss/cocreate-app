ALTER TABLE public.content_items
  ADD COLUMN IF NOT EXISTS body_doc jsonb,
  ADD COLUMN IF NOT EXISTS hero_caption text,
  ADD COLUMN IF NOT EXISTS is_standalone boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS comments_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.devotional_days
  ADD COLUMN IF NOT EXISTS scripture_passage text,
  ADD COLUMN IF NOT EXISTS reflection_doc jsonb,
  ADD COLUMN IF NOT EXISTS questions jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.devotional_templates
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS is_standalone boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS comments_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.collection_items
  ADD COLUMN IF NOT EXISTS planned_title text,
  ADD COLUMN IF NOT EXISTS planned_kind text,
  ADD COLUMN IF NOT EXISTS planned_at timestamptz;

CREATE TABLE IF NOT EXISTS public.devotional_topics (
  template_id uuid NOT NULL REFERENCES public.devotional_templates(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  position smallint NOT NULL DEFAULT 0 CHECK (position BETWEEN 0 AND 2),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (template_id, topic_id)
);
GRANT SELECT ON public.devotional_topics TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.devotional_topics TO authenticated;
GRANT ALL ON public.devotional_topics TO service_role;
ALTER TABLE public.devotional_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Topics of published devotionals are public" ON public.devotional_topics FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.devotional_templates t WHERE t.id = template_id
                 AND (t.status = 'published'::content_status OR public.has_role(auth.uid(), 'admin'::app_role))));
CREATE POLICY "Admins manage devotional topics" ON public.devotional_topics FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
INSERT INTO public.devotional_topics (template_id, topic_id, position)
  SELECT id, topic_id, 0 FROM public.devotional_templates WHERE topic_id IS NOT NULL
  ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.preview_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  scope text NOT NULL CHECK (scope IN ('content','devotional')),
  target_id uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  revoked_at timestamptz,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS preview_tokens_target_idx ON public.preview_tokens (target_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.preview_tokens TO authenticated;
GRANT ALL ON public.preview_tokens TO service_role;
ALTER TABLE public.preview_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage preview tokens" ON public.preview_tokens FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.list_admins()
RETURNS TABLE (user_id uuid, name text, email text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT r.user_id, p.name, u.email::text, p.avatar_url
  FROM public.user_roles r
  JOIN auth.users u ON u.id = r.user_id
  LEFT JOIN public.profiles p ON p.id = r.user_id
  WHERE r.role = 'admin'::app_role AND public.has_role(auth.uid(), 'admin'::app_role)
  ORDER BY p.name NULLS LAST, u.email;
$$;
REVOKE ALL ON FUNCTION public.list_admins() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.list_admins() TO authenticated;