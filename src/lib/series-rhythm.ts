import { etToUtcISO, utcToEt } from "@/lib/et-time";

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1) + n * 86400000);
  return t.toISOString().slice(0, 10);
}
const weekdayOf = (ymd: string) => new Date(`${ymd}T12:00:00Z`).getUTCDay();

/**
 * The next `count` release times on the rhythm (weekday + ET time), each strictly after `afterIso`.
 * Used to fill unscheduled planned slots in series order.
 */
export function nextRhythmDates(afterIso: string, weekday: number, time: string, count: number): string[] {
  const out: string[] = [];
  let day = utcToEt(afterIso).date;
  while (weekdayOf(day) !== weekday) day = addDays(day, 1);
  while (out.length < count) {
    const iso = etToUtcISO(day, time);
    if (new Date(iso).getTime() > new Date(afterIso).getTime() && (!out.length || iso > out[out.length - 1]!)) out.push(iso);
    day = addDays(day, 7);
  }
  return out;
}

/** "9:00 am ET" from "09:00". */
export function timeLabel(t: string | null | undefined): string {
  if (!t) return "Set a time";
  const [h, m] = t.split(":").map(Number);
  const ap = (h ?? 0) >= 12 ? "pm" : "am";
  const hh = ((h ?? 0) % 12) || 12;
  return `${hh}:${String(m ?? 0).padStart(2, "0")} ${ap} ET`;
}
