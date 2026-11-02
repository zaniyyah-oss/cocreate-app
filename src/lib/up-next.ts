import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ContentPreview = Database["public"]["Views"]["content_items_public"]["Row"];
export type ContentType = Database["public"]["Enums"]["content_type"];

export type UpNextRow = {
  savedId: string;
  saved_at: string;
  kept: boolean;
  finished_at: string | null;
  content: ContentPreview;
};

export const UP_NEXT_KEY = "up-next";

export const routeForType = (t: ContentType | null | undefined) =>
  t === "teaching" || t === "clip" ? "/teachings/$id" : t === "podcast" ? "/podcasts/$id" : "/essays/$id";

export function useSessionUserId() {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);
  return userId;
}

/** Every saved content item (Up next + Kept), newest first. */
export function useUpNext(userId: string | null | undefined) {
  return useQuery({
    queryKey: [UP_NEXT_KEY, userId],
    enabled: !!userId,
    queryFn: async (): Promise<UpNextRow[]> => {
      const { data, error } = await (supabase.from("saved_items") as any)
        .select("id, content_item_id, saved_at, kept, finished_at")
        .eq("user_id", userId!)
        .not("content_item_id", "is", null)
        .order("saved_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as any[];
      const ids = rows.map((r) => r.content_item_id as string);
      if (!ids.length) return [];
      const { data: content } = await supabase.from("content_items_public").select("*").in("id", ids);
      const map = new Map<string, ContentPreview>();
      (content ?? []).forEach((c) => c.id && map.set(c.id, c as ContentPreview));
      return rows
        .filter((r) => map.has(r.content_item_id))
        .map((r) => ({
          savedId: r.id,
          saved_at: r.saved_at,
          kept: !!r.kept,
          finished_at: r.finished_at ?? null,
          content: map.get(r.content_item_id)!,
        }));
    },
  });
}

export function useInvalidateUpNext() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: [UP_NEXT_KEY] });
    qc.invalidateQueries({ queryKey: ["saved"] });
  };
}

export async function saveForLater(userId: string, contentId: string) {
  const { data: existing } = await supabase
    .from("saved_items").select("id").eq("user_id", userId).eq("content_item_id", contentId).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase
    .from("saved_items").insert({ user_id: userId, content_item_id: contentId }).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function removeSaved(savedId: string) {
  const { error } = await supabase.from("saved_items").delete().eq("id", savedId);
  if (error) throw error;
}

export async function setKept(savedId: string, kept: boolean) {
  const { error } = await (supabase.from("saved_items") as any)
    .update({ kept, finished_at: null }).eq("id", savedId);
  if (error) throw error;
}

/** Called when the reader reaches the end of an article / media. Only affects items still in Up next. */
export async function markFinished(userId: string, contentId: string) {
  await (supabase.from("saved_items") as any)
    .update({ finished_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("content_item_id", contentId)
    .eq("kept", false)
    .is("finished_at", null);
}

export function lengthLabel(c: ContentPreview): string {
  const secs = (c as any).duration_seconds as number | null | undefined;
  if (secs && secs > 0) return `${Math.max(1, Math.round(secs / 60))} min`;
  const rt = (c as any).read_time_minutes as number | null | undefined;
  if (rt && rt > 0) return `${rt} min read`;
  const words = (((c as any).body as string | undefined) ?? "").split(/\s+/).filter(Boolean).length;
  return words > 0 ? `${Math.max(1, Math.round(words / 220))} min read` : "";
}

export function typeLabel(t: ContentType | null | undefined) {
  switch (t) {
    case "teaching": return "Teaching";
    case "podcast": return "Podcast";
    case "clip": return "Clip";
    case "blog": return "Blog";
    case "promoted": return "Featured";
    default: return "Essay";
  }
}

async function defaultTemplateId(): Promise<string | null> {
  const { data } = await supabase
    .from("devotional_templates").select("id").eq("is_default" as any, true).eq("status", "published").maybeSingle();
  return data?.id ?? null;
}

/** Create an open workspace note "Reflection: <title>" with a link card back to the content. */
export async function createReflectionNote(userId: string, c: ContentPreview) {
  const title = `Reflection: ${c.title ?? "Untitled"}`;
  const path = routeForType(c.type).replace("$id", c.id ?? "");
  const href = typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
  const body = {
    type: "doc",
    content: [
      { type: "linkCard", attrs: { href, title: c.title ?? "", description: c.excerpt ?? "", image: (c as any).cover_image_url || c.thumbnail_url || "", siteName: "CoCreate", domain: "" } },
      { type: "paragraph" },
    ],
  };
  const { data, error } = await supabase
    .from("workspace_items" as any)
    .insert({ user_id: userId, kind: "note", title, body, body_text: c.title ?? "", tags: [], status: "open" })
    .select("id")
    .single();
  if (error) throw error;
  return { noteId: (data as any).id as string, templateId: await defaultTemplateId() };
}
