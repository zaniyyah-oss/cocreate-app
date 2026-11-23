import { useRef, useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { uploadStudioPhoto } from "@/lib/studio-data";
import { C } from "./ui";

const parse = (f: string | null | undefined) => {
  const m = /(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/.exec(f ?? "");
  return m ? { x: Number(m[1]), y: Number(m[2]) } : null;
};

function Frame({ src, ratio, label, focal, onFocal, width }: { src: string; ratio: string; label: string; focal: string | null; onFocal: (f: string) => void; width: number | string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState(false);
  const set = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100));
    onFocal(`${Math.round(x)}% ${Math.round(y)}%`);
  };
  const p = parse(focal);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, width }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: C.MUTED, display: "flex", justifyContent: "space-between" }}>{label}<span style={{ color: focal ? C.GREEN : "#8A4B00" }}>{focal ? "✓ Set" : "Click to set"}</span></span>
      <div ref={ref} role="button" aria-label={`${label} focal point`} tabIndex={0}
        onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); setDrag(true); set(e); }}
        onPointerMove={(e) => drag && set(e)} onPointerUp={() => setDrag(false)}
        style={{ position: "relative", aspectRatio: ratio, borderRadius: 8, overflow: "hidden", border: `1px solid ${C.LINE}`, cursor: "crosshair", touchAction: "none", background: "#E9E6DF" }}>
        <img src={src} alt="" draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: focal || "center", pointerEvents: "none" }} />
        {p && <span style={{ position: "absolute", left: `${p.x}%`, top: `${p.y}%`, width: 18, height: 18, marginLeft: -9, marginTop: -9, borderRadius: 99, border: "2px solid #fff", boxShadow: "0 0 0 1px rgba(0,0,0,.35)", pointerEvents: "none" }} />}
      </div>
    </div>
  );
}

/** Hero photo upload with two focal-point crop frames: desktop (wide) and mobile (4:5). */
export function HeroPhotoField({ url, fd, fm, onChange }: { url: string | null; fd: string | null; fm: string | null; onChange: (patch: { url?: string | null; fd?: string | null; fm?: string | null }) => void }) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    try { const u = await uploadStudioPhoto(f); onChange({ url: u, fd: null, fm: null }); }
    catch (e: any) { toast.error(e?.message ?? "Upload failed"); }
    finally { setBusy(false); }
  };
  return (
    <div className="st-field">
      <span className="st-label">Hero photo</span>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
      {url ? (
        <>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Frame src={url} ratio="16 / 7" label="Desktop" focal={fd} onFocal={(f) => onChange({ fd: f })} width="62%" />
            <Frame src={url} ratio="4 / 5" label="Mobile" focal={fm} onFocal={(f) => onChange({ fm: f })} width="38%" />
          </div>
          <span className="st-help">Click or drag on each frame to set what stays in view.</span>
          <div className="st-row" style={{ gap: 8 }}>
            <button type="button" className="st-btn sm" onClick={() => fileRef.current?.click()} disabled={busy}>{busy ? "Uploading…" : "Replace"}</button>
            <button type="button" className="st-btn sm danger" onClick={() => onChange({ url: null, fd: null, fm: null })}>Remove</button>
          </div>
        </>
      ) : (
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} style={{ border: "1px dashed #C9C6BE", borderRadius: 9, background: C.SOFT, minHeight: 72, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13.5, fontWeight: 600, color: C.INK }}>
          <ImageIcon size={17} strokeWidth={1.7} />{busy ? "Uploading…" : "Upload or choose a photo"}
        </button>
      )}
    </div>
  );
}

/** The large dashed hero slot inside the writing canvas. */
export function HeroSlot({ url, fd, onUpload }: { url: string | null; fd: string | null; onUpload: (u: string) => void }) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const go = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    try { onUpload(await uploadStudioPhoto(f)); } catch (e: any) { toast.error(e?.message ?? "Upload failed"); } finally { setBusy(false); }
  };
  if (url) return (
    <div className="pc-hero" style={{ cursor: "pointer" }} onClick={() => fileRef.current?.click()} title="Replace hero photo">
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { go(e.target.files?.[0]); e.target.value = ""; }} />
      <img src={url} alt="" style={{ objectPosition: fd || "center" }} />
    </div>
  );
  return (
    <div role="button" tabIndex={0} onClick={() => fileRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); go(e.dataTransfer.files?.[0]); }}
      style={{ marginTop: 26, borderRadius: 10, border: `2px dashed ${over ? C.INK : "#C9C6BE"}`, aspectRatio: "16 / 7", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: C.SOFT, cursor: "pointer" }}>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { go(e.target.files?.[0]); e.target.value = ""; }} />
      <ImageIcon size={26} strokeWidth={1.7} color={C.INK} />
      <span style={{ fontSize: 14, fontWeight: 600, color: C.INK }}>{busy ? "Uploading…" : "Add hero photo"}</span>
      <span style={{ fontSize: 12.5, color: C.MUTED }}>Drop an image or choose from the library</span>
    </div>
  );
}
