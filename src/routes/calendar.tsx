import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { MonthCalendarView } from "./devotionals.$id";

export const Route = createFileRoute("/calendar")({
  component: CalendarPage,
  head: () => ({
    meta: [
      { title: "Calendar — CoCreate" },
      { name: "description", content: "See your devotionals, events, and to-dos at a glance in a monthly calendar view." },
      { property: "og:title", content: "Calendar — CoCreate" },
      { property: "og:description", content: "A monthly overview of your Abide practice, events, and tasks." },
    ],
  }),
});

function CalendarPage() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const defaultQ = useQuery({
    queryKey: ["platform-default-template-id"],
    queryFn: async () => {
      const { data } = await supabase
        .from("devotional_templates")
        .select("id")
        .eq("is_default" as any, true)
        .eq("status", "published")
        .maybeSingle();
      return data?.id ?? null;
    },
  });

  return (
    <AppShell current="calendar">
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px 60px" }}>
        {defaultQ.data ? (
          <MonthCalendarView templateId={defaultQ.data} userId={userId} />
        ) : (
          <div style={{ minHeight: "40vh" }} />
        )}
      </div>
    </AppShell>
  );
}
