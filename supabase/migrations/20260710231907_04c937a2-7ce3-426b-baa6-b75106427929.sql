
UPDATE public.page_content SET field_value = 'Workspace' WHERE page_key = 'site_nav' AND field_key = 'devotionals_label';
INSERT INTO public.page_content (page_key, field_key, field_value) VALUES
  ('site_nav', 'library_label', 'Library')
ON CONFLICT DO NOTHING;
