import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { NotificationBell } from "@/components/NotificationBell";

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

// ─── Shared responsive AppShell ─────────────────────────────────────────

type NavKey = "home" | "explore" | "devotionals" | "saved" | "notes" | "profile";
type NavItem = { key: NavKey; label: string; to: string; icon: ReactNode };

const NAV: NavItem[] = [
  { key: "home",        label: "Home",        to: "/",            icon: <svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/></svg> },
  { key: "explore",     label: "Explore",     to: "/explore",     icon: <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg> },
  { key: "devotionals", label: "Devotionals", to: "/devotionals", icon: <svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13z"/><path d="M8 7h8M8 11h5"/></svg> },
  { key: "saved",       label: "Saved",       to: "/saved",       icon: <svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4V3z"/></svg> },
  { key: "notes",       label: "Notes",       to: "/notes",       icon: <svg viewBox="0 0 24 24"><path d="M5 4h11l3 3v13H5z"/><path d="M9 9h6M9 13h6M9 17h3"/></svg> },
  { key: "profile",     label: "Profile",     to: "/profile",     icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6"/></svg> },
];

const SHELL_CSS = `
.hp-root, .hp-root *{box-sizing:border-box;}
.hp-root{min-height:100vh;background:#eee9d9;color:#20201c;font-family:'Poppins',sans-serif;-webkit-font-smoothing:antialiased;}
.hp-layout{display:grid;grid-template-columns:1fr;min-height:100vh;}

/* Sidebar (>=1024px) */
.hp-side{display:none;}
.hp-topbar{background:#fff;border-bottom:1px solid rgba(20,20,20,0.08);padding:12px 18px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:40;}
.hp-brand{display:flex;align-items:center;gap:10px;text-decoration:none;}
.hp-brand .mark{width:28px;height:28px;background:#DCE07A;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#181A4D;font-weight:900;}
.hp-brand .word{font-weight:900;font-size:18px;color:#181A4D;letter-spacing:-0.02em;}
.hp-topbar-actions{display:flex;align-items:center;gap:8px;}
.hp-signin{background:#181A4D;color:#fff;font-weight:800;font-size:12.5px;padding:8px 16px;border-radius:20px;text-decoration:none;border:none;cursor:pointer;font-family:'Poppins';}
.hp-signout{background:transparent;border:1.5px solid rgba(20,20,20,0.12);color:#20201c;font-weight:700;font-size:12px;padding:7px 13px;border-radius:16px;font-family:'Poppins';cursor:pointer;}

.hp-main{padding:26px 20px 110px;max-width:1080px;margin:0 auto;width:100%;}

/* Bottom tab bar (<1024px) */
.hp-bottomnav{position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid rgba(20,20,20,0.08);display:flex;justify-content:space-around;padding:10px 4px calc(10px + env(safe-area-inset-bottom,0));z-index:50;}
.hp-bottomnav a{display:flex;flex-direction:column;align-items:center;gap:3px;color:#8a8678;text-decoration:none;padding:4px 8px;transition:color .15s;}
.hp-bottomnav a.active{color:#181A4D;}
.hp-bottomnav svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}
.hp-bottomnav span{font-size:9.5px;font-weight:700;letter-spacing:0.02em;}

@media (min-width:1024px){
  .hp-layout{grid-template-columns:236px 1fr;}
  .hp-side{display:flex;flex-direction:column;background:#fff;border-right:1px solid rgba(20,20,20,0.08);padding:24px 14px;position:sticky;top:0;height:100vh;}
  .hp-side-logo{display:flex;align-items:center;gap:10px;padding:0 10px;margin-bottom:26px;text-decoration:none;}
  .hp-side-logo .mark{width:30px;height:30px;background:#DCE07A;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#181A4D;font-weight:900;}
  .hp-side-logo .word{font-weight:900;font-size:19px;color:#181A4D;letter-spacing:-0.02em;}
  .hp-side-item{display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:10px;font-size:13.5px;font-weight:600;color:#8a8678;cursor:pointer;margin-bottom:2px;text-decoration:none;transition:background .15s, color .15s;}
  .hp-side-item svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0;}
  .hp-side-item:hover{background:#FBF8ED;color:#181A4D;}
  .hp-side-item.active{background:#DCE07A;color:#181A4D;}
  .hp-side-foot{margin-top:auto;padding:12px 10px 4px;border-top:1px solid rgba(20,20,20,0.08);display:flex;align-items:center;justify-content:space-between;gap:8px;}
  .hp-topbar{display:none;}
  .hp-bottomnav{display:none;}
  .hp-main{padding:44px 44px 60px;}
}

/* Home content */
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

/* Loading skeletons */
.hp-skel{background:#fff;border-radius:16px;height:290px;border:1px solid rgba(20,20,20,0.05);position:relative;overflow:hidden;}
.hp-skel::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent);animation:hp-shimmer 1.4s infinite;}
@keyframes hp-shimmer{0%{transform:translateX(-100%);}100%{transform:translateX(100%);}}

.hp-empty{background:#fff;border:1.5px dashed rgba(20,20,20,0.14);border-radius:16px;padding:36px 24px;text-align:center;color:#8a8678;}
.hp-empty strong{display:block;color:#181A4D;font-weight:800;font-size:15px;margin-bottom:4px;}

.hp-hero{background:#fff;border:1px solid rgba(20,20,20,0.06);border-left:5px solid #0F4A42;border-radius:16px;padding:22px 24px;margin-bottom:34px;}
.hp-hero .lbl{font-size:10.5px;letter-spacing:0.14em;text-transform:uppercase;color:#0F4A42;font-weight:800;margin-bottom:6px;}
.hp-hero p{font-size:14px;color:#181A4D;font-weight:600;line-height:1.5;margin:0;}
`;

function AppShell({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    document.body.style.background = "#eee9d9";
    return () => { document.body.style.background = ""; };
  }, []);

  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <div className="hp-root">
      <style dangerouslySetInnerHTML={{ __html: SHELL_CSS }} />
      <div className="hp-layout">
        {/* Desktop sidebar */}
        <aside className="hp-side" aria-label="Primary">
          <Link to="/" className="hp-side-logo">
            <div className="mark">C</div><div className="word">CoCreate</div>
          </Link>
          {NAV.map((n) => (
            <Link key={n.key} to={n.to} className="hp-side-item" activeProps={{ className: "hp-side-item active" }} activeOptions={{ exact: n.to === "/" }}>
              {n.icon}{n.label}
            </Link>
          ))}
          <div className="hp-side-foot">
            {userId ? (
              <>
                <NotificationBell />
                <button className="hp-signout" onClick={signOut}>Sign out</button>
              </>
            ) : (
              <Link to="/auth" className="hp-signin" style={{ textDecoration: "none" }}>Sign in</Link>
            )}
          </div>
        </aside>

        {/* Mobile top bar */}
        <div>
          <header className="hp-topbar">
            <Link to="/" className="hp-brand">
              <div className="mark">C</div><div className="word">CoCreate</div>
            </Link>
            <div className="hp-topbar-actions">
              {userId ? (
                <>
                  <NotificationBell />
                  <button className="hp-signout" onClick={signOut}>Sign out</button>
                </>
              ) : (
                <Link to="/auth" className="hp-signin">Sign in</Link>
              )}
            </div>
          </header>
          <main className="hp-main">{children}</main>
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="hp-bottomnav" aria-label="Primary mobile">
        {NAV.map((n) => (
          <Link key={n.key} to={n.to} activeProps={{ className: "active" }} activeOptions={{ exact: n.to === "/" }}>
            {n.icon}<span>{n.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

// ─── Home content ─────────────────────────────────────────────────────

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
    <AppShell>
      <h1 className="hp-h1">Slow spiritual formation, daily.</h1>
      <p className="hp-sub">Essays, teachings, podcasts, and devotional practices — the content changes, the practice doesn't.</p>

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
    </AppShell>
  );
}
