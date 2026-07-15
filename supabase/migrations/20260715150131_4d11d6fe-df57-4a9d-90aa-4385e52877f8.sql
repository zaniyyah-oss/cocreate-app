
CREATE TABLE public.message_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_group boolean NOT NULL DEFAULT false,
  title text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.thread_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz NOT NULL DEFAULT 'epoch',
  UNIQUE (thread_id, user_id)
);
CREATE INDEX thread_participants_user_idx ON public.thread_participants (user_id);
CREATE INDEX thread_participants_thread_idx ON public.thread_participants (thread_id);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_thread_created_idx ON public.messages (thread_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_threads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.thread_participants TO authenticated;
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.message_threads, public.thread_participants, public.messages TO service_role;

-- Helper: avoids recursive RLS on participants table
CREATE OR REPLACE FUNCTION public.is_thread_participant(_thread_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.thread_participants
    WHERE thread_id = _thread_id AND user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_thread_creator(_thread_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.message_threads
    WHERE id = _thread_id AND created_by = _user_id
  )
$$;

REVOKE ALL ON FUNCTION public.is_thread_participant(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_thread_creator(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_thread_participant(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_thread_creator(uuid, uuid) TO authenticated;

-- threads
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can view threads"
  ON public.message_threads FOR SELECT TO authenticated
  USING (public.is_thread_participant(id, auth.uid()));
CREATE POLICY "Users can create threads"
  ON public.message_threads FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Creator can update thread"
  ON public.message_threads FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- thread_participants
ALTER TABLE public.thread_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can view participants list"
  ON public.thread_participants FOR SELECT TO authenticated
  USING (public.is_thread_participant(thread_id, auth.uid()));
CREATE POLICY "Add self or added by creator"
  ON public.thread_participants FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_thread_creator(thread_id, auth.uid())
  );
CREATE POLICY "Update own participant row"
  ON public.thread_participants FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Leave thread (delete self)"
  ON public.thread_participants FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can read messages"
  ON public.messages FOR SELECT TO authenticated
  USING (public.is_thread_participant(thread_id, auth.uid()));
CREATE POLICY "Participants can send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_thread_participant(thread_id, auth.uid())
  );

-- Bump thread updated_at when a new message arrives (drives thread ordering)
CREATE OR REPLACE FUNCTION public.bump_thread_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.message_threads SET updated_at = NEW.created_at WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.bump_thread_on_message() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER messages_bump_thread
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_thread_on_message();

CREATE TRIGGER message_threads_updated_at
  BEFORE UPDATE ON public.message_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.message_threads REPLICA IDENTITY FULL;
ALTER TABLE public.thread_participants REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.thread_participants;
