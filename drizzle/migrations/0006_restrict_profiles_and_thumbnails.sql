DROP POLICY IF EXISTS "Profiles viewable by signed-in users" ON public.profiles;
CREATE POLICY "Profiles viewable by related users" ON public.profiles
FOR SELECT TO authenticated USING (
  id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.friendships f WHERE (f.requester_id = auth.uid() AND f.addressee_id = profiles.id) OR (f.addressee_id = auth.uid() AND f.requester_id = profiles.id))
  OR EXISTS (SELECT 1 FROM public.discipleships d WHERE (d.mentor_id = auth.uid() AND d.disciple_id = profiles.id) OR (d.disciple_id = auth.uid() AND d.mentor_id = profiles.id))
  OR EXISTS (SELECT 1 FROM public.thread_participants a JOIN public.thread_participants b ON a.thread_id = b.thread_id WHERE a.user_id = auth.uid() AND b.user_id = profiles.id)
  OR EXISTS (SELECT 1 FROM public.facilitator_group_members m WHERE m.user_id = profiles.id AND public.is_facilitator_group_participant(m.group_id, auth.uid()))
  OR EXISTS (SELECT 1 FROM public.facilitator_groups g WHERE g.facilitator_id = profiles.id AND public.is_facilitator_group_participant(g.id, auth.uid()))
  OR EXISTS (SELECT 1 FROM public.discussion_comments c WHERE c.user_id = profiles.id)
);

CREATE OR REPLACE FUNCTION public.search_profiles(_q text)
RETURNS TABLE(id uuid, name text, avatar_url text, member_since timestamptz, streak_count integer, created_at timestamptz, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.name, p.avatar_url, p.member_since, p.streak_count, p.created_at, p.updated_at
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL AND length(trim(_q)) >= 2
    AND p.name ILIKE '%' || replace(replace(left(trim(_q),60),'%','\%'),'_','\_') || '%'
  LIMIT 20
$$;
REVOKE EXECUTE ON FUNCTION public.search_profiles(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_profiles(text) TO authenticated;

DROP POLICY IF EXISTS "Public read content thumbnails" ON storage.objects;
CREATE POLICY "Admins read content thumbnails" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'content-thumbnails' AND public.has_role(auth.uid(), 'admin'));