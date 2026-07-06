
REVOKE EXECUTE ON FUNCTION public.notify_topic_subscribers_on_publish() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_commenters_on_pin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
