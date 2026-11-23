import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { checklist, pieceStatus, type CheckItem, type PieceStatus } from "@/lib/studio-checklist";
import { docHasContent, type DocNode } from "@/lib/piece-doc";

export type StudioKind = "teaching" | "essay" | "blog" | "podcast" | "clip" | "promoted" | "devotional";
export const KIND_LABEL: Record<string, string> = {
  teaching: "Teaching", essay: "Article", blog: "Blog", podcast: "Podcast", clip: "Clip", promoted: "Feature", devotional: "Devotional",
};
export const NEW_KINDS: { kind: StudioKind; label: string; desc: string }[] = [
  { kind: "teaching", label: "Teaching", desc: "Video teaching with notes" },
  { kind: "essay", label: "Article / Essay", desc: "Long-form written piece" },
  { kind: "podcast", label: "Podcast", desc: "Audio episode with show notes" },
  { kind: "blog", label: "Blog", desc: "Shorter written post" },
  { kind: "devotional", label: "Devotional", desc: "One tab per day" },
];

export type SeriesItem = { id: string; collection_id: string; content_id: string | null; template_id: string | null; position: number; planned_title: string | null; planned_kind: string | null; planned_at: string | null; show_title_publicly?: boolean };
export type StudioSeries = {
  id: string; slug: string; title: string; series_month: string | null; summary: string | null; status: string;
  banner_url: string | null; cover_image_url: string | null; hero_focal_desktop: string | null; hero_focal_mobile: string | null;
  eyebrow: string | null; writeup_title: string | null; writeup_body: string | null; description: string | null; about_doc: unknown;
  themes: string[]; taught_by: string[]; rhythm_weekday: number | null; rhythm_time: string | null; devotional_template_id: string | null;
  items: SeriesItem[];
};
export type StudioPiece = {
  id: string; kind: StudioKind; title: string; summary: string | null; rawStatus: string; status: PieceStatus;
  releaseAt: string | null; photo: string | null; heroUrl: string | null; fd: string | null; fm: string | null;
  topicIds: string[]; seriesId: string | null; seriesTitle: string | null; part: number | null; seriesTotal: number;
  standalone: boolean; hasBody: boolean; feature: boolean; updatedAt: string; slug: string | null; checks: CheckItem[];
};
export type Topic = { id: string; name: string; display_name: string | null };
export type StudioData = { pieces: StudioPiece[]; series: StudioSeries[]; topics: Topic[] };

/** Part number within a series: stored position when set, otherwise its order. */
export function partOf(items: SeriesItem[], match: (i: SeriesItem) => boolean): number | null {
  const sorted = [...items].sort((a, b) => a.position - b.position);
  const idx = sorted.findIndex(match);
  if (idx < 0) return null;
  return sorted[idx]!.position > 0 ? sorted[idx]!.position : idx + 1;
}

export async function fetchStudioData(): Promise<StudioData> {
  const [cR, dR, sR, tR] = await Promise.all([
    supabase.from("content_items").select("id, type, title, summary, excerpt, status, release_at, hero_url, cover_image_url, thumbnail_url, hero_focal_desktop, hero_focal_mobile, is_standalone, body, body_doc, video_url, media_url, feature_new_this_month, updated_at, slug, content_topics(topic_id)").eq("is_seed", false).order("updated_at", { ascending: false }),
    supabase.from("devotional_templates").select("id, title, description, status, release_at, hero_url, hero_focal_desktop, hero_focal_mobile, is_standalone, feature_new_this_month, updated_at, slug, devotional_topics(topic_id), devotional_days(id, scripture_reference, scripture_passage, reflection_doc, preview_reflect)").eq("is_default", false).eq("is_seed", false).order("updated_at", { ascending: false }),
    supabase.from("collections").select("id, slug, title, series_month, summary, status, banner_url, cover_image_url, hero_focal_desktop, hero_focal_mobile, eyebrow, writeup_title, writeup_body, description, about_doc, themes, taught_by, rhythm_weekday, rhythm_time, devotional_template_id, collection_items(id, collection_id, content_id, template_id, position, planned_title, planned_kind, planned_at, show_title_publicly)").order("series_month", { ascending: true, nullsFirst: false }),
    supabase.from("topics").select("id, name, display_name").order("sort_order", { ascending: true }),
  ]);
  if (cR.error) throw cR.error;
  if (dR.error) throw dR.error;
  if (sR.error) throw sR.error;
  const series = (sR.data ?? []).map((s: any) => ({ ...s, themes: s.themes ?? [], taught_by: s.taught_by ?? [], items: (s.collection_items ?? []) as SeriesItem[] })) as StudioSeries[];
  const where = (m: (i: SeriesItem) => boolean) => {
    for (const s of series) {
      const part = partOf(s.items, m);
      if (part != null) return { s, part };
    }
    return null;
  };
  const pieces: StudioPiece[] = [];
  for (const c of (cR.data ?? []) as any[]) {
    const hit = where((i) => i.content_id === c.id);
    const topicIds = (c.content_topics ?? []).map((t: any) => t.topic_id);
    const hasBody = docHasContent(c.body_doc as DocNode) || !!c.body?.trim() || (c.type !== "essay" && c.type !== "blog" && !!(c.video_url || c.media_url));
    const heroUrl = c.hero_url || c.cover_image_url || null;
    pieces.push({
      id: c.id, kind: c.type, title: c.title, summary: c.summary ?? c.excerpt ?? null, rawStatus: c.status,
      status: pieceStatus(c.status, c.release_at), releaseAt: c.release_at, photo: heroUrl || c.thumbnail_url || null, heroUrl,
      fd: c.hero_focal_desktop, fm: c.hero_focal_mobile, topicIds, seriesId: hit?.s.id ?? null, seriesTitle: hit?.s.title ?? null,
      part: hit?.part ?? null, seriesTotal: hit?.s.items.length ?? 0, standalone: !!c.is_standalone, hasBody,
      feature: !!c.feature_new_this_month, updatedAt: c.updated_at, slug: c.slug,
      checks: checklist({ title: c.title, summary: c.summary ?? c.excerpt, hasBody, inSeries: !!hit, part: hit?.part, standalone: !!c.is_standalone, heroUrl, focalDesktop: c.hero_focal_desktop, focalMobile: c.hero_focal_mobile, topicCount: topicIds.length, releaseAt: c.release_at }),
    });
  }
  for (const d of (dR.data ?? []) as any[]) {
    const hit = where((i) => i.template_id === d.id);
    const topicIds = (d.devotional_topics ?? []).map((t: any) => t.topic_id);
    const hasBody = (d.devotional_days ?? []).some((x: any) => docHasContent(x.reflection_doc) || !!x.scripture_passage?.trim() || !!x.preview_reflect?.trim());
    pieces.push({
      id: d.id, kind: "devotional", title: d.title, summary: d.description, rawStatus: d.status,
      status: pieceStatus(d.status, d.release_at), releaseAt: d.release_at, photo: d.hero_url, heroUrl: d.hero_url,
      fd: d.hero_focal_desktop, fm: d.hero_focal_mobile, topicIds, seriesId: hit?.s.id ?? null, seriesTitle: hit?.s.title ?? null,
      part: hit?.part ?? null, seriesTotal: hit?.s.items.length ?? 0, standalone: !!d.is_standalone, hasBody,
      feature: !!d.feature_new_this_month, updatedAt: d.updated_at, slug: d.slug,
      checks: checklist({ title: d.title, summary: d.description, hasBody, inSeries: !!hit, part: hit?.part, standalone: !!d.is_standalone, heroUrl: d.hero_url, focalDesktop: d.hero_focal_desktop, focalMobile: d.hero_focal_mobile, topicCount: topicIds.length, releaseAt: d.release_at }),
    });
  }
  return { pieces, series, topics: (tR.data ?? []) as Topic[] };
}

export const STUDIO_KEY = ["studio-data"] as const;
export function useStudioData() {
  return useQuery({ queryKey: STUDIO_KEY, queryFn: fetchStudioData, staleTime: 10_000 });
}
export function useInvalidateStudio() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: STUDIO_KEY });
}

/** Uploads a photo to the (private) thumbnails bucket and returns a long-lived signed URL. */
export async function uploadStudioPhoto(file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `studio/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("content-thumbnails").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  const { data, error: e2 } = await supabase.storage.from("content-thumbnails").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (e2 || !data) throw e2 ?? new Error("Couldn't create photo link");
  return data.signedUrl;
}

export function kickerFor(p: { kind: string; seriesTitle: string | null; part: number | null; seriesTotal: number }) {
  return [KIND_LABEL[p.kind] ?? p.kind, p.seriesTitle, p.part ? `Part ${p.part} of ${p.seriesTotal}` : null].filter(Boolean).join(" · ");
}

export type CalEntry = {
  key: string; at: string; kindLabel: string; title: string; seriesLine: string | null;
  status: PieceStatus | "planned"; piece: StudioPiece | null; seriesId: string | null; photo: string | null;
};

/** Every dated release: pieces, planned slots and series launches. */
export function calendarEntries(d: StudioData): CalEntry[] {
  const out: CalEntry[] = [];
  for (const p of d.pieces) if (p.releaseAt) out.push({ key: `p:${p.id}`, at: p.releaseAt, kindLabel: KIND_LABEL[p.kind] ?? p.kind, title: p.title, seriesLine: p.seriesTitle ? `${p.seriesTitle}${p.part ? ` · Part ${p.part}` : ""}` : null, status: p.status, piece: p, seriesId: p.seriesId, photo: p.photo });
  for (const s of d.series) {
    const sorted = [...s.items].sort((a, b) => a.position - b.position);
    sorted.forEach((i, idx) => {
      if (!i.content_id && !i.template_id && i.planned_at) out.push({ key: `slot:${i.id}`, at: i.planned_at, kindLabel: i.planned_kind ? KIND_LABEL[i.planned_kind] ?? i.planned_kind : "Planned", title: i.planned_title || "[Planned piece]", seriesLine: `${s.title} · Part ${i.position > 0 ? i.position : idx + 1}`, status: "planned", piece: null, seriesId: s.id, photo: null });
    });
    if (s.series_month && s.items.length === 0) out.push({ key: `launch:${s.id}`, at: `${s.series_month}T12:00:00Z`, kindLabel: "Series launch", title: s.title, seriesLine: s.title, status: "planned", piece: null, seriesId: s.id, photo: s.banner_url || s.cover_image_url });
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}
