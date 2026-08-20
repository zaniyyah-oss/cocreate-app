-- ============ plans ============
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT 'navy',
  length_days integer NOT NULL,
  source text NOT NULL DEFAULT 'built',
  source_plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plans_length_positive CHECK (length_days > 0),
  CONSTRAINT plans_source_valid CHECK (source IN ('built','saved')),
  CONSTRAINT plans_color_valid CHECK (color IN (
    'navy','limelight','teal','lime','amber','burgundy',
    'blush','cream','ink','fire_red','hot_pink','periwinkle'
  ))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own plans"
  ON public.plans FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE INDEX plans_owner_idx ON public.plans (owner_id, created_at DESC);

CREATE TRIGGER plans_updated_at BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- helper: does the current user own this plan? (avoids recursive policy evaluation)
CREATE OR REPLACE FUNCTION public.owns_plan(_plan_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.plans WHERE id = _plan_id AND owner_id = _user_id)
$$;

-- ============ plan_days ============
CREATE TABLE public.plan_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  day_number integer NOT NULL,
  read_content text,
  pray_prompt text,
  task_content text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plan_days_day_positive CHECK (day_number > 0),
  CONSTRAINT plan_days_unique_day UNIQUE (plan_id, day_number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_days TO authenticated;
GRANT ALL ON public.plan_days TO service_role;
ALTER TABLE public.plan_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage days of their own plans"
  ON public.plan_days FOR ALL TO authenticated
  USING (public.owns_plan(plan_id, auth.uid()))
  WITH CHECK (public.owns_plan(plan_id, auth.uid()));

CREATE TRIGGER plan_days_updated_at BEFORE UPDATE ON public.plan_days
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ plan_assignments ============
CREATE TABLE public.plan_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  current_day integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'not_started',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plan_assignments_day_positive CHECK (current_day > 0),
  CONSTRAINT plan_assignments_status_valid CHECK (status IN ('not_started','in_progress','completed'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_assignments TO authenticated;
GRANT ALL ON public.plan_assignments TO service_role;
ALTER TABLE public.plan_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own plan assignments"
  ON public.plan_assignments FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX plan_assignments_user_date_idx ON public.plan_assignments (user_id, start_date DESC);
CREATE INDEX plan_assignments_active_idx ON public.plan_assignments (user_id, start_date)
  WHERE status <> 'completed';

CREATE TRIGGER plan_assignments_updated_at BEFORE UPDATE ON public.plan_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.owns_plan_assignment(_assignment_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.plan_assignments WHERE id = _assignment_id AND user_id = _user_id)
$$;

-- ============ plan_day_completions ============
CREATE TABLE public.plan_day_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.plan_assignments(id) ON DELETE CASCADE,
  day_number integer NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plan_day_completions_day_positive CHECK (day_number > 0),
  CONSTRAINT plan_day_completions_unique UNIQUE (assignment_id, day_number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_day_completions TO authenticated;
GRANT ALL ON public.plan_day_completions TO service_role;
ALTER TABLE public.plan_day_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage completions on their own assignments"
  ON public.plan_day_completions FOR ALL TO authenticated
  USING (public.owns_plan_assignment(assignment_id, auth.uid()))
  WITH CHECK (public.owns_plan_assignment(assignment_id, auth.uid()));

-- ============ plan_day_responses ============
CREATE TABLE public.plan_day_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.plan_assignments(id) ON DELETE CASCADE,
  day_number integer NOT NULL,
  read_reflection text,
  pray_reflection text,
  task_done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plan_day_responses_day_positive CHECK (day_number > 0),
  CONSTRAINT plan_day_responses_unique UNIQUE (assignment_id, day_number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_day_responses TO authenticated;
GRANT ALL ON public.plan_day_responses TO service_role;
ALTER TABLE public.plan_day_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage responses on their own assignments"
  ON public.plan_day_responses FOR ALL TO authenticated
  USING (public.owns_plan_assignment(assignment_id, auth.uid()))
  WITH CHECK (public.owns_plan_assignment(assignment_id, auth.uid()));

CREATE TRIGGER plan_day_responses_updated_at BEFORE UPDATE ON public.plan_day_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ notes linking ============
ALTER TABLE public.workspace_items
  ADD COLUMN plan_assignment_id uuid REFERENCES public.plan_assignments(id) ON DELETE SET NULL,
  ADD COLUMN plan_day_number integer;

CREATE INDEX workspace_items_plan_idx ON public.workspace_items (plan_assignment_id, plan_day_number)
  WHERE plan_assignment_id IS NOT NULL;
