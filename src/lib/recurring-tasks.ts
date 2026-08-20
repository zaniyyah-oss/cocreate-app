import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RecurrenceFrequency = "weekly" | "biweekly" | "monthly" | "quarterly";

export type RecurringTask = {
  id: string;
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

/** True when a recurring task lands on the given date. */
export function occursOn(task: RecurringTask, date: Date): boolean {
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
    const hits = tasks.filter(t => occursOn(t, d));
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
        .select("id,title,notes,color,frequency,weekdays,month_days,start_date,end_date,start_time,end_time,is_active")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as RecurringTask[]).map(t => ({
        ...t,
        weekdays: (t.weekdays ?? []).map(Number),
        month_days: (t.month_days ?? []).map(Number),
      }));
    },
  });
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
