import { describe, it, expect } from "vitest";
import { etToUtcISO, utcToEt } from "./et-time";

describe("Eastern-time release scheduling", () => {
  it("9:00 am ET in December (EST) is 14:00 UTC", () => {
    expect(etToUtcISO("2026-12-07", "09:00")).toBe("2026-12-07T14:00:00.000Z");
  });
  it("9:00 am ET in July (EDT) is 13:00 UTC", () => {
    expect(etToUtcISO("2026-07-06", "09:00")).toBe("2026-07-06T13:00:00.000Z");
  });
  it("round-trips back to the Eastern date and time", () => {
    expect(utcToEt("2026-12-07T14:00:00.000Z")).toEqual({ date: "2026-12-07", time: "09:00" });
  });
});
