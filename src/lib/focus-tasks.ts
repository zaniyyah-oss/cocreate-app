import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveDayEntry, updateEntryTodos } from "@/lib/day-entry";

/**
 * A focus item on the calendar is a scheduled task: it owns one to-do on its
 * day (todo.focus_event_id = event id). The to-do is the source of truth for
 * "done" — time passing never marks a focus item complete.
 */
type Todo = { id: string; text: string; done: boolean; status?: string; due_date?: string | null; focus_event_id?: string | null; [k: string]: unknown };

let defaultTpl: Promise<string | null> | null = null;
function defaultTemplateId(): Promise<string | null> {
  if (!defaultTpl) {
    defaultTpl = (async () => {
      const { data } = await supabase.from("devotional_templates").select("id")
        .eq("is_default" as any, true).eq("status", "published").maybeSingle();
      return (data?.id as string | undefined) ?? null;
    })();
    defaultTpl.then((v) => { if (!v) defaultTpl = null; });
  }
  return defaultTpl;
}

/** Tell an open workspace page to apply the same change to its local list. */
function announce(date: string, eventId: string, item: Todo | null) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("cc:focus-todo", { detail: { date, eventId, item } }));
}

async function entryFor(userId: string, date: string, create: boolean): Promise<string | null> {
  const tpl = await defaultTemplateId();
  if (!tpl) return null;
  if (create) return resolveDayEntry(userId, tpl, date);
  const { data } = await supabase.from("devotional_entries").select("id")
    .eq("user_id", userId).eq("template_id", tpl).eq("entry_date", date)
    .order("created_at", { ascending: true }).limit(1).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

export async function removeFocusTodo(userId: string, eventId: string, date: string) {
  const entryId = await entryFor(userId, date, false);
  if (!entryId) return;
  await updateEntryTodos<Todo>(entryId, (items) => items.filter((t) => t.focus_event_id !== eventId));
  announce(date, eventId, null);
}

/** Create or update the to-do linked to a focus item (moving it if the date changed). */
export async function syncFocusTodo(userId: string, ev: { id: string; event_date: string; title: string }, prevDate?: string | null) {
  let carried: Todo | undefined;
  if (prevDate && prevDate !== ev.event_date) {
    const oldId = await entryFor(userId, prevDate, false);
    if (oldId) {
      await updateEntryTodos<Todo>(oldId, (items) => {
        carried = items.find((t) => t.focus_event_id === ev.id);
        return items.filter((t) => t.focus_event_id !== ev.id);
      });
      announce(prevDate, ev.id, null);
    }
  }
  const entryId = await entryFor(userId, ev.event_date, true);
  if (!entryId) return;
  let result: Todo | null = null;
  await updateEntryTodos<Todo>(entryId, (items) => {
    const idx = items.findIndex((t) => t.focus_event_id === ev.id);
    if (idx >= 0) {
      const next = [...items];
      next[idx] = result = { ...next[idx], text: ev.title, due_date: ev.event_date };
      return next;
    }
    result = carried
      ? { ...carried, text: ev.title, due_date: ev.event_date }
      : { id: crypto.randomUUID(), text: ev.title, done: false, status: "not_started", due_date: ev.event_date, focus_event_id: ev.id };
    return [...items, result];
  });
  announce(ev.event_date, ev.id, result);
}

export async function setFocusDone(userId: string, eventId: string, date: string, title: string, done: boolean) {
  const entryId = await entryFor(userId, date, true);
  if (!entryId) return;
  let result: Todo | null = null;
  const status = done ? "done" : "not_started";
  await updateEntryTodos<Todo>(entryId, (items) => {
    const out = items.map((t) => t.focus_event_id === eventId ? (result = { ...t, done, status }) : t);
    if (result) return out;
    // Older focus items made before linking: create their to-do now.
    result = { id: crypto.randomUUID(), text: title, done, status, due_date: date, focus_event_id: eventId };
    return [...out, result];
  });
  announce(date, eventId, result);
}

/** Map of focus event id -> done, for focus items in the date range. */
export function useFocusDone(userId: string | null, startISO: string, endISO: string) {
  return useQuery({
    queryKey: ["focus-done", userId, startISO, endISO],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("devotional_entries").select("todo_items")
        .eq("user_id", userId!).gte("entry_date", startISO).lte("entry_date", endISO);
      if (error) throw error;
      const map = new Map<string, boolean>();
      for (const row of (data ?? []) as any[]) {
        for (const t of (Array.isArray(row.todo_items) ? row.todo_items : []) as Todo[]) {
          if (t?.focus_event_id) map.set(t.focus_event_id, t.status ? t.status === "done" : !!t.done);
        }
      }
      return map;
    },
  });
}
