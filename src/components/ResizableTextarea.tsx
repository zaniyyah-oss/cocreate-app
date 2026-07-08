import { useEffect, useRef, type TextareaHTMLAttributes } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  storageKey: string;
};

/**
 * Textarea whose user-dragged height is persisted to localStorage per
 * storageKey (per-device, since mobile and desktop naturally have their own
 * stores). Restores on mount and saves on resize.
 */
export function ResizableTextarea({ storageKey, style, ...rest }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Restore saved height on mount / when the key changes.
  useEffect(() => {
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

  // Persist height whenever the user drags the resize handle.
  useEffect(() => {
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

  return <textarea ref={ref} style={style} {...rest} />;
}
