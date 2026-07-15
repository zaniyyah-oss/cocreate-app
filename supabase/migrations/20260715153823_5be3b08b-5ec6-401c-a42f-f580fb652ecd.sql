
-- 1. Add facilitator_level to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS facilitator_level smallint
  CHECK (facilitator_level IN (1, 2));

-- 2. Grant zaniyyaheblue@gmail.com facilitator level 2
UPDATE public.profiles
  SET facilitator_level = 2
  WHERE id IN (SELECT id FROM auth.users WHERE lower(email) = 'zaniyyaheblue@gmail.com');

-- 3. facilitator_groups table
CREATE TABLE public.facilitator_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facilitator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  invite_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX facilitator_groups_facilitator_idx ON public.facilitator_groups(facilitator_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.facilitator_groups TO authenticated;
GRANT ALL ON public.facilitator_groups TO service_role;

ALTER TABLE public.facilitator_groups ENABLE ROW LEVEL SECURITY;

-- 4. facilitator_group_members
CREATE TABLE public.facilitator_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.facilitator_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

CREATE INDEX facilitator_group_members_user_idx ON public.facilitator_group_members(user_id);
CREATE INDEX facilitator_group_members_group_idx ON public.facilitator_group_members(group_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.facilitator_group_members TO authenticated;
GRANT ALL ON public.facilitator_group_members TO service_role;

ALTER TABLE public.facilitator_group_members ENABLE ROW LEVEL SECURITY;

-- 5. Helper: is user a member of group
CREATE OR REPLACE FUNCTION public.is_facilitator_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.facilitator_group_members
    WHERE group_id = _group_id AND user_id = _user_id
  )
$$;

-- Helper: is user the facilitator of group
CREATE OR REPLACE FUNCTION public.is_facilitator_group_owner(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.facilitator_groups
    WHERE id = _group_id AND facilitator_id = _user_id
  )
$$;

-- Helper: get caller's facilitator level
CREATE OR REPLACE FUNCTION public.get_facilitator_level(_user_id uuid)
RETURNS smallint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT facilitator_level FROM public.profiles WHERE id = _user_id
$$;

-- 6. Policies: facilitator_groups
CREATE POLICY "Facilitators view their groups"
  ON public.facilitator_groups FOR SELECT
  TO authenticated
  USING (facilitator_id = auth.uid());

CREATE POLICY "Members view groups they belong to"
  ON public.facilitator_groups FOR SELECT
  TO authenticated
  USING (public.is_facilitator_group_member(id, auth.uid()));

CREATE POLICY "Facilitators create their own groups"
  ON public.facilitator_groups FOR INSERT
  TO authenticated
  WITH CHECK (
    facilitator_id = auth.uid()
    AND public.get_facilitator_level(auth.uid()) IN (1, 2)
  );

CREATE POLICY "Facilitators update their groups"
  ON public.facilitator_groups FOR UPDATE
  TO authenticated
  USING (facilitator_id = auth.uid())
  WITH CHECK (facilitator_id = auth.uid());

CREATE POLICY "Facilitators delete their groups"
  ON public.facilitator_groups FOR DELETE
  TO authenticated
  USING (facilitator_id = auth.uid());

-- Trigger enforcing level 1 = 1 group cap and level requirement
CREATE OR REPLACE FUNCTION public.enforce_facilitator_group_limit()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  lvl smallint;
  existing_count int;
BEGIN
  SELECT facilitator_level INTO lvl FROM public.profiles WHERE id = NEW.facilitator_id;
  IF lvl IS NULL THEN
    RAISE EXCEPTION 'Only facilitators can create facilitator groups.';
  END IF;
  IF lvl = 1 THEN
    SELECT count(*) INTO existing_count FROM public.facilitator_groups WHERE facilitator_id = NEW.facilitator_id;
    IF existing_count >= 1 THEN
      RAISE EXCEPTION 'Level 1 facilitators can create only 1 group.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_facilitator_group_limit_trg
  BEFORE INSERT ON public.facilitator_groups
  FOR EACH ROW EXECUTE FUNCTION public.enforce_facilitator_group_limit();

CREATE TRIGGER facilitator_groups_updated_at
  BEFORE UPDATE ON public.facilitator_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Policies: facilitator_group_members
CREATE POLICY "Members view their own membership rows"
  ON public.facilitator_group_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Facilitator views memberships of own groups"
  ON public.facilitator_group_members FOR SELECT
  TO authenticated
  USING (public.is_facilitator_group_owner(group_id, auth.uid()));

CREATE POLICY "Members can leave"
  ON public.facilitator_group_members FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Facilitator can remove members"
  ON public.facilitator_group_members FOR DELETE
  TO authenticated
  USING (public.is_facilitator_group_owner(group_id, auth.uid()));

-- No INSERT policy; members added via join_facilitator_group_by_code (SECURITY DEFINER)

-- 8. Join by code function
CREATE OR REPLACE FUNCTION public.join_facilitator_group_by_code(_code text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  gid uuid;
  fid uuid;
  member_count int;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id, facilitator_id INTO gid, fid
  FROM public.facilitator_groups
  WHERE invite_code = _code;

  IF gid IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  IF fid = uid THEN
    RAISE EXCEPTION 'You are the facilitator of this group';
  END IF;

  IF EXISTS (SELECT 1 FROM public.facilitator_group_members WHERE group_id = gid AND user_id = uid) THEN
    RETURN gid;
  END IF;

  SELECT count(*) INTO member_count FROM public.facilitator_group_members WHERE group_id = gid;
  IF member_count >= 25 THEN
    RAISE EXCEPTION 'This group is full (25/25)';
  END IF;

  INSERT INTO public.facilitator_group_members (group_id, user_id) VALUES (gid, uid);
  RETURN gid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_facilitator_group_by_code(text) TO authenticated;

-- 9. Preview a group by code (name + counts) for the join screen
CREATE OR REPLACE FUNCTION public.get_facilitator_group_preview(_code text)
RETURNS TABLE (id uuid, name text, description text, member_count int, is_full boolean, facilitator_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    g.id,
    g.name,
    g.description,
    (SELECT count(*)::int FROM public.facilitator_group_members m WHERE m.group_id = g.id) AS member_count,
    (SELECT count(*) FROM public.facilitator_group_members m WHERE m.group_id = g.id) >= 25 AS is_full,
    COALESCE(p.name, 'Facilitator') AS facilitator_name
  FROM public.facilitator_groups g
  LEFT JOIN public.profiles p ON p.id = g.facilitator_id
  WHERE g.invite_code = _code
$$;

GRANT EXECUTE ON FUNCTION public.get_facilitator_group_preview(text) TO authenticated;
