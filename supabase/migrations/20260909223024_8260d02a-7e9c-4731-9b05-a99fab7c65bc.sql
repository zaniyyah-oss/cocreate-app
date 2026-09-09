ALTER TABLE public.recurring_tasks ADD COLUMN IF NOT EXISTS item_kind text NOT NULL DEFAULT 'task';
ALTER TABLE public.recurring_tasks DROP CONSTRAINT IF EXISTS recurring_tasks_item_kind_check;
ALTER TABLE public.recurring_tasks ADD CONSTRAINT recurring_tasks_item_kind_check CHECK (item_kind IN ('task','event'));