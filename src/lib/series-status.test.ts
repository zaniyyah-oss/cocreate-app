import { describe, it, expect } from "vitest";
import { seriesStatus } from "./series-status";

describe("seriesStatus", () => {
  it("is Not started with no parts", () => expect(seriesStatus([]).status).toBe("notstarted"));
  it("is Live once any part is released", () => expect(seriesStatus(["draft", "live", "scheduled"]).status).toBe("live"));
  it("is Scheduled when a part is scheduled and none released", () => expect(seriesStatus(["planned", "scheduled"]).status).toBe("scheduled"));
  it("is Draft when parts exist but none are scheduled", () => expect(seriesStatus(["planned", "draft"]).status).toBe("draft"));
  it("counts released of total", () => expect(seriesStatus(["live", "live", "planned"])).toMatchObject({ released: 2, total: 3 }));
});
