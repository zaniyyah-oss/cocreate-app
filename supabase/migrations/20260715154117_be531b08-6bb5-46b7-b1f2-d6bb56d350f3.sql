
-- Helper: is user a member OR facilitator of the group
CREATE OR REPLACE FUNCTION public.is_facilitator_group_participant(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.facilitator_groups WHERE id = _group_id AND facilitator_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.facilitator_group_members WHERE group_id = _group_id AND user_id = _user_id
  )
$$;

-- Conversation messages
CREATE TABLE public.facilitator_group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.facilitator_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX fg_msg_group_created_idx ON public.facilitator_group_messages(group_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.facilitator_group_messages TO authenticated;
GRANT ALL ON public.facilitator_group_messages TO service_role;

ALTER TABLE public.facilitator_group_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group participants read messages"
  ON public.facilitator_group_messages FOR SELECT
  TO authenticated
  USING (public.is_facilitator_group_participant(group_id, auth.uid()));

CREATE POLICY "Group participants send messages"
  ON public.facilitator_group_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_facilitator_group_participant(group_id, auth.uid())
  );

CREATE POLICY "Sender can delete own message"
  ON public.facilitator_group_messages FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Announcements
CREATE TABLE public.facilitator_group_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.facilitator_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX fg_ann_group_created_idx ON public.facilitator_group_announcements(group_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.facilitator_group_announcements TO authenticated;
GRANT ALL ON public.facilitator_group_announcements TO service_role;

ALTER TABLE public.facilitator_group_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group participants read announcements"
  ON public.facilitator_group_announcements FOR SELECT
  TO authenticated
  USING (public.is_facilitator_group_participant(group_id, auth.uid()));

CREATE POLICY "Only facilitator creates announcements"
  ON public.facilitator_group_announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_facilitator_group_owner(group_id, auth.uid())
  );

CREATE POLICY "Only facilitator updates announcements"
  ON public.facilitator_group_announcements FOR UPDATE
  TO authenticated
  USING (public.is_facilitator_group_owner(group_id, auth.uid()))
  WITH CHECK (public.is_facilitator_group_owner(group_id, auth.uid()));

CREATE POLICY "Only facilitator deletes announcements"
  ON public.facilitator_group_announcements FOR DELETE
  TO authenticated
  USING (public.is_facilitator_group_owner(group_id, auth.uid()));

CREATE TRIGGER facilitator_group_announcements_updated_at
  BEFORE UPDATE ON public.facilitator_group_announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
