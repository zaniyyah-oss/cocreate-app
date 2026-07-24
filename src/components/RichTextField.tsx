import { useEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  storageKey?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
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
      <div className="rtf-toolbar" onMouseDown={(e) => e.preventDefault()}>
        <button type="button" className="rtf-btn" title="Bold" onClick={() => exec("bold")}><b>B</b></button>
        <button type="button" className="rtf-btn" title="Italic" onClick={() => exec("italic")}><i>I</i></button>
        <button type="button" className="rtf-btn" title="Underline" onClick={() => exec("underline")}><span style={{ textDecoration: "underline" }}>U</span></button>
        <span className="rtf-sep" />
        <button type="button" className="rtf-btn" title="Bulleted list" onClick={() => exec("insertUnorderedList")}>•&nbsp;List</button>
        <button type="button" className="rtf-btn" title="Numbered list" onClick={() => exec("insertOrderedList")}>1.&nbsp;List</button>
      </div>
      <div
        ref={ref}
        className="rtf-editor"
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-placeholder={placeholder ?? ""}
        onInput={(e) => {
          const html = (e.currentTarget as HTMLDivElement).innerHTML;
          lastValueRef.current = html;
          onChange(html);
        }}
        onBlur={onBlur}
      />
      <style dangerouslySetInnerHTML={{ __html: `
        .rtf-wrap{display:flex;flex-direction:column;gap:6px;}
        .rtf-toolbar{display:flex;flex-wrap:wrap;gap:4px;align-items:center;}
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
