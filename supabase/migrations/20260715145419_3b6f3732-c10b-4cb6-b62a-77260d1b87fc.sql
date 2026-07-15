
REVOKE ALL ON FUNCTION public.enforce_friend_cap() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_friend_request() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_friend_accepted() FROM PUBLIC, anon, authenticated;
