
CREATE POLICY "Public read content thumbnails"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'content-thumbnails');

CREATE POLICY "Admins insert content thumbnails"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'content-thumbnails' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update content thumbnails"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'content-thumbnails' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'content-thumbnails' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete content thumbnails"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'content-thumbnails' AND public.has_role(auth.uid(), 'admin'));
