CREATE OR REPLACE FUNCTION public.get_facilitator_level(_user_id uuid)
 RETURNS smallint LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT facilitator_level FROM public.profiles
  WHERE id = _user_id AND (_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
$$;

CREATE OR REPLACE FUNCTION public.guard_facilitator_level()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN NEW.facilitator_level := NULL;
  ELSIF NEW.facilitator_level IS DISTINCT FROM OLD.facilitator_level THEN NEW.facilitator_level := OLD.facilitator_level;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_facilitator_level ON public.profiles;
CREATE TRIGGER guard_facilitator_level BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_facilitator_level();

CREATE OR REPLACE FUNCTION public.guard_comment_pin()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN NEW.is_admin_pinned := false;
  ELSIF NEW.is_admin_pinned IS DISTINCT FROM OLD.is_admin_pinned THEN NEW.is_admin_pinned := OLD.is_admin_pinned;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS a_guard_comment_pin ON public.discussion_comments;
CREATE TRIGGER a_guard_comment_pin BEFORE INSERT OR UPDATE ON public.discussion_comments
  FOR EACH ROW EXECUTE FUNCTION public.guard_comment_pin();

CREATE OR REPLACE FUNCTION public.search_profiles(_q text)
 RETURNS TABLE(id uuid, name text, avatar_url text, member_since timestamp with time zone, streak_count integer, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.id, p.name, p.avatar_url, NULL::timestamptz, NULL::integer, NULL::timestamptz, NULL::timestamptz
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL AND length(trim(_q)) >= 3 AND p.id <> auth.uid()
    AND p.name ILIKE '%' || replace(replace(left(trim(_q),60),'%','\%'),'_','\_') || '%'
  LIMIT 10
$$;

CREATE OR REPLACE FUNCTION public.subscribe_email(_email text, _first_name text, _tags text[], _season text, _source text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE e text := lower(trim(_email)); allowed text[] := ARRAY['everything','monthly_letter','new_releases','devotionals','abide_seasons','paper_crew','app_updates'];
  clean text[];
BEGIN
  IF e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(e) > 255 THEN RAISE EXCEPTION 'invalid email'; END IF;
  SELECT coalesce(array_agg(DISTINCT t), '{}') INTO clean FROM unnest(coalesce(_tags,'{}')) t WHERE t = ANY(allowed);
  INSERT INTO public.subscribers (email, first_name, tags, season_interest, source)
  VALUES (e, nullif(left(trim(_first_name),120),''), clean, nullif(left(_season,40),''), left(_source,40))
  ON CONFLICT (email) DO UPDATE SET
    tags = (SELECT array_agg(DISTINCT x) FROM unnest(subscribers.tags || EXCLUDED.tags) x),
    first_name = coalesce(subscribers.first_name, EXCLUDED.first_name),
    season_interest = coalesce(subscribers.season_interest, EXCLUDED.season_interest);
END $$;