
ALTER TABLE public.collection_items
  ADD COLUMN IF NOT EXISTS release_week integer,
  ADD COLUMN IF NOT EXISTS release_at timestamptz;

-- Backfill: place any existing items in week 1 as already released
UPDATE public.collection_items
  SET release_week = COALESCE(release_week, 1)
  WHERE release_week IS NULL;
