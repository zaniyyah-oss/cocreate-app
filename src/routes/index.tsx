import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { AppShell } from "@/components/AppShell";
import { ContinuePractice } from "@/components/ContinuePractice";


export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "CoCreate — Slow spiritual formation, daily" },
      { name: "description", content: "Essays, teachings, podcasts, and devotional practices for people who want to abide, not scroll." },
      { property: "og:title", content: "CoCreate" },
      { property: "og:description", content: "A calm home for essays, teachings, podcasts, and devotional templates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type ContentPreview = Database["public"]["Views"]["content_items_public"]["Row"];
type ContentType = Database["public"]["Enums"]["content_type"];

const TYPE_META: Record<ContentType, { label: string; bg: string; fg: string }> = {
  teaching: { label: "Teaching", bg: "#FFAE00", fg: "#181A4D" },
  essay:    { label: "Essay",    bg: "#DCE07A", fg: "#181A4D" },
  podcast:  { label: "Podcast",  bg: "#0F4A42", fg: "#FBF8ED" },
  blog:     { label: "Blog",     bg: "#DCE07A", fg: "#181A4D" },
};

const IMG_FALLBACK = (id: string) => `https://picsum.photos/seed/${id}/600/400`;

const HOME_CSS = `
.hp-page{padding:26px 20px;max-width:1080px;margin:0 auto;width:100%;}
@media (min-width:1024px){.hp-page{padding:44px 44px 60px;}}

.hp-h1{font-size:32px;font-weight:900;letter-spacing:-0.03em;color:#181A4D;margin:0 0 6px;line-height:1.1;}
.hp-sub{font-size:14px;color:#8a8678;font-weight:500;margin:0 0 26px;}
@media (min-width:1024px){.hp-h1{font-size:38px;} .hp-sub{font-size:15px;margin-bottom:34px;}}

.hp-section-lbl{font-size:11px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#181A4D;margin:0 0 14px;display:flex;align-items:center;gap:10px;}
.hp-section-lbl .count{background:#FBF8ED;color:#181A4D;font-size:10.5px;padding:2px 9px;border-radius:99px;letter-spacing:0;font-weight:700;}
.hp-section{margin-bottom:44px;}

.hp-grid{display:grid;grid-template-columns:1fr;gap:16px;}
@media (min-width:640px){.hp-grid{grid-template-columns:repeat(2,1fr);}}
@media (min-width:1024px){.hp-grid{grid-template-columns:repeat(3,1fr);gap:20px;}}

.hp-card{background:#fff;border:1px solid rgba(20,20,20,0.06);border-radius:16px;overflow:hidden;display:flex;flex-direction:column;cursor:pointer;text-decoration:none;color:inherit;transition:transform .18s ease, box-shadow .18s ease;}
.hp-card:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgba(0,0,0,0.07);}
.hp-thumb{position:relative;aspect-ratio:16/10;overflow:hidden;background:#DCE07A;}
.hp-thumb img{width:100%;height:100%;object-fit:cover;display:block;filter:grayscale(0.15) contrast(1.05);}
.hp-thumb::after{content:'';position:absolute;inset:0;mix-blend-mode:multiply;opacity:0.45;pointer-events:none;}
.hp-thumb.teaching::after{background:#FFAE00;}
.hp-thumb.essay::after,.hp-thumb.blog::after{background:#DCE07A;}
.hp-thumb.podcast::after{background:#0F4A42;}
.hp-rt{position:absolute;top:10px;left:10px;z-index:2;font-size:10px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;padding:4px 10px;border-radius:12px;}
.hp-cbody{padding:14px 16px 16px;display:flex;flex-direction:column;gap:6px;flex:1;}
.hp-scr{font-size:10.5px;color:#0F4A42;font-weight:700;}
.hp-title{font-size:15.5px;font-weight:800;color:#181A4D;letter-spacing:-0.01em;line-height:1.3;margin:0;}
.hp-excerpt{font-size:12.5px;color:#8a8678;line-height:1.55;margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.hp-author{font-size:11px;color:#8a8678;font-weight:600;margin-top:auto;}

.hp-skel{background:#fff;border-radius:16px;height:290px;border:1px solid rgba(20,20,20,0.05);position:relative;overflow:hidden;}
.hp-skel::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent);animation:hp-shimmer 1.4s infinite;}
@keyframes hp-shimmer{0%{transform:translateX(-100%);}100%{transform:translateX(100%);}}

.hp-empty{background:#fff;border:1.5px dashed rgba(20,20,20,0.14);border-radius:16px;padding:36px 24px;text-align:center;color:#8a8678;}
.hp-empty strong{display:block;color:#181A4D;font-weight:800;font-size:15px;margin-bottom:4px;}

.hp-hero{background:#fff;border:1px solid rgba(20,20,20,0.06);border-left:5px solid #0F4A42;border-radius:16px;padding:22px 24px;margin-bottom:34px;}
.hp-hero .lbl{font-size:10.5px;letter-spacing:0.14em;text-transform:uppercase;color:#0F4A42;font-weight:800;margin-bottom:6px;}
.hp-hero p{font-size:14px;color:#181A4D;font-weight:600;line-height:1.5;margin:0;}

/* Today's workspace banner — full width of the main workspace area */
.hp-workspace{display:flex;align-items:center;justify-content:space-between;background:#DCE07A;padding:13px 20px;color:#181A4D;text-decoration:none;margin-bottom:24px;transition:transform .18s ease, box-shadow .18s ease;}
@media (min-width:1024px){.hp-workspace{padding:14px 44px;margin-bottom:32px;}}
.hp-workspace:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(0,0,0,0.07);}
.hp-workspace-text{font-weight:800;font-size:14px;letter-spacing:-0.01em;}
.hp-workspace-arrow{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round;}


`;

function localToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function WorkspaceReturnBanner() {
  const [userId, setUserId] = useState<string | null>(null);
  const [today, setToday] = useState<string>(() => localToday());

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      const t = localToday();
      setToday((prev) => (prev === t ? prev : t));
    }, 60_000);
    return () => clearInterval(iv);
  }, []);

  const q = useQuery({
    queryKey: ["workspace-return", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devotional_templates")
        .select("id, title")
        .eq("is_default" as any, true)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; title: string } | null;
    },
  });

  if (!userId || !q.data?.id) return null;

  return (
    <Link
      to="/devotionals/$id"
      params={{ id: q.data.id }}
      search={{ date: today }}
      className="hp-workspace"
    >
      <span className="hp-workspace-text">Return to today's workspace</span>
      <svg viewBox="0 0 24 24" className="hp-workspace-arrow" aria-hidden>
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

function HomePage() {
  const navigate = useNavigate();

  const contentQ = useQuery({
    queryKey: ["home-content"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_items_public")
        .select("*")
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(9);
      if (error) throw error;
      return (data ?? []) as ContentPreview[];
    },
  });

  const items = contentQ.data ?? [];

  return (
    <AppShell current="home">
      <style dangerouslySetInnerHTML={{ __html: HOME_CSS }} />
      <WorkspaceReturnBanner />
      <div className="hp-page">
        <h1 className="hp-h1">Slow spiritual formation, daily.</h1>
        <p className="hp-sub">Essays, teachings, podcasts, and devotional practices — the content changes, the practice doesn't.</p>
        <ContinuePractice />



        <div className="hp-hero">
          <div className="lbl">A reminder</div>
          <p>"Renewed, not rushed." Come back today to the topics that keep shaping you.</p>
        </div>

        <section className="hp-section">
          <h2 className="hp-section-lbl">
            Featured
            {!contentQ.isLoading && <span className="count">{items.length}</span>}
          </h2>

          {contentQ.isLoading ? (
            <div className="hp-grid">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="hp-skel" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="hp-empty">
              <strong>Nothing to show yet</strong>
              Once content is published, the newest pieces will appear here.
            </div>
          ) : (
            <div className="hp-grid">
              {items.map((c) => {
                const t = (c.type ?? "essay") as ContentType;
                const meta = TYPE_META[t];
                const route = t === "teaching" ? "/teachings/$id" : t === "podcast" ? "/podcasts/$id" : "/essays/$id";
                return (
                  <div key={c.id ?? ""} className="hp-card"
                    onClick={() => c.id && navigate({ to: route, params: { id: c.id } })}>
                    <div className={`hp-thumb ${t}`}>
                      <img src={c.thumbnail_url || IMG_FALLBACK(c.id ?? "x")} alt={c.title ?? ""} loading="lazy" />
                      <span className="hp-rt" style={{ background: meta.bg, color: meta.fg }}>{meta.label}</span>
                    </div>
                    <div className="hp-cbody">
                      {c.scripture_reference && <div className="hp-scr">{c.scripture_reference}</div>}
                      <h3 className="hp-title">{c.title}</h3>
                      {c.excerpt && <p className="hp-excerpt">{c.excerpt}</p>}
                      <div className="hp-author">{c.author_name ?? "CoCreate"}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
