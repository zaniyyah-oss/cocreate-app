import { useEditor, EditorContent, NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer, type Editor, type NodeViewProps } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Node, mergeAttributes } from "@tiptap/core";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Heading2, BookOpen, ArrowUpRight, Quote, Image as ImageIcon, Film, List, Link2, Trash2 } from "lucide-react";
import { PIECE_CSS } from "@/components/content/PieceRenderer";
import { uploadStudioPhoto } from "@/lib/studio-data";
import type { DocNode } from "@/lib/piece-doc";
import { C } from "./ui";
import { useStudioClips, fmtDur } from "@/lib/clips";
import { VerticalClip } from "@/components/content/ClipPlayer";

export type DeeperOption = { id: string; title: string; kind: string };

/* ---------- custom nodes (render the same classes as PieceRenderer) ---------- */

function ScriptureView({ node, updateAttributes }: NodeViewProps) {
  return (
    <NodeViewWrapper as="figure" className="pc-scripture">
      <input contentEditable={false} className="pc-ref sb-refin" value={node.attrs.reference ?? ""} placeholder="BOOK 0:0" onChange={(e) => updateAttributes({ reference: e.target.value })} aria-label="Scripture reference" />
      <NodeViewContent className="pc-passage" />
    </NodeViewWrapper>
  );
}
const Scripture = Node.create({
  name: "scripture", group: "block", content: "inline*", defining: true,
  addAttributes() { return { reference: { default: "" } }; },
  parseHTML() { return [{ tag: "figure[data-scripture]" }]; },
  renderHTML({ HTMLAttributes }) { return ["figure", mergeAttributes(HTMLAttributes, { "data-scripture": "", class: "pc-scripture" }), ["div", { class: "pc-passage" }, 0]]; },
  addNodeView() { return ReactNodeViewRenderer(ScriptureView); },
});

const PullQuote = Node.create({
  name: "pullQuote", group: "block", content: "inline*", defining: true,
  parseHTML() { return [{ tag: "blockquote.pc-pull" }]; },
  renderHTML({ HTMLAttributes }) { return ["blockquote", mergeAttributes(HTMLAttributes, { class: "pc-pull" }), 0]; },
});

function FigureView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  return (
    <NodeViewWrapper as="figure" className={`pc-figure${node.attrs.layout === "inline" ? " inline" : ""}`} style={{ outline: selected ? `2px solid ${C.INK}` : undefined, outlineOffset: 4, borderRadius: 10 }}>
      <div contentEditable={false}>
        {node.attrs.src ? <img src={node.attrs.src} alt={node.attrs.caption ?? ""} /> : null}
        <div className="sb-figbar">
          <input value={node.attrs.caption ?? ""} placeholder="Add a caption" onChange={(e) => updateAttributes({ caption: e.target.value })} aria-label="Caption" />
          <button type="button" onClick={() => updateAttributes({ layout: node.attrs.layout === "inline" ? "full" : "inline" })}>{node.attrs.layout === "inline" ? "Inline" : "Full width"}</button>
          <button type="button" onClick={deleteNode} aria-label="Remove image"><Trash2 size={14} strokeWidth={1.7} /></button>
        </div>
      </div>
    </NodeViewWrapper>
  );
}
const Figure = Node.create({
  name: "figure", group: "block", atom: true, draggable: true,
  addAttributes() { return { src: { default: null }, caption: { default: "" }, layout: { default: "full" } }; },
  parseHTML() { return [{ tag: "figure[data-figure]" }]; },
  renderHTML({ HTMLAttributes }) { return ["figure", mergeAttributes(HTMLAttributes, { "data-figure": "" })]; },
  addNodeView() { return ReactNodeViewRenderer(FigureView); },
});

function DeeperView({ node, updateAttributes, deleteNode, extension }: NodeViewProps) {
  const opts = ((extension.options as any).getPieces?.() ?? []) as DeeperOption[];
  const hit = opts.find((o) => o.id === node.attrs.pieceId);
  return (
    <NodeViewWrapper className="pc-deeper" style={{ flexWrap: "wrap" }}>
      <div contentEditable={false} style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 0 }}>
        <span className="k">Go deeper{hit ? ` · ${hit.kind}` : ""}</span>
        <select value={node.attrs.pieceId ?? ""} onChange={(e) => { const o = opts.find((x) => x.id === e.target.value); updateAttributes({ pieceId: e.target.value || null, title: o?.title ?? "", kind: o?.kind ?? "" }); }} className="sb-select" aria-label="Piece to link">
          <option value="">Choose a piece…</option>
          {opts.map((o) => <option key={o.id} value={o.id}>{o.kind} · {o.title}</option>)}
        </select>
        <input className="sb-select" value={node.attrs.timestamp ?? ""} onChange={(e) => updateAttributes({ timestamp: e.target.value })} placeholder="Timestamp (optional), e.g. 12:40" aria-label="Timestamp" />
      </div>
      <button type="button" contentEditable={false} onClick={deleteNode} aria-label="Remove card" style={{ border: 0, background: "none", color: C.MUTED }}><Trash2 size={15} strokeWidth={1.7} /></button>
    </NodeViewWrapper>
  );
}
const GoDeeper = Node.create<{ getPieces: () => DeeperOption[] }>({
  name: "goDeeper", group: "block", atom: true,
  addOptions() { return { getPieces: () => [] }; },
  addAttributes() { return { pieceId: { default: null }, title: { default: "" }, kind: { default: "" }, timestamp: { default: "" } }; },
  parseHTML() { return [{ tag: "div[data-go-deeper]" }]; },
  renderHTML({ HTMLAttributes }) { return ["div", mergeAttributes(HTMLAttributes, { "data-go-deeper": "", class: "pc-deeper" })]; },
  addNodeView() { return ReactNodeViewRenderer(DeeperView); },
});

function ClipView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const lib = useStudioClips();
  const id = node.attrs.clipId as string | null;
  const clip = (lib.data ?? []).find((c) => c.id === id) ?? null;
  return (
    <NodeViewWrapper contentEditable={false} style={{ margin: "28px auto", maxWidth: 320, display: "flex", flexDirection: "column", gap: 8 }}>
      {clip ? (
        <>
          <VerticalClip autoPlay={false} clip={{ id: clip.id, caption: clip.caption, videoUrl: clip.videoUrl, posterUrl: clip.posterUrl, duration: clip.duration_seconds, seriesId: clip.series_id, releaseAt: clip.release_at, alt: clip.alt_text, position: clip.position, source: null, sourceSeconds: clip.source_seconds }} />
          <span style={{ fontSize: 13, color: C.INK }}>{clip.caption || <span style={{ color: C.MUTED }}>Needs a caption</span>}</span>
        </>
      ) : <div className="pc-clip" style={{ margin: 0, width: "100%" }}><Film size={22} strokeWidth={1.7} /><span style={{ fontWeight: 600, color: C.INK }}>Clip</span><span style={{ textAlign: "center", padding: "0 16px" }}>{id ? "This clip was removed" : "Pick a clip from the library"}</span></div>}
      <div style={{ display: "flex", gap: 8 }}>
        <select className="st-input" style={{ minHeight: 32, fontSize: 13 }} value={id ?? ""} onChange={(e) => updateAttributes({ clipId: e.target.value || null, caption: (lib.data ?? []).find((c) => c.id === e.target.value)?.caption ?? "" })} aria-label="Choose clip">
          <option value="">{lib.isLoading ? "Loading clips…" : (lib.data ?? []).length ? "Choose a clip…" : "No clips yet — upload in Clips & media"}</option>
          {(lib.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.caption || "(no caption)"}{c.duration_seconds ? ` · ${fmtDur(c.duration_seconds)}` : ""}</option>)}
        </select>
        <button type="button" onClick={deleteNode} style={{ border: 0, background: "none", color: C.MUTED, fontSize: 12 }}>Remove</button>
      </div>
    </NodeViewWrapper>
  );
}
const Clip = Node.create({
  name: "clip", group: "block", atom: true,
  addAttributes() { return { clipId: { default: null }, caption: { default: "" } }; },
  parseHTML() { return [{ tag: "div[data-clip]" }]; },
  renderHTML({ HTMLAttributes }) { return ["div", mergeAttributes(HTMLAttributes, { "data-clip": "", class: "pc-clip" })]; },
  addNodeView() { return ReactNodeViewRenderer(ClipView); },
});

/* ---------- insert menu ---------- */

const ITEMS = [
  { key: "heading", label: "Section heading", desc: "Breaks the piece into parts", icon: Heading2 },
  { key: "scripture", label: "Scripture", desc: "Reference and passage, styled", icon: BookOpen },
  { key: "goDeeper", label: "Go deeper", desc: "Card linking to the teaching or podcast", icon: ArrowUpRight },
  { key: "pullQuote", label: "Pull quote", desc: "Large line that stops the scroll", icon: Quote },
  { key: "image", label: "Image", desc: "Full width or inline, with caption", icon: ImageIcon },
  { key: "clip", label: "Clip", desc: "Vertical video from the clips library", icon: Film },
] as const;

const EDITOR_CSS = `
.sb-wrap{position:relative;}
.sb-wrap .ProseMirror{min-height:240px;}
.sb-wrap .ProseMirror p.is-empty::before{content:attr(data-placeholder);color:#A19E94;float:left;height:0;pointer-events:none;}
.sb-wrap .ProseMirror-selectednode{outline:2px solid ${C.INK};outline-offset:4px;border-radius:10px;}
.sb-refin{border:0;background:transparent;padding:0;width:100%;font:inherit;letter-spacing:inherit;text-transform:uppercase;color:#5F5D55;outline:none;}
.sb-figbar{display:flex;gap:8px;align-items:center;margin-top:8px;}
.sb-figbar input{flex:1;border:0;border-bottom:1px solid ${C.LINE};padding:6px 0;font-size:13px;color:#5F5D55;outline:none;font-family:inherit;background:transparent;}
.sb-figbar button{border:1px solid ${C.LINE};background:#fff;border-radius:999px;padding:4px 10px;font-size:12px;color:${C.INK};display:inline-flex;align-items:center;}
.sb-select{min-height:34px;border:1px solid ${C.LINE};border-radius:8px;padding:0 10px;font-size:13.5px;font-family:inherit;color:${C.INK};background:#fff;max-width:100%;}
.sb-bubble{display:flex;align-items:center;gap:2px;padding:4px;border-radius:10px;background:${C.INK};box-shadow:0 8px 20px rgba(24,26,77,.25);}
.sb-bubble button{width:34px;height:32px;border-radius:7px;border:0;background:transparent;color:#fff;font-size:13.5px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;font-family:'Instrument Sans',sans-serif;}
.sb-bubble button:hover,.sb-bubble button.on{background:rgba(255,255,255,.14);}
.sb-bubble .dv{width:1px;height:20px;background:rgba(255,255,255,.25);margin:0 3px;}
.sb-plus{position:absolute;left:-46px;width:30px;height:30px;border-radius:99px;background:${C.INK};border:0;display:flex;align-items:center;justify-content:center;color:#fff;}
`;

export function BlockEditor({ value, onChange, pieces = [], placeholder = "Type / for blocks", minHeight }: { value: DocNode; onChange: (doc: DocNode) => void; pieces?: DeeperOption[]; placeholder?: string; minHeight?: number }) {
  const piecesRef = useRef(pieces);
  piecesRef.current = pieces;
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [sel, setSel] = useState(0);
  const [plusY, setPlusY] = useState<number | null>(null);
  const menuRef = useRef(menu);
  menuRef.current = menu;

  const openMenuAtCaret = (ed: Editor) => {
    const wrap = wrapRef.current; if (!wrap) return;
    const c = ed.view.coordsAtPos(ed.state.selection.from);
    const r = wrap.getBoundingClientRect();
    setSel(0);
    setMenu({ x: Math.max(0, c.left - r.left), y: c.bottom - r.top + 6 });
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, italic: false, strike: false, code: false, codeBlock: false, link: { openOnClick: false, autolink: true } } as any),
      Placeholder.configure({ placeholder, showOnlyCurrent: true }),
      Scripture, PullQuote, Figure, Clip,
      GoDeeper.configure({ getPieces: () => piecesRef.current }),
    ],
    content: value as any,
    editorProps: {
      attributes: { class: "pc-body", style: `margin-top:0;${minHeight ? `min-height:${minHeight}px` : ""}` },
      handleKeyDown: (view, e) => {
        if (menuRef.current) {
          if (e.key === "ArrowDown") { setSel((s) => (s + 1) % ITEMS.length); return true; }
          if (e.key === "ArrowUp") { setSel((s) => (s - 1 + ITEMS.length) % ITEMS.length); return true; }
          if (e.key === "Enter") { document.dispatchEvent(new CustomEvent("sb-pick")); return true; }
          if (e.key === "Escape") { setMenu(null); return true; }
          setMenu(null);
        }
        if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
          const { $from } = view.state.selection;
          if ($from.parent.type.name === "paragraph" && $from.parent.textContent.trim() === "") {
            e.preventDefault();
            if (editorRef.current) openMenuAtCaret(editorRef.current);
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON() as DocNode),
    onSelectionUpdate: ({ editor }) => trackPlus(editor),
    onFocus: ({ editor }) => trackPlus(editor),
  });
  const editorRef = useRef<Editor | null>(null);
  editorRef.current = editor;

  function trackPlus(ed: Editor) {
    const wrap = wrapRef.current; if (!wrap) return;
    const { $from, empty } = ed.state.selection;
    if (empty && $from.parent.type.name === "paragraph" && $from.parent.content.size === 0) {
      const c = ed.view.coordsAtPos($from.pos);
      setPlusY(c.top - wrap.getBoundingClientRect().top + (c.bottom - c.top) / 2 - 15);
    } else setPlusY(null);
  }

  useEffect(() => {
    const h = (e: MouseEvent) => { if (menuRef.current && wrapRef.current && !(e.target as HTMLElement).closest(".sb-menu, .sb-plus")) setMenu(null); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const insert = (key: string) => {
    const ed = editor; if (!ed) return;
    setMenu(null);
    const { $from } = ed.state.selection;
    const emptyPara = $from.parent.type.name === "paragraph" && $from.parent.content.size === 0;
    const range = emptyPara ? { from: $from.before(), to: $from.after() } : null;
    const put = (node: any) => {
      const chain = ed.chain().focus();
      if (range) chain.insertContentAt(range, [node, { type: "paragraph" }]).run();
      else chain.insertContent([node, { type: "paragraph" }]).run();
    };
    if (key === "heading") { ed.chain().focus().setNode("heading", { level: 2 }).run(); return; }
    if (key === "pullQuote") { ed.chain().focus().setNode("pullQuote").run(); return; }
    if (key === "scripture") { ed.chain().focus().setNode("scripture").run(); return; }
    if (key === "goDeeper") return put({ type: "goDeeper" });
    if (key === "clip") return put({ type: "clip" });
    if (key === "image") { fileRef.current?.click(); return; }
  };
  const insertRef = useRef(insert);
  insertRef.current = insert;
  const selRef = useRef(sel);
  selRef.current = sel;
  useEffect(() => {
    const h = () => insertRef.current(ITEMS[selRef.current]!.key);
    document.addEventListener("sb-pick", h);
    return () => document.removeEventListener("sb-pick", h);
  }, []);

  const onFile = async (f: File | undefined) => {
    if (!f || !editor) return;
    try {
      const src = await uploadStudioPhoto(f);
      editor.chain().focus().insertContent([{ type: "figure", attrs: { src, caption: "", layout: "full" } }, { type: "paragraph" }]).run();
    } catch (e: any) { toast.error(e?.message ?? "Upload failed"); }
  };

  const setLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link address", prev ?? "https://");
    if (url === null) return;
    if (!url.trim()) editor.chain().focus().unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  return (
    <div className="sb-wrap" ref={wrapRef}>
      <style dangerouslySetInnerHTML={{ __html: PIECE_CSS + EDITOR_CSS }} />
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      {editor && (
        <BubbleMenu editor={editor} options={{ placement: "top" }} shouldShow={({ editor: ed, from, to }) => from !== to && !ed.isActive("figure") && !ed.isActive("goDeeper")}>
          <div className="sb-bubble" role="toolbar" aria-label="Formatting">
            <button type="button" className={editor.isActive("bold") ? "on" : ""} onClick={() => editor.chain().focus().toggleBold().run()} aria-label="Bold">B</button>
            <button type="button" className={editor.isActive("heading", { level: 2 }) ? "on" : ""} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
            <button type="button" className={editor.isActive("heading", { level: 3 }) ? "on" : ""} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
            <span className="dv" />
            <button type="button" className={editor.isActive("bulletList") ? "on" : ""} onClick={() => editor.chain().focus().toggleBulletList().run()} aria-label="Bulleted list"><List size={16} strokeWidth={1.7} /></button>
            <button type="button" className={editor.isActive("link") ? "on" : ""} onClick={setLink} aria-label="Link"><Link2 size={16} strokeWidth={1.7} /></button>
            <button type="button" className={editor.isActive("pullQuote") ? "on" : ""} onClick={() => editor.isActive("pullQuote") ? editor.chain().focus().setParagraph().run() : editor.chain().focus().setNode("pullQuote").run()} aria-label="Pull quote"><Quote size={16} strokeWidth={1.7} /></button>
          </div>
        </BubbleMenu>
      )}
      {plusY != null && !menu && (
        <button type="button" className="sb-plus" style={{ top: plusY }} aria-label="Insert block" onMouseDown={(e) => { e.preventDefault(); if (editor) openMenuAtCaret(editor); }}><Plus size={15} strokeWidth={2} /></button>
      )}
      <EditorContent editor={editor} />
      {menu && (
        <div className="st-pop sb-menu" style={{ left: menu.x, top: menu.y, width: 290 }} role="menu">
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", color: C.MUTED, padding: "4px 10px 8px" }}>INSERT BLOCK</div>
          {ITEMS.map((it, i) => {
            const Icon = it.icon;
            return (
              <button key={it.key} type="button" role="menuitem" className={`st-popitem${i === sel ? " sel" : ""}`} onMouseEnter={() => setSel(i)} onMouseDown={(e) => { e.preventDefault(); insert(it.key); }}>
                <span className="tile"><Icon size={16} strokeWidth={1.7} /></span>
                <span><span className="tt">{it.label}</span><span className="dd">{it.desc}</span></span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
