import { describe, it, expect } from "vitest";
import { nextRhythmDates, timeLabel } from "./series-rhythm";
import { utcToEt } from "./et-time";

describe("nextRhythmDates", () => {
  it("fills slots on the rhythm weekday at the ET time, one week apart", () => {
    // Tue Nov 3 2026 → next Sundays: Nov 8, 15, 22 at 9:00 ET
    const r = nextRhythmDates("2026-11-03T15:00:00Z", 0, "09:00", 3);
    expect(r.map((x) => utcToEt(x))).toEqual([
      { date: "2026-11-08", time: "09:00" },
      { date: "2026-11-15", time: "09:00" },
      { date: "2026-11-22", time: "09:00" },
    ]);
  });
  it("skips the same day when that time already passed", () => {
    // Sunday Nov 8 2026 at 10:00 ET → first slot is Nov 15
    const r = nextRhythmDates("2026-11-08T15:00:00Z", 0, "09:00", 1);
    expect(utcToEt(r[0]!).date).toBe("2026-11-15");
  });
});

describe("timeLabel", () => {
  it("formats ET times", () => {
    expect(timeLabel("09:00")).toBe("9:00 am ET");
    expect(timeLabel("18:30")).toBe("6:30 pm ET");
  });
});
