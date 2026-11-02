CREATE TABLE IF NOT EXISTS public.devotional_entries_backup_20261102 AS TABLE public.devotional_entries;
CREATE TABLE IF NOT EXISTS public.workspace_items_backup_20261102 AS TABLE public.workspace_items;
GRANT ALL ON public.devotional_entries_backup_20261102 TO service_role;
GRANT ALL ON public.workspace_items_backup_20261102 TO service_role;
ALTER TABLE public.devotional_entries_backup_20261102 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_items_backup_20261102 ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.study_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_folders TO authenticated;
GRANT ALL ON public.study_folders TO service_role;
ALTER TABLE public.study_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage study folders" ON public.study_folders FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX study_folders_user_idx ON public.study_folders(user_id, sort_order);
CREATE TRIGGER study_folders_updated_at BEFORE UPDATE ON public.study_folders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.workspace_items
  ADD COLUMN kind text NOT NULL DEFAULT 'note',
  ADD COLUMN folder_id uuid REFERENCES public.study_folders(id) ON DELETE SET NULL,
  ADD COLUMN books_of_bible text[] NOT NULL DEFAULT '{}',
  ADD COLUMN topic_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN legacy_entry_id uuid;
ALTER TABLE public.workspace_items ADD CONSTRAINT workspace_items_kind_check CHECK (kind IN ('note','study'));
CREATE UNIQUE INDEX workspace_items_legacy_entry_uidx ON public.workspace_items(legacy_entry_id) WHERE legacy_entry_id IS NOT NULL;
CREATE INDEX workspace_items_user_kind_idx ON public.workspace_items(user_id, kind);

CREATE TABLE public.entry_study_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entry_date date NOT NULL,
  workspace_item_id uuid NOT NULL REFERENCES public.workspace_items(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','continued','revisited')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entry_date, workspace_item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entry_study_links TO authenticated;
GRANT ALL ON public.entry_study_links TO service_role;
ALTER TABLE public.entry_study_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage study links" ON public.entry_study_links FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);