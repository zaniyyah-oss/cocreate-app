import { describe, it, expect } from "vitest";
import { orderRelated, type RelPiece } from "./related";

const P = (id: string, at: string): RelPiece => ({ id, type: "essay", title: id, release_at: at, hero_url: null, cover_image_url: null, thumbnail_url: null, hero_focal_desktop: null, hero_focal_mobile: null, duration_seconds: null, read_time_minutes: null, summary: null, excerpt: null, slug: null });
const now = new Date("2026-11-20T12:00:00Z");
const pieces = [P("a", "2026-11-01T00:00:00Z"), P("b", "2026-11-10T00:00:00Z"), P("c", "2026-11-30T00:00:00Z"), P("t1", "2026-11-05T00:00:00Z"), P("t2", "2026-11-15T00:00:00Z"), P("x", "2026-11-18T00:00:00Z")];
const base = { now, seriesOrder: ["a", "b", "c"], topicName: "Rest", topicPieceIds: new Set(["t1", "t2", "a"]), pieces, exclude: ["b"], finished: [] as string[], topicLimit: 3, latestLimit: 3 };

describe("orderRelated", () => {
  it("lists the series first in order, including the scheduled part as Coming next", () => {
    const r = orderRelated(base);
    expect(r.series.map((s) => s.piece.id)).toEqual(["a", "c"]);
    expect(r.series[1]!.reason).toBe("Coming next");
  });
  it("then same topic newest first, never repeating series pieces", () => {
    const r = orderRelated(base);
    expect(r.topic.map((s) => s.piece.id)).toEqual(["t2", "t1"]);
    expect(r.topic[0]!.reason).toBe("Shares the topic Rest");
  });
  it("skips topic pieces the reader finished", () => {
    expect(orderRelated({ ...base, finished: ["t2"] }).topic.map((s) => s.piece.id)).toEqual(["t1"]);
  });
  it("fills with Just released, excluding anything already on the page and unreleased pieces", () => {
    const r = orderRelated(base);
    expect(r.latest.map((s) => s.piece.id)).toEqual(["x"]);
  });
  it("respects the simulated now", () => {
    const r = orderRelated({ ...base, now: new Date("2026-12-01T00:00:00Z") });
    expect(r.series.every((s) => s.released)).toBe(true);
  });
});
