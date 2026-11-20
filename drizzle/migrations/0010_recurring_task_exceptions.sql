CREATE TABLE public.recurring_task_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  task_id uuid NOT NULL REFERENCES public.recurring_tasks(id) ON DELETE CASCADE,
  original_date date NOT NULL,
  action text NOT NULL CHECK (action IN ('skip','move')),
  new_date date,
  new_start_time time,
  new_end_time time,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, original_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_task_exceptions TO authenticated;
GRANT ALL ON public.recurring_task_exceptions TO service_role;
ALTER TABLE public.recurring_task_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their recurring exceptions" ON public.recurring_task_exceptions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX recurring_task_exceptions_user_idx ON public.recurring_task_exceptions(user_id);