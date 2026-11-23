import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronUp, ChevronDown, X, Volume2, VolumeX } from "lucide-react";
import { loadClips, fmtDur, type PublicClip } from "@/lib/clips";
import { pieceRoute, kindLabel } from "@/lib/content-pages";

const CSS = `
.vc{position:relative;width:100%;aspect-ratio:9/16;border-radius:12px;overflow:hidden;background:#0E1030;}
.vc video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;}
.vc .mute{position:absolute;right:10px;bottom:10px;display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border-radius:999px;border:0;background:rgba(0,0,0,.55);color:#fff;font-size:12px;font-weight:600;cursor:pointer;}
.vc-empty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#C9C6BE;font-size:13px;}
.vc-src{display:inline-block;margin-top:8px;font-size:13.5px;font-weight:600;color:var(--ink,#181A4D);}
.vco{position:fixed;inset:0;z-index:1000;background:rgba(10,12,32,.92);display:flex;align-items:center;justify-content:center;gap:20px;}
.vco .col{width:min(400px,calc((100vh - 160px) * 9 / 16));display:flex;flex-direction:column;gap:12px;}
.vco .cap{color:#fff;font-size:15px;line-height:1.45;}
.vco .cap .vc-src{color:#fff;text-decoration:underline;text-underline-offset:3px;}
.vco .nav{display:flex;flex-direction:column;gap:10px;}
.vco button.ic{width:44px;height:44px;border-radius:999px;border:0;background:rgba(255,255,255,.14);color:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;}
.vco button.ic:disabled{opacity:.3;cursor:default;}
.vco .close{position:absolute;top:16px;right:16px;}
.vco .count{color:rgba(255,255,255,.7);font-size:12px;}
@media(max-width:760px){
 .vco{gap:0;}
 .vco .col{width:100vw;height:100vh;position:relative;}
 .vco .vc{position:absolute;inset:0;aspect-ratio:auto;border-radius:0;}
 .vco .cap{position:absolute;left:16px;right:72px;bottom:28px;text-shadow:0 1px 6px rgba(0,0,0,.6);}
 .vco .nav{display:none;}
}
.vc-tiles{display:flex;gap:16px;overflow-x:auto;padding-bottom:6px;}
.vc-tile{width:200px;flex:none;border:0;padding:0;background:none;text-align:left;cursor:pointer;}
.vc-tile .im{position:relative;aspect-ratio:9/16;border-radius:10px;overflow:hidden;background:#E9E6DF;}
.vc-tile img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
.vc-tile .du{position:absolute;top:10px;left:10px;background:rgba(0,0,0,.45);color:#fff;font-size:11.5px;font-weight:600;border-radius:999px;padding:3px 8px;}
.vc-tile .tt{position:absolute;left:12px;right:12px;bottom:12px;color:#fff;font-family:Poppins,sans-serif;font-size:14px;font-weight:600;line-height:1.3;}
.vc-tile .sh{position:absolute;inset:0;background:linear-gradient(180deg,transparent 50%,rgba(10,14,36,.75));}
@media(max-width:760px){.vc-tile{width:150px;}}
`;
export const CLIP_CSS = CSS;

function SourceLink({ c }: { c: PublicClip }) {
  if (!c.source) return null;
  const word = c.source.kind === "teaching" ? "teaching" : kindLabel(c.source.kind).toLowerCase();
  return (
    <Link to={pieceRoute(c.source.kind)} params={{ id: c.source.id }} hash={c.sourceSeconds ? `t=${c.sourceSeconds}` : undefined} className="vc-src">
      {c.sourceSeconds ? `Watch the full ${word} from ${fmtDur(c.sourceSeconds)}` : `Watch the full ${word}`}
    </Link>
  );
}

/** The one vertical player: muted autoplay, tap to unmute. */
export function VerticalClip({ clip, autoPlay = true }: { clip: PublicClip; autoPlay?: boolean }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [muted, setMuted] = useState(true);
  useEffect(() => { setMuted(true); }, [clip.id]);
  return (
    <div className="vc">
      {clip.videoUrl ? (
        <video ref={ref} key={clip.id} src={clip.videoUrl} poster={clip.posterUrl ?? undefined} muted={muted} autoPlay={autoPlay} loop playsInline preload="metadata" aria-label={clip.alt || clip.caption}
          onClick={() => { const v = ref.current; if (!v) return; if (muted) setMuted(false); else if (v.paused) void v.play(); else v.pause(); }} />
      ) : <div className="vc-empty">Video unavailable</div>}
      {clip.videoUrl && <button type="button" className="mute" onClick={() => setMuted((m) => !m)} aria-label={muted ? "Unmute" : "Mute"}>{muted ? <VolumeX size={14} /> : <Volume2 size={14} />}{muted ? "Tap to unmute" : "Sound on"}</button>}
    </div>
  );
}

export function ClipOverlay({ clips, index, onIndex, onClose }: { clips: PublicClip[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const c = clips[index];
  const touch = useRef<number | null>(null);
  const go = (d: number) => { const j = index + d; if (j >= 0 && j < clips.length) onIndex(j); };
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown" || e.key === "ArrowRight") go(1);
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", h);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = prev; };
  });
  if (!c || typeof document === "undefined") return null;
  return createPortal(
    <div className="vco" role="dialog" aria-modal="true" aria-label="Clip player"
      onTouchStart={(e) => { touch.current = e.touches[0]?.clientY ?? null; }}
      onTouchEnd={(e) => { const y0 = touch.current; const y1 = e.changedTouches[0]?.clientY; touch.current = null; if (y0 == null || y1 == null) return; if (y0 - y1 > 60) go(1); else if (y1 - y0 > 60) go(-1); }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <button type="button" className="ic close" onClick={onClose} aria-label="Close" style={{ zIndex: 2 }}><X size={20} /></button>
      <div className="col">
        <VerticalClip clip={c} />
        <div className="cap">
          <div>{c.caption}</div>
          <SourceLink c={c} />
          <div className="count" style={{ marginTop: 6 }}>{index + 1} of {clips.length}</div>
        </div>
      </div>
      <div className="nav">
        <button type="button" className="ic" onClick={() => go(-1)} disabled={index === 0} aria-label="Previous clip"><ChevronUp size={20} /></button>
        <button type="button" className="ic" onClick={() => go(1)} disabled={index === clips.length - 1} aria-label="Next clip"><ChevronDown size={20} /></button>
      </div>
    </div>,
    document.body,
  );
}

/** "Inside the series" tiles; clicking opens the vertical player. */
export function ClipTiles({ clips }: { clips: PublicClip[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="vc-tiles">
        {clips.map((c, i) => (
          <button key={c.id} type="button" className="vc-tile" onClick={() => setOpen(i)} aria-label={`Play clip: ${c.caption}`}>
            <div className="im">
              {c.posterUrl && <img src={c.posterUrl} alt={c.alt ?? ""} />}
              <div className="sh" />
              {c.duration ? <span className="du">{fmtDur(c.duration)}</span> : null}
              <span className="tt">{c.caption}</span>
            </div>
          </button>
        ))}
      </div>
      {open != null && <ClipOverlay clips={clips} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </>
  );
}

/** Clip block inside an article/devotional: same player inline, max 320px, centered. */
export function ClipEmbed({ clipId }: { clipId: string | null | undefined }) {
  const q = useQuery({ queryKey: ["clips", "one", clipId], enabled: !!clipId, staleTime: 5 * 60_000, queryFn: () => loadClips({ ids: [clipId!] }) });
  const c = q.data?.[0];
  if (!clipId || !c) return null;
  return (
    <figure style={{ margin: "28px auto", maxWidth: 320, width: "100%" }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <VerticalClip clip={c} autoPlay={false} />
      <figcaption style={{ marginTop: 10, fontSize: 14, lineHeight: 1.45, color: "var(--txt,#2A2B33)" }}>{c.caption}<br /><SourceLink c={c} /></figcaption>
    </figure>
  );
}
