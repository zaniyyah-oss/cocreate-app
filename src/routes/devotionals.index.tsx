import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

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

const DEFAULT_TPL_KEY = "cocreate:default-template-id";
const readCachedTemplateId = () => {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(DEFAULT_TPL_KEY); } catch { return null; }
};

function DevotionalsIndex() {
  // "/devotionals" is no longer a browsing page. It IS Abide — redirect
  // straight to the platform default (Abide) entry page.
  const cachedId = readCachedTemplateId();

  const defaultQ = useQuery({
    queryKey: ["platform-default-template-id"],
    initialData: cachedId ?? undefined,
    queryFn: async () => {
      const { data } = await supabase
        .from("devotional_templates")
        .select("id")
        .eq("is_default" as any, true)
        .eq("status", "published")
        .maybeSingle();
      const id = data?.id ?? null;
      try { if (id) window.localStorage.setItem(DEFAULT_TPL_KEY, id); } catch { /* ignore */ }
      return id;
    },
  });

  // Guests fall through to the same redirect below — they get the guest preview
  // inside /devotionals/$id. No need to wait on the auth session here.

  if (!defaultQ.data && defaultQ.isLoading) {
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

  return <Navigate to="/devotionals/$id" params={{ id: defaultQ.data }} search={{} as any} replace />;
}
