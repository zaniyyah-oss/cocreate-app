CREATE OR REPLACE FUNCTION public.viewer_is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role);
$$;
REVOKE ALL ON FUNCTION public.viewer_is_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.viewer_is_admin() TO anon, authenticated;

CREATE OR REPLACE VIEW public.comments_public AS
SELECT c.id, c.content_id, c.template_id, c.day_number, c.parent_id, c.user_id, c.author_name,
  CASE WHEN c.hidden_at IS NULL OR c.user_id = auth.uid() OR public.viewer_is_admin() THEN c.body ELSE NULL END AS body,
  c.hidden_at IS NOT NULL AS is_hidden, c.agree_count, c.edited_at, c.created_at
FROM public.comments c
LEFT JOIN public.content_items ci ON ci.id = c.content_id
LEFT JOIN public.devotional_templates dt ON dt.id = c.template_id
WHERE (ci.id IS NOT NULL AND ci.status = 'published' AND (ci.release_at IS NULL OR ci.release_at <= now()) AND ci.comments_enabled)
   OR (dt.id IS NOT NULL AND dt.status = 'published' AND (dt.release_at IS NULL OR dt.release_at <= now()) AND dt.comments_enabled)
   OR public.viewer_is_admin();
ALTER VIEW public.comments_public SET (security_invoker = off);
GRANT SELECT ON public.comments_public TO anon, authenticated;