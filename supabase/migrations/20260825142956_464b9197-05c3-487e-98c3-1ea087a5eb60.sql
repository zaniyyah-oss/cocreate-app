DROP POLICY "Add self or added by creator" ON public.thread_participants;
CREATE POLICY "Thread creator adds participants" ON public.thread_participants
FOR INSERT TO authenticated
WITH CHECK (public.is_thread_creator(thread_id, auth.uid()));