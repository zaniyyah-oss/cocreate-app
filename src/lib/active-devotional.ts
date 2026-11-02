import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getActivePlanForDate } from "@/lib/plans.functions";

export type ActiveDevotional = {
  kind: "plan" | "template";
  title: string;
  day: number;
  total: number;
  /** Template id for the workspace route, when the devotional is a published template. */
  templateId: string | null;
};

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayNumber(startIso: string, todayIso: string) {
  const a = new Date(`${startIso}T12:00:00`).getTime();
  const b = new Date(`${todayIso}T12:00:00`).getTime();
  return Math.round((b - a) / 86400000) + 1;
}

/** The devotional the user is currently in the middle of (a plan they started, or a devotional they subscribed to). */
export function useActiveDevotional(userId: string | null | undefined) {
  const fetchActive = useServerFn(getActivePlanForDate);
  return useQuery({
    queryKey: ["active-devotional", userId, todayISO()],
    enabled: !!userId,
    queryFn: async (): Promise<ActiveDevotional | null> => {
      const today = todayISO();
      try {
        const plan = await fetchActive({ data: { date: today } as any });
        if (plan) {
          return { kind: "plan", title: plan.plan.name, day: plan.day_number, total: plan.plan.length_days, templateId: null };
        }
      } catch { /* fall through to subscribed devotionals */ }
      const { data } = await supabase
        .from("saved_items")
        .select("saved_at, devotional_templates(id, title, duration_days, is_default)")
        .eq("user_id", userId!)
        .not("devotional_template_id", "is", null)
        .order("saved_at", { ascending: false });
      for (const r of (data ?? []) as any[]) {
        const t = r.devotional_templates;
        if (!t || t.is_default || !t.duration_days) continue;
        const day = dayNumber(String(r.saved_at).slice(0, 10), today);
        if (day >= 1 && day <= t.duration_days) {
          return { kind: "template", title: t.title, day, total: t.duration_days, templateId: t.id };
        }
      }
      return null;
    },
  });
}
