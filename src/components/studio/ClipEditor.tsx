import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { X, Upload, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStudioData } from "@/lib/studio-data";
import { CLIP_MAX_BYTES, CAPTION_MAX, fmtDur, parseStamp, uploadClipFile, grabFrame, useInvalidateClips, clipIsPublic, type StudioClip } from "@/lib/clips";
import { etToUtcISO, utcToEt } from "@/lib/et-time";
import { Btn, C } from "./ui";

const OK_TYPES = ["video/mp4", "video/quicktime"];

/** Earliest dated part of a series (or its month) — the default clip release. */
export function seriesStart(d: ReturnType<typeof useStudioData>["data"], seriesId: string | null): string | null {
  if (!d || !seriesId) return null;
  const s = d.series.find((x) => x.id === seriesId); if (!s) return null;
  const dates = s.items.flatMap((i) => {
    const p = d.pieces.find((x) => x.id === (i.content_id ?? i.template_id));
    return [p?.releaseAt ?? i.planned_at].filter(Boolean) as string[];
  }).sort();
  return dates[0] ?? (s.series_month ? etToUtcISO(s.series_month, "09:00") : null);
}

export function ClipEditor({ clip, defaultSeriesId, onClose }: { clip: StudioClip | null; defaultSeriesId?: string | null; onClose: () => void }) {
  const studio = useStudioData();
  const invalidate = useInvalidateClips();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const posterRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(clip?.duration_seconds ?? null);
  const [poster, setPoster] = useState<Blob | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(clip?.posterUrl ?? null);
  const [frameAt, setFrameAt] = useState(1);
  const [caption, setCaption] = useState(clip?.caption ?? "");
  const [seriesId, setSeriesId] = useState<string | null>(clip?.series_id ?? defaultSeriesId ?? null);
  const [sourceId, setSourceId] = useState<string | null>(clip?.source_content_id ?? null);
  const [stamp, setStamp] = useState(clip?.source_seconds != null ? fmtDur(clip.source_seconds) : "");
  const initialRel = clip?.release_at ?? null;
  const [relDate, setRelDate] = useState(initialRel ? utcToEt(initialRel).date : "");
  const [relTime, setRelTime] = useState(initialRel ? utcToEt(initialRel).time : "09:00");
  const [relTouched, setRelTouched] = useState(!!initialRel);
  const [alt, setAlt] = useState(clip?.alt_text ?? "");
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  // Default release = series start, until the user picks a date themselves.
  useEffect(() => {
    if (relTouched) return;
    const st = seriesStart(studio.data, seriesId);
    if (st) { const e = utcToEt(st); setRelDate(e.date); setRelTime(e.time); }
  }, [seriesId, studio.data, relTouched]);
  useEffect(() => () => { if (localUrl) URL.revokeObjectURL(localUrl); }, [localUrl]);

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (!OK_TYPES.includes(f.type) && !/\.(mp4|mov)$/i.test(f.name)) { toast.error("Use an .mp4 or .mov video"); return; }
    if (f.size > CLIP_MAX_BYTES) { toast.error("That video is over 200 MB"); return; }
    setFile(f); setPoster(null); setPosterPreview(null);
    setLocalUrl(URL.createObjectURL(f));
  };
  const onMeta = async () => {
    const v = videoRef.current; if (!v || !file) return;
    const d = Math.round(v.duration);
    setDuration(Number.isFinite(d) ? d : null);
    if (v.videoWidth > v.videoHeight) toast.message("This video is horizontal — clips look best vertical (9:16).");
    const at = Math.min(1, v.duration / 2);
    setFrameAt(at);
    try { const b = await grabFrame(v, at); setPoster(b); setPosterPreview(URL.createObjectURL(b)); } catch { /* leave without poster */ }
  };
  const useFrame = async () => {
    const v = videoRef.current; if (!v) return;
    try { const b = await grabFrame(v, frameAt); setPoster(b); setPosterPreview(URL.createObjectURL(b)); toast.success("Poster frame set"); }
    catch (e: any) { toast.error(e?.message ?? "Couldn't capture frame"); }
  };

  const pieces = useMemo(() => (studio.data?.pieces ?? []).filter((p) => p.kind !== "devotional"), [studio.data]);
  const releaseIso = relDate ? etToUtcISO(relDate, relTime || "09:00") : null;

  const save = async () => {
    if (!clip && !file) { toast.error("Choose a video first"); return; }
    if (caption.length > CAPTION_MAX) { toast.error(`Caption is over ${CAPTION_MAX} characters`); return; }
    const secs = stamp.trim() ? parseStamp(stamp) : null;
    if (stamp.trim() && secs == null) { toast.error("Timestamp looks like 18:40"); return; }
    setBusy(true);
    try {
      let video_path = clip?.video_path ?? "";
      let poster_path = clip?.poster_path ?? null;
      const id = crypto.randomUUID();
      if (file) {
        const ext = (file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "");
        video_path = `videos/${id}.${ext}`;
        setProgress(0);
        await uploadClipFile(video_path, file, setProgress);
      }
      if (poster) {
        const isJpeg = poster.type === "image/jpeg";
        poster_path = `posters/${id}.${isJpeg ? "jpg" : (poster.type.split("/")[1] || "jpg")}`;
        await uploadClipFile(poster_path, poster);
      }
      const row = { caption: caption.trim(), video_path, poster_path, duration_seconds: duration, series_id: seriesId, source_content_id: sourceId, source_seconds: sourceId ? secs : null, release_at: releaseIso, alt_text: alt.trim() || null };
      if (clip) {
        const { error } = await supabase.from("clips").update(row).eq("id", clip.id);
        if (error) throw error;
        const old = [file && clip.video_path, poster && clip.poster_path].filter(Boolean) as string[];
        if (old.length) await supabase.storage.from("clips").remove(old);
      } else {
        const { data: last } = seriesId ? await supabase.from("clips").select("position").eq("series_id", seriesId).order("position", { ascending: false }).limit(1) : { data: [] as any[] };
        const { error } = await supabase.from("clips").insert({ ...row, position: ((last ?? [])[0]?.position ?? 0) + 1 });
        if (error) throw error;
      }
      toast.success(clip ? "Clip saved" : "Clip uploaded");
      invalidate(); onClose();
    } catch (e: any) { toast.error(e?.message ?? "Couldn't save the clip"); }
    finally { setBusy(false); setProgress(null); }
  };
  const del = async () => {
    if (!clip) return;
    setBusy(true);
    const { error } = await supabase.from("clips").delete().eq("id", clip.id);
    if (!error) await supabase.storage.from("clips").remove([clip.video_path, clip.poster_path].filter(Boolean) as string[]);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Clip deleted"); invalidate(); onClose();
  };

  const src = localUrl ?? clip?.videoUrl ?? null;
  const status = clipIsPublic({ caption, release_at: releaseIso }) ? "Live" : !caption.trim() ? "Needs caption" : releaseIso ? "Scheduled" : "No release time";
  return (
    <div role="dialog" aria-modal="true" aria-label={clip ? "Edit clip" : "Upload clip"} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(24,26,77,.35)", display: "flex", justifyContent: "flex-end" }} onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div style={{ width: "min(760px, 100vw)", height: "100%", background: "#fff", display: "flex", flexDirection: "column", boxShadow: "-12px 0 40px rgba(24,26,77,.14)" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: `1px solid ${C.LINE}` }}>
          <div><div style={{ fontSize: 12, color: C.MUTED }}>Clip · {status}</div><div style={{ fontFamily: "Poppins", fontSize: 16, fontWeight: 600 }}>{clip ? "Edit clip" : "Upload clip"}</div></div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" style={{ width: 36, height: 36, borderRadius: 99, border: `1px solid ${C.LINE}`, background: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><X size={16} /></button>
        </header>
        <div style={{ flex: 1, overflow: "auto", padding: 24, display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div style={{ width: 220, flex: "none", display: "flex", flexDirection: "column", gap: 10 }}>
            <input ref={fileRef} type="file" accept="video/mp4,video/quicktime,.mp4,.mov" hidden onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }} />
            <input ref={posterRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) { setPoster(f); setPosterPreview(URL.createObjectURL(f)); } e.target.value = ""; }} />
            <div style={{ width: 220, aspectRatio: "9/16", borderRadius: 10, overflow: "hidden", background: "#0E1030", position: "relative" }}>
              {src ? <video ref={videoRef} src={src} crossOrigin="anonymous" poster={posterPreview ?? undefined} controls playsInline preload="metadata" onLoadedMetadata={onMeta} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <button type="button" onClick={() => fileRef.current?.click()} style={{ position: "absolute", inset: 0, border: "1.5px dashed #C9C6BE", borderRadius: 10, background: C.SBG, color: C.INK, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, fontWeight: 600 }}><Upload size={20} />Choose a vertical video<span style={{ fontWeight: 400, color: C.MUTED, fontSize: 12 }}>.mp4 or .mov · up to 200 MB</span></button>}
            </div>
            {src && <button type="button" className="st-btn sm" onClick={() => fileRef.current?.click()} disabled={busy}>Replace video</button>}
            {duration != null && <span className="st-help">Length {fmtDur(duration)}</span>}
            {progress != null && <div aria-label="Upload progress"><div style={{ height: 6, borderRadius: 99, background: C.SOFT, overflow: "hidden" }}><div style={{ width: `${progress}%`, height: "100%", background: C.INK }} /></div><span className="st-help">Uploading… {progress}%</span></div>}
            <span className="st-label" style={{ marginTop: 6 }}>Poster frame</span>
            {posterPreview && <img src={posterPreview} alt="" style={{ width: 90, aspectRatio: "9/16", objectFit: "cover", borderRadius: 6, border: `1px solid ${C.LINE}` }} />}
            {file && duration ? <>
              <input type="range" min={0} max={duration} step={0.1} value={frameAt} onChange={(e) => { const t = Number(e.target.value); setFrameAt(t); if (videoRef.current) videoRef.current.currentTime = t; }} aria-label="Pick a frame" />
              <button type="button" className="st-btn sm" onClick={useFrame}>Use this frame ({fmtDur(frameAt)})</button>
            </> : null}
            <button type="button" className="st-btn sm" onClick={() => posterRef.current?.click()}>Upload a poster image</button>
          </div>
          <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", gap: 16 }}>
            <label className="st-field"><span className="st-label">Caption · required to publish</span>
              <input className="st-input" value={caption} maxLength={CAPTION_MAX} onChange={(e) => setCaption(e.target.value)} placeholder="[Caption]" />
              <span className="st-help" style={{ textAlign: "right" }}>{caption.length}/{CAPTION_MAX}</span>
            </label>
            <label className="st-field"><span className="st-label">Series</span>
              <select className="st-input" value={seriesId ?? ""} onChange={(e) => setSeriesId(e.target.value || null)}>
                <option value="">No series</option>
                {(studio.data?.series ?? []).map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 110px", gap: 10 }}>
              <label className="st-field"><span className="st-label">From piece (optional)</span>
                <select className="st-input" value={sourceId ?? ""} onChange={(e) => setSourceId(e.target.value || null)}>
                  <option value="">None</option>
                  {pieces.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </label>
              <label className="st-field"><span className="st-label">At</span><input className="st-input" value={stamp} onChange={(e) => setStamp(e.target.value)} placeholder="18:40" disabled={!sourceId} /></label>
            </div>
            {sourceId && parseStamp(stamp) != null && <span className="st-help">Shows “Watch the full teaching from {fmtDur(parseStamp(stamp))}” under the clip.</span>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label className="st-field"><span className="st-label">Release date (ET)</span><input className="st-input" type="date" value={relDate} onChange={(e) => { setRelTouched(true); setRelDate(e.target.value); }} /></label>
              <label className="st-field"><span className="st-label">Time (ET)</span><input className="st-input" type="time" value={relTime} onChange={(e) => { setRelTouched(true); setRelTime(e.target.value); }} /></label>
            </div>
            <span className="st-help">Locked until this time, like pieces. Defaults to the series start.</span>
            <label className="st-field"><span className="st-label">Alt text</span><input className="st-input" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="[Describe the video for screen readers]" /></label>
            {clip && (confirmDel ? (
              <div style={{ border: "1px solid #E5B8B8", background: "#FBF1F1", borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                <b style={{ fontFamily: "Poppins", fontSize: 14 }}>Delete this clip?</b>
                <span style={{ fontSize: 13, color: C.MUTED }}>The video file is removed, and any article blocks using it go blank.</span>
                <div className="st-row"><Btn sm onClick={() => setConfirmDel(false)}>Keep clip</Btn><Btn sm className="danger" onClick={del} disabled={busy}>Yes, delete it</Btn></div>
              </div>
            ) : <div><Btn sm className="danger" onClick={() => setConfirmDel(true)}><Trash2 size={14} />Delete clip</Btn></div>)}
          </div>
        </div>
        <footer style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 24px", borderTop: `1px solid ${C.LINE}` }}>
          <Btn onClick={onClose} disabled={busy}>Cancel</Btn>
          <Btn primary onClick={save} disabled={busy || (!clip && !file)}>{busy ? (progress != null ? `Uploading ${progress}%` : "Saving…") : clip ? "Save clip" : "Upload clip"}</Btn>
        </footer>
      </div>
    </div>
  );
}
