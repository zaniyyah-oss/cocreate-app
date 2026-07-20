CREATE TABLE public.user_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('prayer_meeting','bible_study','mentor_meeting','other')),
  title TEXT,
  color TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_events TO authenticated;
GRANT ALL ON public.user_events TO service_role;

ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own events" ON public.user_events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX user_events_user_date_idx ON public.user_events(user_id, event_date);

CREATE TRIGGER user_events_updated_at
  BEFORE UPDATE ON public.user_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();