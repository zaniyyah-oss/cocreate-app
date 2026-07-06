import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchOgPreview } from "@/lib/og-preview.functions";
import { LinkCard } from "./link-card-node";
import { Indent } from "./indent-extension";

const URL_RE = /^https?:\/\/[^\s]+$/i;

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
    // Never sync while the user is actively typing — that would collapse the
    // selection to doc end (on mobile this looks like the cursor jumping to a
    // new line after dictation / IME composition ends).
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
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor, userId }: { editor: Editor; userId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const url = await uploadImage(f, userId);
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const btn = (label: string, onClick: () => void, active = false) => (
    <button
      type="button"
      className={`ws-tb-btn ${active ? "on" : ""}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
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

  return (
    <div className="ws-toolbar">
      {btn("B", () => editor.chain().focus().toggleBold().run(), editor.isActive("bold"))}
      {btn("I", () => editor.chain().focus().toggleItalic().run(), editor.isActive("italic"))}
      {btn("H2", () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive("heading", { level: 2 }))}
      {btn("H3", () => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive("heading", { level: 3 }))}
      {btn("• List", () => editor.chain().focus().toggleBulletList().run(), editor.isActive("bulletList"))}
      {btn("1. List", () => editor.chain().focus().toggleOrderedList().run(), editor.isActive("orderedList"))}
      {btn("“ Quote", () => editor.chain().focus().toggleBlockquote().run(), editor.isActive("blockquote"))}
      <button type="button" className="ws-tb-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => fileRef.current?.click()}>Image</button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
      <button type="button" className="ws-tb-btn" onMouseDown={(e) => e.preventDefault()} onClick={addLinkCard}>Link card</button>
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
    // Private bucket → long-lived signed URL (1 year)
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
  // Insert placeholder card first so UI is responsive
  const domain = safeDomain(url);
  const { state } = view;
  const schema = state.schema;
  const node = schema.nodes.linkCard.create({
    href: url, title: url, description: "", image: "", siteName: "", domain,
  });
  view.dispatch(state.tr.replaceSelectionWith(node));

  try {
    const preview = await fetchOgPreview({ data: { url } });
    // Find that placeholder in the doc (by href) and update its attrs
    const { state: s2 } = view;
    let pos: number | null = null;
    s2.doc.descendants((n: any, p: number) => {
      if (pos !== null) return false;
      if (n.type.name === "linkCard" && n.attrs.href === url && !n.attrs.title) { pos = p; return false; }
      // fall back to any linkCard matching href
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
