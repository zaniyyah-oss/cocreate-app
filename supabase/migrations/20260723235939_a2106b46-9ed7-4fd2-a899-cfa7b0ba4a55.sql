DROP VIEW IF EXISTS public.content_items_public;
CREATE VIEW public.content_items_public AS
SELECT id, type, title, excerpt, body, topic_id, scripture_reference, author_name, published_at, thumbnail_url, video_url, duration_seconds, external_url, created_at
FROM public.content_items
WHERE status = 'published'::content_status;
GRANT SELECT ON public.content_items_public TO anon, authenticated;