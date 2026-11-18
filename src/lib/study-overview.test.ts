import { describe, expect, it } from "vitest";
import { buildStudyLog, filterStudyLog, studyOverviewPage, type StudyLogRow } from "./study-overview";
import type { DocPage } from "./doc-pages";

const page = (id: string, title: string, ids: string[]): DocPage => ({ id, title, parentId: null, order: 0, text: "Saved chapter text", body: { type: "doc", content: ids.map((id) => ({ type: "text", text: "cedars", marks: [{ type: "annotation", attrs: { id, kind: "word" } }] })) } });
const rows: StudyLogRow[] = [
  { id: "word", kind: "word", quote: "cedars", body: "Temple materials", created_at: "2026-11-17", resolved_at: null },
  { id: "question", kind: "question", quote: "Why?", body: "A question", created_at: "2026-11-18", resolved_at: null },
  { id: "note", kind: "note", quote: "Removed passage", body: "Keep this note", created_at: "2026-11-19", resolved_at: null },
];
describe("study overview", () => {
  it("indexes annotations across chapters, counting split marks once", () => {
    const log = buildStudyLog([page("5", "Chapter 5", ["word", "word", "question"])], rows);
    expect(log.map((entry) => [entry.row.id, entry.pageId, entry.number])).toEqual([["word", "5", 1], ["question", "5", 2], ["note", null, null]]);
  });
  it("retains detached and resolved annotations", () => {
    const log = buildStudyLog([], [{ ...rows[0], resolved_at: "2026-11-18" }]);
    expect(log[0].pageTitle).toBe("Detached");
    expect(log[0].row.resolved_at).toBe("2026-11-18");
  });
  it("filters key terms, questions and notes and searches bodies and chapter names", () => {
    const log = buildStudyLog([page("5", "Chapter 5", ["word", "question"])], rows);
    expect(filterStudyLog(log, "word", "temple").map((e) => e.row.id)).toEqual(["word"]);
    expect(filterStudyLog(log, "question", "chapter 5").map((e) => e.row.id)).toEqual(["question"]);
    expect(filterStudyLog(log, "note", "keep").map((e) => e.row.id)).toEqual(["note"]);
  });
  it("does not change existing Overview content or other saved pages", () => {
    const pages = [page("overview", "Overview", []), page("5", "Chapter 5", ["word"])];
    const before = JSON.stringify({ pages, rows });
    expect(studyOverviewPage(pages)).toBe(pages[0]);
    buildStudyLog(pages, rows);
    expect(JSON.stringify({ pages, rows })).toBe(before);
  });
  it("offers a virtual Overview without overwriting a study that starts with a chapter", () => {
    const pages = [page("1", "Chapter 1", [])];
    expect(studyOverviewPage(pages).id).toBe("study-overview");
    expect(pages).toHaveLength(1);
    expect(pages[0].text).toBe("Saved chapter text");
  });
});