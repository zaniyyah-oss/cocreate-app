-- Track who created each topic so only owners (or admins) can delete it.
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Ensure the authenticated role can create, update, and delete topics as needed.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.topics TO authenticated;
GRANT ALL ON public.topics TO service_role;

-- Keep RLS enabled.
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

-- Auto-fill the creator on insert so clients don't have to remember it.
CREATE OR REPLACE FUNCTION public.set_topic_created_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_topic_created_by_trigger ON public.topics;
CREATE TRIGGER set_topic_created_by_trigger
  BEFORE INSERT ON public.topics
  FOR EACH ROW
  EXECUTE FUNCTION public.set_topic_created_by();

-- Clean up policies: keep select public, restrict insert/update/delete to owner/admin.
DROP POLICY IF EXISTS "Authenticated users can create topics" ON public.topics;
DROP POLICY IF EXISTS "Topics are viewable by everyone" ON public.topics;

CREATE POLICY "Topics are viewable by everyone" ON public.topics
  FOR SELECT TO public
  USING (true);

CREATE POLICY "Users can create topics" ON public.topics
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own topics" ON public.topics
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete their own topics" ON public.topics
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Remove deleted topic ids from any devotional entries that reference them.
CREATE OR REPLACE FUNCTION public.remove_topic_from_entries()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.devotional_entries
  SET topic_ids = array_remove(topic_ids, OLD.id)
  WHERE topic_ids @> ARRAY[OLD.id];
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS remove_topic_from_entries_trigger ON public.topics;
CREATE TRIGGER remove_topic_from_entries_trigger
  AFTER DELETE ON public.topics
  FOR EACH ROW
  EXECUTE FUNCTION public.remove_topic_from_entries();