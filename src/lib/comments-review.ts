import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Flagged or auto-hidden comments awaiting review (admins only; 0 for everyone else). */
export function useCommentsReviewCount() {
  return useQuery({
    queryKey: ["comments-review-count"], staleTime: 30_000,
    queryFn: async () => (((await (supabase.rpc as any)("comments_review_count")).data ?? 0) as number),
  });
}
