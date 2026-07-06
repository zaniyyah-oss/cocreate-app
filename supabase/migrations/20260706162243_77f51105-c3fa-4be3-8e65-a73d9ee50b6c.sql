
ALTER TABLE public.devotional_templates
  ADD COLUMN IF NOT EXISTS fill_mode text NOT NULL DEFAULT 'pool',
  ADD COLUMN IF NOT EXISTS scripture_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS pray_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS todo_items_pool jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS duration_days integer;

ALTER TABLE public.devotional_templates
  DROP CONSTRAINT IF EXISTS devotional_templates_fill_mode_check;
ALTER TABLE public.devotional_templates
  ADD CONSTRAINT devotional_templates_fill_mode_check
  CHECK (fill_mode IN ('pool','sequence'));
