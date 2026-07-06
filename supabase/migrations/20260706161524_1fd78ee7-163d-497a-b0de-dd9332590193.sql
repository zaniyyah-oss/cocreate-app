
ALTER TABLE public.devotional_entries
  ADD COLUMN IF NOT EXISTS where_text text,
  ADD COLUMN IF NOT EXISTS scripture_reference text,
  ADD COLUMN IF NOT EXISTS scripture_text text,
  ADD COLUMN IF NOT EXISTS further_reading_text text,
  ADD COLUMN IF NOT EXISTS todo_text text,
  ADD COLUMN IF NOT EXISTS todo_items jsonb NOT NULL DEFAULT '[]'::jsonb;
