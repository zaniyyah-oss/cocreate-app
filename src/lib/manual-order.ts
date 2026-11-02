import { supabase } from "@/integrations/supabase/client";

type Orderable = { id: string; manual_order?: number | null };

/** Items with a saved manual position come first (in that order); the rest keep the fallback order. */
export function byManualOrder<T extends Orderable>(fallback: (a: T, b: T) => number) {
  return (a: T, b: T) => {
    const ao = a.manual_order ?? null;
    const bo = b.manual_order ?? null;
    if (ao !== null && bo !== null) return ao - bo || fallback(a, b);
    if (ao !== null) return -1;
    if (bo !== null) return 1;
    return fallback(a, b);
  };
}

/** Move `dragId` to the position of `targetId` within `list`, then save the new positions. */
export async function saveReorder<T extends Orderable>(list: T[], dragId: string, targetId: string) {
  if (dragId === targetId) return null;
  const ids = list.map((x) => x.id);
  const from = ids.indexOf(dragId);
  const to = ids.indexOf(targetId);
  if (from < 0 || to < 0) return null;
  ids.splice(from, 1);
  ids.splice(to, 0, dragId);
  await Promise.all(
    ids.map((id, i) => supabase.from("workspace_items").update({ manual_order: (i + 1) * 10 }).eq("id", id)),
  );
  return ids;
}
