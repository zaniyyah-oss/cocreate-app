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
  placeholder,
}: {
  userId: string;
  initialJSON: any;
  onChange: (json: any, text: string) => void;
  placeholder?: string;
}) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
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
      onChangeRef.current(editor.getJSON(), editor.getText());
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.isFocused) return;
    if (!initialJSON || !Object.keys(initialJSON).length) return;
    const current = editor.getJSON();
    if (JSON.stringify(current) !== JSON.stringify(initialJSON)) {
      editor.commands.setContent(initialJSON, { emitUpdate: false });
    }
  }, [editor, initialJSON]);

  if (!editor) return null;

  return (
    <div className="ws-editor">
      <Toolbar editor={editor} userId={userId} />
      <BubbleMenu
        editor={editor}
        options={{ placement: "top" }}
        shouldShow={({ editor, from, to }) => !editor.isActive("image") && from !== to}
      >
        <MobileBubble editor={editor} />
      </BubbleMenu>
      <EditorContent editor={editor} />
    </div>
  );
}

function MobileBubble({ editor }: { editor: Editor }) {
  return (
    <div className="ws-bubble">
      <button className={`ws-bb-btn ${editor.isActive("bold") ? "on" : ""}`} onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleBold().run()}>B</button>
      <button className={`ws-bb-btn ${editor.isActive("italic") ? "on" : ""}`} onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></button>
      <button className={`ws-bb-btn ${editor.isActive("highlight") ? "on" : ""}`} onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleHighlight({ color: "#FDE68A" }).run()} title="Highlight">🖍</button>
      <button className={`ws-bb-btn ${editor.isActive("heading", { level: 2 }) ? "on" : ""}`} onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
      <button className={`ws-bb-btn ${editor.isActive("bulletList") ? "on" : ""}`} onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleBulletList().run()}>•</button>
      <button className={`ws-bb-btn ${editor.isActive("blockquote") ? "on" : ""}`} onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleBlockquote().run()}>“”</button>
    </div>
  );
}

function Toolbar({ editor, userId }: { editor: Editor; userId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [colorOpen, setColorOpen] = useState(false);
  const [hlOpen, setHlOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);

  // Toolbar sticks via CSS — no scroll-driven transforms (they caused
  // shimmering as the visual viewport updated).


  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const url = await uploadImage(f, userId);
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const btn = (label: React.ReactNode, onClick: () => void, active = false, title?: string) => (
    <button
      type="button"
      className={`ws-tb-btn ${active ? "on" : ""}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      {label}
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

  return (
    <div className="ws-toolbar" ref={barRef}>
      {btn("B", () => editor.chain().focus().toggleBold().run(), editor.isActive("bold"), `Bold (${mod}+B)`)}
      {btn(<i>I</i>, () => editor.chain().focus().toggleItalic().run(), editor.isActive("italic"), `Italic (${mod}+I)`)}
      {btn("H2", () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive("heading", { level: 2 }), `Heading 2 (${mod}+${alt}+2)`)}
      {btn("H3", () => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive("heading", { level: 3 }), `Heading 3 (${mod}+${alt}+3)`)}
      {btn("• List", () => editor.chain().focus().toggleBulletList().run(), editor.isActive("bulletList"), `Bullet list (${mod}+${shift}+8)`)}
      {btn("1. List", () => editor.chain().focus().toggleOrderedList().run(), editor.isActive("orderedList"), `Numbered list (${mod}+${shift}+7)`)}
      {btn("“ Quote", () => editor.chain().focus().toggleBlockquote().run(), editor.isActive("blockquote"), `Quote (${mod}+${shift}+B)`)}

      {/* Highlight picker */}
      <div style={{ position: "relative" }}>
        {btn(
          <span style={{ background: "#FDE68A", padding: "0 4px", borderRadius: 3 }}>H</span>,
          () => { setHlOpen((v) => !v); setColorOpen(false); setTableOpen(false); },
          editor.isActive("highlight"),
          `Highlight (${mod}+${shift}+H)`
        )}
        {hlOpen && (
          <div className="ws-popover" onMouseDown={(e) => e.preventDefault()}>
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.name}
                className="ws-swatch"
                title={c.name}
                style={{ background: c.value || "transparent", border: c.value ? "1px solid rgba(0,0,0,0.08)" : "1px dashed rgba(0,0,0,0.25)" }}
                onClick={() => {
                  if (!c.value) editor.chain().focus().unsetHighlight().run();
                  else editor.chain().focus().setHighlight({ color: c.value }).run();
                  setHlOpen(false);
                }}
              >
                {c.value ? "" : "×"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Text color picker */}
      <div style={{ position: "relative" }}>
        {btn(
          <span style={{ color: "#FF340C", fontWeight: 700 }}>A</span>,
          () => { setColorOpen((v) => !v); setHlOpen(false); setTableOpen(false); },
          false,
          "Text color"
        )}
        {colorOpen && (
          <div className="ws-popover" onMouseDown={(e) => e.preventDefault()}>
            {TEXT_COLORS.map((c) => (
              <button
                key={c.name}
                className="ws-swatch"
                title={c.name}
                style={{ background: c.value || "transparent", border: c.value ? "1px solid rgba(0,0,0,0.08)" : "1px dashed rgba(0,0,0,0.25)", color: c.value ? "#fff" : "#20201C" }}
                onClick={() => {
                  if (!c.value) editor.chain().focus().unsetColor().run();
                  else editor.chain().focus().setColor(c.value).run();
                  setColorOpen(false);
                }}
              >
                {c.value ? "" : "×"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Callout */}
      {btn("💡 Callout", () => editor.chain().focus().toggleCallout().run(), editor.isActive("callout"), `Callout (${mod}+${shift}+C)`)}

      {/* Table */}
      <div style={{ position: "relative" }}>
        {btn("▦ Table", () => setTableOpen((v) => !v), inTable, "Table")}
        {tableOpen && (
          <div className="ws-popover ws-popover-col" onMouseDown={(e) => e.preventDefault()}>
            {!inTable && (
              <button className="ws-popbtn" onClick={() => { editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); setTableOpen(false); }}>Insert 3×3 table</button>
            )}
            {inTable && <>
              <button className="ws-popbtn" onClick={() => editor.chain().focus().addRowBefore().run()}>Row above</button>
              <button className="ws-popbtn" onClick={() => editor.chain().focus().addRowAfter().run()}>Row below</button>
              <button className="ws-popbtn" onClick={() => editor.chain().focus().addColumnBefore().run()}>Column left</button>
              <button className="ws-popbtn" onClick={() => editor.chain().focus().addColumnAfter().run()}>Column right</button>
              <button className="ws-popbtn" onClick={() => editor.chain().focus().deleteRow().run()}>Delete row</button>
              <button className="ws-popbtn" onClick={() => editor.chain().focus().deleteColumn().run()}>Delete column</button>
              <button className="ws-popbtn" onClick={() => editor.chain().focus().toggleHeaderRow().run()}>Toggle header row</button>
              <button className="ws-popbtn" onClick={() => { editor.chain().focus().deleteTable().run(); setTableOpen(false); }}>Delete table</button>
            </>}
          </div>
        )}
      </div>

      <button type="button" className="ws-tb-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => fileRef.current?.click()} title="Insert image">Image</button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
      <button type="button" className="ws-tb-btn" onMouseDown={(e) => e.preventDefault()} onClick={addLinkCard} title="Add link card">Link card</button>
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
