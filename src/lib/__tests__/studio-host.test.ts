import { describe, it, expect } from "vitest";
import { isStudioHost, studioHostRedirect, parseTimestamp } from "../studio-host";
describe("studio host", () => {
  it("detects studio hostnames", () => { expect(isStudioHost("studio.justcocreate.com")).toBe(true); expect(isStudioHost("justcocreate.com")).toBe(false); });
  it("sends / to /studio", () => expect(studioHostRedirect("/", "")).toBe("/studio"));
  it("keeps studio, auth and preview paths", () => { for (const p of ["/studio/series/1", "/auth", "/auth/callback", "/preview/abc"]) expect(studioHostRedirect(p, "")).toBeNull(); });
  it("sends public pages to the main domain", () => expect(studioHostRedirect("/series/x", "?a=1")).toBe("https://justcocreate.com/series/x?a=1"));
  it("parses timestamps", () => { expect(parseTimestamp("18:40")).toBe(1120); expect(parseTimestamp("1:02:03")).toBe(3723); });
});
