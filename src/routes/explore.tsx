import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/explore")({
  component: BookmarksPage,
  head: () => ({
    meta: [
      { title: "Bookmarks — CoCreate" },
      { name: "description", content: "Your saved topics and content on CoCreate — the conversations you're following and the pieces you plan to return to." },
      { property: "og:title", content: "Your bookmarks on CoCreate" },
      { property: "og:description", content: "Topics you follow and content you saved for later — all in one place." },
    ],
  }),
});

type Topic = Database["public"]["Tables"]["topics"]["Row"];
type ContentPreview = Database["public"]["Views"]["content_items_public"]["Row"];
type ContentType = Database["public"]["Enums"]["content_type"];

const TOPIC_COLORS: Record<string, string> = {
  amber: "#F5B301", teal: "#0F4A42", lime: "#DCE07A", "light-green": "#C7E39B",
  coral: "#FF340C", navy: "#181A4D", cream: "#FBF8ED", brown: "#441B07",
};
const topicColor = (k?: string | null) => (k && TOPIC_COLORS[k]) || "#0F4A42";

const TYPE_META: Record<ContentType, { label: string; bg: string; fg: string }> = {
  teaching: { label: "Teaching", bg: "#FFAE00", fg: "#181A4D" },
  essay:    { label: "Essay",    bg: "#DCE07A", fg: "#181A4D" },
  podcast:  { label: "Podcast",  bg: "#0F4A42", fg: "#FBF8ED" },
  blog:     { label: "Blog",     bg: "#DCE07A", fg: "#181A4D" },
  clip:     { label: "Clip",     bg: "#CAC307", fg: "#181A4D" },
  promoted: { label: "Featured", bg: "#FFAE00", fg: "#181A4D" },
};

const routeForType = (t: ContentType) =>
  t === "teaching" ? "/teachings/$id" : t === "podcast" ? "/podcasts/$id" : "/essays/$id";

const CSS = `
.bm-root{font-family:'Poppins',sans-serif;background:#eee9d9;color:#20201c;min-height:100vh;}
.bm-root *{box-sizing:border-box;}
.bm-shell{max-width:1080px;margin:0 auto;padding:38px 28px 90px;}
.bm-h1{font-size:34px;font-weight:900;letter-spacing:-0.03em;color:#181A4D;margin:0 0 6px;}
.bm-sub{font-size:14px;color:#8a8678;font-weight:500;margin:0 0 28px;max-width:560px;line-height:1.55;}

.bm-signgate{background:#fff;border:1px solid rgba(20,20,20,0.08);border-left:4px solid #FF340C;border-radius:14px;padding:22px;max-width:560px;margin-bottom:26px;}
.bm-signgate h3{font-size:16px;font-weight:800;color:#181A4D;margin:0 0 6px;}
.bm-signgate p{font-size:13.5px;color:#8a8678;margin:0 0 14px;line-height:1.55;}
.bm-signin{background:#181A4D;color:#fff;font-weight:800;font-size:12.5px;padding:9px 18px;border-radius:20px;text-decoration:none;display:inline-block;}

.bm-section{margin-bottom:48px;}
.bm-shead{display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin-bottom:16px;}
.bm-shead h2{font-size:13px;font-weight:800;color:#8a8678;letter-spacing:0.14em;text-transform:uppercase;margin:0;display:flex;align-items:center;gap:10px;}
.bm-shead h2 .count{background:#FBF8ED;color:#181A4D;font-size:11px;padding:2px 9px;border-radius:99px;letter-spacing:0;}
.bm-shead a{font-size:12px;font-weight:700;color:#181A4D;text-decoration:none;opacity:0.7;}
.bm-shead a:hover{opacity:1;}

.bm-topics{display:flex;flex-wrap:wrap;gap:10px;}
.bm-topic{background:#fff;border:1px solid rgba(20,20,20,0.08);border-radius:14px;padding:12px 16px;display:inline-flex;align-items:center;gap:10px;cursor:pointer;transition:transform .15s, box-shadow .15s;text-decoration:none;color:inherit;}
.bm-topic:hover{transform:translateY(-2px);box-shadow:0 10px 22px rgba(0,0,0,0.06);}
.bm-topic .dot{width:10px;height:10px;border-radius:50%;}
.bm-topic .name{font-size:13.5px;font-weight:800;color:#181A4D;letter-spacing:-0.005em;}
.bm-topic .rm{background:none;border:none;color:#8a8678;font-size:16px;line-height:1;cursor:pointer;padding:2px 4px;font-family:inherit;}
.bm-topic .rm:hover{color:#FF340C;}

.bm-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:18px;}
.bm-card{background:#fff;border-radius:14px;overflow:hidden;cursor:pointer;transition:transform .18s, box-shadow .18s;border:1px solid rgba(20,20,20,0.06);display:flex;flex-direction:column;position:relative;}
.bm-card:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgba(0,0,0,0.08);}
.bm-thumb{width:100%;aspect-ratio:16/10;background:#DCE07A;position:relative;overflow:hidden;}
.bm-thumb img{width:100%;height:100%;object-fit:cover;}
.bm-rt{position:absolute;top:10px;left:10px;font-size:9.5px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;padding:4px 10px;border-radius:12px;}
.bm-cbody{padding:14px 16px 16px;}
.bm-cbody h3{font-size:14.5px;font-weight:800;color:#181A4D;letter-spacing:-0.01em;margin:0 0 6px;line-height:1.35;}
.bm-cbody .a{font-size:11.5px;color:#8a8678;font-weight:600;}
.bm-crm{position:absolute;top:10px;right:10px;width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,0.92);color:#181A4D;border:none;font-size:15px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:inherit;opacity:0;transition:opacity .15s;}
.bm-card:hover .bm-crm{opacity:1;}
.bm-crm:hover{background:#FF340C;color:#fff;}

.bm-empty{background:#fff;border:1.5px dashed rgba(20,20,20,0.12);border-radius:14px;padding:28px 24px;text-align:center;color:#8a8678;font-size:13.5px;line-height:1.6;}
.bm-empty strong{display:block;color:#181A4D;font-weight:800;font-size:15px;margin-bottom:6px;}
.bm-empty a{color:#181A4D;font-weight:700;text-decoration:underline;}

.bm-skel{background:#fff;border:1px solid rgba(20,20,20,0.06);border-radius:14px;height:220px;position:relative;overflow:hidden;}
.bm-skel::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.7),transparent);animation:bm-shim 1.4s infinite;}
@keyframes bm-shim{0%{transform:translateX(-100%);}100%{transform:translateX(100%);}}
`;

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

function BookmarksPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { userId, ready } = useAuth();

  useEffect(() => {
    document.body.style.background = "#eee9d9";
    return () => { document.body.style.background = ""; };
  }, []);

  const topicsQ = useQuery({
    queryKey: ["bookmarked-topics", userId],
    enabled: ready && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topic_subscriptions")
        .select("topic_id, created_at, topic:topics(*)")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => r.topic as Topic).filter(Boolean);
    },
  });

  const savedQ = useQuery({
    queryKey: ["bookmarked-content", userId],
    enabled: ready && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_items")
        .select("id, content_item_id, saved_at")
        .eq("user_id", userId!)
        .not("content_item_id", "is", null)
        .order("saved_at", { ascending: false });
      if (error) throw error;
      const ids = (data ?? []).map((r: any) => r.content_item_id).filter(Boolean) as string[];
      if (ids.length === 0) return [] as Array<{ id: string; content: ContentPreview }>;
      const { data: content } = await supabase
        .from("content_items_public")
        .select("*")
        .in("id", ids);
      const map = new Map<string, ContentPreview>();
      (content ?? []).forEach((c) => { if (c.id) map.set(c.id, c as ContentPreview); });
      return (data ?? [])
        .map((r: any) => ({ id: r.id as string, content: map.get(r.content_item_id) }))
        .filter((r) => !!r.content) as Array<{ id: string; content: ContentPreview }>;
    },
  });

  const removeTopic = async (topicId: string) => {
    if (!userId) return;
    await supabase.from("topic_subscriptions").delete().eq("user_id", userId).eq("topic_id", topicId);
    qc.invalidateQueries({ queryKey: ["bookmarked-topics", userId] });
  };

  const removeSaved = async (savedId: string) => {
    await supabase.from("saved_items").delete().eq("id", savedId);
    qc.invalidateQueries({ queryKey: ["bookmarked-content", userId] });
  };

  const openContent = (c: ContentPreview) => {
    if (!c.id) return;
    navigate({ to: routeForType((c.type ?? "essay") as ContentType), params: { id: c.id } });
  };

  const topics = topicsQ.data ?? [];
  const saved = savedQ.data ?? [];

  return (
    <AppShell current="explore">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="bm-root">
        <div className="bm-shell">
          <h1 className="bm-h1">Bookmarks</h1>
          <p className="bm-sub">Topics you're following and pieces you've saved for later. Nothing to remember — everything's waiting here.</p>

          {ready && !userId ? (
            <div className="bm-signgate">
              <h3>Sign in to keep bookmarks</h3>
              <p>Your saved topics and content stay private to your account and follow you across devices.</p>
              <Link to="/auth" className="bm-signin">Sign in</Link>
            </div>
          ) : (
            <>
              <div className="bm-section">
                <div className="bm-shead">
                  <h2>Topics you follow {!topicsQ.isLoading && <span className="count">{topics.length}</span>}</h2>
                </div>
                {topicsQ.isLoading ? (
                  <div className="bm-skel" style={{ height: 60 }} />
                ) : topics.length === 0 ? (
                  <div className="bm-empty">
                    <strong>No topics bookmarked yet</strong>
                    Open any topic page and tap "Follow topic" to keep it here. Try one from the <Link to="/">homepage</Link>.
                  </div>
                ) : (
                  <div className="bm-topics">
                    {topics.map((t) => (
                      <Link key={t.id} to="/topics/$slug" params={{ slug: t.slug }} className="bm-topic">
                        <span className="dot" style={{ background: topicColor(t.color_key) }} />
                        <span className="name">{t.name}</span>
                        <button
                          type="button"
                          className="rm"
                          aria-label={`Remove ${t.name}`}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeTopic(t.id); }}
                        >×</button>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="bm-section">
                <div className="bm-shead">
                  <h2>Saved to read later {!savedQ.isLoading && <span className="count">{saved.length}</span>}</h2>
                </div>
                {savedQ.isLoading ? (
                  <div className="bm-cards">
                    {Array.from({ length: 3 }).map((_, i) => <div key={i} className="bm-skel" />)}
                  </div>
                ) : saved.length === 0 ? (
                  <div className="bm-empty">
                    <strong>Nothing saved for later yet</strong>
                    Tap the bookmark on any essay, teaching, or podcast and it will land here.
                  </div>
                ) : (
                  <div className="bm-cards">
                    {saved.map((s) => {
                      const c = s.content!;
                      const meta = TYPE_META[(c.type ?? "essay") as ContentType] ?? TYPE_META.essay;
                      return (
                        <div key={s.id} className="bm-card" onClick={() => openContent(c)}>
                          <div className="bm-thumb">
                            {c.thumbnail_url && <img src={c.thumbnail_url} alt={c.title ?? ""} />}
                            <span className="bm-rt" style={{ background: meta.bg, color: meta.fg }}>{meta.label}</span>
                          </div>
                          <div className="bm-cbody">
                            <h3>{c.title}</h3>
                            <div className="a">{c.author_name ?? "CoCreate"}</div>
                          </div>
                          <button
                            type="button"
                            className="bm-crm"
                            aria-label="Remove bookmark"
                            onClick={(e) => { e.stopPropagation(); removeSaved(s.id); }}
                          >×</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
