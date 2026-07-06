
CREATE OR REPLACE FUNCTION public.purge_seed_content_on_real_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_seed IS TRUE THEN RETURN NEW; END IF;
  DELETE FROM public.content_items WHERE is_seed = true;
  DELETE FROM public.devotional_templates WHERE is_seed = true;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.purge_seed_content_on_real_insert() FROM PUBLIC, anon, authenticated;
