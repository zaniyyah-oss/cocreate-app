
CREATE TABLE public.discipleship_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('discipler','disciple')),
  channel text NOT NULL CHECK (channel IN ('email','sms')),
  contact text NOT NULL,
  invitee_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','canceled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.discipleship_invites TO authenticated;
GRANT ALL ON public.discipleship_invites TO service_role;

ALTER TABLE public.discipleship_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inviter can view own invites" ON public.discipleship_invites
  FOR SELECT TO authenticated USING (auth.uid() = inviter_id);
CREATE POLICY "Inviter can create own invites" ON public.discipleship_invites
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = inviter_id);
CREATE POLICY "Inviter can update own invites" ON public.discipleship_invites
  FOR UPDATE TO authenticated USING (auth.uid() = inviter_id) WITH CHECK (auth.uid() = inviter_id);
CREATE POLICY "Inviter can delete own invites" ON public.discipleship_invites
  FOR DELETE TO authenticated USING (auth.uid() = inviter_id);

CREATE INDEX discipleship_invites_inviter_idx ON public.discipleship_invites (inviter_id, created_at DESC);

CREATE TRIGGER update_discipleship_invites_updated_at
  BEFORE UPDATE ON public.discipleship_invites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
