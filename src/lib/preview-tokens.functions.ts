import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Admin-only: mint a 14-day read-only share link token for a piece. Only the hash is stored. */
export const createPreviewToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { scope: "content" | "devotional"; targetId: string }) => {
    if (input.scope !== "content" && input.scope !== "devotional") throw new Error("Bad scope");
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

export type PreviewPayload = {
  scope: "content" | "devotional";
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
