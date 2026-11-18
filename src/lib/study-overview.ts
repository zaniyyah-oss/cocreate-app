import type { DocPage } from "./doc-pages";

export type StudyLogKind = "note" | "question" | "word";
export type StudyLogRow = { id: string; kind: StudyLogKind; quote: string; body: string; created_at: string; resolved_at: string | null };
export type StudyLogEntry = { row: StudyLogRow; pageId: string | null; pageTitle: string; number: number | null };

/** A missing Overview is virtual until the user writes in it; opening never changes stored pages. */
export function studyOverviewPage(pages: DocPage[]): DocPage {
  return pages.find((p) => !p.parentId && p.title.trim().toLowerCase() === "overview") ?? {
    id: "study-overview", title: "Overview", parentId: null, body: { type: "doc", content: [{ type: "paragraph" }] }, text: "", order: -1,
  };
}

/** Derive locations from marks without changing any page or annotation. Split marks are counted once. */
export function buildStudyLog(pages: DocPage[], rows: StudyLogRow[]): StudyLogEntry[] {
  const locations = new Map<string, { pageId: string; pageTitle: string; number: number }>();
  for (const page of pages) {
    const seen = new Set<string>();
    const walk = (node: any) => {
      for (const mark of node?.marks ?? []) {
        const id = mark?.attrs?.id;
        if (mark.type !== "annotation" || typeof id !== "string" || seen.has(id)) continue;
        seen.add(id);
        if (!locations.has(id)) locations.set(id, { pageId: page.id, pageTitle: page.title, number: seen.size });
      }
      for (const child of node?.content ?? []) walk(child);
    };
    walk(page.body);
  }
  return rows.map((row) => ({ row, ...(locations.get(row.id) ?? { pageId: null, pageTitle: "Detached", number: null }) }));
}

export function filterStudyLog(entries: StudyLogEntry[], kind: "all" | StudyLogKind, search: string): StudyLogEntry[] {
  const term = search.trim().toLocaleLowerCase();
  return entries.filter(({ row, pageTitle }) => (kind === "all" || row.kind === kind) &&
    (!term || [row.quote, row.body, pageTitle].some((text) => text.toLocaleLowerCase().includes(term))));
}