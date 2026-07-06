import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { AppShell } from "@/components/AppShell";

type Topic = Database["public"]["Tables"]["topics"]["Row"];
type PreviewRow = Database["public"]["Views"]["content_items_public"]["Row"];
type Template = Database["public"]["Tables"]["devotional_templates"]["Row"];

export const Route = createFileRoute("/topics/$slug")({
  component: TopicPage,
  errorComponent: ({ error }) => (
    <div style={{ minHeight: "100vh", background: "#eee9d9", fontFamily: "Poppins,sans-serif", padding: 80, textAlign: "center" }}>
      <h1 style={{ color: "#181A4D", fontWeight: 900 }}>This topic didn't load</h1>
      <p style={{ color: "#8a8678" }}>{error.message}</p>
      <Link to="/explore" style={{ color: "#181A4D", fontWeight: 700 }}>Back to Explore</Link>
    </div>
  ),
  notFoundComponent: () => (
    <div style={{ minHeight: "100vh", background: "#eee9d9", fontFamily: "Poppins,sans-serif", padding: 80, textAlign: "center" }}>
      <h1 style={{ color: "#181A4D", fontWeight: 900 }}>Topic not found</h1>
      <Link to="/explore" style={{ color: "#181A4D", fontWeight: 700 }}>Back to Explore</Link>
    </div>
  ),
  head: ({ params }) => ({
    meta: [
      { title: `${humanize(params.slug)} — CoCreate` },
      { name: "description", content: `Essays, teachings, podcasts, and devotionals on ${humanize(params.slug)}.` },
      { property: "og:title", content: `${humanize(params.slug)} — CoCreate` },
      { property: "og:description", content: `Explore ${humanize(params.slug)} across essays, teachings, podcasts, and devotionals on CoCreate.` },
    ],
  }),
});

function humanize(slug: string) {
  return slug.split("-").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");
}

const TOPIC_COLORS: Record<string, string> = {
  amber: "#F5B301", teal: "#0F4A42", lime: "#DCE07A", "light-green": "#C7E39B",
  coral: "#FF340C", navy: "#181A4D", cream: "#FBF8ED", brown: "#441B07",
};
const topicColor = (k?: string | null) => (k && TOPIC_COLORS[k]) || "#0F4A42";

// Short descriptions for the 15 seeded topics (by slug)
const TOPIC_DESCRIPTIONS: Record<string, string> = {
  "abiding": "Staying with Jesus as the ongoing shape of the day — not a task, but a home.",
  "theology-of-work": "Ordinary vocation as worship. What our labor is for, and who it serves.",
  "identity-in-christ": "Who we are before we are anything else — beloved, adopted, secure.",
  "prayer": "Speaking and listening in the presence of God. Honest, unhurried, ordinary.",
  "calling": "The Spirit-shaped invitation to a particular life — discerned, not performed.",
  "spiritual-formation": "The slow, embodied work of becoming like Christ in the depths.",
  "discipline": "Rhythms of grace that make room in us — practice, not perfectionism.",
  "suffering-and-endurance": "Faith held in the dark. Hope that outlives the hard season.",
  "friendship-and-fellowship": "The particular love of the body of Christ — real, near, over time.",
  "kingdom-culture": "What God's people look like when they belong to a different King.",
  "motherhood": "Formation in a small, holy place. The theology of the everyday with children.",
  "creativity": "Making as image-bearing. Art, craft, and imagination in step with God.",
  "leadership": "Serving from stillness. Authority given, not seized — for the good of others.",
  "obedience": "The quiet yes. Trust made visible in what we actually do.",
  "purpose": "Why we're here — a life ordered around God, others, and love.",
};

const TYPE_META: Record<string, { label: string; bg: string; fg: string; route: "/essays/$id" | "/teachings/$id" | "/podcasts/$id" }> = {
  essay:    { label: "Essay",    bg: "#C7E39B", fg: "#20201c", route: "/essays/$id" },
  teaching: { label: "Teaching", bg: "#F5B301", fg: "#20201c", route: "/teachings/$id" },
  podcast:  { label: "Podcast",  bg: "#0F4A42", fg: "#FBF8ED", route: "/podcasts/$id" },
  blog:     { label: "Blog",     bg: "#DCE07A", fg: "#181A4D", route: "/essays/$id" },
};

const CSS = `
.tp-root *{box-sizing:border-box;}
.tp-root{min-height:100vh;background:#eee9d9;font-family:'Poppins',sans-serif;color:#20201c;}
.tp-nav{background:#fff;border-bottom:1px solid rgba(20,20,20,0.08);padding:14px 24px;display:flex;align-items:center;justify-content:space-between;gap:12px;position:sticky;top:0;z-index:50;}
.tp-brand{display:flex;align-items:center;gap:10px;text-decoration:none;}
.tp-brand .mark{width:28px;height:28px;background:#DCE07A;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#181A4D;font-weight:900;}
.tp-brand .word{font-weight:900;font-size:19px;color:#181A4D;letter-spacing:-0.02em;}
.tp-back{color:#8a8678;font-weight:700;font-size:12.5px;text-decoration:none;}
.tp-back:hover{color:#181A4D;}

.tp-hero{background:#fff;border-bottom:1px solid rgba(20,20,20,0.06);}
.tp-hero-inner{max-width:1080px;margin:0 auto;padding:56px 28px 46px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px;align-items:end;}
.tp-eyebrow{display:inline-flex;align-items:center;gap:10px;font-size:11px;font-weight:800;color:#8a8678;letter-spacing:0.16em;text-transform:uppercase;margin-bottom:14px;}
.tp-eyebrow .dot{width:10px;height:10px;border-radius:50%;}
.tp-title{font-size:52px;font-weight:900;color:#181A4D;letter-spacing:-0.04em;line-height:1.02;margin:0 0 14px;}
.tp-desc{font-size:16px;line-height:1.65;color:#20201c;max-width:640px;margin:0;font-weight:500;}
.tp-count{background:#FBF8ED;color:#181A4D;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;padding:8px 14px;border-radius:99px;white-space:nowrap;}

.tp-shell{max-width:1080px;margin:0 auto;padding:52px 28px 100px;}
.tp-section{margin-bottom:56px;}
.tp-sh{display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin-bottom:20px;}
.tp-sh h2{font-size:22px;font-weight:900;color:#181A4D;letter-spacing:-0.02em;margin:0;}
.tp-sh .n{font-size:11.5px;color:#8a8678;font-weight:700;}

.tp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:18px;}
.tp-card{background:#fff;border-radius:14px;overflow:hidden;cursor:pointer;transition:transform .18s ease, box-shadow .18s ease;border:1px solid rgba(20,20,20,0.06);display:flex;flex-direction:column;}
.tp-card:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgba(0,0,0,0.08);}
.tp-thumb{width:100%;aspect-ratio:16/10;background:#DCE07A;position:relative;overflow:hidden;}
.tp-thumb img{width:100%;height:100%;object-fit:cover;}
.tp-rt{position:absolute;top:10px;left:10px;font-size:9.5px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;padding:4px 10px;border-radius:12px;}
.tp-cbody{padding:14px 16px 16px;}
.tp-cbody .scr{font-size:11px;color:#0F4A42;font-weight:700;margin-bottom:6px;}
.tp-cbody h3{font-size:15px;font-weight:800;color:#181A4D;letter-spacing:-0.01em;margin:0 0 6px;line-height:1.35;}
.tp-cbody .a{font-size:11.5px;color:#8a8678;font-weight:600;}

.tp-devgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:18px;}
.tp-dev{background:#fff;border-radius:16px;overflow:hidden;cursor:pointer;border:1px solid rgba(20,20,20,0.06);transition:transform .18s ease, box-shadow .18s ease;display:flex;flex-direction:column;}
.tp-dev:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgba(0,0,0,0.08);}
.tp-dev-accent{height:6px;}
.tp-dev-body{padding:22px;}
.tp-dev-body h3{font-size:17px;font-weight:800;color:#181A4D;letter-spacing:-0.01em;margin:0 0 10px;line-height:1.3;}
.tp-dev-body .scr{font-size:12px;font-weight:700;color:#0F4A42;margin-bottom:8px;}
.tp-dev-body p{font-size:13px;line-height:1.55;color:#8a8678;margin:0;}

.tp-scr{display:flex;flex-wrap:wrap;gap:10px;}
.tp-scrchip{background:#fff;border:1px solid rgba(20,20,20,0.08);border-left:4px solid #0F4A42;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:700;color:#181A4D;letter-spacing:-0.005em;}

.tp-empty{background:#fff;border:1.5px dashed rgba(20,20,20,0.12);border-radius:14px;padding:28px;text-align:center;color:#8a8678;font-size:13px;line-height:1.6;}
.tp-empty strong{display:block;color:#181A4D;font-weight:800;font-size:14.5px;margin-bottom:4px;}

@media (max-width:720px){
  .tp-hero-inner{grid-template-columns:1fr;padding:40px 24px 34px;}
  .tp-title{font-size:38px;}
}
`;

function TopicPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();

  useEffect(() => {
    document.body.style.background = "#eee9d9";
    return () => { document.body.style.background = ""; };
  }, []);

  const topicQ = useQuery({
    queryKey: ["topic-slug", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("topics").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data as Topic;
    },
  });

  const contentQ = useQuery({
    queryKey: ["topic-content", topicQ.data?.id],
    enabled: !!topicQ.data?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_items_public")
        .select("*")
        .eq("topic_id", topicQ.data!.id)
        .order("published_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as PreviewRow[];
    },
  });

  const templatesQ = useQuery({
    queryKey: ["topic-templates", topicQ.data?.id],
    enabled: !!topicQ.data?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devotional_templates")
        .select("*")
        .eq("topic_id", topicQ.data!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Template[];
    },
  });

  const topic = topicQ.data;
  const color = topicColor(topic?.color_key);
  const desc = TOPIC_DESCRIPTIONS[slug] ?? "A conversation we return to on CoCreate.";

  const items = contentQ.data ?? [];
  const essays = items.filter((c) => c.type === "essay" || c.type === "blog");
  const teachings = items.filter((c) => c.type === "teaching");
  const podcasts = items.filter((c) => c.type === "podcast");
  const templates = templatesQ.data ?? [];

  // Distinct scripture references from content + templates
  const scriptures = Array.from(new Set<string>([
    ...items.map((c) => c.scripture_reference).filter((s): s is string => !!s),
    ...templates.map((t) => t.scripture_focus).filter((s): s is string => !!s),
  ])).slice(0, 10);

  const totalCount = items.length + templates.length;

  const openContent = (c: PreviewRow) => {
    if (!c.id) return;
    const meta = TYPE_META[c.type ?? "essay"] ?? TYPE_META.essay;
    navigate({ to: meta.route, params: { id: c.id } });
  };

  return (
    <AppShell>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="tp-root">
      <div style={{ padding: "16px 24px 0", maxWidth: 1200, margin: "0 auto" }}>
        <Link to="/explore" className="tp-back">← Back to Explore</Link>
      </div>


      <div className="tp-hero">
        <div className="tp-hero-inner">
          <div>
            <div className="tp-eyebrow">
              <span className="dot" style={{ background: color }} />
              Topic
            </div>
            <h1 className="tp-title">{topic?.name ?? humanize(slug)}</h1>
            <p className="tp-desc">{desc}</p>
          </div>
          <div className="tp-count">{totalCount} {totalCount === 1 ? "piece" : "pieces"}</div>
        </div>
      </div>

      <div className="tp-shell">
        {scriptures.length > 0 && (
          <div className="tp-section">
            <div className="tp-sh"><h2>Scripture threads</h2><span className="n">{scriptures.length}</span></div>
            <div className="tp-scr">
              {scriptures.map((s) => <div key={s} className="tp-scrchip" style={{ borderLeftColor: color }}>{s}</div>)}
            </div>
          </div>
        )}

        <TypeSection title="Essays" items={essays} onOpen={openContent} />
        <TypeSection title="Teachings" items={teachings} onOpen={openContent} />
        <TypeSection title="Podcasts" items={podcasts} onOpen={openContent} />

        <div className="tp-section">
          <div className="tp-sh"><h2>Devotional templates</h2><span className="n">{templates.length}</span></div>
          {templates.length === 0 ? (
            <div className="tp-empty"><strong>No devotionals here yet</strong>New templates land as this topic grows.</div>
          ) : (
            <div className="tp-devgrid">
              {templates.map((t) => (
                <div key={t.id} className="tp-dev" onClick={() => navigate({ to: "/devotionals/$id", params: { id: t.id } })}>
                  <div className="tp-dev-accent" style={{ background: color }} />
                  <div className="tp-dev-body">
                    <h3>{t.title}</h3>
                    {t.scripture_focus && <div className="scr">{t.scripture_focus}</div>}
                    {t.description && <p>{t.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </AppShell>
  );
}


function TypeSection({ title, items, onOpen }: { title: string; items: PreviewRow[]; onOpen: (c: PreviewRow) => void }) {
  return (
    <div className="tp-section">
      <div className="tp-sh"><h2>{title}</h2><span className="n">{items.length}</span></div>
      {items.length === 0 ? (
        <div className="tp-empty"><strong>Nothing in {title.toLowerCase()} yet</strong>Check back as this topic grows.</div>
      ) : (
        <div className="tp-grid">
          {items.map((c) => {
            const meta = TYPE_META[c.type ?? "essay"] ?? TYPE_META.essay;
            return (
              <div key={c.id ?? ""} className="tp-card" onClick={() => onOpen(c)}>
                <div className="tp-thumb">
                  {c.thumbnail_url && <img src={c.thumbnail_url} alt={c.title ?? ""} />}
                  <span className="tp-rt" style={{ background: meta.bg, color: meta.fg }}>{meta.label}</span>
                </div>
                <div className="tp-cbody">
                  {c.scripture_reference && <div className="scr">{c.scripture_reference}</div>}
                  <h3>{c.title}</h3>
                  <div className="a">{c.author_name ?? "CoCreate"}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

