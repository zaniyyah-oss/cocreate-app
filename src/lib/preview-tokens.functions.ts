import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Admin-only: mint a 14-day read-only share link token for a piece. Only the hash is stored. */
export const createPreviewToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { scope: "content" | "devotional" | "series"; targetId: string }) => {
    if (input.scope !== "content" && input.scope !== "devotional" && input.scope !== "series") throw new Error("Bad scope");
    if (!/^[0-9a-f-]{36}$/i.test(input.targetId)) throw new Error("Bad id");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const { error } = await context.supabase.from("preview_tokens").insert({ token_hash: await sha256(token), scope: data.scope, target_id: data.targetId, created_by: context.userId });
    if (error) throw new Error(error.message);
    return { token };
  });

export type SeriesPreview = {
  series: any; parts: any[]; clips: any[]; devo: { id: string; title: string; hero_url: string | null; duration_days: number | null } | null; authors: string[];
};
export type PreviewPayload = {
  scope: "content" | "devotional" | "series";
  seriesPage?: SeriesPreview;
  expiresAt: string;
  piece: {
    kind: string; title: string; summary: string | null; heroUrl: string | null; heroCaption: string | null;
    fd: string | null; fm: string | null; doc: any; seriesTitle: string | null; part: number | null; seriesTotal: number;
    videoUrl: string | null; mediaUrl: string | null; speaker: string | null;
  };
  days: { day_number: number; title: string; scripture_reference: string | null; scripture_passage: string | null; reflection_doc: any; questions: string[]; pray_prompt: string | null }[];
} | null;

/** Public: resolve a share token to a read-only staged piece. Returns null for unknown, expired or revoked tokens. */
export const getPreviewByToken = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => {
    if (typeof input?.token !== "string" || input.token.length < 16 || input.token.length > 64) throw new Error("Bad token");
    return input;
  })
  .handler(async ({ data }): Promise<PreviewPayload> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: tok } = await supabaseAdmin.from("preview_tokens").select("scope, target_id, expires_at, revoked_at").eq("token_hash", await sha256(data.token)).maybeSingle();
    if (!tok || tok.revoked_at || new Date(tok.expires_at).getTime() < Date.now()) return null;
    if (tok.scope === "series") {
      const seriesPage = await seriesPreview(supabaseAdmin, tok.target_id);
      if (!seriesPage) return null;
      return { scope: "series", expiresAt: tok.expires_at, seriesPage, days: [], piece: { kind: "series", title: seriesPage.series.title, summary: seriesPage.series.summary, heroUrl: null, heroCaption: null, fd: null, fm: null, doc: null, seriesTitle: null, part: null, seriesTotal: 0, videoUrl: null, mediaUrl: null, speaker: null } };
    }
    const { data: links } = await supabaseAdmin.from("collection_items").select("collection_id, content_id, template_id, position");
    const mine = (links ?? []).find((l) => (tok.scope === "content" ? l.content_id : l.template_id) === tok.target_id);
    let seriesTitle: string | null = null, part: number | null = null, seriesTotal = 0;
    if (mine) {
      const sib = (links ?? []).filter((l) => l.collection_id === mine.collection_id).sort((a, b) => a.position - b.position);
      seriesTotal = sib.length;
      const idx = sib.indexOf(mine);
      part = mine.position > 0 ? mine.position : idx + 1;
      const { data: s } = await supabaseAdmin.from("collections").select("title").eq("id", mine.collection_id).maybeSingle();
      seriesTitle = s?.title ?? null;
    }
    if (tok.scope === "content") {
      const { data: c } = await supabaseAdmin.from("content_items").select("type, title, summary, excerpt, hero_url, cover_image_url, hero_caption, hero_focal_desktop, hero_focal_mobile, body_doc, body, video_url, media_url, author_name").eq("id", tok.target_id).maybeSingle();
      if (!c) return null;
      const { textToDoc } = await import("@/lib/piece-doc");
      return { scope: "content", expiresAt: tok.expires_at, days: [], piece: { kind: c.type, title: c.title, summary: c.summary ?? c.excerpt, heroUrl: c.hero_url ?? c.cover_image_url, heroCaption: c.hero_caption, fd: c.hero_focal_desktop, fm: c.hero_focal_mobile, doc: c.body_doc ?? textToDoc(c.body), seriesTitle, part, seriesTotal, videoUrl: c.video_url, mediaUrl: c.media_url, speaker: c.author_name } };
    }
    const { data: d } = await supabaseAdmin.from("devotional_templates").select("title, description, hero_url, hero_focal_desktop, hero_focal_mobile").eq("id", tok.target_id).maybeSingle();
    if (!d) return null;
    const { data: days } = await supabaseAdmin.from("devotional_days").select("day_number, title, scripture_reference, scripture_passage, reflection_doc, questions, pray_prompt").eq("template_id", tok.target_id).order("day_number");
    return { scope: "devotional", expiresAt: tok.expires_at, piece: { kind: "devotional", title: d.title, summary: d.description, heroUrl: d.hero_url, heroCaption: null, fd: d.hero_focal_desktop, fm: d.hero_focal_mobile, doc: null, seriesTitle, part, seriesTotal, videoUrl: null, mediaUrl: null, speaker: null }, days: (days ?? []).map((x) => ({ ...x, questions: Array.isArray(x.questions) ? (x.questions as string[]) : [] })) as any };
  });

/** Whole series page for a share link: every part as it stands now, planned slots only as "Coming [date]". */
async function seriesPreview(admin: any, id: string): Promise<SeriesPreview | null> {
  const { data: s } = await admin.from("collections").select("id, slug, title, summary, description, writeup_title, writeup_body, banner_url, cover_image_url, hero_focal_desktop, hero_focal_mobile, series_month, devotional_template_id, eyebrow, themes, taught_by, about_doc").eq("id", id).maybeSingle();
  if (!s) return null;
  const now = Date.now();
  const rel = (iso: string | null) => !!iso && new Date(iso).getTime() <= now;
  const { data: L } = await admin.from("collection_items").select("id, content_id, template_id, position, planned_title, planned_kind, planned_at, show_title_publicly").eq("collection_id", id).order("position");
  const items = (L ?? []) as any[];
  const cids = items.map((l) => l.content_id).filter(Boolean);
  const tids = items.map((l) => l.template_id).filter(Boolean);
  const [{ data: cs }, { data: ts }] = await Promise.all([
    cids.length ? admin.from("content_items").select("id, type, title, release_at, status, hero_url, cover_image_url, thumbnail_url, summary, excerpt, author_name, duration_seconds, read_time_minutes").in("id", cids) : { data: [] },
    tids.length ? admin.from("devotional_templates").select("id, title, release_at, status, hero_url, duration_days, description").in("id", tids) : { data: [] },
  ]);
  const cm = new Map(((cs ?? []) as any[]).map((c) => [c.id, c]));
  const tm = new Map(((ts ?? []) as any[]).map((t) => [t.id, t]));
  const parts: any[] = [];
  const authors: string[] = [];
  for (const l of items) {
    const c = l.content_id ? cm.get(l.content_id) : null;
    const t = l.template_id ? tm.get(l.template_id) : null;
    if (c) {
      if (c.author_name && !authors.includes(c.author_name)) authors.push(c.author_name);
      parts.push({ key: l.id, kind: c.type, title: c.title, releaseAt: c.release_at, released: c.status === "published" && rel(c.release_at), piece: null, templateId: null, collectionItemId: l.id, thumb: c.hero_url || c.cover_image_url || c.thumbnail_url, summary: c.summary || c.excerpt, length: c.duration_seconds ? `${Math.max(1, Math.round(c.duration_seconds / 60))} min` : c.read_time_minutes ? `${c.read_time_minutes} min read` : "" });
    } else if (t) parts.push({ key: l.id, kind: "devotional", title: t.title, releaseAt: t.release_at, released: t.status === "published" && rel(t.release_at), piece: null, templateId: null, collectionItemId: l.id, thumb: t.hero_url, summary: t.description, length: t.duration_days ? `${t.duration_days} days` : "" });
    else if (l.planned_at) parts.push({ key: l.id, kind: l.planned_kind ?? "essay", title: l.show_title_publicly ? l.planned_title ?? "" : "", releaseAt: l.planned_at, released: false, piece: null, templateId: null, collectionItemId: l.id, thumb: null, summary: null, length: "" });
  }
  const { data: cl } = await admin.from("clips").select("id, caption, video_path, poster_path, duration_seconds, alt_text, position, release_at").eq("series_id", id).neq("caption", "").order("position");
  const clipRows = (cl ?? []) as any[];
  const paths = clipRows.flatMap((r) => [r.video_path, r.poster_path].filter(Boolean));
  const { data: signed } = paths.length ? await admin.storage.from("clips").createSignedUrls(paths, 60 * 15) : { data: [] };
  const url = new Map(((signed ?? []) as any[]).map((x) => [x.path, x.signedUrl]));
  const clips = clipRows.map((r) => ({ id: r.id, caption: r.caption, videoUrl: url.get(r.video_path) ?? null, posterUrl: r.poster_path ? url.get(r.poster_path) ?? null : null, duration: r.duration_seconds, seriesId: id, releaseAt: r.release_at, alt: r.alt_text, position: r.position, source: null, sourceSeconds: null }));
  let devo = null;
  if (s.devotional_template_id) {
    const { data: d } = await admin.from("devotional_templates").select("id, title, hero_url, duration_days").eq("id", s.devotional_template_id).maybeSingle();
    devo = d ?? null;
  }
  return { series: s, parts, clips, devo, authors };
}
