import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** A user-defined calendar category, e.g. "Girls night" or "Conference". */
export type EventCategory = {
  id: string;
  label: string;
  color: string;
  sort_order: number;
};

/** Colors offered when naming a new category. Plain, obvious names. */
export const CATEGORY_COLORS: { name: string; value: string }[] = [
  { name: "Navy", value: "#181A4D" },
  { name: "Blue", value: "#2E9BE6" },
  { name: "Light blue", value: "#8A96E0" },
  { name: "Dark green", value: "#0F4A42" },
  { name: "Green", value: "#4FA92B" },
  { name: "Lime", value: "#DCE07A" },
  { name: "Yellow", value: "#F5F740" },
  { name: "Orange", value: "#FFAE00" },
  { name: "Red", value: "#FF340C" },
  { name: "Coral", value: "#FF6B4A" },
  { name: "Pink", value: "#E990A2" },
  { name: "Brown", value: "#441B07" },
  { name: "Gray", value: "#9B9B93" },
];


export function useEventCategories(userId: string | null) {
  return useQuery({
    queryKey: ["event-categories", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<EventCategory[]> => {
      const { data, error } = await supabase
        .from("user_event_types" as any)
        .select("id,label,color,sort_order")
        .eq("user_id", userId!)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as EventCategory[];
    },
  });
}

export async function createEventCategory(
  userId: string,
  label: string,
  color: string,
  sortOrder = 0,
): Promise<EventCategory> {
  const { data, error } = await supabase
    .from("user_event_types" as any)
    .insert({ user_id: userId, label: label.trim(), color, sort_order: sortOrder })
    .select("id,label,color,sort_order")
    .single();
  if (error) throw error;
  return data as unknown as EventCategory;
}

export async function updateEventCategory(
  id: string,
  patch: { label?: string; color?: string },
): Promise<void> {
  const { error } = await supabase
    .from("user_event_types" as any)
    .update(patch)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteEventCategory(id: string): Promise<void> {
  const { error } = await supabase.from("user_event_types" as any).delete().eq("id", id);
  if (error) throw error;
}
