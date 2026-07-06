
-- 1. Add is_default to devotional_templates
ALTER TABLE public.devotional_templates
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

-- Only one row may hold is_default = true.
CREATE UNIQUE INDEX IF NOT EXISTS devotional_templates_one_default
  ON public.devotional_templates ((is_default))
  WHERE is_default = true;

-- Trigger: any row with is_default = true must also be published.
CREATE OR REPLACE FUNCTION public.enforce_default_template_published()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default = true AND NEW.status <> 'published' THEN
    RAISE EXCEPTION 'The platform default devotional must be published.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_default_template_published ON public.devotional_templates;
CREATE TRIGGER trg_enforce_default_template_published
  BEFORE INSERT OR UPDATE ON public.devotional_templates
  FOR EACH ROW EXECUTE FUNCTION public.enforce_default_template_published();

-- 2. Retire profiles.default_template_id
ALTER TABLE public.profiles DROP COLUMN IF EXISTS default_template_id;

-- 3. Seed: mark the earliest published seed template as the platform default
--    (only if no default is currently set).
DO $$
DECLARE
  seed_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.devotional_templates WHERE is_default = true) THEN
    SELECT id INTO seed_id
    FROM public.devotional_templates
    WHERE status = 'published'
    ORDER BY (is_seed = true) DESC, created_at ASC
    LIMIT 1;

    IF seed_id IS NOT NULL THEN
      UPDATE public.devotional_templates SET is_default = true WHERE id = seed_id;
    END IF;
  END IF;
END $$;
