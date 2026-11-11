/** A study/note can hold ordered pages, with one level of sub-pages. */
export type DocPage = {
  id: string;
  title: string;
  parentId: string | null;
  body: any;
  text: string;
  order: number;
};

export const newPageId = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `p${Date.now()}${Math.random().toString(36).slice(2)}`);

/** Existing items without pages open as one "Overview" page built from their body. */
export function pagesFromItem(item: { pages?: any; body: any; body_text: string }): DocPage[] {
  if (Array.isArray(item.pages) && item.pages.length) return orderPages(item.pages as DocPage[]);
  return [{ id: "main", title: "Overview", parentId: null, body: item.body ?? {}, text: item.body_text ?? "", order: 0 }];
}

/** Roots by order, each followed by its own sub-pages by order. */
export function orderPages(pages: DocPage[]): DocPage[] {
  const roots = pages.filter((p) => !p.parentId).sort((a, b) => a.order - b.order);
  const out: DocPage[] = [];
  for (const r of roots) {
    out.push(r);
    out.push(...pages.filter((p) => p.parentId === r.id).sort((a, b) => a.order - b.order));
  }
  return out;
}

export function addPage(pages: DocPage[], parentId: string | null = null): { pages: DocPage[]; id: string } {
  // Sub-pages can only hang off a root page.
  const parent = parentId ? pages.find((p) => p.id === parentId) : null;
  const pid = parent ? (parent.parentId ?? parent.id) : null;
  const siblings = pages.filter((p) => (p.parentId ?? null) === pid);
  const id = newPageId();
  const order = siblings.reduce((m, p) => Math.max(m, p.order), -1) + 1;
  return { id, pages: orderPages([...pages, { id, title: pid ? "New sub-page" : "New page", parentId: pid, body: {}, text: "", order }]) };
}

/** Deleting a page also deletes its sub-pages; the last page can't be deleted. */
export function deletePage(pages: DocPage[], id: string): DocPage[] {
  const next = pages.filter((p) => p.id !== id && p.parentId !== id);
  return next.length ? next : pages;
}

export function movePage(pages: DocPage[], id: string, dir: -1 | 1): DocPage[] {
  const page = pages.find((p) => p.id === id);
  if (!page) return pages;
  const sibs = pages.filter((p) => (p.parentId ?? null) === (page.parentId ?? null)).sort((a, b) => a.order - b.order);
  const i = sibs.findIndex((p) => p.id === id);
  const j = i + dir;
  if (j < 0 || j >= sibs.length) return pages;
  [sibs[i], sibs[j]] = [sibs[j], sibs[i]];
  const orders = new Map(sibs.map((p, k) => [p.id, k]));
  return orderPages(pages.map((p) => (orders.has(p.id) ? { ...p, order: orders.get(p.id)! } : p)));
}

/** Fields to save: body mirrors the first page so lists and previews keep working; body_text covers every page for search. */
export function mirrorFields(pages: DocPage[]) {
  const ordered = orderPages(pages);
  return {
    pages: ordered,
    body: ordered[0]?.body ?? {},
    body_text: ordered.map((p) => p.text).filter(Boolean).join("\n\n"),
  };
}

export type OutlineItem = { level: number; text: string; index: number };

/** Headings (H1–H3) of a page, in document order. */
export function outlineOf(doc: any): OutlineItem[] {
  const out: OutlineItem[] = [];
  const walk = (n: any) => {
    if (!n) return;
    if (n.type === "heading") {
      const text = (n.content ?? []).map((c: any) => c.text ?? "").join("").trim();
      out.push({ level: n.attrs?.level ?? 1, text, index: out.length });
      return;
    }
    (n.content ?? []).forEach(walk);
  };
  walk(doc);
  return out.filter((h) => h.text);
}
