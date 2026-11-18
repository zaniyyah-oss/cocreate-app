CREATE TABLE public.doc_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workspace_item_id uuid NOT NULL REFERENCES public.workspace_items(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('note','question','word')),
  quote text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  word_study_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX doc_annotations_item_idx ON public.doc_annotations(workspace_item_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doc_annotations TO authenticated;
GRANT ALL ON public.doc_annotations TO service_role;
ALTER TABLE public.doc_annotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their annotations" ON public.doc_annotations
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.workspace_items w WHERE w.id = workspace_item_id AND w.user_id = auth.uid()));
CREATE TRIGGER doc_annotations_updated_at BEFORE UPDATE ON public.doc_annotations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();