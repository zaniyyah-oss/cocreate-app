CREATE TABLE public.word_studies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  term text NOT NULL,
  original text NOT NULL DEFAULT '',
  original_script text,
  language text CHECK (language IN ('hebrew','greek','aramaic','english')),
  strongs text,
  part_of_speech text,
  meaning text NOT NULL DEFAULT '',
  notes jsonb,
  notes_text text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.word_studies TO authenticated;
GRANT ALL ON public.word_studies TO service_role;
ALTER TABLE public.word_studies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their word studies" ON public.word_studies FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX word_studies_user_term_idx ON public.word_studies (user_id, lower(term));
CREATE INDEX word_studies_user_strongs_idx ON public.word_studies (user_id, upper(strongs));
CREATE TRIGGER word_studies_updated_at BEFORE UPDATE ON public.word_studies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.doc_annotations ADD COLUMN IF NOT EXISTS reference text;
CREATE INDEX IF NOT EXISTS doc_annotations_word_study_idx ON public.doc_annotations (word_study_id);