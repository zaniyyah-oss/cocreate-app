CREATE TABLE public.user_event_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  color text NOT NULL DEFAULT '#9B9B93',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_event_types TO authenticated;
GRANT ALL ON public.user_event_types TO service_role;

ALTER TABLE public.user_event_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own event categories"
ON public.user_event_types FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_user_event_types_user ON public.user_event_types (user_id, sort_order);

CREATE TRIGGER update_user_event_types_updated_at
BEFORE UPDATE ON public.user_event_types
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();