import { createServerFn } from "@tanstack/react-start";
import type { PublicClip } from "@/lib/clips";

const SIGN_SECONDS = 60 * 60 * 6;

/**
 * Public: released clips only (release_at ≤ now and a caption), with short-lived signed URLs.
 * The bucket is private; this is the only way readers get clip files.
 */
export const getReleasedClips = createServerFn({ method: "POST" })
  .inputValidator((input: { seriesId?: string; ids?: string[] }) => {
    const re = /^[0-9a-f-]{36}$/i;
    if (input.seriesId && !re.test(input.seriesId)) throw new Error("Bad id");
    const ids = (input.ids ?? []).filter((x) => re.test(x)).slice(0, 50);
    return { seriesId: input.seriesId, ids };
  })
  .handler(async ({ data }): Promise<PublicClip[]> => {
    if (!data.seriesId && !data.ids.length) return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    let q = supabaseAdmin.from("clips").select("id, caption, video_path, poster_path, duration_seconds, series_id, source_content_id, source_seconds, release_at, alt_text, position").lte("release_at", now).neq("caption", "");
    q = data.seriesId ? q.eq("series_id", data.seriesId) : q.in("id", data.ids);
    const { data: rows, error } = await q.order("position").order("created_at");
    if (error) { console.error("getReleasedClips", error.message); return []; }
    const list = rows ?? [];
    if (!list.length) return [];
    const paths = list.flatMap((r) => [r.video_path, r.poster_path].filter(Boolean) as string[]);
    const { data: signed } = await supabaseAdmin.storage.from("clips").createSignedUrls(paths, SIGN_SECONDS);
    const url = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
    const srcIds = [...new Set(list.map((r) => r.source_content_id).filter(Boolean) as string[])];
    const { data: srcs } = srcIds.length ? await supabaseAdmin.from("content_items").select("id, type, title, release_at, status").in("id", srcIds) : { data: [] as any[] };
    const src = new Map(((srcs ?? []) as any[]).filter((s) => s.status === "published" && (!s.release_at || s.release_at <= now)).map((s) => [s.id, s]));
    return list.map((r) => {
      const s = r.source_content_id ? src.get(r.source_content_id) : null;
      return {
        id: r.id, caption: r.caption, videoUrl: url.get(r.video_path) ?? null, posterUrl: r.poster_path ? url.get(r.poster_path) ?? null : null,
        duration: r.duration_seconds, seriesId: r.series_id, releaseAt: r.release_at, alt: r.alt_text, position: r.position,
        source: s ? { id: s.id, kind: s.type, title: s.title } : null, sourceSeconds: s ? r.source_seconds : null,
      };
    });
  });
