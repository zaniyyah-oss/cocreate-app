import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RelPiece } from "@/lib/related";

/** Data helpers for the public inner content pages (article, series, devotional day). */

export const UUID_RE = /^[0-9a-f-]{36}$/i;
export const KIND_LABEL: Record<string, string> = { teaching: "Teaching", essay: "Article", blog: "Blog", podcast: "Podcast", clip: "Clip", promoted: "Feature", devotional: "Devotional" };
export const kindLabel = (k: string | null | undefined) => KIND_LABEL[k ?? ""] ?? "Article";
export const isReleased = (iso: string | null | undefined, now: Date) => !iso || new Date(iso).getTime() <= now.getTime();
export const monD = (iso: string | null | undefined) => iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
export const monthD = (iso: string | null | undefined) => iso ? new Date(iso).toLocaleDateString(undefined, { month: "long", day: "numeric" }) : "";
export const photo = (p: { hero_url?: string | null; cover_image_url?: string | null; thumbnail_url?: string | null; banner_url?: string | null } | null | undefined) =>
  p ? p.hero_url || p.cover_image_url || p.thumbnail_url || p.banner_url || null : null;
export function lengthOf(p: { duration_seconds?: number | null; read_time_minutes?: number | null } | null | undefined) {
  if (!p) return "";
  if (p.duration_seconds) return `${Math.max(1, Math.round(p.duration_seconds / 60))} min`;
  if (p.read_time_minutes) return `${p.read_time_minutes} min read`;
  return "";
}
export function pieceRoute(type: string | null | undefined): "/teachings/$id" | "/podcasts/$id" | "/essays/$id" {
  return type === "teaching" || type === "clip" ? "/teachings/$id" : type === "podcast" ? "/podcasts/$id" : "/essays/$id";
}
export const verb = (type: string | null | undefined) => type === "teaching" || type === "clip" ? "Watch" : type === "podcast" ? "Listen" : "Read";

/** Viewer, with the Studio staged preview's simulated time and "signed out reader" applied. */
export function useViewer(search: { at?: string; viewer?: "in" | "out" }) {
  const [realUserId, setReal] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setReal(data.session?.user.id ?? null); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setReal(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);
  const adminQ = useQuery({
    queryKey: ["is-admin", realUserId], enabled: !!realUserId,
    queryFn: async () => !!(await supabase.rpc("has_role", { _user_id: realUserId!, _role: "admin" })).data,
  });
  const staged = !!search.at && !!adminQ.data;
  const now = useMemo(() => (staged && search.at ? new Date(search.at) : new Date()), [staged, search.at]);
  const userId = staged && search.viewer !== "in" ? null : realUserId;
  return { ready, realUserId, userId, isAdmin: !!adminQ.data, staged, now };
}

export function validateStageSearch(search: Record<string, unknown>): { at?: string; stage?: string; viewer?: "in" | "out" } {
  const o: { at?: string; stage?: string; viewer?: "in" | "out" } = {};
  if (typeof search.at === "string" && !Number.isNaN(Date.parse(search.at))) o.at = search.at;
  if (typeof search.stage === "string" && UUID_RE.test(search.stage)) o.stage = search.stage;
  if (search.viewer === "in" || search.viewer === "out") o.viewer = search.viewer;
  return o;
}

export type SeriesInfo = {
  id: string; slug: string; title: string; summary: string | null; description: string | null; writeup_title: string | null; writeup_body: string | null;
  banner_url: string | null; cover_image_url: string | null; hero_focal_desktop: string | null; hero_focal_mobile: string | null;
  series_month: string | null; devotional_template_id: string | null; eyebrow: string | null;
  themes?: string[] | null; taught_by?: string[] | null; about_doc?: unknown;
};
export type SeriesPart = {
  key: string; kind: string; title: string; releaseAt: string | null; released: boolean;
  piece: (RelPiece & { author_name?: string | null; topic_id?: string | null }) | null;
  templateId: string | null; collectionItemId: string; thumb: string | null; summary: string | null; length: string;
};
const PCOLS = "id, type, title, release_at, hero_url, cover_image_url, thumbnail_url, hero_focal_desktop, hero_focal_mobile, duration_seconds, read_time_minutes, summary, excerpt, slug, author_name, topic_id";

export async function fetchSeries(by: { id?: string; slug?: string }, now: Date): Promise<{ series: SeriesInfo; parts: SeriesPart[] } | null> {
  let q = supabase.from("collections").select("id, slug, title, summary, description, writeup_title, writeup_body, banner_url, cover_image_url, hero_focal_desktop, hero_focal_mobile, series_month, devotional_template_id, eyebrow, themes, taught_by, about_doc").eq("status", "published");
  q = by.id ? q.eq("id", by.id) : q.eq("slug", by.slug ?? "");
  const { data: s } = await q.maybeSingle();
  if (!s) return null;
  const { data: links } = await supabase.from("collection_items").select("id, content_id, template_id, position, sort_order, release_at, planned_title, planned_kind, planned_at, show_title_publicly").eq("collection_id", s.id);
  const L = (links ?? []) as any[];
  const cids = L.map((l) => l.content_id).filter(Boolean);
  const tids = L.map((l) => l.template_id).filter(Boolean);
  const [pr, tr] = await Promise.all([
    cids.length ? supabase.from("content_items_public").select(PCOLS).in("id", cids) : Promise.resolve({ data: [] as any[] }),
    tids.length ? supabase.from("devotional_templates").select("id, title, release_at, hero_url, duration_days, summary, description, status").in("id", tids) : Promise.resolve({ data: [] as any[] }),
  ]);
  const pm = new Map(((pr.data ?? []) as any[]).map((p) => [p.id, p]));
  const tm = new Map(((tr.data ?? []) as any[]).map((t) => [t.id, t]));
  const parts: SeriesPart[] = [];
  for (const l of L) {
    if (l.content_id) {
      const p = pm.get(l.content_id); if (!p) continue;
      parts.push({ key: l.id, kind: p.type, title: p.title ?? "", releaseAt: p.release_at, released: isReleased(p.release_at, now), piece: p, templateId: null, collectionItemId: l.id, thumb: photo(p), summary: p.summary || p.excerpt, length: lengthOf(p) });
    } else if (l.template_id) {
      const t = tm.get(l.template_id); if (!t || t.status !== "published") continue;
      parts.push({ key: l.id, kind: "devotional", title: t.title, releaseAt: t.release_at, released: isReleased(t.release_at, now), piece: null, templateId: t.id, collectionItemId: l.id, thumb: t.hero_url, summary: t.summary || t.description, length: t.duration_days ? `${t.duration_days} days` : "" });
    } else if (l.planned_title || l.planned_at) {
      const at = l.planned_at ?? l.release_at;
      if (!at || isReleased(at, now)) continue; // public: only "Coming [date]" for dated slots; never stands in for a released piece
      parts.push({ key: l.id, kind: l.planned_kind ?? "essay", title: l.show_title_publicly ? l.planned_title ?? "" : "", releaseAt: at, released: false, piece: null, templateId: null, collectionItemId: l.id, thumb: null, summary: null, length: "" });
    }
  }
  const ord = (k: string) => { const l = L.find((x) => x.id === k); return l?.sort_order ?? l?.position ?? 0; };
  parts.sort((a, b) => ord(a.key) - ord(b.key) || (a.releaseAt ?? "9").localeCompare(b.releaseAt ?? "9"));
  return { series: s as SeriesInfo, parts };
}

export async function seriesIdForPiece(contentId: string): Promise<string | null> {
  const { data } = await supabase.from("collection_items").select("collection_id, collections!inner(status)").eq("content_id", contentId).eq("collections.status", "published").limit(1).maybeSingle();
  return (data as any)?.collection_id ?? null;
}
export async function seriesIdForTemplate(templateId: string): Promise<string | null> {
  const { data } = await supabase.from("collection_items").select("collection_id, collections!inner(status)").eq("template_id", templateId).eq("collections.status", "published").limit(1).maybeSingle();
  if ((data as any)?.collection_id) return (data as any).collection_id;
  const { data: c } = await supabase.from("collections").select("id").eq("devotional_template_id", templateId).eq("status", "published").limit(1).maybeSingle();
  return c?.id ?? null;
}

/* ---------- progress / follow / remind (owner-only rows) ---------- */

export function useProgress(userId: string | null) {
  return useQuery({
    queryKey: ["content-progress", userId], enabled: !!userId,
    queryFn: async () => {
      const { data } = await (supabase.from as any)("content_progress").select("content_id, template_id, day_number, finished_at, started_at, response").eq("user_id", userId);
      return (data ?? []) as { content_id: string | null; template_id: string | null; day_number: number | null; finished_at: string | null; started_at: string; response: string | null }[];
    },
  });
}
export async function upsertProgress(userId: string, row: { content_id?: string; template_id?: string; day_number?: number; finished?: boolean; response?: string; progress?: number }) {
  const rec: Record<string, unknown> = { user_id: userId, content_id: row.content_id ?? null, template_id: row.template_id ?? null, day_number: row.day_number ?? null };
  if (row.finished) rec.finished_at = new Date().toISOString();
  if (row.response !== undefined) rec.response = row.response;
  if (row.progress !== undefined) rec.progress = row.progress;
  const { error } = await (supabase.from as any)("content_progress").upsert(rec, { onConflict: "user_id,content_id,template_id,day_number" });
  if (error) throw error;
}
/** Records "started" without clobbering an existing finished state. */
export async function markStarted(userId: string, row: { content_id?: string; template_id?: string; day_number?: number }) {
  await (supabase.from as any)("content_progress").upsert(
    { user_id: userId, content_id: row.content_id ?? null, template_id: row.template_id ?? null, day_number: row.day_number ?? null },
    { onConflict: "user_id,content_id,template_id,day_number", ignoreDuplicates: true });
}

export function useFollows(userId: string | null) {
  return useQuery({ queryKey: ["series-follows", userId], enabled: !!userId, queryFn: async () => {
    const { data } = await (supabase.from as any)("series_follows").select("collection_id").eq("user_id", userId);
    return new Set(((data ?? []) as any[]).map((r) => r.collection_id as string));
  } });
}
export function useReminders(userId: string | null) {
  return useQuery({ queryKey: ["release-reminders", userId], enabled: !!userId, queryFn: async () => {
    const { data } = await (supabase.from as any)("release_reminders").select("id, content_id, template_id, collection_item_id, day_number").eq("user_id", userId).is("sent_at", null);
    return (data ?? []) as { id: string; content_id: string | null; template_id: string | null; collection_item_id: string | null; day_number: number | null }[];
  } });
}
export function useContentActions(userId: string | null) {
  const qc = useQueryClient();
  return {
    async toggleFollow(collectionId: string, on: boolean) {
      if (!userId) return;
      if (on) await (supabase.from as any)("series_follows").upsert({ user_id: userId, collection_id: collectionId }, { onConflict: "user_id,collection_id", ignoreDuplicates: true });
      else await (supabase.from as any)("series_follows").delete().eq("user_id", userId).eq("collection_id", collectionId);
      qc.invalidateQueries({ queryKey: ["series-follows"] });
    },
    async remind(t: { content_id?: string | null; template_id?: string | null; collection_item_id?: string | null; day_number?: number | null; remind_at?: string | null; title?: string | null }) {
      if (!userId) return;
      const rec = { user_id: userId, content_id: t.content_id ?? null, template_id: t.template_id ?? null, collection_item_id: t.content_id || t.template_id ? null : t.collection_item_id ?? null, day_number: t.day_number ?? null, remind_at: t.remind_at ?? null, title: t.title ?? null };
      const { error } = await (supabase.from as any)("release_reminders").upsert(rec, { onConflict: "user_id,content_id,template_id,collection_item_id,day_number" });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["release-reminders"] });
    },
    async unremind(id: string) {
      await (supabase.from as any)("release_reminders").delete().eq("id", id);
      qc.invalidateQueries({ queryKey: ["release-reminders"] });
    },
    invalidateProgress: () => qc.invalidateQueries({ queryKey: ["content-progress"] }),
  };
}

/* ---------- rails shared by the inner pages ---------- */

export type CalendarItem = { key: string; at: string; kicker: string; title: string; href: { to: string; params?: Record<string, string> } | null };

export function useOnTheCalendar(now: Date) {
  return useQuery({
    queryKey: ["on-the-calendar", now.toISOString().slice(0, 13)],
    queryFn: async (): Promise<CalendarItem[]> => {
      const iso = now.toISOString();
      const [pr, sr, links] = await Promise.all([
        supabase.from("content_items_public").select("id, type, title, release_at").gt("release_at", iso).order("release_at").limit(6),
        supabase.from("collections").select("id, slug, title, series_month").eq("status", "published").gt("series_month", iso.slice(0, 10)).order("series_month").limit(3),
        supabase.from("collection_items").select("content_id, collections!inner(title, status)").eq("collections.status", "published").not("content_id", "is", null),
      ]);
      const sName = new Map(((links.data ?? []) as any[]).map((l) => [l.content_id, l.collections?.title as string]));
      const items: CalendarItem[] = [
        ...((pr.data ?? []) as any[]).map((p) => ({ key: p.id, at: p.release_at, kicker: [kindLabel(p.type), sName.get(p.id)].filter(Boolean).join(" · "), title: p.title ?? "", href: null })),
        ...((sr.data ?? []) as any[]).map((s) => ({ key: s.id, at: `${s.series_month}T12:00:00`, kicker: "New series begins", title: s.title, href: { to: "/series/$slug", params: { slug: s.slug } } })),
      ];
      return items.sort((a, b) => a.at.localeCompare(b.at)).slice(0, 3);
    },
  });
}

export function useMostRead(now: Date) {
  return useQuery({
    queryKey: ["most-read", now.toISOString().slice(0, 13)],
    queryFn: async () => {
      const { data } = await (supabase.rpc as any)("most_read_week", { _now: now.toISOString() });
      const ids = ((data ?? []) as any[]).map((r) => r.content_id as string);
      if (!ids.length) return [];
      const { data: ps } = await supabase.from("content_items_public").select("id, type, title").in("id", ids);
      return ids.map((id) => (ps ?? []).find((p) => p.id === id)).filter(Boolean) as { id: string; type: string; title: string }[];
    },
  });
}

export function useCurrentSeries(now: Date) {
  return useQuery({
    queryKey: ["current-series", now.toISOString().slice(0, 7)],
    queryFn: async () => {
      const { data } = await supabase.from("collections").select("id, slug, title, series_month, summary, banner_url, cover_image_url, hero_focal_desktop, hero_focal_mobile").not("series_month", "is", null).eq("status", "published").order("series_month");
      const key = now.toISOString().slice(0, 7);
      return (data ?? []).find((s) => s.series_month?.slice(0, 7) === key) ?? null;
    },
  });
}

export function usePageCopy(pageKey: string) {
  return useQuery({ queryKey: ["page-copy", pageKey], queryFn: async () => {
    const { data } = await supabase.from("page_content").select("field_key, field_value").eq("page_key", pageKey);
    const m: Record<string, string> = {}; for (const r of data ?? []) m[r.field_key] = r.field_value ?? ""; return m;
  } });
}

export function useIsPreviewHost() {
  const [p, setP] = useState(false);
  useEffect(() => { setP(import.meta.env.DEV || /id-preview|lovableproject|localhost|127\.0\.0\.1/.test(window.location.hostname)); }, []);
  return p;
}
