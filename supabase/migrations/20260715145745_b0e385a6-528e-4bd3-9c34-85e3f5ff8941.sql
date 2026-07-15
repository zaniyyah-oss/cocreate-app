
CREATE TYPE public.discipleship_status AS ENUM ('pending','accepted');

CREATE TABLE public.discipleships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  disciple_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.discipleship_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT discipleships_no_self CHECK (mentor_id <> disciple_id),
  CONSTRAINT discipleships_requester_is_party CHECK (requester_id IN (mentor_id, disciple_id))
);

CREATE UNIQUE INDEX discipleships_pair_uidx ON public.discipleships (mentor_id, disciple_id);
CREATE INDEX discipleships_mentor_idx ON public.discipleships (mentor_id);
CREATE INDEX discipleships_disciple_idx ON public.discipleships (disciple_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.discipleships TO authenticated;
GRANT ALL ON public.discipleships TO service_role;

ALTER TABLE public.discipleships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own discipleships"
  ON public.discipleships FOR SELECT TO authenticated
  USING (auth.uid() = mentor_id OR auth.uid() = disciple_id);

CREATE POLICY "Users can send discipleship requests"
  ON public.discipleships FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = requester_id
    AND auth.uid() IN (mentor_id, disciple_id)
    AND status = 'pending'
  );

CREATE POLICY "Recipient can respond to discipleship requests"
  ON public.discipleships FOR UPDATE TO authenticated
  USING (auth.uid() IN (mentor_id, disciple_id) AND auth.uid() <> requester_id)
  WITH CHECK (auth.uid() IN (mentor_id, disciple_id));

CREATE POLICY "Either party can remove discipleship"
  ON public.discipleships FOR DELETE TO authenticated
  USING (auth.uid() = mentor_id OR auth.uid() = disciple_id);

CREATE TRIGGER discipleships_updated_at
  BEFORE UPDATE ON public.discipleships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.notify_on_discipleship_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_id uuid;
  requester_name text;
  role_label text;
BEGIN
  IF NEW.status <> 'pending' THEN RETURN NEW; END IF;
  recipient_id := CASE WHEN NEW.requester_id = NEW.mentor_id THEN NEW.disciple_id ELSE NEW.mentor_id END;
  SELECT COALESCE(name, 'Someone') INTO requester_name FROM public.profiles WHERE id = NEW.requester_id;
  -- If requester is the mentor, they invited the recipient to BE their disciple.
  -- If requester is the disciple, they invited the recipient to BE their discipler.
  role_label := CASE WHEN NEW.requester_id = NEW.mentor_id THEN 'be their disciple' ELSE 'disciple them' END;

  INSERT INTO public.notifications (user_id, kind, title, body, link_route, link_params, dedupe_key)
  VALUES (
    recipient_id,
    'discipleship_request',
    'New discipleship request',
    requester_name || ' invited you to ' || role_label,
    '/friends',
    '{}'::jsonb,
    'discipleship_request:' || NEW.id::text
  )
  ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER discipleships_notify_request
  AFTER INSERT ON public.discipleships
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_discipleship_request();

CREATE OR REPLACE FUNCTION public.notify_on_discipleship_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_name text;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status <> 'accepted' THEN
    SELECT COALESCE(name, 'Someone') INTO recipient_name FROM public.profiles
      WHERE id = CASE WHEN NEW.requester_id = NEW.mentor_id THEN NEW.disciple_id ELSE NEW.mentor_id END;
    INSERT INTO public.notifications (user_id, kind, title, body, link_route, link_params, dedupe_key)
    VALUES (
      NEW.requester_id,
      'discipleship_accepted',
      'Discipleship request accepted',
      recipient_name || ' accepted your discipleship request',
      '/friends',
      '{}'::jsonb,
      'discipleship_accepted:' || NEW.id::text
    )
    ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER discipleships_notify_accepted
  AFTER UPDATE ON public.discipleships
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_discipleship_accepted();

REVOKE ALL ON FUNCTION public.notify_on_discipleship_request() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_discipleship_accepted() FROM PUBLIC, anon, authenticated;
