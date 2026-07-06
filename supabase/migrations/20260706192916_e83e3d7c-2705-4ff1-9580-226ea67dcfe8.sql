
-- Profiles: restrict SELECT to authenticated
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by signed-in users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Discussion comments: scope to published essays
DROP POLICY IF EXISTS "Signed-in users view discussion" ON public.discussion_comments;
CREATE POLICY "Signed-in users view discussion on published essays"
  ON public.discussion_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.content_items ci
      WHERE ci.id = discussion_comments.essay_id
        AND ci.status = 'published'
    )
    OR auth.uid() = user_id
  );

-- SECURITY DEFINER function exposure: revoke public execute
REVOKE EXECUTE ON FUNCTION public.compute_user_recommendations() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_popular_content_ids(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
-- has_role must remain executable by authenticated for RLS policy evaluation
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
