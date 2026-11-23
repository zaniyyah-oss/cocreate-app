ALTER TABLE public.content_items
  ADD COLUMN IF NOT EXISTS release_at timestamptz,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS kicker text,
  ADD COLUMN IF NOT EXISTS hero_url text,
  ADD COLUMN IF NOT EXISTS hero_focal_desktop text,
  ADD COLUMN IF NOT EXISTS hero_focal_mobile text,
  ADD COLUMN IF NOT EXISTS feature_new_this_month boolean NOT NULL DEFAULT false;
UPDATE public.content_items SET release_at = COALESCE(scheduled_at, published_at, created_at) WHERE release_at IS NULL;
CREATE INDEX IF NOT EXISTS content_items_release_at_idx ON public.content_items (release_at);

CREATE OR REPLACE VIEW public.content_items_public WITH (security_invoker = on) AS
SELECT id, type, title, excerpt, body, scripture_reference, topic_id, shelf, author_name,
       published_at, thumbnail_url, video_url, duration_seconds, external_url, created_at,
       release_at, summary, kicker, hero_url, hero_focal_desktop, hero_focal_mobile,
       feature_new_this_month, is_featured, slug, cover_image_url, read_time_minutes
FROM public.content_items
WHERE status = 'published'::content_status;
GRANT SELECT ON public.content_items_public TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.content_topics (
  content_id uuid NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  position smallint NOT NULL DEFAULT 0 CHECK (position BETWEEN 0 AND 2),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (content_id, topic_id)
);
GRANT SELECT ON public.content_topics TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_topics TO authenticated;
GRANT ALL ON public.content_topics TO service_role;
ALTER TABLE public.content_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Topics of published content are public" ON public.content_topics FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.content_items c WHERE c.id = content_id
                 AND (c.status = 'published'::content_status OR public.has_role(auth.uid(), 'admin'::app_role))));
CREATE POLICY "Admins manage content topics" ON public.content_topics FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
INSERT INTO public.content_topics (content_id, topic_id, position)
  SELECT id, topic_id, 0 FROM public.content_items WHERE topic_id IS NOT NULL
  ON CONFLICT DO NOTHING;

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS series_month date,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS hero_focal_desktop text,
  ADD COLUMN IF NOT EXISTS hero_focal_mobile text;

ALTER TABLE public.devotional_templates
  ADD COLUMN IF NOT EXISTS hero_url text,
  ADD COLUMN IF NOT EXISTS hero_focal_desktop text,
  ADD COLUMN IF NOT EXISTS hero_focal_mobile text,
  ADD COLUMN IF NOT EXISTS release_at timestamptz,
  ADD COLUMN IF NOT EXISTS feature_new_this_month boolean NOT NULL DEFAULT false;
UPDATE public.devotional_templates SET release_at = COALESCE(scheduled_at, created_at) WHERE release_at IS NULL;

ALTER TABLE public.shop_products ADD COLUMN IF NOT EXISTS category text;

INSERT INTO public.page_content (page_key, field_key, field_value) VALUES
  ('home', 'devotionals_headline', 'Read it here, live it in your workspace.'),
  ('home', 'devotionals_subline', 'Each devotional opens straight into your day’s Read, Pray and To-do.'),
  ('home', 'devotionals_create_note', 'Pick 1, 3, 5 or 10 days.'),
  ('home', 'newsletter_headline', 'Never miss a new release.'),
  ('home', 'newsletter_subline', 'One letter a month: what’s new, what’s coming, and where to start.'),
  ('home', 'newsletter_image_url', ''),
  ('home', 'workspace_card_subline', 'Your read, pray and do are waiting.')
ON CONFLICT (page_key, field_key) DO NOTHING;