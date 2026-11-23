import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { textToDoc, emptyDoc, type DocNode } from "@/lib/piece-doc";

/** Unified editable fields for any piece (content_items row or devotional_templates row). */
export type PieceDraft = {
  kind: string; title: string; summary: string; body_doc: DocNode | null; hero_url: string | null; hero_caption: string | null;
  hero_focal_desktop: string | null; hero_focal_mobile: string | null; release_at: string | null; feature_new_this_month: boolean;
  comments_enabled: boolean; is_standalone: boolean; status: string; video_url: string | null; media_url: string | null;
  author_name: string | null; duration_seconds: number | null; slug: string | null;
};
export type DayRow = { id: string; day_number: number; title: string; scripture_reference: string | null; scripture_passage: string | null; reflection_doc: DocNode | null; questions: string[]; pray_prompt: string | null; reflect_prompt: string | null };
export type LoadedPiece = { table: "content" | "devotional"; id: string; draft: PieceDraft; topicIds: string[]; link: { id: string; collection_id: string; position: number } | null; days: DayRow[]; converted: boolean };

export async function loadPiece(id: string): Promise<LoadedPiece | null> {
  const { data: c } = await supabase.from("content_items").select("*").eq("id", id).maybeSingle();
  if (c) {
    const [{ data: t }, { data: l }] = await Promise.all([
      supabase.from("content_topics").select("topic_id, position").eq("content_id", id).order("position"),
      supabase.from("collection_items").select("id, collection_id, position").eq("content_id", id).limit(1),
    ]);
    const converted = !c.body_doc;
    return {
      table: "content", id, converted, days: [], topicIds: (t ?? []).map((x) => x.topic_id), link: (l ?? [])[0] ?? null,
      draft: {
        kind: c.type, title: c.title ?? "", summary: c.summary ?? c.excerpt ?? "", body_doc: (c.body_doc as DocNode | null) ?? (c.body ? textToDoc(c.body) : emptyDoc()),
        hero_url: c.hero_url ?? c.cover_image_url, hero_caption: c.hero_caption, hero_focal_desktop: c.hero_focal_desktop, hero_focal_mobile: c.hero_focal_mobile,
        release_at: c.release_at, feature_new_this_month: c.feature_new_this_month, comments_enabled: c.comments_enabled, is_standalone: c.is_standalone,
        status: c.status, video_url: c.video_url, media_url: c.media_url, author_name: c.author_name, duration_seconds: c.duration_seconds, slug: c.slug,
      },
    };
  }
  const { data: d } = await supabase.from("devotional_templates").select("*").eq("id", id).maybeSingle();
  if (!d) return null;
  const [{ data: t }, { data: l }, { data: days }] = await Promise.all([
    supabase.from("devotional_topics").select("topic_id, position").eq("template_id", id).order("position"),
    supabase.from("collection_items").select("id, collection_id, position").eq("template_id", id).limit(1),
    supabase.from("devotional_days").select("id, day_number, title, scripture_reference, scripture_passage, reflection_doc, questions, pray_prompt, reflect_prompt").eq("template_id", id).order("day_number"),
  ]);
  return {
    table: "devotional", id, converted: false, topicIds: (t ?? []).map((x) => x.topic_id), link: (l ?? [])[0] ?? null,
    days: (days ?? []).map((x: any) => ({ ...x, questions: Array.isArray(x.questions) ? x.questions : [] })),
    draft: {
      kind: "devotional", title: d.title ?? "", summary: d.description ?? "", body_doc: null, hero_url: d.hero_url, hero_caption: null,
      hero_focal_desktop: d.hero_focal_desktop, hero_focal_mobile: d.hero_focal_mobile, release_at: d.release_at, feature_new_this_month: d.feature_new_this_month,
      comments_enabled: d.comments_enabled, is_standalone: d.is_standalone, status: d.status, video_url: null, media_url: null, author_name: null, duration_seconds: null, slug: d.slug,
    },
  };
}

export function usePiece(id: string) {
  return useQuery({ queryKey: ["studio-piece", id], queryFn: () => loadPiece(id), staleTime: Infinity, refetchOnWindowFocus: false });
}
export function useRefreshPiece(id: string) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["studio-piece", id] });
}

/** Maps a draft patch to the columns of its table. The legacy plain-text body is never overwritten. */
export function toRow(table: "content" | "devotional", p: Partial<PieceDraft>): Record<string, any> {
  const r: Record<string, any> = {};
  const copy = (k: keyof PieceDraft, col: string = k) => { if (k in p) r[col] = p[k]; };
  copy("title"); copy("hero_url"); copy("hero_focal_desktop"); copy("hero_focal_mobile"); copy("release_at");
  copy("feature_new_this_month"); copy("comments_enabled"); copy("is_standalone"); copy("status");
  if (table === "content") {
    copy("summary"); copy("body_doc"); copy("hero_caption"); copy("video_url"); copy("media_url"); copy("author_name"); copy("duration_seconds");
  } else {
    copy("summary", "description");
  }
  return r;
}

export async function savePatch(table: "content" | "devotional", id: string, p: Partial<PieceDraft>) {
  const row = toRow(table, p);
  if (!Object.keys(row).length) return;
  const { error } = table === "content"
    ? await supabase.from("content_items").update(row as any).eq("id", id)
    : await supabase.from("devotional_templates").update(row as any).eq("id", id);
  if (error) throw error;
}
