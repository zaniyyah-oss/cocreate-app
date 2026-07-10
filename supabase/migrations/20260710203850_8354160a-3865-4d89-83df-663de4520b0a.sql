
REVOKE EXECUTE ON FUNCTION public.publish_scheduled_content() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_scheduled_content() TO service_role, postgres;
