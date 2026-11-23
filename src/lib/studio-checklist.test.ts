import { describe, it, expect } from "vitest";
import { checklist, readyCount, isReady, missingText, pieceStatus } from "./studio-checklist";

const full = {
  title: "T", summary: "S", hasBody: true, inSeries: true, part: 6, standalone: false,
  heroUrl: "x.jpg", focalDesktop: "50% 50%", focalMobile: "40% 30%", topicCount: 2, releaseAt: "2026-12-07T14:00:00Z",
};

describe("Studio readiness checklist", () => {
  it("has six items and a complete piece is ready", () => {
    const c = checklist(full);
    expect(c).toHaveLength(6);
    expect(readyCount(c)).toBe(6);
    expect(isReady(c)).toBe(true);
  });
  it("hero needs both desktop and mobile crops", () => {
    expect(isReady(checklist({ ...full, focalMobile: null }))).toBe(false);
  });
  it("topics must be between 1 and 3", () => {
    expect(isReady(checklist({ ...full, topicCount: 0 }))).toBe(false);
    expect(isReady(checklist({ ...full, topicCount: 4 }))).toBe(false);
    expect(isReady(checklist({ ...full, topicCount: 3 }))).toBe(true);
  });
  it("standalone pieces don't need a series", () => {
    expect(isReady(checklist({ ...full, inSeries: false, part: null, standalone: true }))).toBe(true);
    expect(isReady(checklist({ ...full, inSeries: false, part: null }))).toBe(false);
  });
  it("lists what is missing", () => {
    expect(missingText(checklist({ ...full, heroUrl: null, topicCount: 0 }))).toBe("Missing hero photo and topic tags");
  });
  it("status: draft, scheduled before release, live after", () => {
    const now = new Date("2026-12-01T00:00:00Z");
    expect(pieceStatus("draft", "2026-12-07T14:00:00Z", now)).toBe("draft");
    expect(pieceStatus("published", "2026-12-07T14:00:00Z", now)).toBe("scheduled");
    expect(pieceStatus("published", "2026-11-07T14:00:00Z", now)).toBe("live");
  });
});
