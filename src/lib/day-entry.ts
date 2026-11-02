import { supabase } from "@/integrations/supabase/client";

/**
 * One shared find-or-create per (user, template, date). Concurrent callers on
 * any page share the same promise, so a day never gets two entry rows.
 */
const inflight = new Map<string, Promise<string | null>>();

export function resolveDayEntry(userId: string, templateId: string, date: string): Promise<string | null> {
  const key = `${userId}:${templateId}:${date}`;
  const existing = inflight.get(key);
  if (existing) return existing;
  const find = async () => {
    const { data } = await supabase
      .from("devotional_entries").select("id")
      .eq("user_id", userId).eq("template_id", templateId).eq("entry_date", date)
      .order("created_at", { ascending: true }).limit(1).maybeSingle();
    return (data?.id as string | undefined) ?? null;
  };
  const p = (async () => {
    const found = await find();
    if (found) return found;
    const { data, error } = await supabase
      .from("devotional_entries")
      .insert({ user_id: userId, template_id: templateId, entry_date: date } as any)
      .select("id").single();
    if (error) return find();
    return data.id as string;
  })();
  inflight.set(key, p);
  p.then((v) => { if (!v) inflight.delete(key); }, () => inflight.delete(key));
  return p;
}

/** Serialize read-modify-write updates to one entry's todo_items. */
const chains = new Map<string, Promise<unknown>>();
export function updateEntryTodos<T>(entryId: string, fn: (items: T[]) => T[]): Promise<T[]> {
  const prev = chains.get(entryId) ?? Promise.resolve();
  const next = prev.catch(() => {}).then(async () => {
    const { data, error } = await supabase
      .from("devotional_entries").select("todo_items").eq("id", entryId).maybeSingle();
    if (error) throw error;
    const cur = Array.isArray((data as any)?.todo_items) ? ((data as any).todo_items as T[]) : [];
    const out = fn(cur);
    const res = await supabase.from("devotional_entries").update({ todo_items: out } as any).eq("id", entryId);
    if (res.error) throw res.error;
    return out;
  });
  chains.set(entryId, next);
  return next;
}
