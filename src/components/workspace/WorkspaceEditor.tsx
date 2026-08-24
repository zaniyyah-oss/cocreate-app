import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Highlight } from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchOgPreview } from "@/lib/og-preview.functions";
import { LinkCard } from "./link-card-node";
import { Indent } from "./indent-extension";
import { Callout } from "./callout-node";
import { WORKSPACE_EDITOR_CSS } from "./editor-css";

/** Inject the shared note styling once, so every surface renders notes alike. */
function useWorkspaceEditorCss() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById("ws-editor-css")) return;
    const tag = document.createElement("style");
    tag.id = "ws-editor-css";
    tag.textContent = WORKSPACE_EDITOR_CSS;
    document.head.appendChild(tag);
  }, []);
}

const URL_RE = /^https?:\/\/[^\s]+$/i;

// Curated palette for text color + highlight. Cream palette-friendly.
const TEXT_COLORS = [
  { name: "Default", value: "" },
  { name: "Navy", value: "#181A4D" },
  { name: "Fire", value: "#FF340C" },
  { name: "Teal", value: "#0F4A42" },
  { name: "Burgundy", value: "#441B07" },
  { name: "Amber", value: "#B87500" },
  { name: "Muted", value: "#8A8678" },
];
const HIGHLIGHT_COLORS = [
  { name: "None", value: "" },
  { name: "Yellow", value: "#FDE68A" },
  { name: "Lime", value: "#DCE07A" },
  { name: "Peach", value: "#FFD3B6" },
  { name: "Blush", value: "#F4C2CD" },
  { name: "Sky", value: "#C7D8F5" },
  { name: "Mint", value: "#BEE3D4" },
];

// macOS vs everywhere else — used only for tooltip labels.
const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);
const mod = isMac ? "⌘" : "Ctrl";
const alt = isMac ? "⌥" : "Alt";
const shift = isMac ? "⇧" : "Shift";

export type WorkspaceEditorHandle = {
  getJSON: () => any;
  getText: () => string;
};

export function WorkspaceEditor({
  userId,
  initialJSON,
  onChange,
  onBlur,
  ignoreExternalUpdates = false,
  placeholder,
  editable = true,
}: {
  userId: string;
  initialJSON: any;
  onChange: (json: any, text: string, html: string) => void;
  onBlur?: () => void;
  ignoreExternalUpdates?: boolean;
  placeholder?: string;
  editable?: boolean;
}) {
  useWorkspaceEditorCss();

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onBlurRef = useRef(onBlur);
  onBlurRef.current = onBlur;

  const editorRef = useRef<Editor | null>(null);

  const editor = useEditor({

    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Image.configure({ inline: false, allowBase64: false, HTMLAttributes: { class: "ws-img" } }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { class: "ws-link" } }),
      LinkCard,
      Placeholder.configure({ placeholder: placeholder ?? "Write, paste a link, or drop in an image…" }),
      Indent,
      Table.configure({ resizable: true, HTMLAttributes: { class: "ws-table" } }),
      TableRow,
      TableHeader,
      TableCell,
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      Callout,
    ],
    content: initialJSON && Object.keys(initialJSON).length ? initialJSON : undefined,
    editorProps: {
      attributes: { class: "ws-editor-content" },
      handleKeyDown(view, event) {
        // Cmd/Ctrl + Shift + Backspace removes the whole table.
        if ((event.metaKey || event.ctrlKey) && event.shiftKey && (event.key === "Backspace" || event.key === "Delete")) {
          if (editorRef.current?.isActive("table")) {
            event.preventDefault();
            editorRef.current.chain().focus().deleteTable().run();
            return true;
          }
        }
        // Plain Backspace/Delete when a table (or all of its cells) is selected removes it.
        if (event.key === "Backspace" || event.key === "Delete") {
          const { state } = view;
          const sel = state.selection as unknown as {
            from: number; to: number; empty: boolean;
            node?: { type: { name: string } };
            $anchorCell?: unknown;
          };
          // Whole-table node selection
          if (sel.node?.type?.name === "table") {
            event.preventDefault();
            editorRef.current?.chain().focus().deleteTable().run();
            return true;
          }
          // Cell selection covering every cell in the table
          if (sel.$anchorCell !== undefined) {
            let tablePos: number | null = null;
            let tableNode: { nodeSize: number } | null = null;
            state.doc.nodesBetween(sel.from, sel.to, (node, pos) => {
              if (node.type.name === "table" && tablePos === null) {
                tablePos = pos;
                tableNode = node as unknown as { nodeSize: number };
              }
              return true;
            });
            if (tablePos === null) {
              // walk up from the selection to find the enclosing table
              const $from = state.doc.resolve(sel.from);
              for (let d = $from.depth; d > 0; d--) {
                if ($from.node(d).type.name === "table") {
                  tablePos = $from.before(d);
                  tableNode = $from.node(d) as unknown as { nodeSize: number };
                  break;
                }
              }
            }
            if (tablePos !== null && tableNode) {
              const start = tablePos as number;
              const end = start + (tableNode as { nodeSize: number }).nodeSize;
              // selection touches first and last cell => treat as "all selected"
              if (sel.from <= start + 3 && sel.to >= end - 3) {
                event.preventDefault();
                editorRef.current?.chain().focus().deleteTable().run();
                return true;
              }
            }
          }
        }
        return false;
      },

      handlePaste(view, event) {
        const text = event.clipboardData?.getData("text/plain")?.trim();

        if (text && URL_RE.test(text)) {
          event.preventDefault();
          insertLinkCard(view, text);
          return true;
        }
        const items = Array.from(event.clipboardData?.items ?? []);
        for (const item of items) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) {
              event.preventDefault();
              uploadAndInsertImage(view, file, userId);
              return true;
            }
          }
        }
        return false;
      },
      handleDrop(view, event) {
        const files = Array.from(event.dataTransfer?.files ?? []);
        const image = files.find((f) => f.type.startsWith("image/"));
        if (image) {
          event.preventDefault();
          uploadAndInsertImage(view, image, userId);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      onChangeRef.current(editor.getJSON(), editor.getText(), editor.getHTML());
    },
    onBlur: ({ editor }) => {
      // iOS home-screen Safari can commit the final autocorrect/composition
      // transaction at blur time. Capture the editor one last time, then ask
      // the parent to flush immediately instead of waiting on a debounce timer.
      onChangeRef.current(editor.getJSON(), editor.getText(), editor.getHTML());
      onBlurRef.current?.();
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (ignoreExternalUpdates) return;
    if (editor.isFocused) return;
    if (!initialJSON || !Object.keys(initialJSON).length) return;
    const current = editor.getJSON();
    if (JSON.stringify(current) !== JSON.stringify(initialJSON)) {
      editor.commands.setContent(initialJSON, { emitUpdate: false });
    }
  }, [editor, initialJSON, ignoreExternalUpdates]);

  useEffect(() => {
    if (!editor) return;
    if (editor.isEditable !== editable) editor.setEditable(editable);
  }, [editor, editable]);

  editorRef.current = editor;

  if (!editor) return null;


  return (
    <div className="ws-editor">
      {editable && <Toolbar editor={editor} userId={userId} />}
      {editable && (
        <BubbleMenu
          editor={editor}
          options={{ placement: "top" }}
          shouldShow={({ editor, from, to }) => !editor.isActive("image") && from !== to}
        >
          <MobileBubble editor={editor} />
        </BubbleMenu>
      )}
      <EditorContent editor={editor} />
      {editable && <TableDeleteButton editor={editor} />}
    </div>
  );
}

/** Floating "delete table" affordance shown whenever the caret sits in a table. */
function TableDeleteButton({ editor }: { editor: Editor }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const update = () => {
      if (!editor.isActive("table")) { setPos(null); return; }
      const wrap = editor.view.dom.closest(".ws-editor") as HTMLElement | null;
      const node = editor.view.domAtPos(editor.state.selection.from).node as Node;
      const el = (node.nodeType === 1 ? (node as HTMLElement) : node.parentElement) as HTMLElement | null;
      const table = el?.closest("table") as HTMLElement | null;
      if (!wrap || !table) { setPos(null); return; }
      const w = wrap.getBoundingClientRect();
      const t = table.getBoundingClientRect();
      setPos({ top: t.top - w.top - 12, left: t.right - w.left - 22 });
    };
    update();
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  if (!pos) return null;
  return (
    <button
      type="button"
      title="Delete table"
      aria-label="Delete table"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => editor.chain().focus().deleteTable().run()}
      style={{
        position: "absolute",
        top: pos.top,
        left: pos.left,
        width: 22,
        height: 22,
        borderRadius: 999,
        border: "1px solid rgba(24,26,77,0.15)",
        background: "#fff",
        color: "#181A4D",
        fontSize: 13,
        lineHeight: "20px",
        cursor: "pointer",
        boxShadow: "0 1px 4px rgba(24,26,77,0.18)",
        zIndex: 5,
      }}
    >
      ×
    </button>
  );
}


function MobileBubble({ editor }: { editor: Editor }) {
  // preventDefault on pointerdown (covers mouse + touch + pen) is required
  // to stop iOS Safari from collapsing the selection before onClick fires.
  const hold = (e: React.SyntheticEvent) => e.preventDefault();
  return (
    <div className="ws-bubble">
      <button type="button" className={`ws-bb-btn ${editor.isActive("bold") ? "on" : ""}`} onPointerDown={hold} onMouseDown={hold} onClick={() => editor.chain().focus().toggleBold().run()}>B</button>
      <button type="button" className={`ws-bb-btn ${editor.isActive("italic") ? "on" : ""}`} onPointerDown={hold} onMouseDown={hold} onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></button>
      <button type="button" className={`ws-bb-btn ${editor.isActive("highlight") ? "on" : ""}`} onPointerDown={hold} onMouseDown={hold} onClick={() => editor.chain().focus().toggleHighlight({ color: "#FDE68A" }).run()} title="Highlight">🖍</button>
      <button type="button" className={`ws-bb-btn ${editor.isActive("heading", { level: 2 }) ? "on" : ""}`} onPointerDown={hold} onMouseDown={hold} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
      <button type="button" className={`ws-bb-btn ${editor.isActive("bulletList") ? "on" : ""}`} onPointerDown={hold} onMouseDown={hold} onClick={() => editor.chain().focus().toggleBulletList().run()}>•</button>
      <button type="button" className={`ws-bb-btn ${editor.isActive("blockquote") ? "on" : ""}`} onPointerDown={hold} onMouseDown={hold} onClick={() => editor.chain().focus().toggleBlockquote().run()}>“”</button>
    </div>
  );
}

/* ── Toolbar icons ─────────────────────────────────────────────────── */
const I = {
  bold: <svg viewBox="0 0 24 24"><path d="M7 5h6.5a4 4 0 0 1 0 8H7z" /><path d="M7 13h7a4 4 0 0 1 0 8H7z" /></svg>,
  italic: <svg viewBox="0 0 24 24"><line x1="14" y1="4" x2="9" y2="20" /><line x1="6" y1="20" x2="10" y2="20" /><line x1="13" y1="4" x2="17" y2="4" /></svg>,
  underline: <svg viewBox="0 0 24 24"><path d="M6 4v7a6 6 0 0 0 12 0V4" /><line x1="5" y1="20" x2="19" y2="20" /></svg>,
  bullet: <svg viewBox="0 0 24 24"><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /><line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" /></svg>,
  ordered: <svg viewBox="0 0 24 24"><text x="1.5" y="8" fontSize="7" stroke="none" fill="currentColor">1</text><text x="1.5" y="14" fontSize="7" stroke="none" fill="currentColor">2</text><text x="1.5" y="20" fontSize="7" stroke="none" fill="currentColor">3</text><line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" /></svg>,
  quote: <svg viewBox="0 0 24 24"><path d="M7 8a3 3 0 0 0-3 3v2a2 2 0 0 0 2 2h2v-4H6a1 1 0 0 1 1-1z" /><path d="M16 8a3 3 0 0 0-3 3v2a2 2 0 0 0 2 2h2v-4h-2a1 1 0 0 1 1-1z" /></svg>,
  indent: <svg viewBox="0 0 24 24"><line x1="4" y1="6" x2="20" y2="6" /><line x1="10" y1="12" x2="20" y2="12" /><line x1="10" y1="18" x2="20" y2="18" /><polyline points="4 10 8 12 4 14" /></svg>,
  outdent: <svg viewBox="0 0 24 24"><line x1="4" y1="6" x2="20" y2="6" /><line x1="10" y1="12" x2="20" y2="12" /><line x1="10" y1="18" x2="20" y2="18" /><polyline points="8 10 4 12 8 14" /></svg>,
  divider: <svg viewBox="0 0 24 24"><line x1="4" y1="12" x2="20" y2="12" strokeDasharray="3 3" /></svg>,
  highlight: <svg viewBox="0 0 24 24"><path d="M9 11 15 5l4 4-6 6" /><path d="M9 11 5 15v4h4l4-4" /></svg>,
  textColor: <svg viewBox="0 0 24 24"><path d="M5 20 11 4h2l6 16" /><path d="M8 14h8" /></svg>,
  plus: <svg viewBox="0 0 24 24" style={{ width: 15, height: 15 }}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  chevron: <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9" /></svg>,
  callout: <svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3" /><line x1="4" y1="10" x2="20" y2="10" /></svg>,
  table: <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="9" y1="10" x2="9" y2="20" /></svg>,
  image: <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="M4 17l5-5 4 4 3-3 4 4" /></svg>,
  link: <svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" /></svg>,
};

function Toolbar({ editor, userId }: { editor: Editor; userId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<null | "heading" | "hl" | "color" | "insert">(null);

  // Toolbar sticks via CSS — no scroll-driven transforms (they caused
  // shimmering as the visual viewport updated).

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setMenu(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menu]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const url = await uploadImage(f, userId);
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const btn = (label: React.ReactNode, onClick: () => void, active = false, title?: string, extra?: React.ReactNode) => (
    <button
      type="button"
      className={`ws-tb-btn ${active ? "on" : ""}`}
      onPointerDown={(e) => e.preventDefault()}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      {label}
      {extra}
    </button>
  );

  const addLinkCard = async () => {
    const url = window.prompt("Paste a URL to add as a card:");
    if (!url) return;
    if (!URL_RE.test(url.trim())) {
      alert("Please enter a full URL starting with http(s)://");
      return;
    }
    await insertLinkCard(editor.view, url.trim());
  };

  const inTable = editor.isActive("table");
  const inCallout = editor.isActive("callout");
  const headingLevel = ([1, 2, 3] as const).find((l) => editor.isActive("heading", { level: l }));
  const headingLabel = headingLevel ? `Heading ${headingLevel}` : "Paragraph";
  const hlColor = (editor.getAttributes("highlight")?.color as string) || "transparent";
  const txColor = (editor.getAttributes("textStyle")?.color as string) || "#20201C";
  const toggle = (name: typeof menu) => setMenu((m) => (m === name ? null : name));

  return (
    <div className="ws-toolbar" ref={barRef}>
      <div className="ws-tbgroup">
        {btn(I.bold, () => editor.chain().focus().toggleBold().run(), editor.isActive("bold"), `Bold (${mod}+B)`)}
        {btn(I.italic, () => editor.chain().focus().toggleItalic().run(), editor.isActive("italic"), `Italic (${mod}+I)`)}
        {btn(I.underline, () => editor.chain().focus().toggleUnderline().run(), editor.isActive("underline"), `Underline (${mod}+U)`)}
      </div>

      <div className="ws-tbdiv" />

      <div className="ws-tbgroup">
        <button
          type="button"
          className={`ws-tb-dd ${menu === "heading" ? "on" : ""}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => toggle("heading")}
          title="Text style"
        >
          <span>{headingLabel}</span>
          {I.chevron}
        </button>
        {menu === "heading" && (
          <div className="ws-popover ws-popover-col" onMouseDown={(e) => e.preventDefault()}>
            {([1, 2, 3] as const).map((lvl) => (
              <button
                key={lvl}
                className="ws-popbtn"
                onClick={() => { editor.chain().focus().setHeading({ level: lvl }).run(); setMenu(null); }}
              >
                <span style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 900, fontSize: lvl === 1 ? 16 : lvl === 2 ? 14 : 12 }}>Heading {lvl}</span>
                <span className="ws-poptag">H{lvl}</span>
              </button>
            ))}
            <button className="ws-popbtn" onClick={() => { editor.chain().focus().setParagraph().run(); setMenu(null); }}>
              Paragraph<span className="ws-poptag">TXT</span>
            </button>
          </div>
        )}
      </div>

      <div className="ws-tbdiv" />

      <div className="ws-tbgroup">
        {btn(I.bullet, () => toggleListPreservingIndent(editor, "bulletList"), editor.isActive("bulletList"), `Bullet list (${mod}+${shift}+8)`)}
        {btn(I.ordered, () => toggleListPreservingIndent(editor, "orderedList"), editor.isActive("orderedList"), `Numbered list (${mod}+${shift}+7)`)}
        {btn(I.quote, () => editor.chain().focus().toggleBlockquote().run(), editor.isActive("blockquote"), `Quote (${mod}+${shift}+B)`)}
      </div>

      <div className="ws-tbdiv" />

      <div className="ws-tbgroup">
        {btn(I.indent, () => {
          if (editor.isActive("listItem") && editor.chain().focus().sinkListItem("listItem").run()) return;
          (editor.chain().focus() as any).indent().run();
        }, false, "Indent (Tab)")}
        {btn(I.outdent, () => {
          if (editor.isActive("listItem") && editor.chain().focus().liftListItem("listItem").run()) return;
          (editor.chain().focus() as any).outdent().run();
        }, false, "Outdent (Shift+Tab)")}
        {btn(I.divider, () => editor.chain().focus().setHorizontalRule().run(), false, "Divider")}
      </div>

      <div className="ws-tbdiv" />

      {/* Highlight */}
      <div className="ws-tbgroup">
        {btn(
          I.highlight,
          () => toggle("hl"),
          editor.isActive("highlight"),
          `Highlight (${mod}+${shift}+H)`,
          <span className="ws-tb-swatchbar" style={{ background: hlColor }} />
        )}
        {menu === "hl" && (
          <div className="ws-popover" onMouseDown={(e) => e.preventDefault()}>
            <p className="ws-popover-label">Highlight</p>
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.name}
                className="ws-swatch"
                title={c.name}
                style={{ background: c.value || "#fff", borderColor: c.value ? "transparent" : "rgba(32,32,28,0.35)", borderStyle: c.value ? "solid" : "dashed" }}
                onClick={() => {
                  const { empty, $from } = editor.state.selection;
                  let chain = editor.chain().focus();
                  if (empty) chain = chain.setTextSelection({ from: $from.start(), to: $from.end() });
                  if (!c.value) chain.unsetHighlight().run();
                  else chain.setHighlight({ color: c.value }).run();
                  setMenu(null);
                }}
              >
                {c.value ? "" : "✕"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Text color */}
      <div className="ws-tbgroup">
        {btn(
          I.textColor,
          () => toggle("color"),
          false,
          "Text color",
          <span className="ws-tb-swatchbar" style={{ background: txColor }} />
        )}
        {menu === "color" && (
          <div className="ws-popover" onMouseDown={(e) => e.preventDefault()}>
            <p className="ws-popover-label">Text color</p>
            {TEXT_COLORS.map((c) => (
              <button
                key={c.name}
                className="ws-swatch"
                title={c.name}
                style={{ background: c.value || "#fff", borderColor: c.value ? "transparent" : "rgba(32,32,28,0.35)", borderStyle: c.value ? "solid" : "dashed", color: "#20201C" }}
                onClick={() => {
                  if (!c.value) editor.chain().focus().unsetColor().run();
                  else editor.chain().focus().setColor(c.value).run();
                  setMenu(null);
                }}
              >
                {c.value ? "" : "✕"}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="ws-tbdiv" />

      {/* Insert */}
      <div className="ws-tbgroup">
        <button
          type="button"
          className={`ws-tb-dd ${menu === "insert" ? "on" : ""}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => toggle("insert")}
          title="Insert"
        >
          {I.plus}
          <span>Insert</span>
          {I.chevron}
        </button>
        {menu === "insert" && (
          <div className="ws-popover ws-popover-col" onMouseDown={(e) => e.preventDefault()}>
            {!inCallout && (
              <button className="ws-popbtn" onClick={() => { editor.chain().focus().toggleCallout().run(); setMenu(null); }}>{I.callout}Callout</button>
            )}
            {inCallout && <>
              {[
                { tone: "amber", label: "Amber callout", swatch: "#FFF4D6" },
                { tone: "teal", label: "Teal callout", swatch: "#E4F1EE" },
                { tone: "blush", label: "Blush callout", swatch: "#FBE3E9" },
                { tone: "lime", label: "Lime callout", swatch: "#F2F4C7" },
              ].map((t) => (
                <button
                  key={t.tone}
                  className="ws-popbtn"
                  onClick={() => { editor.chain().focus().updateAttributes("callout", { tone: t.tone }).run(); setMenu(null); }}
                >
                  <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: 3, background: t.swatch, border: "1px solid rgba(0,0,0,0.1)" }} />
                  {t.label}
                </button>
              ))}
              <button className="ws-popbtn" onClick={() => { editor.chain().focus().unsetCallout().run(); setMenu(null); }}>Remove callout</button>
            </>}

            {!inTable && (
              <button className="ws-popbtn" onClick={() => { editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); setMenu(null); }}>{I.table}Table</button>
            )}
            {inTable && <>
              <button className="ws-popbtn" onClick={() => editor.chain().focus().addRowAfter().run()}>{I.table}Row below</button>
              <button className="ws-popbtn" onClick={() => editor.chain().focus().addRowBefore().run()}>{I.table}Row above</button>
              <button className="ws-popbtn" onClick={() => editor.chain().focus().addColumnAfter().run()}>{I.table}Column right</button>
              <button className="ws-popbtn" onClick={() => editor.chain().focus().addColumnBefore().run()}>{I.table}Column left</button>
              <button className="ws-popbtn" onClick={() => editor.chain().focus().deleteRow().run()}>{I.table}Delete row</button>
              <button className="ws-popbtn" onClick={() => editor.chain().focus().deleteColumn().run()}>{I.table}Delete column</button>
              <button className="ws-popbtn" onClick={() => editor.chain().focus().toggleHeaderRow().run()}>{I.table}Toggle header row</button>
              <button className="ws-popbtn" onClick={() => { editor.chain().focus().deleteTable().run(); setMenu(null); }}>{I.table}Delete table</button>
            </>}

            <button className="ws-popbtn" onClick={() => { setMenu(null); fileRef.current?.click(); }}>{I.image}Image</button>
            <button className="ws-popbtn" onClick={() => { setMenu(null); addLinkCard(); }}>{I.link}Link card</button>
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
    </div>
  );
}


async function uploadImage(file: File, userId: string): Promise<string | null> {
  try {
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("workspace-media")
      .upload(path, file, { upsert: false, contentType: file.type });
    if (upErr) throw upErr;
    const { data, error } = await supabase.storage
      .from("workspace-media")
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    if (error || !data) throw error ?? new Error("Failed to sign URL");
    return data.signedUrl;
  } catch (e) {
    console.error("workspace image upload failed", e);
    alert("Image upload failed. Please try again.");
    return null;
  }
}

async function uploadAndInsertImage(view: any, file: File, userId: string) {
  const url = await uploadImage(file, userId);
  if (!url) return;
  const { state, dispatch } = view;
  const node = state.schema.nodes.image.create({ src: url });
  dispatch(state.tr.replaceSelectionWith(node));
}

async function insertLinkCard(view: any, url: string) {
  const domain = safeDomain(url);
  const { state } = view;
  const schema = state.schema;
  const node = schema.nodes.linkCard.create({
    href: url, title: url, description: "", image: "", siteName: "", domain,
  });
  view.dispatch(state.tr.replaceSelectionWith(node));

  try {
    const preview = await fetchOgPreview({ data: { url } });
    const { state: s2 } = view;
    let pos: number | null = null;
    s2.doc.descendants((n: any, p: number) => {
      if (pos !== null) return false;
      if (n.type.name === "linkCard" && n.attrs.href === url && !n.attrs.title) { pos = p; return false; }
      if (n.type.name === "linkCard" && n.attrs.href === url && pos === null) { pos = p; }
      return true;
    });
    if (pos !== null) {
      const attrs = {
        href: preview.url,
        title: preview.title ?? url,
        description: preview.description ?? "",
        image: preview.image ?? "",
        siteName: preview.siteName ?? "",
        domain: preview.domain,
      };
      view.dispatch(s2.tr.setNodeMarkup(pos, undefined, attrs));
    }
  } catch (e) {
    console.warn("OG preview fetch failed", e);
  }
}

function safeDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

/**
 * Toggle bullet/ordered list while preserving the indent level of the
 * paragraph the cursor is currently in. When wrapping, transfer the
 * paragraph's `indent` onto the new list wrapper and reset it on the
 * paragraph so the bullet sits at the same indent the user was typing at.
 */
function toggleListPreservingIndent(editor: Editor, listType: "bulletList" | "orderedList") {
  const wasActive = editor.isActive(listType);
  // Grab current block indent before toggling.
  const $from = editor.state.selection.$from;
  let blockIndent = 0;
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    if (["paragraph", "heading"].includes(node.type.name)) {
      blockIndent = Number(node.attrs.indent) || 0;
      break;
    }
  }

  const command = listType === "bulletList"
    ? editor.chain().focus().toggleBulletList()
    : editor.chain().focus().toggleOrderedList();
  command.run();

  if (wasActive || blockIndent <= 0) return;

  // After toggling into a list, find the newly-wrapped list ancestor and
  // move the indent from the inner paragraph onto the list wrapper.
  const { state, view } = editor;
  const $pos = state.selection.$from;
  let listPos: number | null = null;
  let listNode: any = null;
  for (let d = $pos.depth; d > 0; d--) {
    const node = $pos.node(d);
    if (node.type.name === listType) {
      listPos = $pos.before(d);
      listNode = node;
      break;
    }
  }
  if (listPos === null || !listNode) return;
  const tr = state.tr.setNodeMarkup(listPos, undefined, { ...listNode.attrs, indent: blockIndent });
  // Reset indent on the paragraph inside the current list item.
  for (let d = $pos.depth; d > 0; d--) {
    const node = $pos.node(d);
    if (node.type.name === "paragraph") {
      const pPos = $pos.before(d);
      tr.setNodeMarkup(pPos, undefined, { ...node.attrs, indent: 0 });
      break;
    }
  }
  view.dispatch(tr);
}

