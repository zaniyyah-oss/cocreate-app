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
  value, onChange, onBlur, placeholder, className, storageKey, disabled, style,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef<string>("");
  const [focused, setFocused] = useState(false);

  // Sync incoming value into the DOM only when it differs from what the
  // editor currently shows (prevents caret jumps while typing).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (value !== el.innerHTML && value !== lastValueRef.current) {
      el.innerHTML = value ?? "";
      lastValueRef.current = value ?? "";
    }
  }, [value]);

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

  const exec = (cmd: string) => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    try { document.execCommand(cmd, false); } catch { /* ignore */ }
    const html = el.innerHTML;
    lastValueRef.current = html;
    onChange(html);
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
            // Remove the marker characters, then convert the (now empty)
            // line into a list.
            const delRange = document.createRange();
            delRange.setStart(node, 0);
            delRange.setEnd(node, range.startOffset);
            delRange.deleteContents();
            try { document.execCommand(cmd, false); } catch { /* ignore */ }
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
        onFocus={() => setFocused(true)}
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
