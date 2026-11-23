import { describe, it, expect } from "vitest";
import { textToDoc, docHasContent } from "./piece-doc";

describe("legacy body conversion", () => {
  it("turns blank-line separated text into paragraphs", () => {
    const d = textToDoc("One\n\nTwo");
    expect(d.content?.map((c) => c.type)).toEqual(["paragraph", "paragraph"]);
  });
  it("empty body is an empty doc with no content", () => {
    expect(docHasContent(textToDoc(""))).toBe(false);
    expect(docHasContent(textToDoc("Hello"))).toBe(true);
  });
});
