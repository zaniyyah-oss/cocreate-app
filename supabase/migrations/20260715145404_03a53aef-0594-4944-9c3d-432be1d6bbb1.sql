
CREATE TYPE public.friendship_status AS ENUM ('pending','accepted');

CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.friendship_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT friendships_no_self CHECK (requester_id <> addressee_id)
);

-- Unique unordered pair
CREATE UNIQUE INDEX friendships_pair_uidx ON public.friendships (
  LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id)
);
CREATE INDEX friendships_requester_idx ON public.friendships (requester_id);
CREATE INDEX friendships_addressee_idx ON public.friendships (addressee_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own friendships"
  ON public.friendships FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can send friend requests"
  ON public.friendships FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id AND status = 'pending');

CREATE POLICY "Addressee can accept or update requests"
  ON public.friendships FOR UPDATE TO authenticated
  USING (auth.uid() = addressee_id)
  WITH CHECK (auth.uid() = addressee_id);

CREATE POLICY "Either party can remove friendship"
  ON public.friendships FOR DELETE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE TRIGGER friendships_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enforce 10-friend cap on accepted friendships
CREATE OR REPLACE FUNCTION public.enforce_friend_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a_count int;
  b_count int;
BEGIN
  IF NEW.status <> 'accepted' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'accepted' THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO a_count FROM public.friendships
    WHERE status = 'accepted'
      AND (requester_id = NEW.requester_id OR addressee_id = NEW.requester_id)
      AND id <> NEW.id;
  IF a_count >= 10 THEN
    RAISE EXCEPTION 'Friends list full for requester (10/10)';
  END IF;

  SELECT count(*) INTO b_count FROM public.friendships
    WHERE status = 'accepted'
      AND (requester_id = NEW.addressee_id OR addressee_id = NEW.addressee_id)
      AND id <> NEW.id;
  IF b_count >= 10 THEN
    RAISE EXCEPTION 'Friends list full for addressee (10/10)';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER friendships_enforce_cap
  BEFORE INSERT OR UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.enforce_friend_cap();

-- Notify addressee when a friend request arrives
CREATE OR REPLACE FUNCTION public.notify_on_friend_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_name text;
BEGIN
  SELECT COALESCE(name, 'Someone') INTO requester_name FROM public.profiles WHERE id = NEW.requester_id;
  IF NEW.status = 'pending' THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link_route, link_params, dedupe_key)
    VALUES (
      NEW.addressee_id,
      'friend_request',
      'New friend request',
      requester_name || ' sent you a friend request',
      '/friends',
      '{}'::jsonb,
      'friend_request:' || NEW.id::text
    )
    ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER friendships_notify_request
  AFTER INSERT ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_friend_request();

-- Notify requester when accepted
CREATE OR REPLACE FUNCTION public.notify_on_friend_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  addressee_name text;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status <> 'accepted' THEN
    SELECT COALESCE(name, 'Someone') INTO addressee_name FROM public.profiles WHERE id = NEW.addressee_id;
    INSERT INTO public.notifications (user_id, kind, title, body, link_route, link_params, dedupe_key)
    VALUES (
      NEW.requester_id,
      'friend_accepted',
      'Friend request accepted',
      addressee_name || ' accepted your friend request',
      '/friends',
      '{}'::jsonb,
      'friend_accepted:' || NEW.id::text
    )
    ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER friendships_notify_accepted
  AFTER UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_friend_accepted();
