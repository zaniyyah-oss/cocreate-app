import { useEffect, useRef, useState } from "react";
import { refreshWorkspaceImages, uploadWorkspaceImage } from "@/lib/workspace-images";

type Props = {
  value: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  storageKey?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  /** Show a "Photo" button that uploads and inlines an image. */
  allowImages?: boolean;
};

/**
 * Lightweight rich-text field with a small toolbar (Bold, Italic, Underline,
 * Bullet list, Numbered list). Stores content as HTML in the same string
 * column that previously held plain text — old plain-text values load fine
 * (they render as their own text). Height is persisted per storageKey the
 * same way ResizableTextarea persists it.
 */
export function RichTextField({
  value, onChange, onBlur, placeholder, className, storageKey, disabled, style, allowImages,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastValueRef = useRef<string>("");
  const [focused, setFocused] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);

  // Sync incoming value into the DOM only when it differs from what the
  // editor currently shows (prevents caret jumps while typing).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (value !== el.innerHTML && value !== lastValueRef.current) {
      el.innerHTML = value ?? "";
      lastValueRef.current = value ?? "";
      if (allowImages) void refreshWorkspaceImages(el);
    }
  }, [value, allowImages]);

  // Restore + persist height (same convention as ResizableTextarea).
  useEffect(() => {
    if (!storageKey) return;
    const el = ref.current;
    if (!el || typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(`de-h:${storageKey}`);
      if (saved) {
        const n = parseFloat(saved);
        if (Number.isFinite(n) && n > 20) el.style.height = `${n}px`;
      }
    } catch { /* ignore */ }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    const el = ref.current;
    if (!el || typeof window === "undefined" || typeof ResizeObserver === "undefined") return;
    let t: ReturnType<typeof setTimeout> | null = null;
    let last = el.getBoundingClientRect().height;
    const ro = new ResizeObserver(() => {
      const h = el.getBoundingClientRect().height;
      if (Math.abs(h - last) < 1) return;
      last = h;
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        try { window.localStorage.setItem(`de-h:${storageKey}`, String(Math.round(h))); } catch { /* ignore */ }
      }, 200);
    });
    ro.observe(el);
    return () => { ro.disconnect(); if (t) clearTimeout(t); };
  }, [storageKey]);

  const BLOCKS = new Set(["P", "DIV", "LI", "UL", "OL", "H1", "H2", "H3", "BLOCKQUOTE", "PRE"]);

  /** Nearest block ancestor of `node` inside the editor. */
  const blockOf = (editor: HTMLElement, node: Node): HTMLElement | null => {
    let p: Node | null = node;
    while (p && p !== editor) {
      if (p.nodeType === Node.ELEMENT_NODE && BLOCKS.has((p as HTMLElement).nodeName)) return p as HTMLElement;
      p = p.parentNode;
    }
    return null;
  };

  /**
   * Wrap every stray top-level inline run (text nodes / spans separated by
   * <br>) into its own <p>. Browsers otherwise apply list commands to the
   * nearest bare text run — which made the bullet appear on the line above.
   * Existing nodes are moved, never cloned, so the caret's node survives.
   */
  const normalizeBlocks = (editor: HTMLElement) => {
    const kids = Array.from(editor.childNodes);
    let run: ChildNode[] = [];
    const flush = (before: ChildNode | null) => {
      if (run.length === 0) return;
      const p = document.createElement("p");
      editor.insertBefore(p, before);
      run.forEach((n) => p.appendChild(n));
      if (!p.firstChild) p.appendChild(document.createElement("br"));
      run = [];
    };
    for (const n of kids) {
      const isBlock = n.nodeType === Node.ELEMENT_NODE && BLOCKS.has(n.nodeName);
      if (isBlock) { flush(n); continue; }
      if (n.nodeName === "BR") { flush(n); editor.removeChild(n); continue; }
      run.push(n);
    }
    flush(null);
  };

  /** Turn a single block element into a list item, merging with an adjacent
   *  list of the same type when there is one. */
  const toList = (editor: HTMLElement, block: HTMLElement, ordered: boolean) => {
    const tag = ordered ? "OL" : "UL";
    const li = document.createElement("li");
    while (block.firstChild) li.appendChild(block.firstChild);
    const prev = block.previousElementSibling;
    const next = block.nextElementSibling;
    if (prev && prev.nodeName === tag) {
      prev.appendChild(li);
      if (next && next.nodeName === tag) {
        while (next.firstChild) prev.appendChild(next.firstChild);
        next.remove();
      }
      block.remove();
      return;
    }
    if (next && next.nodeName === tag) {
      next.insertBefore(li, next.firstChild);
      block.remove();
      return;
    }
    const list = document.createElement(ordered ? "ol" : "ul");
    list.appendChild(li);
    editor.replaceChild(list, block);
  };

  /** Pull a list item back out of its list, as a plain paragraph. */
  const unwrapListItem = (li: HTMLElement) => {
    const list = li.parentElement;
    if (!list) return;
    const p = document.createElement("p");
    while (li.firstChild) p.appendChild(li.firstChild);
    if (!p.firstChild) p.appendChild(document.createElement("br"));
    const before = Array.from(list.children).slice(0, Array.from(list.children).indexOf(li));
    const after = Array.from(list.children).slice(Array.from(list.children).indexOf(li) + 1);
    const parent = list.parentElement;
    if (!parent) return;
    parent.insertBefore(p, list.nextSibling);
    li.remove();
    if (after.length > 0) {
      const rest = document.createElement(list.nodeName.toLowerCase());
      after.forEach((n) => rest.appendChild(n));
      parent.insertBefore(rest, p.nextSibling);
    }
    if (before.length === 0) list.remove();
  };

  const exec = (cmd: string) => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    if (cmd === "insertUnorderedList" || cmd === "insertOrderedList") {
      const ordered = cmd === "insertOrderedList";
      const sel = window.getSelection();
      const r = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
      const node = r?.startContainer ?? null;
      const offset = r?.startOffset ?? 0;
      if (node && el.contains(node)) {
        let li: Node | null = node;
        while (li && li !== el && li.nodeName !== "LI") li = li.parentNode;
        if (li && li !== el) {
          const list = (li as HTMLElement).parentElement;
          if (list && ((list.nodeName === "OL") === ordered)) {
            unwrapListItem(li as HTMLElement); // toggle off
          } else if (list) {
            const swapped = document.createElement(ordered ? "ol" : "ul");
            while (list.firstChild) swapped.appendChild(list.firstChild);
            list.parentElement?.replaceChild(swapped, list);
          }
        } else {
          normalizeBlocks(el);
          const block = blockOf(el, node);
          if (block && block !== el) toList(el, block, ordered);
        }
        try { setCaret(node, Math.min(offset, node.nodeType === Node.TEXT_NODE ? (node.textContent ?? "").length : node.childNodes.length)); } catch { /* ignore */ }
      }
      const html0 = el.innerHTML;
      lastValueRef.current = html0;
      onChange(html0);
      return;
    }
    try { document.execCommand(cmd, false); } catch { /* ignore */ }
    const html = el.innerHTML;
    lastValueRef.current = html;
    onChange(html);
  };



  const setCaret = (node: Node, offset: number) => {
    const sel = window.getSelection();
    if (!sel) return;
    const r = document.createRange();
    r.setStart(node, offset);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
  };


  const insertImage = async (file: File) => {
    const el = ref.current;
    if (!el) return;
    setImgError(null);
    setUploading(true);
    try {
      const { path, url } = await uploadWorkspaceImage(file);
      const html = `<p><img src="${url}" data-ws-path="${path}" alt="" /></p><p><br/></p>`;
      el.focus();
      let inserted = false;
      try { inserted = document.execCommand("insertHTML", false, html); } catch { inserted = false; }
      if (!inserted) el.insertAdjacentHTML("beforeend", html);
      const next = el.innerHTML;
      lastValueRef.current = next;
      onChange(next);
    } catch (err) {
      setImgError(err instanceof Error ? err.message : "Couldn't add that photo.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`rtf-wrap ${className ?? ""}`} style={style}>
      <div className={`rtf-toolbar ${focused ? "is-visible" : ""}`} aria-hidden={!focused} onMouseDown={(e) => e.preventDefault()}>
        <button type="button" tabIndex={focused ? 0 : -1} className="rtf-btn" title="Bold" onClick={() => exec("bold")}><b>B</b></button>
        <button type="button" tabIndex={focused ? 0 : -1} className="rtf-btn" title="Italic" onClick={() => exec("italic")}><i>I</i></button>
        <button type="button" tabIndex={focused ? 0 : -1} className="rtf-btn" title="Underline" onClick={() => exec("underline")}><span style={{ textDecoration: "underline" }}>U</span></button>
        <span className="rtf-sep" />
        <button type="button" tabIndex={focused ? 0 : -1} className="rtf-btn" title="Bulleted list" onClick={() => exec("insertUnorderedList")}>•&nbsp;List</button>
        <button type="button" tabIndex={focused ? 0 : -1} className="rtf-btn" title="Numbered list" onClick={() => exec("insertOrderedList")}>1.&nbsp;List</button>
        {allowImages && (
          <>
            <span className="rtf-sep" />
            <button
              type="button"
              tabIndex={focused ? 0 : -1}
              className="rtf-btn"
              title="Add photo"
              disabled={uploading || disabled}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? "Uploading…" : "🖼 Photo"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void insertImage(f);
              }}
            />
            {imgError && <span className="rtf-err">{imgError}</span>}
          </>
        )}
      </div>
      <div
        ref={ref}
        className="rtf-editor"
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-placeholder={placeholder ?? ""}
        onKeyDown={(e) => {
          // Cmd/Ctrl formatting shortcuts (browsers already handle B/I/U on
          // contentEditable, but we handle explicitly so onChange fires with
          // the new HTML and behavior is consistent across platforms).
          if (e.metaKey || e.ctrlKey) {
            const k = e.key.toLowerCase();
            if (k === "b" || k === "i" || k === "u") {
              e.preventDefault();
              exec(k === "b" ? "bold" : k === "i" ? "italic" : "underline");
              return;
            }
          }
          // Backspace at the very start of a list item leaves the list
          // instead of merging into the line above.
          if (e.key === "Backspace") {
            const sel = window.getSelection();
            const editor = ref.current;
            if (!sel || !editor || sel.rangeCount === 0 || !sel.isCollapsed) return;
            const range = sel.getRangeAt(0);
            const node = range.startContainer;
            if (!editor.contains(node)) return;
            let li: Node | null = node;
            while (li && li !== editor && (li as HTMLElement).nodeName !== "LI") li = li.parentNode;
            if (!li || li === editor) return;
            // Is the caret at the very beginning of this <li>?
            const pre = document.createRange();
            pre.selectNodeContents(li);
            pre.setEnd(range.startContainer, range.startOffset);
            if (pre.toString().length > 0) return;
            e.preventDefault();
            unwrapListItem(li as HTMLElement);
            try { setCaret(node, Math.min(range.startOffset, node.nodeType === Node.TEXT_NODE ? (node.textContent ?? "").length : node.childNodes.length)); } catch { /* ignore */ }

            const html = editor.innerHTML;
            lastValueRef.current = html;
            onChange(html);
            return;
          }
          // Markdown-style list shortcuts on space: "-", "*", or "1." at the
          // very start of the current line converts it to a list.
          if (e.key === " ") {
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return;
            const range = sel.getRangeAt(0);
            const node = range.startContainer;
            if (node.nodeType !== Node.TEXT_NODE) return;
            const editor = ref.current;
            if (!editor || !editor.contains(node)) return;
            // Only trigger if we're inside the editor's plain content, not
            // already inside a list item.
            let p: Node | null = node;
            while (p && p !== editor) {
              const name = (p as HTMLElement).nodeName;
              if (name === "LI" || name === "UL" || name === "OL") return;
              p = p.parentNode;
            }
            const textBefore = (node.textContent ?? "").slice(0, range.startOffset);
            const trimmed = textBefore.replace(/\u00a0/g, " ");
            let cmd: "insertUnorderedList" | "insertOrderedList" | null = null;
            if (trimmed === "-" || trimmed === "*") cmd = "insertUnorderedList";
            else if (/^\d+\.$/.test(trimmed)) cmd = "insertOrderedList";
            if (!cmd) return;
            e.preventDefault();
            const offset = range.startOffset;
            // Give every line its own block first, then convert exactly that
            // block — execCommand alone bullets the nearest bare text run,
            // which is what put the bullet on the line above.
            normalizeBlocks(editor);
            const block = blockOf(editor, node);
            (node as Text).deleteData(0, offset);
            if (block && block !== editor) {
              toList(editor, block, cmd === "insertOrderedList");
              setCaret(node, 0);
            } else {
              setCaret(node, 0);
              try { document.execCommand(cmd, false); } catch { /* ignore */ }
            }
            const html = editor.innerHTML;
            lastValueRef.current = html;
            onChange(html);

          }
        }}

        onInput={(e) => {
          const html = (e.currentTarget as HTMLDivElement).innerHTML;
          lastValueRef.current = html;
          onChange(html);
        }}
        onFocus={() => {
          setFocused(true);
          // Enter should create real paragraphs so list commands stay scoped
          // to a single line.
          try { document.execCommand("defaultParagraphSeparator", false, "p"); } catch { /* ignore */ }
        }}

        onBlur={(e) => {
          // Keep toolbar visible if focus moved to a toolbar button.
          const next = e.relatedTarget as Node | null;
          const wrap = (e.currentTarget as HTMLElement).parentElement;
          if (!next || !wrap || !wrap.contains(next)) {
            setFocused(false);
          }
          onBlur?.();
        }}
      />
      <style dangerouslySetInnerHTML={{ __html: `
        .rtf-wrap{display:flex;flex-direction:column;gap:0;}
        .rtf-toolbar{display:flex;flex-wrap:wrap;gap:4px;align-items:center;max-height:0;opacity:0;overflow:hidden;pointer-events:none;transition:max-height .18s ease, opacity .18s ease, margin-bottom .18s ease;margin-bottom:0;}
        .rtf-toolbar.is-visible{max-height:60px;opacity:1;pointer-events:auto;margin-bottom:6px;}
        .rtf-btn{font-family:inherit;font-size:12px;line-height:1;padding:5px 9px;border-radius:6px;border:1px solid rgba(24,26,77,0.15);background:#fff;color:#181A4D;cursor:pointer;transition:background .12s ease;}
        .rtf-btn:hover{background:#FBF8ED;}
        .rtf-sep{width:1px;height:16px;background:rgba(24,26,77,0.15);margin:0 4px;}
        .rtf-editor{width:100%;min-height:96px;outline:none;font:inherit;color:inherit;line-height:1.5;padding:6px 0 9px;border-bottom:1px solid rgba(24,26,77,0.12);white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;resize:vertical;overflow:auto;}
        .rtf-editor:focus{border-bottom-color:#181A4D;}
        .rtf-editor:empty::before{content:attr(data-placeholder);color:#20201C;opacity:0.35;pointer-events:none;}
        .rtf-editor ul{list-style:disc;padding-left:22px;margin:4px 0;}
        .rtf-editor ol{list-style:decimal;padding-left:22px;margin:4px 0;}
        .rtf-editor p{margin:0 0 4px;}
        .rtf-editor img{max-width:100%;height:auto;border-radius:10px;margin:6px 0;display:block;}
        .rtf-err{font-size:11px;color:#b3261e;}
      ` }} />

    </div>
  );
}

/** Strip HTML tags for plain-text previews. */
export function stripHtml(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/<\s*br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
