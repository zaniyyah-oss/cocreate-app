import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

/**
 * Home page data. Every query takes `now` so the Studio staged preview (Phase 2)
 * can render the site "as of" a future date with the same code.
 */
export type Piece = Database["public"]["Views"]["content_items_public"]["Row"];
export type SeriesRow = {
  id: string; slug: string; title: string; series_month: string | null; summary: string | null;
  banner_url: string | null; cover_image_url: string | null;
  hero_focal_desktop: string | null; hero_focal_mobile: string | null;
};
export type DevoRow = {
  id: string; title: string; slug: string | null; description: string | null; duration_days: number | null;
  hero_url: string | null; hero_focal_desktop: string | null; hero_focal_mobile: string | null;
  release_at: string | null; feature_new_this_month: boolean;
};
export type ProductRow = {
  id: string; slug: string; title: string; subtitle: string | null; category: string | null;
  cover_image_url: string | null; checkout_url: string | null;
};

export type NewCard =
  | { kind: "piece"; piece: Piece; at: string }
  | { kind: "devotional"; devo: DevoRow; at: string };

export type HomeData = {
  now: string;
  hero: Piece | null;
  heroSeries: SeriesRow | null;
  currentSeries: SeriesRow | null;
  nextSeries: SeriesRow | null;
  newThisMonth: NewCard[];
  schedule: { piece: Piece; released: boolean }[];
  devotionals: DevoRow[];
  watch: Piece[];
  read: Piece[];
  listen: Piece[];
  products: ProductRow[];
  copy: Record<string, string>;
};

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const isReleased = (iso: string | null | undefined, now: Date) => !!iso && new Date(iso).getTime() <= now.getTime();
const sameMonth = (iso: string | null | undefined, now: Date) => !!iso && monthKey(new Date(iso)) === monthKey(now);

export const photoOf = (p: { hero_url?: string | null; cover_image_url?: string | null; thumbnail_url?: string | null }) =>
  p.hero_url || p.cover_image_url || p.thumbnail_url || null;

const WATCH = new Set(["teaching", "clip"]);
const READ = new Set(["essay", "blog"]);

export async function fetchHomeData(nowInput: Date = new Date()): Promise<HomeData> {
  const now = nowInput;
  const [piecesR, seriesR, devoR, prodR, copyR] = await Promise.all([
    supabase.from("content_items_public").select("*").not("release_at", "is", null).order("release_at", { ascending: false }).limit(120),
    supabase.from("collections").select("id, slug, title, series_month, summary, banner_url, cover_image_url, hero_focal_desktop, hero_focal_mobile").not("series_month", "is", null).order("series_month", { ascending: true }),
    supabase.from("devotional_templates").select("id, title, slug, description, duration_days, hero_url, hero_focal_desktop, hero_focal_mobile, release_at, feature_new_this_month, is_featured, updated_at").eq("status", "published").eq("is_default", false).order("is_featured", { ascending: false }).order("updated_at", { ascending: false }).limit(24),
    supabase.from("shop_products").select("id, slug, title, subtitle, category, cover_image_url, checkout_url").eq("is_active", true).order("sort_order", { ascending: true }).limit(4),
    supabase.from("page_content").select("field_key, field_value").eq("page_key", "home"),
  ]);
  const pieces = (piecesR.data ?? []) as Piece[];
  const series = (seriesR.data ?? []) as SeriesRow[];
  const devos = (devoR.data ?? []) as unknown as DevoRow[];
  const copy: Record<string, string> = {};
  for (const r of copyR.data ?? []) copy[r.field_key] = r.field_value ?? "";

  const released = pieces.filter((p) => isReleased(p.release_at, now));
  const cur = monthKey(now);
  const currentSeries = series.find((s) => s.series_month && s.series_month.slice(0, 7) === cur) ?? null;
  const nextSeries = series.find((s) => s.series_month && s.series_month.slice(0, 7) > cur) ?? null;

  // Current series parts, in release order (includes scheduled parts).
  let schedule: HomeData["schedule"] = [];
  let seriesPieceIds = new Set<string>();
  if (currentSeries) {
    const { data: links } = await supabase.from("collection_items").select("content_id, position").eq("collection_id", currentSeries.id);
    seriesPieceIds = new Set((links ?? []).map((l) => l.content_id).filter((x): x is string => !!x));
    schedule = pieces
      .filter((p) => p.id && seriesPieceIds.has(p.id))
      .sort((a, b) => (a.release_at ?? "").localeCompare(b.release_at ?? ""))
      .map((p) => ({ piece: p, released: isReleased(p.release_at, now) }));
  }

  const used = new Set<string>();
  const take = (list: Piece[], n: number) => {
    const out: Piece[] = [];
    for (const p of list) { if (out.length >= n) break; if (p.id && !used.has(p.id)) { used.add(p.id); out.push(p); } }
    return out;
  };

  const hero = released.find((p) => p.is_featured && photoOf(p)) ?? released.find((p) => p.is_featured) ?? released.find((p) => photoOf(p)) ?? released[0] ?? null;
  if (hero?.id) used.add(hero.id);
  const heroSeries = hero?.id && seriesPieceIds.has(hero.id) ? currentSeries : null;

  // New this month: flagged pieces + devotionals in the current month (released or coming), by date.
  const flagged: NewCard[] = [
    ...pieces.filter((p) => p.feature_new_this_month && sameMonth(p.release_at, now) && p.id && !used.has(p.id))
      .map((p) => ({ kind: "piece" as const, piece: p, at: p.release_at! })),
    ...devos.filter((d) => d.feature_new_this_month && sameMonth(d.release_at, now))
      .map((d) => ({ kind: "devotional" as const, devo: d, at: d.release_at! })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  let newThisMonth = flagged.slice(0, 3);
  if (!newThisMonth.length) {
    newThisMonth = released.filter((p) => sameMonth(p.release_at, now) && p.id && !used.has(p.id)).slice(0, 3)
      .map((p) => ({ kind: "piece" as const, piece: p, at: p.release_at! }));
  }
  for (const c of newThisMonth) if (c.kind === "piece" && c.piece.id) used.add(c.piece.id);

  const watch = take(released.filter((p) => (p.type && WATCH.has(p.type)) || p.shelf === "watch"), 4);
  const read = take(released.filter((p) => (p.type && READ.has(p.type)) || p.shelf === "read"), 4);
  const listen = take(released.filter((p) => p.type === "podcast" || p.shelf === "listen"), 4);
  const devotionals = devos.filter((d) => !d.release_at || isReleased(d.release_at, now)).slice(0, 3);

  return {
    now: now.toISOString(), hero, heroSeries, currentSeries, nextSeries, newThisMonth, schedule,
    devotionals, watch, read, listen, products: (prodR.data ?? []) as ProductRow[], copy,
  };
}

export function useHomeData(now?: Date) {
  const key = now ? now.toISOString() : "live";
  return useQuery({ queryKey: ["content-home", key], queryFn: () => fetchHomeData(now ?? new Date()), staleTime: 60_000 });
}

export const TYPE_LABEL: Record<string, string> = {
  teaching: "Teaching", essay: "Article", blog: "Article", podcast: "Podcast", clip: "Clip", promoted: "Feature",
};
export const TYPE_DOT: Record<string, string> = {
  teaching: "var(--cs-amber)", clip: "var(--cs-amber)", essay: "var(--cs-green)", blog: "var(--cs-green)",
  podcast: "var(--cs-periwinkle)", promoted: "var(--cs-ink)", devotional: "var(--cs-blush)",
};

/** Short month/day label, e.g. "Nov 24", in the reader's own time zone. */
export const shortDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
