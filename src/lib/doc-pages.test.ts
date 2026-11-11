import { describe, it, expect } from "vitest";
import { addPage, deletePage, pagesFromItem, mirrorFields, outlineOf, movePage } from "./doc-pages";

const base = pagesFromItem({ body: { type: "doc" }, body_text: "hello" });

describe("doc pages", () => {
  it("opens an item without pages as one Overview page", () => {
    expect(base).toHaveLength(1);
    expect(base[0].title).toBe("Overview");
    expect(base[0].text).toBe("hello");
  });
  it("sub-pages only go one level deep", () => {
    const a = addPage(base, base[0].id);
    const b = addPage(a.pages, a.id);
    expect(b.pages.find((p) => p.id === b.id)!.parentId).toBe(base[0].id);
  });
  it("deleting a page deletes its sub-pages", () => {
    const root = addPage(base);
    const sub = addPage(root.pages, root.id);
    expect(deletePage(sub.pages, root.id).map((p) => p.id)).toEqual([base[0].id]);
  });
  it("the last page cannot be deleted", () => {
    expect(deletePage(base, base[0].id)).toHaveLength(1);
  });
  it("body mirrors the first page and text covers every page", () => {
    const a = addPage(base);
    const pages = a.pages.map((p) => (p.id === a.id ? { ...p, text: "second" } : p));
    const m = mirrorFields(pages);
    expect(m.body).toEqual({ type: "doc" });
    expect(m.body_text).toBe("hello\n\nsecond");
  });
  it("moving a page swaps it with its neighbour", () => {
    const a = addPage(base);
    expect(movePage(a.pages, a.id, -1)[0].id).toBe(a.id);
  });
  it("outline lists headings", () => {
    const doc = { type: "doc", content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Context" }] }, { type: "paragraph" }] };
    expect(outlineOf(doc)).toEqual([{ level: 2, text: "Context", index: 0 }]);
  });
});
