import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RecurrenceFrequency = "weekly" | "biweekly" | "monthly" | "quarterly";

export type RecurringKind = "task" | "event";

export type RecurringTask = {
  id: string;
  item_kind: RecurringKind;
  title: string;
  notes: string | null;
  color: string;
  frequency: RecurrenceFrequency;
  weekdays: number[];
  month_days: number[];
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  is_active: boolean;
  hide_from_workspace?: boolean;
  /** One-off skips/moves for single occurrences. */
  exceptions?: RecurringException[];
  /** Set on an expanded occurrence: the date it originally fell on. */
  occurrence_date?: string;
};

export type RecurringException = {
  task_id: string;
  original_date: string;
  action: "skip" | "move";
  new_date: string | null;
  new_start_time: string | null;
  new_end_time: string | null;
};

export const RECURRENCE_LABEL: Record<RecurrenceFrequency, string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
  quarterly: "Quarterly",
};

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const RECURRING_COLORS: { name: string; value: string }[] = [
  { name: "Navy", value: "#181A4D" },
  { name: "Teal", value: "#0F4A42" },
  { name: "Amber", value: "#FFAE00" },
  { name: "Periwinkle", value: "#8A96E0" },
  { name: "Blush", value: "#E990A2" },
  { name: "Limelight", value: "#DCE07A" },
  { name: "Clay", value: "#441B07" },
  { name: "Gray", value: "#9B9B93" },
];

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function describeRecurrence(t: RecurringTask): string {
  if (t.frequency === "weekly" || t.frequency === "biweekly") {
    const days = [...t.weekdays].sort((a, b) => a - b).map(d => WEEKDAY_LABELS[d]).join(", ");
    return `${RECURRENCE_LABEL[t.frequency]}${days ? ` · ${days}` : ""}`;
  }
  const nums = [...t.month_days].sort((a, b) => a - b).map(ordinal).join(", ");
  return `${RECURRENCE_LABEL[t.frequency]}${nums ? ` · ${nums}` : ""}`;
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** True when a recurring task lands on the given date (honouring skips and moves). */
export function occursOn(task: RecurringTask, date: Date): boolean {
  return occurrenceOn(task, date) !== null;
}

/**
 * The occurrence of a task shown on `date`, or null. A moved occurrence appears on
 * its new date with its new times; a skipped or moved-away date shows nothing.
 */
export function occurrenceOn(task: RecurringTask, date: Date): RecurringTask | null {
  if (!task.is_active) return null;
  const iso = isoDate(date);
  const ex = task.exceptions ?? [];
  const movedIn = ex.find(e => e.action === "move" && e.new_date === iso);
  if (movedIn) {
    return {
      ...task,
      occurrence_date: movedIn.original_date,
      start_time: movedIn.new_start_time,
      end_time: movedIn.new_end_time,
    };
  }
  if (ex.some(e => e.original_date === iso)) return null;
  return baseOccursOn(task, date) ? { ...task, occurrence_date: iso } : null;
}

function baseOccursOn(task: RecurringTask, date: Date): boolean {
  if (!task.is_active) return false;
  const iso = isoDate(date);
  if (iso < task.start_date) return false;
  if (task.end_date && iso > task.end_date) return false;

  const start = parseISO(task.start_date);

  if (task.frequency === "weekly" || task.frequency === "biweekly") {
    if (!task.weekdays.includes(date.getDay())) return false;
    if (task.frequency === "weekly") return true;
    // Align 2-week cadence to the week containing start_date (weeks begin Sunday).
    const startWeek = new Date(start);
    startWeek.setDate(startWeek.getDate() - startWeek.getDay());
    const thisWeek = new Date(date);
    thisWeek.setDate(thisWeek.getDate() - thisWeek.getDay());
    const weeks = Math.round(daysBetween(startWeek, thisWeek) / 7);
    return weeks >= 0 && weeks % 2 === 0;
  }

  const dayOfMonth = date.getDate();
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  // A selected day beyond the month's length falls on the last day of that month.
  const matches = task.month_days.some(d => d === dayOfMonth || (d > lastDay && dayOfMonth === lastDay));
  if (!matches) return false;
  if (task.frequency === "monthly") return true;
  const monthsApart =
    (date.getFullYear() - start.getFullYear()) * 12 + (date.getMonth() - start.getMonth());
  return monthsApart >= 0 && monthsApart % 3 === 0;
}

/** Map of ISO date -> tasks occurring that day, across [startISO, endISO]. */
export function expandOccurrences(
  tasks: RecurringTask[],
  startISO: string,
  endISO: string,
): Map<string, RecurringTask[]> {
  const map = new Map<string, RecurringTask[]>();
  const start = parseISO(startISO);
  const end = parseISO(endISO);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = isoDate(d);
    const hits = tasks.map(t => occurrenceOn(t, d)).filter((t): t is RecurringTask => !!t);
    if (hits.length) {
      hits.sort((a, b) => (a.start_time ?? "zz").localeCompare(b.start_time ?? "zz"));
      map.set(iso, hits);
    }
  }
  return map;
}

export function useRecurringTasks(userId: string | null) {
  return useQuery({
    queryKey: ["recurring-tasks", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurring_tasks" as any)
        .select("id,item_kind,title,notes,color,frequency,weekdays,month_days,start_date,end_date,start_time,end_time,is_active,hide_from_workspace")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const { data: exData, error: exErr } = await supabase
        .from("recurring_task_exceptions")
        .select("task_id,original_date,action,new_date,new_start_time,new_end_time")
        .eq("user_id", userId!);
      if (exErr) throw exErr;
      const byTask = new Map<string, RecurringException[]>();
      for (const e of (exData ?? []) as RecurringException[]) {
        byTask.set(e.task_id, [...(byTask.get(e.task_id) ?? []), e]);
      }
      return ((data ?? []) as unknown as RecurringTask[]).map(t => ({
        ...t,
        exceptions: byTask.get(t.id) ?? [],
        item_kind: (t.item_kind === "event" ? "event" : "task") as RecurringKind,
        weekdays: (t.weekdays ?? []).map(Number),
        month_days: (t.month_days ?? []).map(Number),
      }));
    },
  });
}

/** Recurring items expanded across a date range: ISO date -> items that day. */
export function useRecurringOccurrences(userId: string | null, startISO: string, endISO: string) {
  const tasksQ = useRecurringTasks(userId);
  const tasks = tasksQ.data ?? [];
  return useMemo(
    () => expandOccurrences(tasks, startISO, endISO),
    [tasks, startISO, endISO],
  );
}

export function useRecurringCompletions(userId: string | null, startISO: string, endISO: string) {
  return useQuery({
    queryKey: ["recurring-task-completions", userId, startISO, endISO],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurring_task_completions" as any)
        .select("task_id,occurrence_date")
        .eq("user_id", userId!)
        .gte("occurrence_date", startISO)
        .lte("occurrence_date", endISO);
      if (error) throw error;
      const set = new Set<string>();
      for (const r of (data ?? []) as any[]) set.add(`${r.task_id}|${r.occurrence_date}`);
      return set;
    },
  });
}

export async function toggleRecurringCompletion(
  userId: string,
  taskId: string,
  occurrenceDate: string,
  done: boolean,
) {
  if (done) {
    const { error } = await supabase
      .from("recurring_task_completions" as any)
      .insert({ user_id: userId, task_id: taskId, occurrence_date: occurrenceDate });
    if (error && !`${error.message}`.includes("duplicate")) throw error;
  } else {
    const { error } = await supabase
      .from("recurring_task_completions" as any)
      .delete()
      .eq("task_id", taskId)
      .eq("occurrence_date", occurrenceDate);
    if (error) throw error;
  }
}

/** Remove just one occurrence of a recurring item. */
export async function skipOccurrence(userId: string, taskId: string, originalDate: string) {
  const { error } = await supabase.from("recurring_task_exceptions").upsert(
    { user_id: userId, task_id: taskId, original_date: originalDate, action: "skip",
      new_date: null, new_start_time: null, new_end_time: null },
    { onConflict: "task_id,original_date" },
  );
  if (error) throw error;
}

/** Move just one occurrence to another date and/or time. */
export async function moveOccurrence(
  userId: string, taskId: string, originalDate: string,
  newDate: string, startTime: string | null, endTime: string | null,
) {
  const { error } = await supabase.from("recurring_task_exceptions").upsert(
    { user_id: userId, task_id: taskId, original_date: originalDate, action: "move",
      new_date: newDate, new_start_time: startTime, new_end_time: endTime },
    { onConflict: "task_id,original_date" },
  );
  if (error) throw error;
}
