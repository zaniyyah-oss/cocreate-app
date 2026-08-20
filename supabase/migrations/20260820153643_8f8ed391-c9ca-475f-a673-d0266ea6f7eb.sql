CREATE TABLE public.recurring_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  notes text,
  color text NOT NULL DEFAULT '#8A96E0',
  frequency text NOT NULL CHECK (frequency IN ('weekly','biweekly','monthly','quarterly')),
  weekdays smallint[] NOT NULL DEFAULT '{}',
  month_days smallint[] NOT NULL DEFAULT '{}',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  start_time time,
  end_time time,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_tasks TO authenticated;
GRANT ALL ON public.recurring_tasks TO service_role;

ALTER TABLE public.recurring_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own recurring tasks"
  ON public.recurring_tasks FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER recurring_tasks_updated_at
  BEFORE UPDATE ON public.recurring_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.recurring_task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.recurring_tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  occurrence_date date NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, occurrence_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_task_completions TO authenticated;
GRANT ALL ON public.recurring_task_completions TO service_role;

ALTER TABLE public.recurring_task_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own recurring task completions"
  ON public.recurring_task_completions FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_recurring_tasks_user ON public.recurring_tasks(user_id, is_active);
CREATE INDEX idx_recurring_task_completions_user_date ON public.recurring_task_completions(user_id, occurrence_date);