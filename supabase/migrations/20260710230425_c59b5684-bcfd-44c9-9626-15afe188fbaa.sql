
-- ============ Brand color palette constraint ============
-- Allowed keys: navy, limelight, teal, lime, amber, burgundy, blush, cream, ink, fire_red, hot_pink, periwinkle

-- ============ collections: tag_color ============
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS tag_color text;

ALTER TABLE public.collections
  DROP CONSTRAINT IF EXISTS collections_tag_color_chk;
ALTER TABLE public.collections
  ADD CONSTRAINT collections_tag_color_chk
  CHECK (tag_color IS NULL OR tag_color IN
    ('navy','limelight','teal','lime','amber','burgundy','blush','cream','ink','fire_red','hot_pink','periwinkle'));

-- ============ collection_items: content_kind, sort_order, added_at ============
ALTER TABLE public.collection_items
  ADD COLUMN IF NOT EXISTS content_kind text,
  ADD COLUMN IF NOT EXISTS sort_order integer,
  ADD COLUMN IF NOT EXISTS added_at timestamptz NOT NULL DEFAULT now();

-- Backfill sort_order from existing position
UPDATE public.collection_items SET sort_order = position WHERE sort_order IS NULL;

-- Backfill content_kind from joined content_items.type or 'devotional' when template
UPDATE public.collection_items ci
  SET content_kind = c.type::text
  FROM public.content_items c
  WHERE ci.content_id = c.id AND ci.content_kind IS NULL;

UPDATE public.collection_items
  SET content_kind = 'devotional'
  WHERE template_id IS NOT NULL AND content_kind IS NULL;

ALTER TABLE public.collection_items
  DROP CONSTRAINT IF EXISTS collection_items_content_kind_chk;
ALTER TABLE public.collection_items
  ADD CONSTRAINT collection_items_content_kind_chk
  CHECK (content_kind IS NULL OR content_kind IN ('teaching','essay','podcast','blog','devotional','clip','promoted'));

-- ============ devotional_days: focus_preview ============
ALTER TABLE public.devotional_days
  ADD COLUMN IF NOT EXISTS focus_preview text;

-- ============ devotional_templates: new fields ============
ALTER TABLE public.devotional_templates
  ADD COLUMN IF NOT EXISTS accent_color text,
  ADD COLUMN IF NOT EXISTS overview_text text,
  ADD COLUMN IF NOT EXISTS intro_video_url text,
  ADD COLUMN IF NOT EXISTS widget_heading text,
  ADD COLUMN IF NOT EXISTS widget_subheading text,
  ADD COLUMN IF NOT EXISTS widget_cta_label text,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

ALTER TABLE public.devotional_templates
  DROP CONSTRAINT IF EXISTS devotional_templates_accent_color_chk;
ALTER TABLE public.devotional_templates
  ADD CONSTRAINT devotional_templates_accent_color_chk
  CHECK (accent_color IS NULL OR accent_color IN
    ('navy','limelight','teal','lime','amber','burgundy','blush','cream','ink','fire_red','hot_pink','periwinkle'));

-- Only one featured devotional platform-wide, and it must be published.
CREATE OR REPLACE FUNCTION public.enforce_single_featured_devotional()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_featured IS TRUE THEN
    IF NEW.status <> 'published' THEN
      RAISE EXCEPTION 'A featured devotional must be published.';
    END IF;
    UPDATE public.devotional_templates
       SET is_featured = false
     WHERE is_featured = true
       AND id <> NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_single_featured_devotional ON public.devotional_templates;
CREATE TRIGGER trg_enforce_single_featured_devotional
  BEFORE INSERT OR UPDATE OF is_featured, status ON public.devotional_templates
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_featured_devotional();

-- Partial unique index to hard-guarantee at-most-one featured
DROP INDEX IF EXISTS devotional_templates_single_featured_uidx;
CREATE UNIQUE INDEX devotional_templates_single_featured_uidx
  ON public.devotional_templates ((is_featured))
  WHERE is_featured = true;
