
CREATE TABLE IF NOT EXISTS public.workspace_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  devotional_entry_id uuid REFERENCES public.devotional_entries(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT '',
  body jsonb NOT NULL DEFAULT '{}'::jsonb,
  body_text text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_items TO authenticated;
GRANT ALL ON public.workspace_items TO service_role;

ALTER TABLE public.workspace_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own workspace items"
  ON public.workspace_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workspace items"
  ON public.workspace_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workspace items"
  ON public.workspace_items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workspace items"
  ON public.workspace_items FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS workspace_items_user_updated_idx
  ON public.workspace_items (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS workspace_items_entry_idx
  ON public.workspace_items (devotional_entry_id);
CREATE INDEX IF NOT EXISTS workspace_items_tags_idx
  ON public.workspace_items USING gin (tags);

CREATE TRIGGER update_workspace_items_updated_at
  BEFORE UPDATE ON public.workspace_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
