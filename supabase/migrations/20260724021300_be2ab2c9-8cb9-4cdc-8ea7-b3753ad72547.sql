
ALTER TABLE public.devotional_entries ADD COLUMN IF NOT EXISTS topic_ids uuid[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS devotional_entries_topic_ids_idx ON public.devotional_entries USING gin (topic_ids);
