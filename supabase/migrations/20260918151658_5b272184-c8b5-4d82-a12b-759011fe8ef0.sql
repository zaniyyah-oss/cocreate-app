DROP POLICY IF EXISTS "Anyone reads published templates" ON public.devotional_templates;

CREATE POLICY "Anyone reads published templates"
ON public.devotional_templates
FOR SELECT
TO anon, authenticated
USING (status = 'published'::public.content_status);

CREATE POLICY "Admins read all devotional templates"
ON public.devotional_templates
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));