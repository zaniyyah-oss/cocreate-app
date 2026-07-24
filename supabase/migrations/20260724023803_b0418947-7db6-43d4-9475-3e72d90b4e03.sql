GRANT INSERT ON public.topics TO authenticated;
CREATE POLICY "Authenticated users can create topics"
  ON public.topics FOR INSERT TO authenticated WITH CHECK (true);