import { Mark, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";

export type AnnoKind = "note" | "question" | "word";
export type AnnoRange = { id: string; kind: AnnoKind; from: number; to: number; blockEnd: number; n: number };

export const ANNO_CIRCLE: Record<AnnoKind, string> = { note: "#DCE07A", question: "#F4C2CD", word: "#FFD27A" };
export const annoPluginKey = new PluginKey("annotationDecos");

/** Every annotation mark in the doc, numbered by order of first appearance. */
export function annotationRanges(doc: PMNode): AnnoRange[] {
  const map = new Map<string, AnnoRange>();
  doc.descendants((node, pos) => {
    if (!node.isText) return;
    for (const m of node.marks) {
      if (m.type.name !== "annotation" || !m.attrs.id) continue;
      const id = m.attrs.id as string;
      const end = pos + node.nodeSize;
      const $p = doc.resolve(pos);
      const blockEnd = $p.depth >= 1 ? $p.after(1) : end;
      const cur = map.get(id);
      if (cur) { cur.to = Math.max(cur.to, end); cur.blockEnd = Math.max(cur.blockEnd, blockEnd); }
      else map.set(id, { id, kind: (m.attrs.kind as AnnoKind) || "note", from: pos, to: end, blockEnd, n: map.size + 1 });
    }
  });
  return [...map.values()];
}

/** Annotation ids found in a saved TipTap JSON body. */
export function annotationIdsInJSON(json: any, out: Set<string> = new Set()): Set<string> {
  if (!json || typeof json !== "object") return out;
  if (Array.isArray(json.marks)) for (const m of json.marks) if (m?.type === "annotation" && m.attrs?.id) out.add(m.attrs.id);
  if (Array.isArray(json.content)) for (const c of json.content) annotationIdsInJSON(c, out);
  return out;
}

export const Annotation = Mark.create<Record<string, never>, { strips: boolean }>({
  name: "annotation",
  inclusive: false,
  excludes: "",
  addStorage() { return { strips: false }; },
  addAttributes() {
    return {
      id: { default: null, parseHTML: (el) => el.getAttribute("data-anno-id"), renderHTML: (a) => ({ "data-anno-id": a.id }) },
      kind: { default: "note", parseHTML: (el) => el.getAttribute("data-anno-kind") || "note", renderHTML: (a) => ({ "data-anno-kind": a.kind }) },
    };
  },
  parseHTML() { return [{ tag: "span[data-anno-id]" }]; },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: `ws-anno ws-anno-${HTMLAttributes["data-anno-kind"] ?? "note"}` }), 0];
  },
  addProseMirrorPlugins() {
    const ext = this;
    return [
      new Plugin({
        key: annoPluginKey,
        props: {
          decorations(state) {
            const ranges = annotationRanges(state.doc);
            if (!ranges.length) return null;
            const decos: Decoration[] = [];
            for (const r of ranges) {
              decos.push(Decoration.widget(r.to, () => {
                const s = document.createElement("sup");
                s.className = "ws-anno-num";
                s.contentEditable = "false";
                s.setAttribute("data-anno-num", r.id);
                s.setAttribute("role", "button");
                s.setAttribute("aria-label", `Open margin note ${r.n}`);
                s.setAttribute("tabindex", "0");
                s.style.cursor = "pointer";
                s.addEventListener("keydown", (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    s.click();
                  }
                });
                s.style.background = ANNO_CIRCLE[r.kind];
                s.textContent = String(r.n);
                return s;
              }, { side: 1, key: `n:${r.id}:${r.n}:${r.kind}`, ignoreSelection: true }));
            }
            if (ext.storage.strips) {
              const byBlock = new Map<number, AnnoRange[]>();
              for (const r of ranges) byBlock.set(r.blockEnd, [...(byBlock.get(r.blockEnd) ?? []), r]);
              for (const [pos, rs] of byBlock) {
                for (const r of rs) {
                  decos.push(Decoration.widget(pos, () => {
                    const d = document.createElement("div");
                    d.className = "ws-anno-strip-host";
                    d.contentEditable = "false";
                    d.setAttribute("data-strip-id", r.id);
                    return d;
                  }, { side: 1 + r.n, key: `s:${r.id}`, ignoreSelection: true, stopEvent: () => true }));
                }
              }
            }
            return DecorationSet.create(state.doc, decos);
          },
        },
      }),
    ];
  },
});
