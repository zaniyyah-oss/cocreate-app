import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { NotificationBell } from "@/components/NotificationBell";

export const Route = createFileRoute("/explore")({
  component: ExplorePage,
  head: () => ({
    meta: [
      { title: "Explore — CoCreate" },
      { name: "description", content: "Browse essays, teachings, podcasts, blogs, and devotional templates across every topic on CoCreate." },
      { property: "og:title", content: "Explore CoCreate" },
      { property: "og:description", content: "Filter essays, teachings, podcasts, and devotionals by topic on CoCreate." },
    ],
  }),
});

type Topic = Database["public"]["Tables"]["topics"]["Row"];
type ContentPreview = Database["public"]["Views"]["content_items_public"]["Row"];
type ContentType = Database["public"]["Enums"]["content_type"];

const TYPE_META: Record<ContentType, { label: string; cls: string }> = {
  teaching: { label: "Teaching", cls: "teaching" },
  essay: { label: "Essay", cls: "essay" },
  podcast: { label: "Podcast", cls: "podcast" },
  blog: { label: "Blog", cls: "essay" },
};

const TYPE_OPTIONS: ContentType[] = ["teaching", "essay", "podcast", "blog"];

const CSS = `
.ex-root{font-family:'Poppins',sans-serif;background:#eee9d9;color:#20201c;min-height:100vh;}
.ex-root *{box-sizing:border-box;}
.ex-nav{background:#fff;border-bottom:1px solid rgba(20,20,20,0.08);padding:14px 24px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}
.ex-brand{display:flex;align-items:center;gap:10px;text-decoration:none;}
.ex-brand .mark{width:28px;height:28px;background:#DCE07A;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#181A4D;font-weight:900;}
.ex-brand .word{font-weight:900;font-size:19px;color:#181A4D;letter-spacing:-0.02em;}
.ex-navlinks{display:flex;gap:6px;align-items:center;}
.ex-navlink{color:#20201c;text-decoration:none;font-weight:700;font-size:12.5px;padding:8px 14px;border-radius:16px;}
.ex-navlink.active{background:#DCE07A;color:#181A4D;}
.ex-signin{background:#181A4D;color:#fff;font-weight:800;font-size:12.5px;padding:9px 18px;border-radius:20px;text-decoration:none;font-family:'Poppins';border:none;cursor:pointer;}
.ex-signout{background:transparent;border:1.5px solid rgba(20,20,20,0.12);color:#20201c;font-weight:700;font-size:12px;padding:8px 14px;border-radius:16px;font-family:'Poppins';cursor:pointer;}
.ex-shell{max-width:1400px;margin:0 auto;padding:34px 28px 80px;}
.ex-h1{font-size:34px;font-weight:900;letter-spacing:-0.03em;color:#181A4D;margin:0 0 6px;}
.ex-sub{font-size:14px;color:#8a8678;font-weight:500;margin-bottom:22px;}
.ex-flabel{font-size:10.5px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#181A4D;margin:14px 0 10px;}
.ex-pills{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:6px;}
.ex-pill{padding:8px 16px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;border:1.5px solid rgba(20,20,20,0.08);color:#181A4D;background:#fff;font-family:'Poppins';transition:all .12s;}
.ex-pill:hover{border-color:#181A4D;}
.ex-pill.on{background:#181A4D;border-color:#181A4D;color:#fff;}
.ex-typepill.on.teaching{background:#FFAE00;border-color:#FFAE00;color:#181A4D;}
.ex-typepill.on.essay,.ex-typepill.on.blog{background:#DCE07A;border-color:#DCE07A;color:#181A4D;}
.ex-typepill.on.podcast{background:#0F4A42;border-color:#0F4A42;color:#FBF8ED;}
.ex-typepill.on.devotional{background:#CAC307;border-color:#CAC307;color:#181A4D;}
.ex-clear{background:none;border:none;color:#8a8678;font-size:11.5px;font-weight:700;cursor:pointer;font-family:'Poppins';margin-left:6px;text-decoration:underline;}
.ex-count{font-size:12px;color:#8a8678;font-weight:600;margin:18px 0 14px;}
.ex-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;}
@media (max-width: 900px){.ex-grid{grid-template-columns:1fr;}}
.ex-card{background:#fff;border:1px solid rgba(20,20,20,0.08);border-radius:16px;overflow:hidden;display:flex;flex-direction:column;cursor:pointer;transition:transform .15s;}
.ex-card:hover{transform:translateY(-3px);}
.ex-thumb{position:relative;height:150px;overflow:hidden;}
.ex-thumb img{width:100%;height:100%;object-fit:cover;display:block;filter:grayscale(0.2) contrast(1.05);}
.ex-thumb::after{content:'';position:absolute;inset:0;mix-blend-mode:multiply;opacity:0.55;}
.ex-thumb.teaching::after{background:#FFAE00;}
.ex-thumb.essay::after,.ex-thumb.blog::after{background:#DCE07A;}
.ex-thumb.podcast::after{background:#0F4A42;}
.ex-thumb.devotional::after{background:#CAC307;}
.ex-tag{position:absolute;top:10px;left:10px;z-index:2;display:inline-flex;font-size:10px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;padding:4px 10px;border-radius:20px;}
.ex-tag.teaching{background:#FFAE00;color:#181A4D;}
.ex-tag.essay,.ex-tag.blog{background:#DCE07A;color:#181A4D;}
.ex-tag.podcast{background:#0F4A42;color:#FBF8ED;}
.ex-body{padding:16px 18px 18px;display:flex;flex-direction:column;flex:1;}
.ex-scr{font-size:10.5px;color:#0F4A42;font-weight:700;margin-bottom:6px;}
.ex-title{font-size:16px;font-weight:800;color:#181A4D;letter-spacing:-0.01em;margin:0 0 6px;line-height:1.3;}
.ex-desc{font-size:12.5px;color:#8a8678;line-height:1.55;margin:0 0 12px;}
.ex-meta{display:flex;align-items:center;justify-content:space-between;margin-top:auto;font-size:11px;color:#8a8678;font-weight:600;}
.ex-actions{display:flex;gap:8px;}
.ex-act{background:none;border:none;padding:4px;color:#8a8678;cursor:pointer;display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;font-family:'Poppins';}
.ex-act:hover{color:#181A4D;}
.ex-act svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;}
.ex-empty{background:#fff;border:1.5px dashed rgba(20,20,20,0.14);border-radius:16px;padding:44px 28px;text-align:center;margin-top:14px;}
.ex-empty h3{font-size:18px;font-weight:800;color:#181A4D;margin:0 0 8px;letter-spacing:-0.01em;}
.ex-empty p{font-size:13px;color:#8a8678;margin:0 0 16px;}
.ex-empty button{background:#181A4D;color:#fff;font-weight:700;font-size:12px;padding:9px 18px;border-radius:20px;border:none;font-family:'Poppins';cursor:pointer;}
.ex-skel{background:#fff;border:1px solid rgba(20,20,20,0.06);border-radius:16px;height:290px;animation:pulse 1.4s infinite;}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.55}}
.ex-signprompt{background:#FBF8ED;border:1px solid rgba(20,20,20,0.08);border-left:4px solid #FF340C;border-radius:12px;padding:14px 18px;margin-bottom:22px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;}
.ex-signprompt p{margin:0;font-size:13px;color:#181A4D;font-weight:600;}
.ex-modal{position:fixed;inset:0;background:rgba(24,26,77,0.35);display:flex;align-items:center;justify-content:center;z-index:200;padding:20px;}
.ex-modalcard{background:#fff;border-radius:18px;padding:28px;max-width:400px;width:100%;text-align:center;}
.ex-modalcard h3{font-size:20px;font-weight:900;color:#181A4D;margin:0 0 8px;letter-spacing:-0.01em;}
.ex-modalcard p{font-size:13px;color:#8a8678;margin:0 0 18px;line-height:1.5;}
.ex-modalcard .row{display:flex;gap:10px;justify-content:center;}
`;

const IMG_FALLBACK = (id: string) => `https://picsum.photos/seed/${id}/600/400`;

function useAuth() {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_ev, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return { userId, ready };
}

function ExplorePage() {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [selectedTypes, setSelectedTypes] = useState<Set<ContentType>>(new Set());
  const [gatePrompt, setGatePrompt] = useState<string | null>(null);

  const topicsQ = useQuery({
    queryKey: ["topics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("topics").select("*").order("name");
      if (error) throw error;
      return data as Topic[];
    },
  });

  const contentQ = useQuery({
    queryKey: ["content-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_items_public")
        .select("*")
        .order("published_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as ContentPreview[];
    },
  });

  useEffect(() => {
    document.body.style.background = "#eee9d9";
    return () => { document.body.style.background = ""; };
  }, []);

  const filtered = useMemo(() => {
    const items = contentQ.data ?? [];
    return items.filter((c) => {
      if (selectedTopics.size > 0 && (!c.topic_id || !selectedTopics.has(c.topic_id))) return false;
      if (selectedTypes.size > 0 && (!c.type || !selectedTypes.has(c.type))) return false;
      return true;
    });
  }, [contentQ.data, selectedTopics, selectedTypes]);

  const toggle = <T,>(set: Set<T>, v: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set);
    next.has(v) ? next.delete(v) : next.add(v);
    setter(next);
  };

  const clearAll = () => { setSelectedTopics(new Set()); setSelectedTypes(new Set()); };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const requireAuth = (action: string) => {
    if (userId) return true;
    setGatePrompt(action);
    return false;
  };

  return (
    <div className="ex-root">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <nav className="ex-nav">
        <Link to="/" className="ex-brand">
          <div className="mark">C</div><div className="word">CoCreate</div>
        </Link>
        <div className="ex-navlinks">
          <Link to="/" className="ex-navlink">Home</Link>
          <Link to="/explore" className="ex-navlink active">Explore</Link>
        </div>
        {userId ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <NotificationBell />
            <button className="ex-signout" onClick={signOut}>Sign out</button>
          </div>
        ) : (
          <Link to="/auth" className="ex-signin">Sign in</Link>
        )}
      </nav>

      <div className="ex-shell">
        <h1 className="ex-h1">Explore</h1>
        <p className="ex-sub">Browse essays, teachings, podcasts, and devotionals across every topic.</p>

        {!userId && (
          <div className="ex-signprompt">
            <p>Browsing as a guest. Sign in to save what moves you, take notes, and read full essays.</p>
            <Link to="/auth" className="ex-signin">Sign in</Link>
          </div>
        )}

        <div className="ex-flabel">Topics</div>
        <div className="ex-pills">
          {topicsQ.data?.map((t) => (
            <button key={t.id} className={`ex-pill ${selectedTopics.has(t.id) ? "on" : ""}`}
              onClick={() => toggle(selectedTopics, t.id, setSelectedTopics)}>
              {t.name}
            </button>
          ))}
        </div>

        <div className="ex-flabel">Format</div>
        <div className="ex-pills">
          {TYPE_OPTIONS.map((t) => (
            <button key={t} className={`ex-pill ex-typepill ${t} ${selectedTypes.has(t) ? "on" : ""}`}
              onClick={() => toggle(selectedTypes, t, setSelectedTypes)}>
              {TYPE_META[t].label}
            </button>
          ))}
          {(selectedTopics.size > 0 || selectedTypes.size > 0) && (
            <button className="ex-clear" onClick={clearAll}>Clear filters</button>
          )}
        </div>

        {contentQ.isLoading ? (
          <div className="ex-grid" style={{ marginTop: 24 }}>
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="ex-skel" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="ex-empty">
            <h3>Nothing here yet</h3>
            <p>No content matches this combination of topic and format. Try a different topic — or browse everything.</p>
            <button onClick={clearAll}>Browse everything</button>
          </div>
        ) : (
          <>
            <div className="ex-count">{filtered.length} {filtered.length === 1 ? "result" : "results"}</div>
            <div className="ex-grid">
              {filtered.map((c) => {
                const t = c.type ?? "essay";
                const meta = TYPE_META[t];
                return (
                  <div key={c.id ?? ""} className="ex-card"
                    onClick={() => {
                      if (!c.id) return;
                      const route = t === "teaching" ? "/teachings/$id" : t === "podcast" ? "/podcasts/$id" : "/essays/$id";
                      navigate({ to: route, params: { id: c.id } });
                    }}>

                    <div className={`ex-thumb ${meta.cls}`}>
                      <img src={c.thumbnail_url || IMG_FALLBACK(c.id ?? "x")} alt={c.title ?? ""} />
                      <span className={`ex-tag ${meta.cls}`}>{meta.label}</span>
                    </div>
                    <div className="ex-body">
                      {c.scripture_reference && <div className="ex-scr">{c.scripture_reference}</div>}
                      <h3 className="ex-title">{c.title}</h3>
                      {c.excerpt && <p className="ex-desc">{c.excerpt}</p>}
                      <div className="ex-meta">
                        <span>{c.author_name ?? "CoCreate"}</span>
                        <div className="ex-actions">
                          <button className="ex-act" onClick={(e) => { e.stopPropagation(); requireAuth("save this"); }}>
                            <svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4V3z"/></svg>Save
                          </button>
                          <button className="ex-act" onClick={(e) => { e.stopPropagation(); requireAuth("take a note"); }}>
                            <svg viewBox="0 0 24 24"><path d="M5 4h11l3 3v13H5z"/><path d="M9 9h6M9 13h6M9 17h3"/></svg>Note
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {gatePrompt && (
        <div className="ex-modal" onClick={() => setGatePrompt(null)}>
          <div className="ex-modalcard" onClick={(e) => e.stopPropagation()}>
            <h3>Sign in to continue</h3>
            <p>Create a free account to {gatePrompt}, and keep everything that moves you in one place.</p>
            <div className="row">
              <button className="ex-signout" onClick={() => setGatePrompt(null)}>Not now</button>
              <Link to="/auth" className="ex-signin">Sign in</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
