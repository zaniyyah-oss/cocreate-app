/** Block document (TipTap JSON) helpers shared by the Studio editor and public renderer. */
export type DocNode = {
  type: string;
  attrs?: Record<string, any>;
  content?: DocNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, any> }[];
};

export const emptyDoc = (): DocNode => ({ type: "doc", content: [{ type: "paragraph" }] });

/** Converts a legacy plain-text body into paragraphs (and "## " headings). */
export function textToDoc(body: string | null | undefined): DocNode {
  const src = (body ?? "").replace(/\r\n/g, "\n").trim();
  if (!src) return emptyDoc();
  const blocks = src.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return {
    type: "doc",
    content: blocks.map((b) => {
      const h = /^(#{2,3})\s+(.*)$/.exec(b);
      if (h) return { type: "heading", attrs: { level: h[1]!.length }, content: [{ type: "text", text: h[2]! }] };
      const lines = b.split("\n");
      const content: DocNode[] = [];
      lines.forEach((l, i) => {
        if (i > 0) content.push({ type: "hardBreak" });
        if (l) content.push({ type: "text", text: l });
      });
      return { type: "paragraph", content };
    }),
  };
}

export function docToText(n: DocNode | null | undefined): string {
  if (!n) return "";
  if (n.type === "text") return n.text ?? "";
  if (n.type === "hardBreak") return "\n";
  const inner = (n.content ?? []).map(docToText).join(n.type === "doc" || n.type.endsWith("List") ? "\n\n" : "");
  const extra = n.type === "scripture" ? `${n.attrs?.reference ?? ""} ` : n.type === "figure" ? n.attrs?.caption ?? "" : "";
  return extra + inner;
}

export function docHasContent(n: DocNode | null | undefined): boolean {
  if (!n) return false;
  if (n.type === "text") return !!n.text?.trim();
  if (["figure", "goDeeper", "clip"].includes(n.type)) return true;
  return (n.content ?? []).some(docHasContent);
}
