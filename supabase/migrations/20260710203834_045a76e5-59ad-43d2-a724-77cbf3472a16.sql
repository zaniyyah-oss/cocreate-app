
-- 1. Collections: add description + cover_image_url aliases
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS cover_image_url text;

-- Backfill from existing columns
UPDATE public.collections SET description = COALESCE(description, description_md);
UPDATE public.collections SET cover_image_url = COALESCE(cover_image_url, banner_url);

-- 2. collection_items: allow template references
ALTER TABLE public.collection_items
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.devotional_templates(id) ON DELETE CASCADE;

ALTER TABLE public.collection_items ALTER COLUMN content_id DROP NOT NULL;

ALTER TABLE public.collection_items
  DROP CONSTRAINT IF EXISTS collection_items_one_target_chk;
ALTER TABLE public.collection_items
  ADD CONSTRAINT collection_items_one_target_chk
  CHECK ((content_id IS NOT NULL)::int + (template_id IS NOT NULL)::int = 1);

CREATE UNIQUE INDEX IF NOT EXISTS collection_items_collection_template_key
  ON public.collection_items(collection_id, template_id) WHERE template_id IS NOT NULL;

-- 3. Scheduled publishing
ALTER TABLE public.content_items ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;
ALTER TABLE public.devotional_templates ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_content_items_scheduled ON public.content_items(scheduled_at) WHERE scheduled_at IS NOT NULL AND status = 'draft';
CREATE INDEX IF NOT EXISTS idx_devotional_templates_scheduled ON public.devotional_templates(scheduled_at) WHERE scheduled_at IS NOT NULL AND status = 'draft';

CREATE OR REPLACE FUNCTION public.publish_scheduled_content()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.content_items
    SET status = 'published',
        published_at = COALESCE(published_at, scheduled_at)
    WHERE status = 'draft'
      AND scheduled_at IS NOT NULL
      AND scheduled_at <= now();

  UPDATE public.devotional_templates
    SET status = 'published'
    WHERE status = 'draft'
      AND scheduled_at IS NOT NULL
      AND scheduled_at <= now();
END;
$$;

-- Schedule the cron job (unschedule first if exists to be idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'publish-scheduled-content') THEN
    PERFORM cron.unschedule('publish-scheduled-content');
  END IF;
  PERFORM cron.schedule(
    'publish-scheduled-content',
    '*/15 * * * *',
    $CRON$ SELECT public.publish_scheduled_content(); $CRON$
  );
END $$;

-- 4. page_content
CREATE TABLE IF NOT EXISTS public.page_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text NOT NULL,
  field_key text NOT NULL,
  field_value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page_key, field_key)
);

GRANT SELECT ON public.page_content TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_content TO authenticated;
GRANT ALL ON public.page_content TO service_role;

ALTER TABLE public.page_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads page content" ON public.page_content;
CREATE POLICY "Anyone reads page content" ON public.page_content FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage page content" ON public.page_content;
CREATE POLICY "Admins manage page content" ON public.page_content
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_page_content_updated ON public.page_content;
CREATE TRIGGER trg_page_content_updated BEFORE UPDATE ON public.page_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed existing hardcoded copy
INSERT INTO public.page_content (page_key, field_key, field_value) VALUES
  ('home_devotional_widget', 'heading', 'Today''s Devotional'),
  ('home_devotional_widget', 'subheading', 'A short daily rhythm of scripture, reflection, and prayer.'),
  ('home_devotional_widget', 'cta_label', 'Begin today'),
  ('devotional_overview', 'heading', 'Devotional Overview'),
  ('devotional_overview', 'subheading', 'What you''ll walk through in this devotional.'),
  ('devotional_overview', 'cta_label', 'Add to my Abide')
ON CONFLICT (page_key, field_key) DO NOTHING;

-- 5. devotional_days: add per-day override fields
ALTER TABLE public.devotional_days
  ADD COLUMN IF NOT EXISTS reflect_prompt text,
  ADD COLUMN IF NOT EXISTS pray_prompt text,
  ADD COLUMN IF NOT EXISTS apply_prompt text,
  ADD COLUMN IF NOT EXISTS scripture_note text,
  ADD COLUMN IF NOT EXISTS is_override boolean NOT NULL DEFAULT false;
