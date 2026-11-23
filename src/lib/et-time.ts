/** Releases are scheduled in US Eastern time; readers see them in their own zone. */
export const ET_ZONE = "America/New_York";

function zoneOffsetMs(at: number, zone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(at));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(at / 1000) * 1000;
}

/** "2026-12-07" + "09:00" in Eastern time → UTC ISO string. */
export function etToUtcISO(date: string, time: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = (time || "00:00").split(":").map(Number);
  const guess = Date.UTC(y!, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0);
  const off1 = zoneOffsetMs(guess, ET_ZONE);
  let t = guess - off1;
  const off2 = zoneOffsetMs(t, ET_ZONE);
  if (off2 !== off1) t = guess - off2;
  return new Date(t).toISOString();
}

/** UTC ISO → Eastern { date: "YYYY-MM-DD", time: "HH:MM" }. */
export function utcToEt(iso: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ET_ZONE, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).formatToParts(new Date(iso));
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return { date: `${g("year")}-${g("month")}-${g("day")}`, time: `${g("hour")}:${g("minute")}` };
}

/** "Sun, Dec 7 · 9:00 am" in Eastern time. */
export function etLabel(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-US", { timeZone: ET_ZONE, weekday: "short", month: "short", day: "numeric" });
  const t = d.toLocaleTimeString("en-US", { timeZone: ET_ZONE, hour: "numeric", minute: "2-digit" }).toLowerCase();
  return `${day} · ${t}`;
}
