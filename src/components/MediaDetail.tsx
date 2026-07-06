import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { trackEvent } from "@/lib/track";

type PreviewRow = Database["public"]["Views"]["content_items_public"]["Row"];

const TYPE_META: Record<string, { label: string; bg: string; fg: string }> = {
  teaching: { label: "Teaching", bg: "#F5B301", fg: "#20201c" },
  essay:    { label: "Essay",    bg: "#C7E39B", fg: "#20201c" },
  podcast:  { label: "Podcast",  bg: "#0F4A42", fg: "#FBF8ED" },
  blog:     { label: "Blog",     bg: "#DCE07A", fg: "#181A4D" },
};

const CSS = `
.md-root *{box-sizing:border-box;}
.md-root{min-height:100vh;background:#eee9d9;font-family:'Poppins',sans-serif;color:#20201c;}
.md-nav{background:#fff;border-bottom:1px solid rgba(20,20,20,0.08);padding:14px 24px;display:flex;align-items:center;justify-content:space-between;gap:12px;position:sticky;top:0;z-index:50;}
.md-brand{display:flex;align-items:center;gap:10px;text-decoration:none;}
.md-brand .mark{width:28px;height:28px;background:#DCE07A;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#181A4D;font-weight:900;}
.md-brand .word{font-weight:900;font-size:19px;color:#181A4D;letter-spacing:-0.02em;}
.md-back{color:#8a8678;font-weight:700;font-size:12.5px;text-decoration:none;}
.md-back:hover{color:#181A4D;}
.md-signin{background:#181A4D;color:#fff;font-weight:800;font-size:12.5px;padding:9px 18px;border-radius:20px;text-decoration:none;border:none;cursor:pointer;font-family:'Poppins';}
.md-shell{max-width:820px;margin:0 auto;padding:36px 24px 100px;}
.md-tag{display:inline-block;font-size:10.5px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;padding:5px 12px;border-radius:20px;margin-bottom:16px;}
.md-title{font-size:34px;font-weight:900;letter-spacing:-0.03em;color:#181A4D;line-height:1.15;margin:0 0 12px;}
.md-meta{display:flex;flex-wrap:wrap;align-items:center;gap:10px;color:#8a8678;font-size:13px;font-weight:600;margin-bottom:6px;}
.md-meta .lbl{font-size:10px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#181A4D;background:#FBF8ED;padding:3px 8px;border-radius:10px;}
.md-scr{color:#0F4A42;font-weight:700;font-size:13px;margin-bottom:22px;}
.md-embed{width:100%;aspect-ratio:16/9;background:#111;border-radius:16px;overflow:hidden;margin-bottom:26px;box-shadow:0 20px 50px rgba(0,0,0,0.12);}
.md-embed iframe{width:100%;height:100%;border:0;display:block;}
.md-audio-wrap{background:linear-gradient(135deg,#0F4A42,#181A4D);border-radius:16px;padding:26px;color:#FBF8ED;margin-bottom:26px;display:flex;gap:20px;align-items:center;}
.md-audio-wrap img{width:96px;height:96px;border-radius:12px;object-fit:cover;flex-shrink:0;}
.md-audio-wrap .col{flex:1;min-width:0;}
.md-audio-wrap .lbl{font-size:10px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;opacity:0.7;margin-bottom:6px;}
.md-audio-wrap .ep{font-size:15px;font-weight:800;margin-bottom:12px;letter-spacing:-0.01em;}
.md-audio-wrap audio{width:100%;height:38px;}
.md-desc{font-size:16px;line-height:1.7;color:#20201c;white-space:pre-wrap;margin-bottom:22px;}
.md-actionrow{display:flex;gap:10px;margin:6px 0 26px;flex-wrap:wrap;}
.md-act{display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border-radius:20px;border:1.5px solid rgba(20,20,20,0.10);background:#fff;color:#181A4D;font-weight:700;font-size:12.5px;font-family:'Poppins';cursor:pointer;}
.md-act:hover{border-color:#181A4D;}
.md-act.on{background:#181A4D;color:#fff;border-color:#181A4D;}
.md-act svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}
.md-notes{background:#FBF8ED;border:1.5px dashed #8a96e0;border-radius:14px;padding:18px 20px;margin-top:18px;}
.md-notes .l{font-size:10.5px;font-weight:800;color:#8a96e0;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;}
.md-notes textarea{width:100%;border:none;background:transparent;font-family:'Poppins';font-size:14px;color:#20201c;line-height:1.55;min-height:100px;resize:vertical;outline:none;}
.md-notes .row{display:flex;justify-content:space-between;align-items:center;margin-top:8px;}
.md-notes button{background:#181A4D;color:#fff;border:none;border-radius:16px;padding:7px 16px;font-family:'Poppins';font-weight:700;font-size:11.5px;cursor:pointer;}
.md-signprompt{background:#fff;border:1px solid rgba(20,20,20,0.08);border-left:4px solid #FF340C;border-radius:14px;padding:20px;margin-top:18px;}
.md-signprompt h3{font-size:16px;font-weight:800;color:#181A4D;margin:0 0 6px;}
.md-signprompt p{font-size:13.5px;color:#8a8678;margin:0 0 12px;line-height:1.55;}
.md-related{margin-top:54px;}
.md-related h2{font-size:20px;font-weight:900;color:#181A4D;letter-spacing:-0.02em;margin:0 0 4px;}
.md-related .sub{font-size:13px;color:#8a8678;margin:0 0 20px;}
.md-relgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:18px;}
.md-relcard{background:#fff;border-radius:14px;overflow:hidden;cursor:pointer;transition:transform .18s ease, box-shadow .18s ease;border:1px solid rgba(20,20,20,0.06);text-decoration:none;color:inherit;display:flex;flex-direction:column;}
.md-relcard:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgba(0,0,0,0.08);}
.md-relthumb{width:100%;aspect-ratio:16/10;background:#DCE07A;position:relative;overflow:hidden;}
.md-relthumb img{width:100%;height:100%;object-fit:cover;}
.md-relthumb .rt{position:absolute;top:10px;left:10px;font-size:9.5px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;padding:4px 10px;border-radius:12px;}
.md-relbody{padding:14px 16px 16px;}
.md-relbody h3{font-size:14.5px;font-weight:800;color:#181A4D;letter-spacing:-0.01em;margin:0 0 6px;line-height:1.35;}
.md-relbody .a{font-size:11.5px;color:#8a8678;font-weight:600;}
.md-empty{padding:26px;background:#fff;border-radius:12px;text-align:center;color:#8a8678;font-size:13px;}
.md-skel{height:420px;background:#fff;border-radius:16px;animation:mdpulse 1.4s infinite;}
@keyframes mdpulse{0%,100%{opacity:1}50%{opacity:.55}}
.md-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#181A4D;color:#fff;padding:10px 20px;border-radius:20px;font-size:12.5px;font-weight:700;z-index:200;box-shadow:0 10px 30px rgba(0,0,0,0.2);}
@media (max-width:520px){.md-title{font-size:26px;}.md-audio-wrap{flex-direction:column;text-align:center;}.md-audio-wrap img{width:140px;height:140px;}}
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

function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function MediaDetail({ id, kind }: { id: string; kind: "teaching" | "podcast" }) {
  const { userId, ready } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [toast, setToast] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  useEffect(() => {
    document.body.style.background = "#eee9d9";
    return () => { document.body.style.background = ""; };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const previewQ = useQuery({
    queryKey: [kind, "preview", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("content_items_public").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as PreviewRow | null;
    },
  });

  const fullQ = useQuery({
    queryKey: [kind, "full", id, userId],
    enabled: ready && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("content_items").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const savedQ = useQuery({
    queryKey: ["saved", id, userId],
    enabled: ready && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("saved_items").select("id").eq("user_id", userId!).eq("content_item_id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const noteQ = useQuery({
    queryKey: ["note", id, userId],
    enabled: ready && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("notes").select("*").eq("user_id", userId!).eq("content_item_id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => { if (noteQ.data?.body !== undefined) setNoteDraft(noteQ.data.body ?? ""); }, [noteQ.data?.body]);

  const preview = previewQ.data;
  const topicId = preview?.topic_id ?? null;

  const relatedQ = useQuery({
    queryKey: ["related", topicId, id],
    enabled: !!topicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_items_public")
        .select("*")
        .eq("topic_id", topicId!)
        .neq("id", id)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(6);
      if (error) throw error;
      return (data ?? []) as PreviewRow[];
    },
  });

  const toggleSave = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      if (savedQ.data?.id) {
        const { error } = await supabase.from("saved_items").delete().eq("id", savedQ.data.id);
        if (error) throw error;
        return "removed";
      }
      const { error } = await supabase.from("saved_items").insert({ user_id: userId, content_item_id: id });
      if (error) throw error;
      return "saved";
    },
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["saved", id, userId] }); setToast(r === "saved" ? "Saved" : "Removed from saved"); },
  });

  const saveNote = useMutation({
    mutationFn: async (body: string) => {
      if (!userId) return;
      if (noteQ.data?.id) {
        const { error } = await supabase.from("notes").update({ body }).eq("id", noteQ.data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("notes").insert({ user_id: userId, content_item_id: id, body });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["note", id, userId] }); setToast("Note saved"); },
  });

  const share = async () => {
    const url = window.location.href;
    const title = preview?.title ?? `CoCreate ${kind}`;
    if (navigator.share) { try { await navigator.share({ title, url }); return; } catch { /* cancelled */ } }
    await navigator.clipboard.writeText(url);
    setToast("Link copied");
  };

  // Prefer full row's media (RLS-gated); fall back to preview thumbnail for signed-out state.
  const mediaUrl: string | null = (fullQ.data?.media_url ?? null) as string | null;
  const ytId = youtubeId(mediaUrl);
  const isAudio = !!mediaUrl && !ytId;

  const kindLabel = kind === "teaching" ? "Teaching" : "Podcast";
  const personLabel = kind === "teaching" ? "Author" : "Guest / Speaker";
  const meta = TYPE_META[kind];

  return (
    <div className="md-root">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <nav className="md-nav">
        <Link to="/" className="md-brand"><div className="mark">C</div><div className="word">CoCreate</div></Link>
        <Link to="/explore" className="md-back">← Back to Explore</Link>
        {userId ? null : <Link to="/auth" className="md-signin">Sign in</Link>}
      </nav>

      <div className="md-shell">
        {previewQ.isLoading ? (
          <div className="md-skel" />
        ) : !preview ? (
          <div style={{ textAlign: "center", padding: 40 }}>{kindLabel} not found.</div>
        ) : (
          <>
            <span className="md-tag" style={{ background: meta.bg, color: meta.fg }}>{kindLabel}</span>
            <h1 className="md-title">{preview.title}</h1>
            <div className="md-meta">
              <span className="lbl">{personLabel}</span>
              <span style={{ color: "#181A4D", fontWeight: 700 }}>{preview.author_name ?? "CoCreate"}</span>
              {preview.published_at && <span>·</span>}
              {preview.published_at && <span>{formatWhen(preview.published_at)}</span>}
            </div>
            {preview.scripture_reference && <div className="md-scr">{preview.scripture_reference}</div>}

            {/* Media embed */}
            {userId && mediaUrl ? (
              ytId ? (
                <div className="md-embed">
                  <iframe
                    src={`https://www.youtube.com/embed/${ytId}`}
                    title={preview.title ?? kindLabel}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : isAudio ? (
                <div className="md-audio-wrap">
                  {preview.thumbnail_url && <img src={preview.thumbnail_url} alt={preview.title ?? ""} />}
                  <div className="col">
                    <div className="lbl">Now playing</div>
                    <div className="ep">{preview.title}</div>
                    <audio controls src={mediaUrl} preload="metadata" />
                  </div>
                </div>
              ) : null
            ) : preview.thumbnail_url ? (
              <div className="md-embed" style={{ position: "relative" }}>
                <img src={preview.thumbnail_url} alt={preview.title ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }} />
                {!userId && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(24,26,77,0.55)", color: "#fff", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 12 }}>
                    ▶ Sign in to {kind === "teaching" ? "watch" : "listen"}
                  </div>
                )}
              </div>
            ) : null}

            {preview.excerpt && <p className="md-desc">{preview.excerpt}</p>}

            {userId ? (
              <>
                <div className="md-actionrow">
                  <button className={`md-act ${savedQ.data ? "on" : ""}`} onClick={() => toggleSave.mutate()} disabled={toggleSave.isPending}>
                    <svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4V3z"/></svg>
                    {savedQ.data ? "Saved" : "Save"}
                  </button>
                  <button className="md-act" onClick={share}>
                    <svg viewBox="0 0 24 24"><path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg>
                    Share
                  </button>
                </div>

                <div className="md-notes">
                  <div className="l">Your notes</div>
                  <textarea
                    placeholder={`What stood out from this ${kind}?`}
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                  />
                  <div className="row">
                    <span style={{ fontSize: 11, color: "#8a8678", fontWeight: 600 }}>Only visible to you</span>
                    <button onClick={() => saveNote.mutate(noteDraft)} disabled={saveNote.isPending}>
                      {saveNote.isPending ? "Saving…" : "Save note"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="md-signprompt">
                <h3>Sign in to {kind === "teaching" ? "watch the full teaching" : "listen to the full episode"}</h3>
                <p>Save what moves you, take private notes, and pick back up where you left off.</p>
                <Link to="/auth" className="md-signin">Sign in</Link>
              </div>
            )}

            <div className="md-related">
              <h2>Related content</h2>
              <p className="sub">More from this topic on CoCreate.</p>
              {relatedQ.isLoading ? (
                <div className="md-empty">Loading…</div>
              ) : (relatedQ.data ?? []).length === 0 ? (
                <div className="md-empty">Nothing else in this topic yet — check back soon.</div>
              ) : (
                <div className="md-relgrid">
                  {(relatedQ.data ?? []).map((r) => {
                    const rt = r.type ?? "essay";
                    const rmeta = TYPE_META[rt];
                    const route = rt === "teaching" ? "/teachings/$id" : rt === "podcast" ? "/podcasts/$id" : "/essays/$id";
                    return (
                      <div key={r.id ?? ""} className="md-relcard" onClick={() => r.id && navigate({ to: route, params: { id: r.id } })}>
                        <div className="md-relthumb">
                          {r.thumbnail_url && <img src={r.thumbnail_url} alt={r.title ?? ""} />}
                          <span className="rt" style={{ background: rmeta.bg, color: rmeta.fg }}>{rmeta.label}</span>
                        </div>
                        <div className="md-relbody">
                          <h3>{r.title}</h3>
                          <div className="a">{r.author_name ?? "CoCreate"}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {toast && <div className="md-toast">{toast}</div>}
    </div>
  );
}
