DROP POLICY IF EXISTS "Days of released devotionals are readable" ON public.devotional_days;
CREATE POLICY "Anon reads days of released devotionals" ON public.devotional_days FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.devotional_templates t WHERE t.id = template_id
    AND t.status = 'published'::content_status AND (t.release_at IS NULL OR t.release_at <= now())));
CREATE POLICY "Auth reads days of released devotionals" ON public.devotional_days FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.devotional_templates t WHERE t.id = template_id
    AND ((t.status = 'published'::content_status AND (t.release_at IS NULL OR t.release_at <= now()))
         OR public.has_role(auth.uid(), 'admin'::app_role))));