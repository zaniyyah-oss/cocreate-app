import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { orderRelated, type RelPiece, type RelatedResult } from "@/lib/related";

const UUID = /^[0-9a-f-]{36}$/i;
const COLS = "id, type, title, release_at, hero_url, cover_image_url, thumbnail_url, hero_focal_desktop, hero_focal_mobile, duration_seconds, read_time_minutes, summary, excerpt, slug";

export type RelatedRequest = {
  /** ISO "now" — the staged preview passes a simulated time. */
  now: string;
  seriesId?: string | null;
  topicId?: string | null;
  exclude?: string[];
  finished?: string[];
  topicLimit?: number;
  latestLimit?: number;
};

/** ONE related-content function for every content page (article, series, devotional day). */
export const getRelated = createServerFn({ method: "POST" })
  .inputValidator((input: RelatedRequest) => {
    if (!input || Number.isNaN(Date.parse(input.now))) throw new Error("Bad now");
    const ids = (a?: string[]) => (a ?? []).filter((x) => typeof x === "string" && UUID.test(x)).slice(0, 200);
    return {
      now: input.now,
      seriesId: input.seriesId && UUID.test(input.seriesId) ? input.seriesId : null,
      topicId: input.topicId && UUID.test(input.topicId) ? input.topicId : null,
      exclude: ids(input.exclude), finished: ids(input.finished),
      topicLimit: Math.min(Math.max(input.topicLimit ?? 3, 0), 12),
      latestLimit: Math.min(Math.max(input.latestLimit ?? 3, 0), 12),
    };
  })
  .handler(async ({ data }): Promise<RelatedResult & { topicName: string | null }> => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const sb = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      } },
    });
    const [piecesR, linksR, topicR, ctR] = await Promise.all([
      sb.from("content_items_public").select(COLS).not("release_at", "is", null).order("release_at", { ascending: false }).limit(300),
      data.seriesId ? sb.from("collection_items").select("content_id, position, sort_order, release_at").eq("collection_id", data.seriesId) : Promise.resolve({ data: [] as any[] }),
      data.topicId ? sb.from("topics").select("name").eq("id", data.topicId).maybeSingle() : Promise.resolve({ data: null }),
      data.topicId ? sb.from("content_topics").select("content_id").eq("topic_id", data.topicId) : Promise.resolve({ data: [] as any[] }),
    ]);
    const pieces = ((piecesR.data ?? []) as any[]).filter((p) => p.id) as RelPiece[];
    const byId = new Map(pieces.map((p) => [p.id, p]));
    const seriesOrder = ((linksR.data ?? []) as any[])
      .filter((l) => l.content_id && byId.has(l.content_id))
      .sort((a, b) => (a.sort_order ?? a.position ?? 0) - (b.sort_order ?? b.position ?? 0)
        || (byId.get(a.content_id)!.release_at ?? "").localeCompare(byId.get(b.content_id)!.release_at ?? ""))
      .map((l) => l.content_id as string);
    const topicName = ((topicR as any).data?.name as string | undefined) ?? null;
    const topicPieceIds = new Set(((ctR.data ?? []) as any[]).map((r) => r.content_id as string));
    const out = orderRelated({
      now: new Date(data.now), seriesOrder, topicName, topicPieceIds, pieces,
      exclude: data.exclude, finished: data.finished, topicLimit: data.topicLimit, latestLimit: data.latestLimit,
    });
    return { ...out, topicName };
  });
