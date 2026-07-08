
-- 1) Overview fields on devotional_templates
ALTER TABLE public.devotional_templates
  ADD COLUMN IF NOT EXISTS slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS overview_problem text,
  ADD COLUMN IF NOT EXISTS overview_belief text,
  ADD COLUMN IF NOT EXISTS overview_aim text,
  ADD COLUMN IF NOT EXISTS overview_philosophy text,
  ADD COLUMN IF NOT EXISTS overview_intro text;

-- 2) Movements
CREATE TABLE IF NOT EXISTS public.devotional_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.devotional_templates(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  title text NOT NULL,
  description text,
  day_start integer NOT NULL,
  day_end integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.devotional_movements TO anon, authenticated;
GRANT ALL ON public.devotional_movements TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.devotional_movements TO authenticated;
ALTER TABLE public.devotional_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "movements are public readable"
  ON public.devotional_movements FOR SELECT USING (true);
CREATE POLICY "admins manage movements"
  ON public.devotional_movements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_movements_updated
  BEFORE UPDATE ON public.devotional_movements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_movements_tpl ON public.devotional_movements(template_id, position);

-- 3) Days
DO $$ BEGIN
  CREATE TYPE public.devotional_medium AS ENUM ('scripture','podcast','reflect');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.devotional_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.devotional_templates(id) ON DELETE CASCADE,
  day_number integer NOT NULL,
  title text NOT NULL,
  medium public.devotional_medium NOT NULL DEFAULT 'scripture',
  scripture_reference text,
  preview_read text,
  preview_reflect text,
  preview_carry text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, day_number)
);
GRANT SELECT ON public.devotional_days TO anon, authenticated;
GRANT ALL ON public.devotional_days TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.devotional_days TO authenticated;
ALTER TABLE public.devotional_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "days are public readable"
  ON public.devotional_days FOR SELECT USING (true);
CREATE POLICY "admins manage days"
  ON public.devotional_days FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_days_updated
  BEFORE UPDATE ON public.devotional_days
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_days_tpl ON public.devotional_days(template_id, day_number);
