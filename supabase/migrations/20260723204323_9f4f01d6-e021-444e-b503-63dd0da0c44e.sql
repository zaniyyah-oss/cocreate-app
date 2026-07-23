CREATE TABLE public.user_tag_colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag text NOT NULL,
  color text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, tag)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_tag_colors TO authenticated;
GRANT ALL ON public.user_tag_colors TO service_role;
ALTER TABLE public.user_tag_colors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own tag colors" ON public.user_tag_colors
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_user_tag_colors_updated_at BEFORE UPDATE ON public.user_tag_colors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();