
ALTER TABLE public.workspace_items
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

CREATE INDEX IF NOT EXISTS workspace_items_user_pinned_idx
  ON public.workspace_items (user_id, pinned) WHERE pinned = true;

CREATE INDEX IF NOT EXISTS workspace_items_user_closed_at_idx
  ON public.workspace_items (user_id, closed_at DESC);

-- Backfill closed_at for already-closed items so today's UI has a sensible value.
UPDATE public.workspace_items
   SET closed_at = updated_at
 WHERE status = 'closed' AND closed_at IS NULL;

-- Keep closed_at in sync with status transitions automatically.
CREATE OR REPLACE FUNCTION public.workspace_items_sync_closed_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'closed' AND NEW.closed_at IS NULL THEN
      NEW.closed_at := now();
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'closed' AND (OLD.status <> 'closed' OR OLD.closed_at IS NULL) THEN
      NEW.closed_at := COALESCE(NEW.closed_at, now());
    ELSIF NEW.status = 'open' AND OLD.status = 'closed' THEN
      NEW.closed_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workspace_items_sync_closed_at ON public.workspace_items;
CREATE TRIGGER trg_workspace_items_sync_closed_at
  BEFORE INSERT OR UPDATE ON public.workspace_items
  FOR EACH ROW EXECUTE FUNCTION public.workspace_items_sync_closed_at();
