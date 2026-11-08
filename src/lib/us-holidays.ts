import { useSyncExternalStore } from "react";

/** US holidays (Halloween and Day of the Dead intentionally excluded). */
const KEY = "cc-show-us-holidays";
const listeners = new Set<() => void>();

export function getShowHolidays(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(KEY) !== "0";
}
export function setShowHolidays(v: boolean) {
  window.localStorage.setItem(KEY, v ? "1" : "0");
  listeners.forEach(l => l());
}
export function useShowHolidays(): boolean {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    getShowHolidays,
    () => true,
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
/** nth (1-based) weekday of month; n = -1 means last. */
function nthWeekday(y: number, m: number, dow: number, n: number): number {
  if (n > 0) {
    const first = new Date(y, m, 1).getDay();
    return 1 + ((dow - first + 7) % 7) + (n - 1) * 7;
  }
  const lastDate = new Date(y, m + 1, 0).getDate();
  const lastDow = new Date(y, m, lastDate).getDay();
  return lastDate - ((lastDow - dow + 7) % 7);
}
function easter(y: number): [number, number] {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return [month, day];
}

export function holidaysForYear(y: number): { iso: string; name: string }[] {
  const [em, ed] = easter(y);
  const easterD = new Date(y, em, ed);
  const goodFri = new Date(easterD); goodFri.setDate(goodFri.getDate() - 2);
  const list: [number, number, string][] = [
    [0, 1, "New Year's Day"],
    [0, nthWeekday(y, 0, 1, 3), "Martin Luther King Jr. Day"],
    [1, 14, "Valentine's Day"],
    [1, nthWeekday(y, 1, 1, 3), "Presidents' Day"],
    [2, 17, "St. Patrick's Day"],
    [goodFri.getMonth(), goodFri.getDate(), "Good Friday"],
    [em, ed, "Easter Sunday"],
    [4, nthWeekday(y, 4, 0, 2), "Mother's Day"],
    [4, nthWeekday(y, 4, 1, -1), "Memorial Day"],
    [5, 19, "Juneteenth"],
    [5, nthWeekday(y, 5, 0, 3), "Father's Day"],
    [6, 4, "Independence Day"],
    [8, nthWeekday(y, 8, 1, 1), "Labor Day"],
    [9, nthWeekday(y, 9, 1, 2), "Columbus / Indigenous Peoples' Day"],
    [10, 11, "Veterans Day"],
    [10, nthWeekday(y, 10, 4, 4), "Thanksgiving"],
    [11, 24, "Christmas Eve"],
    [11, 25, "Christmas Day"],
    [11, 31, "New Year's Eve"],
  ];
  return list.map(([m, d, name]) => ({ iso: iso(y, m, d), name }));
}

export function holidaysInRange(startISO: string, endISO: string) {
  const y0 = Number(startISO.slice(0, 4)), y1 = Number(endISO.slice(0, 4));
  const out: { iso: string; name: string }[] = [];
  for (let y = y0; y <= y1; y++) for (const h of holidaysForYear(y)) if (h.iso >= startISO && h.iso <= endISO) out.push(h);
  return out;
}
