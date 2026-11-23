import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getReleasedClips } from "@/lib/clips.functions";

/** Clips live in the private "clips" bucket; files are only ever served through signed URLs. */
export const CLIP_BUCKET = "clips";
export const CLIP_MAX_BYTES = 200 * 1024 * 1024;
export const CAPTION_MAX = 80;

export type PublicClip = {
  id: string; caption: string; videoUrl: string | null; posterUrl: string | null; duration: number | null;
  seriesId: string | null; releaseAt: string | null; alt: string | null; position: number;
  source: { id: string; kind: string; title: string } | null; sourceSeconds: number | null;
};
export type ClipRow = {
  id: string; caption: string; video_path: string; poster_path: string | null; duration_seconds: number | null;
  series_id: string | null; source_content_id: string | null; source_seconds: number | null; release_at: string | null;
  alt_text: string | null; position: number; created_at: string;
};
export type StudioClip = ClipRow & { videoUrl: string | null; posterUrl: string | null };

export const fmtDur = (s: number | null | undefined) => (s == null ? "" : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`);
export function parseStamp(v: string): number | null {
  const t = v.trim(); if (!t) return null;
  const parts = t.split(":").map((x) => Number(x));
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
  return parts.reduce((a, n) => a * 60 + n, 0);
}
/** A clip is public once it has a caption and its release time has passed. */
export const clipIsPublic = (c: { caption: string; release_at: string | null }, now = new Date()) => !!c.caption.trim() && !!c.release_at && new Date(c.release_at).getTime() <= now.getTime();

async function signAll(rows: ClipRow[]): Promise<StudioClip[]> {
  const paths = rows.flatMap((r) => [r.video_path, r.poster_path].filter(Boolean) as string[]);
  if (!paths.length) return rows.map((r) => ({ ...r, videoUrl: null, posterUrl: null }));
  const { data } = await supabase.storage.from(CLIP_BUCKET).createSignedUrls(paths, 60 * 60 * 6);
  const url = new Map((data ?? []).map((s) => [s.path, s.signedUrl]));
  return rows.map((r) => ({ ...r, videoUrl: url.get(r.video_path) ?? null, posterUrl: r.poster_path ? url.get(r.poster_path) ?? null : null }));
}

/** Studio (admin) clip library. RLS returns nothing for anyone else. */
export const STUDIO_CLIPS_KEY = ["studio-clips"] as const;
export function useStudioClips() {
  return useQuery({
    queryKey: STUDIO_CLIPS_KEY, staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("clips").select("id, caption, video_path, poster_path, duration_seconds, series_id, source_content_id, source_seconds, release_at, alt_text, position, created_at").order("position").order("created_at", { ascending: false });
      if (error) throw error;
      return signAll((data ?? []) as ClipRow[]);
    },
  });
}
export function useInvalidateClips() {
  const qc = useQueryClient();
  return () => { qc.invalidateQueries({ queryKey: STUDIO_CLIPS_KEY }); qc.invalidateQueries({ queryKey: ["clips"] }); };
}

/**
 * Clips for a page. Admins read the table directly (so staged previews can show what's coming);
 * everyone else goes through the server function, which only returns released clips.
 */
export async function loadClips(by: { seriesId?: string; ids?: string[] }, opts: { now?: Date; includeUnreleased?: boolean } = {}): Promise<PublicClip[]> {
  let q = supabase.from("clips").select("id, caption, video_path, poster_path, duration_seconds, series_id, source_content_id, source_seconds, release_at, alt_text, position, created_at");
  q = by.seriesId ? q.eq("series_id", by.seriesId) : q.in("id", by.ids ?? []);
  const { data } = await q.order("position").order("created_at");
  const rows = (data ?? []) as ClipRow[];
  if (rows.length) {
    const now = opts.now ?? new Date();
    const keep = opts.includeUnreleased ? rows : rows.filter((r) => clipIsPublic(r, now));
    const signed = await signAll(keep);
    const srcIds = [...new Set(keep.map((r) => r.source_content_id).filter(Boolean) as string[])];
    const { data: srcs } = srcIds.length ? await supabase.from("content_items").select("id, type, title").in("id", srcIds) : { data: [] as any[] };
    const src = new Map(((srcs ?? []) as any[]).map((s) => [s.id, s]));
    return signed.map((r) => {
      const s = r.source_content_id ? src.get(r.source_content_id) : null;
      return { id: r.id, caption: r.caption, videoUrl: r.videoUrl, posterUrl: r.posterUrl, duration: r.duration_seconds, seriesId: r.series_id, releaseAt: r.release_at, alt: r.alt_text, position: r.position, source: s ? { id: s.id, kind: s.type, title: s.title } : null, sourceSeconds: s ? r.source_seconds : null };
    });
  }
  if (!by.seriesId && !(by.ids ?? []).length) return [];
  return getReleasedClips({ data: { seriesId: by.seriesId, ids: by.ids } });
}

/** Upload a file to the clips bucket with progress (supabase-js has no progress callback). */
export async function uploadClipFile(path: string, file: Blob, onProgress?: (pct: number) => void): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Please sign in again");
  const base = import.meta.env.VITE_SUPABASE_URL as string;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${base}/storage/v1/object/${CLIP_BUCKET}/${path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", key);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status}) ${xhr.responseText.slice(0, 120)}`)));
    xhr.onerror = () => reject(new Error("Upload failed — check your connection"));
    xhr.send(file);
  });
}

/** Grab a still frame from a video element as a JPEG. */
export function grabFrame(video: HTMLVideoElement, at: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const draw = () => {
      const c = document.createElement("canvas");
      c.width = video.videoWidth || 720; c.height = video.videoHeight || 1280;
      c.getContext("2d")?.drawImage(video, 0, 0, c.width, c.height);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't capture frame"))), "image/jpeg", 0.85);
    };
    if (Math.abs(video.currentTime - at) < 0.05) { draw(); return; }
    const on = () => { video.removeEventListener("seeked", on); draw(); };
    video.addEventListener("seeked", on);
    video.currentTime = at;
  });
}
