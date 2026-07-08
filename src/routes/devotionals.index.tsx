import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/devotionals/")({
  component: DevotionalsIndex,
  head: () => ({
    meta: [
      { title: "Abide — CoCreate" },
      { name: "description", content: "Your daily Abide devotional — a simple anchor to read, pray, and move into your day." },
      { property: "og:title", content: "Abide — CoCreate" },
      { property: "og:description", content: "A calm, repeatable daily practice." },
    ],
  }),
});

function DevotionalsIndex() {
  // "/devotionals" is no longer a browsing page. It IS Abide — redirect
  // straight to the platform default (Abide) entry page.
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
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

  if (userId === null) {
    return (
      <AppShell current="devotionals">
        <div style={{ maxWidth: 520, margin: "80px auto", padding: 24, fontFamily: "Poppins,sans-serif", background: "#fff", borderRadius: 14, border: "1px solid rgba(20,20,20,0.08)", borderLeft: "4px solid #FF340C" }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#181A4D" }}>Sign in to open Abide</h3>
          <p style={{ fontSize: 13.5, color: "#8a8678", margin: "6px 0 14px", lineHeight: 1.55 }}>Your entries are private and saved to your account.</p>
          <Link to="/auth" style={{ background: "#181A4D", color: "#fff", fontWeight: 800, fontSize: 12.5, padding: "9px 18px", borderRadius: 20, textDecoration: "none" }}>Sign in</Link>
        </div>
      </AppShell>
    );
  }

  if (defaultQ.isLoading || userId === undefined) {
    return (
      <AppShell current="devotionals">
        <div style={{ minHeight: "60vh" }} />
      </AppShell>
    );
  }

  if (!defaultQ.data) {
    return (
      <AppShell current="devotionals">
        <div style={{ maxWidth: 520, margin: "80px auto", padding: 24, fontFamily: "Poppins,sans-serif", textAlign: "center", color: "#8a8678" }}>
          <h3 style={{ color: "#181A4D", fontWeight: 800 }}>Abide isn't set up yet</h3>
          <p>Check back soon.</p>
        </div>
      </AppShell>
    );
  }

  return <Navigate to="/devotionals/$id" params={{ id: defaultQ.data }} replace />;
}
