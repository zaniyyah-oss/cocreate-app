import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { SavedDevotionalsSection } from "@/components/SavedDevotionals";
import { supabase } from "@/integrations/supabase/client";
import { useSessionUserId } from "@/lib/up-next";
import { useActiveDevotional, todayISO } from "@/lib/active-devotional";
import { usePublishedDevotionals, useSavedTemplateIds, subscribeToDevotional } from "@/lib/devotional-start";

export const Route = createFileRoute("/explore_/devotionals")({
  component: DevotionalsExplorePage,
  head: () => ({
    meta: [
      { title: "Devotionals — CoCreate" },
      { name: "description", content: "Read it here, live it in your workspace. Start a devotional and each day shows up in your Read, Pray and To-do." },
      { property: "og:title", content: "Devotionals — CoCreate" },
      { property: "og:description", content: "Start a devotional and each day shows up in your Read, Pray and To-do." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const DEV_CSS = `
.xd{max-width:1080px;margin:0 auto;padding:44px 24px 120px;font-family:'Poppins',sans-serif;color:#20201C;}
.xd-eyebrow{font-size:11.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#8a8678;margin-bottom:10px;}
.xd h1{font-weight:900;letter-spacing:-.02em;font-family:'Archivo Black','Poppins',sans-serif;font-size:40px;color:#181A4D;margin:0 0 8px;}
.xd-sub{font-size:14.5px;color:#6f6b5e;margin:0 0 34px;max-width:620px;line-height:1.55;}
.xd-h2{font-family:'Archivo Black','Poppins',sans-serif;font-weight:900;font-size:22px;color:#20201C;margin:0 0 14px;}
.xd-sec{margin-bottom:40px;}
.xd-active{background:#181A4D;color:#FBF8ED;border-radius:16px;padding:20px 22px;margin-bottom:18px;}
.xd-active .eb{font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#DCE07A;margin-bottom:6px;}
.xd-active h3{margin:0 0 12px;font-size:20px;font-weight:800;color:#fff;}
.xd-bar{height:6px;border-radius:99px;background:rgba(255,255,255,0.14);overflow:hidden;margin-bottom:16px;}
.xd-bar span{display:block;height:100%;background:#DCE07A;border-radius:99px;}
.xd-lime{display:inline-flex;align-items:center;background:#DCE07A;color:#181A4D;font-weight:800;font-size:13px;padding:10px 18px;border-radius:999px;text-decoration:none;border:none;cursor:pointer;font-family:inherit;}
.xd-lime:hover{background:#CAC307;}
.xd-build{background:#181A4D;color:#FBF8ED;border-radius:16px;padding:22px 24px;}
.xd-build h2{font-family:'Archivo Black','Poppins',sans-serif;font-weight:900;font-size:20px;margin:0 0 6px;color:#FBF8ED;}
.xd-build p{font-size:13px;line-height:1.5;margin:0;color:rgba(251,248,237,.82);max-width:520px;}
.xd-lens{display:flex;flex-wrap:wrap;gap:10px;margin:16px 0;}
.xd-len{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;background:#FBF8ED;border:1.5px solid #ECE4CE;border-radius:12px;padding:12px 18px;text-decoration:none;color:#20201C;min-height:58px;min-width:74px;}
.xd-len:hover{border-color:#FFAE00;}
.xd-len .n{font-family:'Archivo Black','Poppins',sans-serif;font-size:18px;line-height:1;}
.xd-len .l{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#8a8879;}
.xd-grid{display:grid;grid-template-columns:1fr;gap:14px;}
@media(min-width:760px){.xd-grid{grid-template-columns:repeat(2,1fr);}}
.xd-card{background:#fff;border:1px solid rgba(24,26,77,0.08);border-left:6px solid var(--acc,#0F4A42);border-radius:14px;padding:18px;display:flex;flex-direction:column;gap:8px;}
.xd-card h3{margin:0;font-size:17px;font-weight:800;color:#181A4D;}
.xd-card .meta{font-size:12px;color:#8a8678;font-weight:600;}
.xd-card p{margin:0;font-size:13.5px;color:#6b6656;line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}
.xd-card .row{display:flex;gap:8px;align-items:center;margin-top:6px;flex-wrap:wrap;}
.xd-start{background:#181A4D;color:#fff;border:none;border-radius:999px;padding:9px 16px;font-family:inherit;font-weight:800;font-size:12.5px;cursor:pointer;}
.xd-start:disabled{opacity:.6;}
.xd-ghost{background:#fff;color:#181A4D;border:1.5px solid rgba(24,26,77,0.2);border-radius:999px;padding:8px 14px;font-family:inherit;font-weight:700;font-size:12.5px;cursor:pointer;text-decoration:none;}
.xd-ghost.on{background:#DCE07A;border-color:#DCE07A;}
@media(max-width:640px){.xd{padding:24px 16px 110px;}.xd h1{font-size:32px;}}
`;

function DevotionalBuilderBlock() {
  return (
    <div className="xd-build">
      <h2>Create your own devotional</h2>
      <p>Pick a length, choose a color, and shape what you'll read, pray, and do each day.</p>
      <div className="xd-lens">
        {[1, 3, 5, 10].map((n) => (
          <Link key={n} to="/plans/new" search={{ length: n } as any} className="xd-len">
            <span className="n">{n}</span>
            <span className="l">{n === 1 ? "Day" : "Days"}</span>
          </Link>
        ))}
      </div>
      <Link to="/plans/new" search={{ length: 3 } as any} className="xd-lime">Start building →</Link>
    </div>
  );
}

function DevotionalsExplorePage() {
  const userId = useSessionUserId();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const active = useActiveDevotional(userId);
  const pub = usePublishedDevotionals();
  const saved = useSavedTemplateIds(userId);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (userId === null) navigate({ to: "/auth", replace: true });
  }, [userId, navigate]);

  const start = async (templateId: string) => {
    if (!userId) return;
    setBusy(templateId);
    try {
      await subscribeToDevotional(userId, templateId);
      navigate({ to: "/devotionals/$id", params: { id: templateId }, search: { date: todayISO() } as any });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start this devotional.");
      setBusy(null);
    }
  };

  const toggleSave = async (templateId: string) => {
    if (!userId) return;
    const savedId = saved.data?.[templateId];
    setBusy(templateId);
    try {
      if (savedId) {
        await supabase.from("saved_items").delete().eq("id", savedId);
        toast.success("Removed from your devotionals");
      } else {
        await subscribeToDevotional(userId, templateId);
        toast.success("Saved to your devotionals");
      }
      qc.invalidateQueries({ queryKey: ["saved-template-ids"] });
      qc.invalidateQueries({ queryKey: ["saved-devotional-templates"] });
      qc.invalidateQueries({ queryKey: ["active-devotional"] });
    } finally { setBusy(null); }
  };

  const a = active.data;
  const items = pub.data ?? [];

  return (
    <AppShell current="explore">
      <style dangerouslySetInnerHTML={{ __html: DEV_CSS }} />
      <div className="xd">
        <div className="xd-eyebrow">Explore · Devotionals</div>
        <h1>Devotionals</h1>
        <p className="xd-sub">Read it here, live it in your workspace. Start one and each day shows up in your Read, Pray and To-do.</p>

        <section className="xd-sec">
          <h2 className="xd-h2">Yours</h2>
          {a && (
            <div className="xd-active">
              <div className="eb">In progress · Day {a.day} of {a.total}</div>
              <h3>{a.title}</h3>
              <div className="xd-bar"><span style={{ width: `${Math.round((a.day / Math.max(1, a.total)) * 100)}%` }} /></div>
              {a.templateId
                ? <Link to="/devotionals/$id" params={{ id: a.templateId }} search={{ date: todayISO() } as any} className="xd-lime">Open today's in workspace →</Link>
                : <Link to="/devotionals" className="xd-lime">Open today's in workspace →</Link>}
            </div>
          )}
          <SavedDevotionalsSection
            title=""
            note=""
            startLabel="Start again"
            emptyText="Nothing here yet. Start one from CoCreate below, or build your own."
          />
        </section>

        <section className="xd-sec">
          <DevotionalBuilderBlock />
        </section>

        {items.length > 0 && (
          <section className="xd-sec">
            <h2 className="xd-h2">From CoCreate</h2>
            <div className="xd-grid">
              {items.map((t) => {
                const isSaved = !!saved.data?.[t.id];
                return (
                  <article key={t.id} className="xd-card" style={{ ["--acc" as any]: t.accent_color || "#0F4A42" }}>
                    <div className="meta">{t.duration_days ? `${t.duration_days}-day devotional` : "Devotional"}</div>
                    <h3>{t.title}</h3>
                    {t.description && <p>{t.description}</p>}
                    <div className="row">
                      <button type="button" className="xd-start" disabled={busy === t.id} onClick={() => start(t.id)}>+ Start in my workspace</button>
                      <button type="button" className={`xd-ghost${isSaved ? " on" : ""}`} disabled={busy === t.id} onClick={() => toggleSave(t.id)} aria-pressed={isSaved}>
                        {isSaved ? "Saved" : "Save"}
                      </button>
                      <Link to="/devotionals/$slug/overview" params={{ slug: t.slug || t.id }} className="xd-ghost">Overview</Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
