import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { AppShell } from "@/components/AppShell";
import { useQueryClient } from "@tanstack/react-query";

type Template = Database["public"]["Tables"]["devotional_templates"]["Row"];
type Topic = Database["public"]["Tables"]["topics"]["Row"];

export const Route = createFileRoute("/devotionals")({
  component: DevotionalsPage,
  head: () => ({
    meta: [
      { title: "Devotionals — CoCreate" },
      { name: "description", content: "Your devotional practice on CoCreate: pick up where you left off or start a new template." },
      { property: "og:title", content: "Devotionals — CoCreate" },
      { property: "og:description", content: "A calm, repeatable practice space." },
    ],
  }),
});

const TOPIC_COLORS: Record<string, string> = {
  amber: "#F5B301", teal: "#0F4A42", lime: "#DCE07A", "light-green": "#C7E39B",
  coral: "#FF340C", navy: "#181A4D", cream: "#FBF8ED", brown: "#441B07",
};
const topicColor = (k?: string | null) => (k && TOPIC_COLORS[k]) || "#0F4A42";

const CSS = `
.dv-root *{box-sizing:border-box;}
.dv-root{min-height:100vh;background:#eee9d9;font-family:'Poppins',sans-serif;color:#20201c;}
.dv-nav{background:#fff;border-bottom:1px solid rgba(20,20,20,0.08);padding:14px 24px;display:flex;align-items:center;justify-content:space-between;gap:12px;position:sticky;top:0;z-index:50;}
.dv-brand{display:flex;align-items:center;gap:10px;text-decoration:none;}
.dv-brand .mark{width:28px;height:28px;background:#DCE07A;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#181A4D;font-weight:900;}
.dv-brand .word{font-weight:900;font-size:19px;color:#181A4D;letter-spacing:-0.02em;}
.dv-navlinks{display:flex;gap:22px;}
.dv-navlink{color:#8a8678;font-weight:700;font-size:13px;text-decoration:none;}
.dv-navlink.active{color:#181A4D;}
.dv-signin{background:#181A4D;color:#fff;font-weight:800;font-size:12.5px;padding:9px 18px;border-radius:20px;text-decoration:none;border:none;cursor:pointer;font-family:'Poppins';}
.dv-shell{max-width:1080px;margin:0 auto;padding:52px 28px 100px;}
.dv-head h1{font-size:38px;font-weight:900;letter-spacing:-0.03em;color:#181A4D;margin:0 0 8px;line-height:1.1;}
.dv-head p{font-size:15px;color:#8a8678;margin:0 0 40px;max-width:520px;line-height:1.6;}
.dv-section h2{font-size:13px;font-weight:800;color:#8a8678;letter-spacing:0.14em;text-transform:uppercase;margin:0 0 18px;}
.dv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:20px;}
.dv-card{background:#fff;border-radius:16px;padding:0;overflow:hidden;cursor:pointer;transition:transform .18s ease, box-shadow .18s ease;border:1px solid rgba(20,20,20,0.06);display:flex;flex-direction:column;}
.dv-card:hover{transform:translateY(-3px);box-shadow:0 18px 40px rgba(0,0,0,0.08);}
.dv-accent{height:6px;width:100%;}
.dv-card-body{padding:22px 22px 24px;}
.dv-topic{font-size:10.5px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#0F4A42;margin-bottom:10px;}
.dv-card h3{font-size:18px;font-weight:800;color:#181A4D;letter-spacing:-0.01em;margin:0 0 14px;line-height:1.3;}
.dv-progress{margin-top:auto;}
.dv-pbar{height:5px;background:#FBF8ED;border-radius:99px;overflow:hidden;margin-bottom:8px;}
.dv-pbar div{height:100%;background:#0F4A42;border-radius:99px;transition:width .3s ease;}
.dv-plabel{font-size:12px;color:#8a8678;font-weight:600;}
.dv-empty{background:#fff;border:1.5px dashed rgba(20,20,20,0.12);border-radius:16px;padding:44px 32px;text-align:center;}
.dv-empty h3{font-size:18px;font-weight:800;color:#181A4D;margin:0 0 8px;letter-spacing:-0.01em;}
.dv-empty p{font-size:13.5px;color:#8a8678;margin:0 0 20px;line-height:1.6;}
.dv-empty a{background:#181A4D;color:#fff;font-weight:700;font-size:12.5px;padding:10px 20px;border-radius:20px;text-decoration:none;display:inline-block;font-family:'Poppins';}
.dv-block{margin-top:56px;}
.dv-block h2{margin-bottom:18px;}
.dv-signgate{background:#fff;border:1px solid rgba(20,20,20,0.08);border-left:4px solid #FF340C;border-radius:14px;padding:22px;max-width:520px;}
.dv-signgate h3{font-size:16px;font-weight:800;color:#181A4D;margin:0 0 6px;}
.dv-signgate p{font-size:13.5px;color:#8a8678;margin:0 0 14px;line-height:1.55;}
.dv-skel{height:180px;background:#fff;border-radius:16px;animation:dvp 1.4s infinite;}
@keyframes dvp{0%,100%{opacity:1}50%{opacity:.55}}
`;

function useAuth() {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setUserId(data.session?.user.id ?? null); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);
  return { userId, ready };
}

function DevotionalsPage() {
  const { userId, ready } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.body.style.background = "#eee9d9";
    return () => { document.body.style.background = ""; };
  }, []);

  // Templates saved by the user
  const savedQ = useQuery({
    queryKey: ["dev-saved", userId],
    enabled: ready && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("saved_items").select("devotional_template_id").eq("user_id", userId!).not("devotional_template_id", "is", null);
      if (error) throw error;
      return (data ?? []).map((r) => r.devotional_template_id!).filter(Boolean);
    },
  });

  // Distinct template_ids the user has entries for
  const entryTemplatesQ = useQuery({
    queryKey: ["dev-entry-templates", userId],
    enabled: ready && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("devotional_entries").select("template_id, entry_date").eq("user_id", userId!).not("template_id", "is", null);
      if (error) throw error;
      const byT: Record<string, Set<string>> = {};
      (data ?? []).forEach((r) => {
        if (!r.template_id) return;
        (byT[r.template_id] ||= new Set()).add(r.entry_date);
      });
      return byT;
    },
  });

  const templateIds = Array.from(new Set([...(savedQ.data ?? []), ...Object.keys(entryTemplatesQ.data ?? {})]));

  const templatesQ = useQuery({
    queryKey: ["dev-templates", templateIds.sort().join(",")],
    enabled: templateIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("devotional_templates").select("*").in("id", templateIds);
      if (error) throw error;
      return (data ?? []) as Template[];
    },
  });

  const topicsQ = useQuery({
    queryKey: ["topics-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("topics").select("*");
      if (error) throw error;
      const m: Record<string, Topic> = {};
      (data ?? []).forEach((t) => { m[t.id] = t as Topic; });
      return m;
    },
  });

  if (ready && !userId) {
    return (
      <AppShell current="devotionals">
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="dv-root">
        <div className="dv-shell">
          <div className="dv-head">
            <h1>Devotionals</h1>
            <p>A calm, repeatable practice space. Reflect, pray, and apply — a few minutes at a time.</p>
          </div>
          <div className="dv-signgate">
            <h3>Sign in to start your practice</h3>
            <p>Your devotional entries and progress are private and saved to your account.</p>
            <Link to="/auth" className="dv-signin">Sign in</Link>
          </div>
        </div>
        </div>
      </AppShell>
    );
  }

  const loading = savedQ.isLoading || entryTemplatesQ.isLoading || templatesQ.isLoading;
  const templates = templatesQ.data ?? [];
  const entryMap = entryTemplatesQ.data ?? {};

  return (
    <AppShell current="devotionals">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="dv-root">


      <div className="dv-shell">
        <div className="dv-head">
          <h1>Devotionals</h1>
          <p>A calm, repeatable practice space. Pick up where you left off, or explore a new template.</p>
        </div>

        <div className="dv-section">
          <h2>Your templates</h2>

          {loading ? (
            <div className="dv-grid">
              <div className="dv-skel" /><div className="dv-skel" /><div className="dv-skel" />
            </div>
          ) : templates.length === 0 ? (
            <div className="dv-empty">
              <h3>No templates yet</h3>
              <p>Save a devotional template from Explore to begin a practice. Everything you write stays private to you.</p>
              <Link to="/explore">Browse devotionals</Link>
            </div>
          ) : (
            <div className="dv-grid">
              {templates.map((t) => {
                const topic = t.topic_id ? topicsQ.data?.[t.topic_id] : undefined;
                const color = topicColor(topic?.color_key);
                const days = entryMap[t.id]?.size ?? 0;
                const label = days === 0 ? "Not started yet" : `Day ${days} of an open practice`;
                const pct = Math.min(100, days === 0 ? 4 : Math.min(100, days * 8));
                return (
                  <div key={t.id} className="dv-card" onClick={() => navigate({ to: "/devotionals/$id", params: { id: t.id } })}>
                    <div className="dv-accent" style={{ background: color }} />
                    <div className="dv-card-body" style={{ display: "flex", flexDirection: "column", minHeight: 180 }}>
                      {topic && (
                        <Link
                          to="/topics/$slug"
                          params={{ slug: topic.slug }}
                          className="dv-topic"
                          style={{ color, textDecoration: "none" }}
                          onClick={(e) => e.stopPropagation()}
                        >{topic.name} →</Link>
                      )}
                      <h3>{t.title}</h3>
                      <div className="dv-progress">
                        <div className="dv-pbar"><div style={{ width: `${pct}%`, background: color }} /></div>
                        <div className="dv-plabel">{label}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      </div>
    </AppShell>
  );
}

