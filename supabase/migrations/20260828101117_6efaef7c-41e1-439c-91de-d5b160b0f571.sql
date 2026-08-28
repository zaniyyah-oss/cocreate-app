CREATE TYPE public.content_shelf AS ENUM ('watch','shorts','read','listen','devotionals','guides');

ALTER TABLE public.content_items ADD COLUMN shelf public.content_shelf;

CREATE INDEX idx_content_items_shelf_published ON public.content_items (shelf, published_at DESC NULLS LAST) WHERE status = 'published';

DROP VIEW public.content_items_public;

CREATE VIEW public.content_items_public
WITH (security_invoker = true) AS
 SELECT id,
    type,
    title,
    excerpt,
    body,
    scripture_reference,
    topic_id,
    shelf,
    author_name,
    published_at,
    thumbnail_url,
    video_url,
    duration_seconds,
    external_url,
    created_at
   FROM public.content_items
  WHERE status = 'published'::content_status;

UPDATE public.content_items SET shelf = CASE
  WHEN type = 'clip' THEN 'shorts'::public.content_shelf
  WHEN type = 'teaching' THEN 'watch'::public.content_shelf
  WHEN type = 'podcast' THEN 'listen'::public.content_shelf
  WHEN type IN ('essay','blog') THEN 'read'::public.content_shelf
  ELSE NULL
END
WHERE shelf IS NULL;