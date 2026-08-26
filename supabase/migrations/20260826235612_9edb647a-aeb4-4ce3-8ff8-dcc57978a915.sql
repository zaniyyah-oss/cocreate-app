CREATE TABLE public.day_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_date date NOT NULL,
  body text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, note_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.day_notes TO authenticated;
GRANT ALL ON public.day_notes TO service_role;

ALTER TABLE public.day_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own day notes"
  ON public.day_notes FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_day_notes_updated_at
  BEFORE UPDATE ON public.day_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();