ALTER TABLE public.collection_items DROP CONSTRAINT IF EXISTS collection_items_one_target_chk;
ALTER TABLE public.collection_items ADD CONSTRAINT collection_items_one_target_chk CHECK (
  ((content_id IS NOT NULL)::integer + (template_id IS NOT NULL)::integer) = 1
  OR (content_id IS NULL AND template_id IS NULL AND planned_kind IS NOT NULL)
);