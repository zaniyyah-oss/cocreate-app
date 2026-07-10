import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PageContentMap = Record<string, string>;

export function usePageContent(pageKey: string) {
  return useQuery({
    queryKey: ["page-content", pageKey],
    queryFn: async (): Promise<PageContentMap> => {
      const { data, error } = await supabase
        .from("page_content")
        .select("field_key, field_value")
        .eq("page_key", pageKey);
      if (error) throw error;
      const map: PageContentMap = {};
      for (const r of data ?? []) map[r.field_key] = r.field_value ?? "";
      return map;
    },
    staleTime: 30_000,
  });
}

/** Human-readable label for a snake_case field_key. */
export function labelizeField(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bCta\b/g, "CTA")
    .replace(/\bUrl\b/g, "URL");
}

/** Human-readable label for a snake_case page_key. */
export function labelizePage(key: string): string {
  const map: Record<string, string> = {
    home_hero: "Homepage — Hero",
    site_nav: "Site Navigation",
    site_footer: "Site Footer",
    devotional_overview: "Devotional Overview Page",
  };
  return map[key] ?? labelizeField(key);
}

/** Preview route for a given page_key (best-effort). */
export function previewRouteFor(pageKey: string): string {
  if (pageKey === "home_hero") return "/";
  if (pageKey === "site_nav") return "/";
  if (pageKey === "site_footer") return "/";
  if (pageKey === "devotional_overview") return "/devotionals";
  return "/";
}
