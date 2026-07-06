import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { trackEvent } from "@/lib/track";

export const Route = createFileRoute("/essays/$id")({
  component: EssayPage,
  errorComponent: ({ error }) => (
    <div style={pageWrap}>
      <div style={{ maxWidth: 640, margin: "80px auto", textAlign: "center" }}>
        <h1 style={{ fontSize: 22, color: "#181A4D", fontWeight: 900 }}>This essay didn't load</h1>
        <p style={{ color: "#8a8678", marginTop: 8 }}>{error.message}</p>
        <Link to="/explore" style={backLink}>Back to Explore</Link>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div style={pageWrap}>
      <div style={{ maxWidth: 640, margin: "80px auto", textAlign: "center" }}>
        <h1 style={{ fontSize: 22, color: "#181A4D", fontWeight: 900 }}>Essay not found</h1>
        <Link to="/explore" style={backLink}>Back to Explore</Link>
      </div>
    </div>
  ),
  head: ({ params }) => ({
    meta: [
      { title: "Essay — CoCreate" },
      { name: "description", content: "Read this essay on CoCreate." },
      { property: "og:title", content: "Essay — CoCreate" },
      { property: "og:type", content: "article" },
    ],
    // params.id is used in queries; suppress unused warning
    ...(params.id ? {} : {}),
  }),
});

type ContentRow = Database["public"]["Tables"]["content_items"]["Row"];
type PreviewRow = Database["public"]["Views"]["content_items_public"]["Row"];
type Comment = Database["public"]["Tables"]["discussion_comments"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const pageWrap: React.CSSProperties = { minHeight: "100vh", background: "#eee9d9", fontFamily: "Poppins, sans-serif", color: "#20201c" };
const backLink: React.CSSProperties = { display: "inline-block", marginTop: 20, color: "#181A4D", fontWeight: 700, textDecoration: "none", borderBottom: "2px solid #DCE07A" };

const CSS = `
.es-root *{box-sizing:border-box;}
.es-nav{background:#fff;border-bottom:1px solid rgba(20,20,20,0.08);padding:14px 24px;display:flex;align-items:center;justify-content:space-between;gap:12px;position:sticky;top:0;z-index:50;}
.es-brand{display:flex;align-items:center;gap:10px;text-decoration:none;}
.es-brand .mark{width:28px;height:28px;background:#DCE07A;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#181A4D;font-weight:900;}
.es-brand .word{font-weight:900;font-size:19px;color:#181A4D;letter-spacing:-0.02em;}
.es-back{color:#8a8678;font-weight:700;font-size:12.5px;text-decoration:none;}
.es-back:hover{color:#181A4D;}
.es-signin{background:#181A4D;color:#fff;font-weight:800;font-size:12.5px;padding:9px 18px;border-radius:20px;text-decoration:none;font-family:'Poppins';border:none;cursor:pointer;}
.es-shell{max-width:720px;margin:0 auto;padding:44px 28px 100px;}
.es-tag{display:inline-block;font-size:10.5px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;background:#DCE07A;color:#181A4D;padding:5px 12px;border-radius:20px;margin-bottom:18px;}
.es-title{font-size:38px;font-weight:900;letter-spacing:-0.03em;color:#181A4D;line-height:1.15;margin:0 0 14px;}
.es-meta{display:flex;align-items:center;gap:14px;color:#8a8678;font-size:13px;font-weight:600;margin-bottom:6px;}
.es-scr{color:#0F4A42;font-weight:700;font-size:13px;margin-bottom:26px;}
.es-hero{width:100%;height:280px;object-fit:cover;border-radius:16px;margin-bottom:28px;filter:grayscale(0.15) contrast(1.05);}
.es-excerpt{font-size:18px;line-height:1.65;font-weight:500;color:#20201c;margin-bottom:22px;letter-spacing:-0.005em;}
.es-body{font-size:16px;line-height:1.75;color:#20201c;white-space:pre-wrap;}
.es-body p{margin:0 0 18px;}
.es-gate{margin-top:8px;background:#fff;border:1px solid rgba(20,20,20,0.08);border-left:4px solid #FF340C;border-radius:14px;padding:22px 24px;}
.es-gate h3{font-size:16px;font-weight:800;color:#181A4D;margin:0 0 6px;letter-spacing:-0.01em;}
.es-gate p{font-size:13.5px;color:#8a8678;margin:0 0 14px;line-height:1.55;}
.es-actionrow{display:flex;gap:10px;margin:26px 0 8px;flex-wrap:wrap;}
.es-act{display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border-radius:20px;border:1.5px solid rgba(20,20,20,0.10);background:#fff;color:#181A4D;font-weight:700;font-size:12.5px;font-family:'Poppins';cursor:pointer;}
.es-act:hover{border-color:#181A4D;}
.es-act.on{background:#181A4D;color:#fff;border-color:#181A4D;}
.es-act svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}
.es-pinbtn{position:absolute;background:#181A4D;color:#fff;border:none;border-radius:16px;padding:7px 14px;font-family:'Poppins';font-weight:700;font-size:11.5px;cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 8px 24px rgba(0,0,0,0.18);z-index:20;}
.es-pinbtn svg{width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2;}
.es-notes{margin-top:36px;background:#FBF8ED;border:1.5px dashed #8a96e0;border-radius:14px;padding:18px 20px;}
.es-notes .l{font-size:10.5px;font-weight:800;color:#8a96e0;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;}
.es-notes textarea{width:100%;border:none;background:transparent;font-family:'Poppins';font-size:14px;color:#20201c;line-height:1.55;min-height:100px;resize:vertical;outline:none;}
.es-notes .row{display:flex;justify-content:space-between;align-items:center;margin-top:8px;}
.es-notes .status{font-size:11px;color:#8a8678;font-weight:600;}
.es-notes button{background:#181A4D;color:#fff;border:none;border-radius:16px;padding:7px 16px;font-family:'Poppins';font-weight:700;font-size:11.5px;cursor:pointer;}
.es-pinned-quotes{margin-top:26px;display:flex;flex-direction:column;gap:10px;}
.es-quote{background:#fff;border:1px solid rgba(20,20,20,0.08);border-left:5px solid #441B07;border-radius:12px;padding:14px 16px;position:relative;}
.es-quote p{margin:0;font-size:14px;color:#181A4D;font-weight:600;line-height:1.5;}
.es-quote .rm{position:absolute;top:10px;right:12px;background:none;border:none;color:#8a8678;font-size:11px;cursor:pointer;font-family:'Poppins';font-weight:700;}
.es-quote .rm:hover{color:#FF340C;}
.es-divider{height:1px;background:rgba(20,20,20,0.08);margin:48px 0 32px;}
.es-disc-h{font-size:20px;font-weight:900;color:#181A4D;letter-spacing:-0.02em;margin:0 0 6px;}
.es-disc-sub{font-size:13px;color:#8a8678;margin:0 0 22px;}
.es-comment{padding:18px 0;border-bottom:1px solid rgba(20,20,20,0.06);}
.es-comment:last-child{border-bottom:none;}
.es-comment .who{display:flex;align-items:center;gap:10px;margin-bottom:8px;}
.es-comment .av{width:28px;height:28px;border-radius:50%;background:#0F4A42;color:#FBF8ED;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;}
.es-comment .name{font-size:12.5px;font-weight:700;color:#181A4D;}
.es-comment .when{font-size:11px;color:#8a8678;font-weight:500;}
.es-comment p{margin:0;font-size:14px;line-height:1.65;color:#20201c;}
.es-pinned{background:#FBF8ED;border:1px solid rgba(20,20,20,0.08);border-left:4px solid #DCE07A;border-radius:14px;padding:18px 20px;margin-bottom:22px;}
.es-pinned .lbl{font-size:9.5px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#8a9407;margin-bottom:8px;}
.es-composer{margin-top:26px;background:#fff;border:1px solid rgba(20,20,20,0.08);border-radius:14px;padding:16px;}
.es-composer textarea{width:100%;border:none;background:#FBF8ED;border-radius:10px;padding:12px;font-family:'Poppins';font-size:13.5px;color:#20201c;min-height:80px;resize:vertical;outline:none;line-height:1.5;}
.es-composer .row{display:flex;justify-content:space-between;align-items:center;margin-top:10px;}
.es-composer .hint{font-size:11px;color:#8a8678;}
.es-composer button{background:#181A4D;color:#fff;border:none;border-radius:16px;padding:8px 18px;font-family:'Poppins';font-weight:700;font-size:12px;cursor:pointer;}
.es-composer button:disabled{opacity:0.5;cursor:not-allowed;}
.es-signprompt{background:#fff;border:1px solid rgba(20,20,20,0.08);border-radius:14px;padding:20px;text-align:center;margin-top:22px;}
.es-signprompt p{margin:0 0 12px;color:#181A4D;font-weight:600;font-size:13.5px;}
.es-skel{height:400px;background:#fff;border-radius:16px;animation:pulse 1.4s infinite;}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.55}}
.es-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#181A4D;color:#fff;padding:10px 20px;border-radius:20px;font-size:12.5px;font-weight:700;z-index:200;box-shadow:0 10px 30px rgba(0,0,0,0.2);}
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

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function EssayPage() {
  const { id } = Route.useParams();
  const { userId, ready } = useAuth();
  const qc = useQueryClient();
  const bodyRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pinBtn, setPinBtn] = useState<{ top: number; left: number; text: string } | null>(null);

  useEffect(() => {
    document.body.style.background = "#eee9d9";
    return () => { document.body.style.background = ""; };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  // Preview (public) — always fetched.
  const previewQ = useQuery({
    queryKey: ["essay-preview", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("content_items_public").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data as PreviewRow;
    },
  });

  useEffect(() => {
    if (previewQ.data?.id) trackEvent("content_view", { content_id: previewQ.data.id, topic_id: previewQ.data.topic_id ?? null });
  }, [previewQ.data?.id, previewQ.data?.topic_id]);


  // Full row (auth-gated by RLS).
  const fullQ = useQuery({
    queryKey: ["essay-full", id, userId],
    enabled: ready && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("content_items").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as ContentRow | null;
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

  const pinnedQ = useQuery({
    queryKey: ["pinned", id, userId],
    enabled: ready && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("pinned_quotes").select("*").eq("user_id", userId!).eq("content_item_id", id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const commentsQ = useQuery({
    queryKey: ["comments", id, userId],
    enabled: ready && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("discussion_comments").select("*").eq("essay_id", id).order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Comment[];
    },
  });

  const commenterIds = useMemo(() => Array.from(new Set((commentsQ.data ?? []).map((c) => c.user_id))), [commentsQ.data]);
  const profilesQ = useQuery({
    queryKey: ["profiles", commenterIds.sort().join(",")],
    enabled: commenterIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").in("id", commenterIds);
      if (error) throw error;
      const map: Record<string, Profile> = {};
      (data ?? []).forEach((p) => { map[p.id] = p as Profile; });
      return map;
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
      trackEvent("content_save", { content_id: id, topic_id: previewQ.data?.topic_id ?? null });
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
        trackEvent("note_created", { content_id: id, topic_id: previewQ.data?.topic_id ?? null });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["note", id, userId] }); setToast("Note saved"); },
  });

  const pinQuote = useMutation({
    mutationFn: async (quote_text: string) => {
      if (!userId) return;
      const { error } = await supabase.from("pinned_quotes").insert({ user_id: userId, content_item_id: id, quote_text });
      if (error) throw error;
      trackEvent("quote_pinned", { content_id: id, topic_id: previewQ.data?.topic_id ?? null });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pinned", id, userId] }); setToast("Quote pinned"); setPinBtn(null); window.getSelection()?.removeAllRanges(); },
  });

  const removePin = useMutation({
    mutationFn: async (pinId: string) => {
      const { error } = await supabase.from("pinned_quotes").delete().eq("id", pinId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pinned", id, userId] }),
  });

  const postComment = useMutation({
    mutationFn: async (body: string) => {
      if (!userId) return;
      const { error } = await supabase.from("discussion_comments").insert({ essay_id: id, user_id: userId, body });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", id, userId] }),
  });

  // Highlight-to-pin: on mouseup within body, show a floating "Pin as quote" button.
  const onBodyMouseUp = () => {
    if (!userId) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) { setPinBtn(null); return; }
    const text = sel.toString().trim();
    if (text.length < 4 || text.length > 500) { setPinBtn(null); return; }
    const range = sel.getRangeAt(0);
    if (!bodyRef.current?.contains(range.commonAncestorContainer)) { setPinBtn(null); return; }
    const rect = range.getBoundingClientRect();
    setPinBtn({
      top: window.scrollY + rect.top - 40,
      left: window.scrollX + rect.left + rect.width / 2 - 60,
      text,
    });
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".es-pinbtn") && !target.closest(".es-body")) setPinBtn(null);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  const [noteDraft, setNoteDraft] = useState("");
  useEffect(() => { if (noteQ.data?.body !== undefined) setNoteDraft(noteQ.data.body); }, [noteQ.data?.body]);
  const [commentDraft, setCommentDraft] = useState("");

  const preview = previewQ.data;
  const full = fullQ.data;
  const isSaved = !!savedQ.data;

  const share = async () => {
    const url = window.location.href;
    const title = preview?.title ?? "CoCreate essay";
    if (navigator.share) {
      try { await navigator.share({ title, url }); return; } catch { /* cancelled */ }
    }
    await navigator.clipboard.writeText(url);
    setToast("Link copied");
  };

  return (
    <div className="es-root" style={pageWrap}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <nav className="es-nav">
        <Link to="/" className="es-brand"><div className="mark">C</div><div className="word">CoCreate</div></Link>
        <Link to="/explore" className="es-back">← Back to Explore</Link>
        {userId ? null : <Link to="/auth" className="es-signin">Sign in</Link>}
      </nav>

      <div className="es-shell">
        {previewQ.isLoading ? (
          <div className="es-skel" />
        ) : !preview ? (
          <div style={{ textAlign: "center", padding: 40 }}>Essay not found.</div>
        ) : (
          <>
            <span className="es-tag">{preview.type ?? "essay"}</span>
            <h1 className="es-title">{preview.title}</h1>
            <div className="es-meta">
              <span>{preview.author_name ?? "CoCreate"}</span>
              {preview.published_at && <span>·</span>}
              {preview.published_at && <span>{formatWhen(preview.published_at)}</span>}
            </div>
            {preview.scripture_reference && <div className="es-scr">{preview.scripture_reference}</div>}

            {preview.thumbnail_url && <img className="es-hero" src={preview.thumbnail_url} alt={preview.title ?? ""} />}

            {preview.excerpt && <p className="es-excerpt">{preview.excerpt}</p>}

            {userId ? (
              <>
                <div className="es-actionrow">
                  <button className={`es-act ${isSaved ? "on" : ""}`} onClick={() => toggleSave.mutate()} disabled={toggleSave.isPending}>
                    <svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4V3z"/></svg>{isSaved ? "Saved" : "Save"}
                  </button>
                  <button className="es-act" onClick={share}>
                    <svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.5l6.8-3.9M8.6 13.5l6.8 3.9"/></svg>Share
                  </button>
                </div>

                <div ref={bodyRef} className="es-body" onMouseUp={onBodyMouseUp} style={{ marginTop: 22 }}>
                  {fullQ.isLoading ? "Loading…" : full?.body
                    ? full.body.split(/\n\n+/).map((para, i) => <p key={i}>{para}</p>)
                    : <p style={{ color: "#8a8678", fontStyle: "italic" }}>The full text for this essay hasn't been added yet.</p>}
                </div>

                <div style={{ fontSize: 11, color: "#8a8678", marginTop: 6, fontWeight: 600 }}>
                  Highlight any passage to pin it as a quote.
                </div>

                {(pinnedQ.data?.length ?? 0) > 0 && (
                  <div className="es-pinned-quotes">
                    <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#181A4D", marginTop: 26 }}>Your Pinned Quotes</div>
                    {pinnedQ.data!.map((q) => (
                      <div key={q.id} className="es-quote">
                        <p>&ldquo;{q.quote_text}&rdquo;</p>
                        <button className="rm" onClick={() => removePin.mutate(q.id)}>Remove</button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="es-notes">
                  <div className="l">Your notes on this essay</div>
                  <textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="What did this stir up? Write it down while it's fresh."
                  />
                  <div className="row">
                    <div className="status">{noteQ.data ? "Saved privately to your notes" : "Only you can see this"}</div>
                    <button onClick={() => saveNote.mutate(noteDraft)} disabled={saveNote.isPending || !noteDraft.trim()}>
                      {saveNote.isPending ? "Saving…" : noteQ.data ? "Update" : "Save note"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="es-gate">
                <h3>Sign in to keep reading</h3>
                <p>The rest of this essay — plus saving, notes, and quote-pinning — is for signed-in members. It's free to create an account.</p>
                <Link to="/auth" className="es-signin">Sign in to continue</Link>
              </div>
            )}

            {/* Discussion */}
            <div className="es-divider" />
            <h2 className="es-disc-h">Discussion</h2>
            <p className="es-disc-sub">A quiet space. No like counts, no infinite thread — just what's been said, in order.</p>

            {!userId ? (
              <div className="es-signprompt">
                <p>Sign in to read the discussion and add your reflection.</p>
                <Link to="/auth" className="es-signin">Sign in</Link>
              </div>
            ) : commentsQ.isLoading ? (
              <div style={{ color: "#8a8678", fontSize: 13 }}>Loading…</div>
            ) : (
              <Discussion
                comments={commentsQ.data ?? []}
                profiles={profilesQ.data ?? {}}
                composerValue={commentDraft}
                onComposerChange={setCommentDraft}
                onPost={() => { postComment.mutate(commentDraft, { onSuccess: () => setCommentDraft("") }); }}
                posting={postComment.isPending}
                userId={userId}
              />
            )}
          </>
        )}
      </div>

      {pinBtn && (
        <button className="es-pinbtn" style={{ top: pinBtn.top, left: pinBtn.left }} onClick={() => pinQuote.mutate(pinBtn.text)}>
          <svg viewBox="0 0 24 24"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg>
          Pin as quote
        </button>
      )}

      {toast && <div className="es-toast">{toast}</div>}
    </div>
  );
}

function Discussion({
  comments, profiles, composerValue, onComposerChange, onPost, posting, userId,
}: {
  comments: Comment[];
  profiles: Record<string, Profile>;
  composerValue: string;
  onComposerChange: (s: string) => void;
  onPost: () => void;
  posting: boolean;
  userId: string;
}) {
  const pinned = comments.filter((c) => c.is_admin_pinned);
  const rest = comments.filter((c) => !c.is_admin_pinned);

  const initial = (name?: string | null) => (name?.trim()?.[0] ?? "?").toUpperCase();

  return (
    <>
      {pinned.length > 0 && (
        <div>
          {pinned.map((c) => {
            const p = profiles[c.user_id];
            return (
              <div key={c.id} className="es-pinned">
                <div className="lbl">Pinned reflection</div>
                <p style={{ margin: 0, fontSize: 14.5, color: "#181A4D", fontWeight: 500, lineHeight: 1.65 }}>{c.body}</p>
                <div style={{ marginTop: 10, fontSize: 11.5, color: "#8a8678", fontWeight: 600 }}>
                  {p?.name ?? "CoCreate reader"} · {formatWhen(c.created_at)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {rest.length === 0 && pinned.length === 0 ? (
        <div style={{ color: "#8a8678", fontSize: 13, padding: "18px 0" }}>No reflections yet. Be the first to add one below.</div>
      ) : (
        <div>
          {rest.map((c) => {
            const p = profiles[c.user_id];
            const name = p?.name ?? "CoCreate reader";
            return (
              <div key={c.id} className="es-comment">
                <div className="who">
                  <div className="av">{initial(name)}</div>
                  <span className="name">{name}</span>
                  <span className="when">· {formatWhen(c.created_at)}</span>
                </div>
                <p>{c.body}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="es-composer">
        <textarea
          value={composerValue}
          onChange={(e) => onComposerChange(e.target.value)}
          placeholder="Share a reflection. Take your time."
        />
        <div className="row">
          <span className="hint">Posting as {profiles[userId]?.name ?? "you"}. Be kind — this is a slow room.</span>
          <button onClick={onPost} disabled={posting || !composerValue.trim()}>
            {posting ? "Posting…" : "Post reflection"}
          </button>
        </div>
      </div>
    </>
  );
}
