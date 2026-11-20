import { describe, expect, it } from "vitest";
import { occurrenceOn, type RecurringTask } from "./recurring-tasks";

const base: RecurringTask = {
  id: "t1", item_kind: "event", title: "Group", notes: null, color: "#000",
  frequency: "weekly", weekdays: [1], month_days: [], start_date: "2026-11-02",
  end_date: null, start_time: "09:00", end_time: "10:00", is_active: true,
};
const d = (iso: string) => new Date(iso + "T00:00:00");

describe("single-occurrence changes", () => {
  it("skipping one Monday removes only that Monday", () => {
    const t = { ...base, exceptions: [{ task_id: "t1", original_date: "2026-11-16", action: "skip" as const, new_date: null, new_start_time: null, new_end_time: null }] };
    expect(occurrenceOn(t, d("2026-11-16"))).toBeNull();
    expect(occurrenceOn(t, d("2026-11-23"))).not.toBeNull();
  });
  it("moving one occurrence shows it on the new day with new times", () => {
    const t = { ...base, exceptions: [{ task_id: "t1", original_date: "2026-11-16", action: "move" as const, new_date: "2026-11-18", new_start_time: "14:00", new_end_time: null }] };
    expect(occurrenceOn(t, d("2026-11-16"))).toBeNull();
    const moved = occurrenceOn(t, d("2026-11-18"));
    expect(moved?.start_time).toBe("14:00");
    expect(moved?.occurrence_date).toBe("2026-11-16");
  });
});
