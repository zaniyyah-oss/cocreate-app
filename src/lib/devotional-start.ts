import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PublishedDevotional = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  duration_days: number | null;
  accent_color: string | null;
};

/** Published CoCreate devotionals (the platform default daily workspace template is excluded). */
export function usePublishedDevotionals(limit = 24) {
  return useQuery({
    queryKey: ["published-devotionals", limit],
    queryFn: async (): Promise<PublishedDevotional[]> => {
      const { data, error } = await supabase
        .from("devotional_templates")
        .select("id, title, slug, description, duration_days, accent_color, is_default, is_featured, updated_at")
        .eq("status", "published")
        .eq("is_default" as any, false)
        .order("is_featured" as any, { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as any;
    },
    staleTime: 60_000,
  });
}

/** Template ids the user has saved/started. */
export function useSavedTemplateIds(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["saved-template-ids", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("saved_items").select("id, devotional_template_id")
        .eq("user_id", userId!).not("devotional_template_id", "is", null);
      const m: Record<string, string> = {};
      (data ?? []).forEach((r: any) => { m[r.devotional_template_id] = r.id; });
      return m;
    },
  });
}

/** Same as subscribing on a devotional's overview page: record it on the user's saved devotionals. */
export async function subscribeToDevotional(userId: string, templateId: string) {
  const { data: existing } = await supabase
    .from("saved_items").select("id").eq("user_id", userId).eq("devotional_template_id", templateId).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase
    .from("saved_items").insert({ user_id: userId, devotional_template_id: templateId }).select("id").single();
  if (error) throw error;
  return data.id;
}
