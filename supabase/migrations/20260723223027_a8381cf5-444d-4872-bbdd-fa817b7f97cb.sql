
-- content_items additions
ALTER TABLE public.content_items
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS read_time_minutes integer,
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS content_items_type_slug_key
  ON public.content_items (type, slug) WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS content_items_published_at_desc_idx
  ON public.content_items (published_at DESC NULLS LAST) WHERE status = 'published';

CREATE INDEX IF NOT EXISTS content_items_topic_published_idx
  ON public.content_items (topic_id, published_at DESC NULLS LAST) WHERE status = 'published';

CREATE INDEX IF NOT EXISTS content_items_is_featured_idx
  ON public.content_items (is_featured) WHERE is_featured = true AND status = 'published';

-- topics additions
ALTER TABLE public.topics
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 100;

UPDATE public.topics SET display_name = name WHERE display_name IS NULL;

-- Seed the seven canonical home-page topics if missing
INSERT INTO public.topics (name, slug, color_key, display_name, sort_order) VALUES
  ('Identity',   'identity',   'navy',       'Identity',   10),
  ('Marriage',   'marriage',   'blush',      'Marriage',   20),
  ('Parenting',  'parenting',  'amber',      'Parenting',  30),
  ('Church',     'church',     'teal',       'Church',     40),
  ('Ministry',   'ministry',   'lime',       'Ministry',   50),
  ('Career',     'career',     'periwinkle', 'Career',     60),
  ('Business',   'business',   'burgundy',   'Business',   70)
ON CONFLICT (slug) DO UPDATE
  SET display_name = COALESCE(public.topics.display_name, EXCLUDED.display_name),
      sort_order   = LEAST(public.topics.sort_order, EXCLUDED.sort_order);

-- collections additions
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS collections_only_one_featured
  ON public.collections ((is_featured)) WHERE is_featured = true;
