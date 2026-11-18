import { describe, expect, it } from "vitest";
import { positionAnnotationCards } from "./annotation-layout";

describe("margin-note placement", () => {
  it("keeps a clicked note beside its passage even when preceding notes would push it down", () => {
    const result = positionAnnotationCards([
      { id: "first", anchor: 0, height: 180 },
      { id: "second", anchor: 80, height: 300 },
    ], "second");
    expect(result.get("second")).toBe(80);
    expect(result.get("first")).toBe(390);
  });
  it("keeps ten pixels between ordinary cards", () => {
    const result = positionAnnotationCards([
      { id: "first", anchor: 0, height: 100 },
      { id: "second", anchor: 20, height: 100 },
    ], null);
    expect(result.get("first")).toBe(0);
    expect(result.get("second")).toBe(110);
  });
  it("leaves room above an active note for cards that fit", () => {
    const result = positionAnnotationCards([
      { id: "first", anchor: 0, height: 100 },
      { id: "second", anchor: 300, height: 200 },
      { id: "third", anchor: 350, height: 80 },
    ], "second");
    expect([...result.entries()]).toEqual([["second", 300], ["first", 0], ["third", 510]]);
  });
});