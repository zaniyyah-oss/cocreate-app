
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;

DROP POLICY IF EXISTS "Published collections readable by everyone" ON public.collections;
CREATE POLICY "Anyone can view published collections" ON public.collections FOR SELECT
  USING (status = 'published'::content_status);
CREATE POLICY "Admins can view any collection" ON public.collections FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Collection items readable by everyone" ON public.collection_items;
CREATE POLICY "Anyone can view items in published collections" ON public.collection_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.collections c WHERE c.id = collection_id AND c.status = 'published'::content_status));
CREATE POLICY "Admins can view any collection items" ON public.collection_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
