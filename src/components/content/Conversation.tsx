import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/** Public comments section, rendered at #conversation on articles, teachings, podcasts and devotional days. */
export type ConvTarget = { contentId: string } | { templateId: string; dayNumber: number };
type Row = { id: string; parent_id: string | null; user_id: string; author_name: string | null; body: string | null; is_hidden: boolean; agree_count: number; edited_at: string | null; created_at: string };

const PASTELS = ["#E8E6F5", "#F7E2E7", "#FFF0CC", "#E3EEEA"];
const pastel = (id: string) => PASTELS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % PASTELS.length]!;
const MAX = 2000;
const REASONS = [{ v: "unkind", l: "Unkind" }, { v: "off_topic", l: "Off-topic" }, { v: "spam", l: "Spam" }, { v: "other", l: "Other" }] as const;

const CSS = `
.cv{margin-top:56px;font-family:'Instrument Sans',sans-serif;color:#2A2B33;}
.cv h2{margin:0;font-family:Poppins,sans-serif;font-size:20px;font-weight:600;color:#181A4D;}
.cv .sort{min-height:34px;padding:0 14px;border-radius:999px;font-size:13px;font-weight:600;border:1px solid #E6E3DC;background:#fff;color:#181A4D;cursor:pointer;font-family:inherit;}
.cv .sort.on{background:#181A4D;border-color:#181A4D;color:#fff;}
.cv .av{width:36px;height:36px;flex:none;border-radius:999px;display:flex;align-items:center;justify-content:center;font-family:Poppins,sans-serif;font-weight:600;font-size:14px;color:#181A4D;}
.cv .box{flex:1;min-width:0;border:1px solid #E6E3DC;border-radius:10px;padding:12px 14px;background:#fff;}
.cv textarea{width:100%;border:0;outline:none;resize:vertical;min-height:64px;font-family:inherit;font-size:14.5px;line-height:1.55;color:#2A2B33;background:transparent;}
.cv .post{min-height:40px;padding:0 18px;border-radius:999px;border:0;background:#181A4D;color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;}
.cv .post.sec{background:#fff;color:#181A4D;border:1.5px solid #E6E3DC;}
.cv .post:disabled{opacity:.5;cursor:default;}
.cv .row{display:flex;gap:12px;padding:16px 0;border-top:1px solid #E6E3DC;}
.cv .row.rep{border-top:0;padding-top:10px;}
.cv .nm{font-size:13.5px;font-weight:600;color:#181A4D;}
.cv .tm{font-size:13.5px;color:#5F5D55;}
.cv .body{margin-top:4px;font-size:15.5px;line-height:1.6;color:#2A2B33;white-space:pre-wrap;word-break:break-word;}
.cv .body a{color:#181A4D;text-decoration:underline;text-underline-offset:2px;}
.cv .acts{display:flex;gap:18px;margin-top:8px;flex-wrap:wrap;}
.cv .act{background:none;border:0;padding:0;min-height:28px;font:inherit;font-size:13px;font-weight:600;color:#181A4D;cursor:pointer;display:inline-flex;align-items:center;gap:6px;}
.cv .more{width:32px;height:32px;border-radius:999px;border:0;background:transparent;color:#5F5D55;cursor:pointer;display:flex;align-items:center;justify-content:center;flex:none;}
.cv .more:hover{background:#F6F5F1;}
.cv .menu{position:absolute;right:0;top:36px;z-index:20;width:210px;padding:6px;background:#fff;border:1px solid #E6E3DC;border-radius:10px;box-shadow:0 8px 24px rgba(24,26,77,.12);}
.cv .menu button{width:100%;min-height:40px;display:flex;align-items:center;gap:10px;padding:0 10px;border:0;background:none;border-radius:8px;font:inherit;font-size:13.5px;color:#181A4D;cursor:pointer;text-align:left;}
.cv .menu button:hover{background:#F6F5F1;}
.cv .menu .danger{color:#9A2A2A;font-weight:600;}
.cv .hid{display:flex;gap:10px;align-items:center;background:#F6F5F1;border-radius:8px;padding:14px 16px;margin:8px 0;font-size:13.5px;color:#5F5D55;}
.cv .note{font-size:12px;color:#5F5D55;}
.cv .showall{min-height:44px;background:none;border:0;font:inherit;font-size:14px;font-weight:600;color:#181A4D;cursor:pointer;padding:0;}
.cv .badge{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#9A2A2A;margin-left:8px;}
.cv-dlg{position:fixed;inset:0;z-index:100;background:rgba(10,14,36,.4);display:flex;align-items:center;justify-content:center;padding:16px;}
.cv-dlg>div{background:#fff;border-radius:12px;padding:22px;width:340px;max-width:100%;font-family:'Instrument Sans',sans-serif;}
.cv-dlg label{display:flex;gap:10px;align-items:center;min-height:40px;font-size:14px;color:#181A4D;cursor:pointer;}
@media(max-width:760px){.cv .reps{margin-left:24px!important;}}
`;

const I = {
  heart: (on: boolean) => <svg width="16" height="16" viewBox="0 0 24 24" fill={on ? "#181A4D" : "none"} stroke="#181A4D" strokeWidth={1.9} strokeLinejoin="round"><path d="M12 20s-7-4.4-9.2-8.6C1.3 8.5 3 5 6.5 5c2 0 3.3 1.1 4 2.3h3C14.2 6.1 15.5 5 17.5 5 21 5 22.7 8.5 21.2 11.4 19 15.6 12 20 12 20z" /></svg>,
  dots: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>,
  share: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v14" /></svg>,
  flag: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></svg>,
  eyeOff: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#5F5D55" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18M10.6 5.1A9.8 9.8 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-3.2 4M6.6 6.6A17 17 0 0 0 2.5 12S6 19 12 19a9.6 9.6 0 0 0 4.4-1M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>,
};

export function relTime(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Plain text with URLs linked (nofollow ugc). */
export function linkify(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\bhttps?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]]/gi;
  let last = 0; let m: RegExpExecArray | null; let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(<a key={k++} href={m[0]} target="_blank" rel="nofollow ugc noopener noreferrer">{m[0]}</a>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const keyOf = (t: ConvTarget) => ("contentId" in t ? `c:${t.contentId}` : `d:${t.templateId}:${t.dayNumber}`);

export function useCommentCount(t: ConvTarget | null) {
  return useQuery({
    queryKey: ["comments", t ? keyOf(t) : "none", "count"], enabled: !!t,
    queryFn: async () => {
      let q = (supabase.from as any)("comments_public").select("id", { count: "exact", head: true }).eq("is_hidden", false);
      q = "contentId" in t! ? q.eq("content_id", t!.contentId) : q.eq("template_id", t!.templateId).eq("day_number", t!.dayNumber);
      return ((await q).count ?? 0) as number;
    },
  });
}

export function Conversation({ target, userId, isAdmin }: { target: ConvTarget; userId: string | null; isAdmin: boolean }) {
  const qc = useQueryClient();
  const key = keyOf(target);
  const [sort, setSort] = useState<"agreed" | "newest">("agreed");
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [flagFor, setFlagFor] = useState<string | null>(null);

  const listQ = useQuery({
    queryKey: ["comments", key, "list", userId],
    queryFn: async () => {
      let q = (supabase.from as any)("comments_public").select("*").order("created_at", { ascending: true }).limit(1000);
      q = "contentId" in target ? q.eq("content_id", target.contentId) : q.eq("template_id", target.templateId).eq("day_number", target.dayNumber);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
  const meQ = useQuery({
    queryKey: ["comment-me", userId], enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      const { data: p } = await supabase.from("profiles").select("name").eq("id", userId!).maybeSingle();
      return { confirmed: !!data.user?.email_confirmed_at, email: data.user?.email ?? "", name: p?.name || data.user?.email || "" };
    },
  });
  const agreesQ = useQuery({
    queryKey: ["comment-agrees", key, userId], enabled: !!userId,
    queryFn: async () => {
      const ids = (listQ.data ?? []).map((r) => r.id);
      if (!ids.length) return new Set<string>();
      const { data } = await (supabase.from as any)("comment_agrees").select("comment_id").eq("user_id", userId).in("comment_id", ids);
      return new Set(((data ?? []) as any[]).map((r) => r.comment_id as string));
    },
  });
  useEffect(() => { if (listQ.data) void agreesQ.refetch(); }, [listQ.data?.length]);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["comments", key] }); qc.invalidateQueries({ queryKey: ["comment-agrees", key] }); };

  const rows = listQ.data ?? [];
  const tops = useMemo(() => {
    const t = rows.filter((r) => !r.parent_id);
    return sort === "newest" ? [...t].sort((a, b) => b.created_at.localeCompare(a.created_at))
      : [...t].sort((a, b) => b.agree_count - a.agree_count || b.created_at.localeCompare(a.created_at));
  }, [rows, sort]);
  const repliesOf = (id: string) => rows.filter((r) => r.parent_id === id);
  const visibleCount = rows.filter((r) => !r.is_hidden).length;

  // Deep link: #comment-<id>
  const scrolled = useRef(false);
  useEffect(() => {
    if (scrolled.current || !rows.length) return;
    const h = window.location.hash.replace("#comment-", "");
    if (!h || h === window.location.hash) return;
    const r = rows.find((x) => x.id === h); if (!r) return;
    scrolled.current = true; setShowAll(true);
    if (r.parent_id) setOpen((s) => new Set(s).add(r.parent_id!));
    setTimeout(() => document.getElementById(`comment-${h}`)?.scrollIntoView({ block: "center" }), 120);
  }, [rows.length]);

  const signedIn = !!userId;
  const confirmed = meQ.data?.confirmed ?? false;
  const canPost = signedIn && confirmed;
  const post = async (body: string, parentId: string | null) => {
    const payload: Record<string, unknown> = { body: body.trim(), parent_id: parentId, user_id: userId };
    if ("contentId" in target) payload.content_id = target.contentId; else { payload.template_id = target.templateId; payload.day_number = target.dayNumber; }
    const { error } = await (supabase.from as any)("comments").insert(payload);
    if (error) { toast.error(error.message.replace(/^.*?: /, "") || "Couldn’t post that."); return false; }
    if (parentId) setOpen((s) => new Set(s).add(parentId));
    refresh(); return true;
  };
  const toggleAgree = async (r: Row) => {
    if (!canPost) return;
    const on = agreesQ.data?.has(r.id);
    const res = on ? await (supabase.from as any)("comment_agrees").delete().eq("comment_id", r.id).eq("user_id", userId)
      : await (supabase.from as any)("comment_agrees").insert({ comment_id: r.id, user_id: userId });
    if (res.error) toast.error("Couldn’t save that."); refresh();
  };
  const resend = async () => {
    const email = meQ.data?.email; if (!email) return;
    const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: window.location.href } });
    if (error) toast.error(error.message); else toast.success("Confirmation email sent");
  };

  const shown = showAll ? tops : tops.slice(0, 5);
  const ctx: RowCtx = { userId, isAdmin, canPost, agrees: agreesQ.data ?? new Set(), refresh, toggleAgree, onReply: (id) => setReplyTo(replyTo === id ? null : id), onFlag: setFlagFor };

  return (
    <section className="cv" id="conversation" aria-label="Conversation">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><h2>Conversation</h2><span style={{ fontSize: 14, fontWeight: 500, color: "#5F5D55" }}>{visibleCount}</span></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className={`sort${sort === "agreed" ? " on" : ""}`} onClick={() => setSort("agreed")}>Most agreed</button>
          <button type="button" className={`sort${sort === "newest" ? " on" : ""}`} onClick={() => setSort("newest")}>Newest</button>
        </div>
      </div>

      {!signedIn ? (
        <div style={{ background: "#F6F5F1", borderRadius: 10, padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
          <span style={{ fontSize: 14.5, color: "#181A4D" }}>Sign in to agree, reply or add your own thoughts.</span>
          <Link to="/auth" className="post" style={{ display: "inline-flex", alignItems: "center", color: "#fff", textDecoration: "none" }}>Sign in</Link>
        </div>
      ) : meQ.data && !confirmed ? (
        <div style={{ background: "#F6F5F1", borderRadius: 10, padding: "16px 18px", fontSize: 14.5, color: "#181A4D", marginBottom: 8 }}>
          Confirm your email to join the conversation. <button type="button" className="act" style={{ textDecoration: "underline" }} onClick={resend}>Resend the email</button>
        </div>
      ) : meQ.data ? (
        <Composer name={meQ.data.name} seed={userId!} onPost={(b) => post(b, null)} />
      ) : null}

      <div style={{ marginTop: 12 }}>
        {shown.map((r) => {
          const reps = repliesOf(r.id);
          const isOpen = open.has(r.id);
          return (
            <div key={r.id}>
              <CommentRow r={r} ctx={ctx} replyCount={reps.length} repliesOpen={isOpen} onToggleReplies={() => setOpen((s) => { const n = new Set(s); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n; })} />
              {(isOpen || replyTo === r.id) && (
                <div className="reps" style={{ marginLeft: 48 }}>
                  {isOpen && reps.map((x) => <CommentRow key={x.id} r={x} ctx={ctx} reply />)}
                  {replyTo === r.id && canPost && meQ.data && <div style={{ paddingBottom: 12 }}><Composer name={meQ.data.name} seed={userId!} placeholder="Write a reply…" autoFocus onCancel={() => setReplyTo(null)} onPost={async (b) => { const ok = await post(b, r.id); if (ok) setReplyTo(null); return ok; }} /></div>}
                </div>
              )}
            </div>
          );
        })}
        {!showAll && tops.length > 5 && <button type="button" className="showall" onClick={() => setShowAll(true)}>Show all {tops.length} comments</button>}
      </div>
      {flagFor && <FlagDialog onClose={() => setFlagFor(null)} onFlag={async (reason) => {
        const { error } = await (supabase.from as any)("comment_flags").insert({ comment_id: flagFor, user_id: userId, reason });
        setFlagFor(null);
        if (error && !/duplicate/i.test(error.message)) toast.error(error.message.replace(/^.*?: /, "")); else toast.success("Thanks — we'll take a look.");
        refresh();
      }} />}
    </section>
  );
}

type RowCtx = { userId: string | null; isAdmin: boolean; canPost: boolean; agrees: Set<string>; refresh: () => void; toggleAgree: (r: Row) => void; onReply: (id: string) => void; onFlag: (id: string) => void };

function Composer({ name, seed, onPost, placeholder, autoFocus, onCancel }: { name: string; seed: string; onPost: (b: string) => Promise<boolean>; placeholder?: string; autoFocus?: boolean; onCancel?: () => void }) {
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => { if (!v.trim() || busy) return; setBusy(true); const ok = await onPost(v); setBusy(false); if (ok) setV(""); };
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <span className="av" style={{ background: "#DCE07A" }} aria-hidden>{(name || "?").trim().charAt(0).toUpperCase()}</span>
      <div className="box">
        <textarea value={v} maxLength={MAX} autoFocus={autoFocus} onChange={(e) => setV(e.target.value)} placeholder={placeholder ?? "Add a thought or what stood out to you…"} aria-label={placeholder ?? "Add a comment"} data-seed={seed}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void submit(); }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <span className="note">Be kind. Comments are reviewed when flagged.{v.length > MAX - 200 ? ` · ${MAX - v.length} left` : ""}</span>
          <span style={{ display: "flex", gap: 8 }}>
            {onCancel && <button type="button" className="post sec" onClick={onCancel}>Cancel</button>}
            <button type="button" className="post" disabled={!v.trim() || busy} onClick={submit}>Post</button>
          </span>
        </div>
      </div>
    </div>
  );
}

function CommentRow({ r, ctx, reply, replyCount = 0, repliesOpen, onToggleReplies }: { r: Row; ctx: RowCtx; reply?: boolean; replyCount?: number; repliesOpen?: boolean; onToggleReplies?: () => void }) {
  const mine = ctx.userId === r.user_id;
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(r.body ?? "");
  const [confirmDel, setConfirmDel] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!menu) return;
    const on = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false); };
    document.addEventListener("mousedown", on); return () => document.removeEventListener("mousedown", on);
  }, [menu]);
  const replyFooter = !reply && replyCount > 0 && <button type="button" className="act" onClick={onToggleReplies}>{repliesOpen ? "Hide replies" : `View ${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}</button>;

  if (r.is_hidden && r.body == null) {
    return (
      <div id={`comment-${r.id}`}>
        <div className="hid">{I.eyeOff}This comment was flagged and is hidden while it’s reviewed.</div>
        {replyFooter && <div className="acts" style={{ marginBottom: 8 }}>{replyFooter}</div>}
      </div>
    );
  }
  const copyLink = async () => {
    setMenu(false);
    const url = `${window.location.href.split("#")[0]}#comment-${r.id}`;
    try { await navigator.clipboard.writeText(url); toast.success("Link copied"); } catch { toast(url); }
  };
  const saveEdit = async () => {
    const b = draft.trim(); if (!b) return;
    const { error } = await (supabase.from as any)("comments").update({ body: b }).eq("id", r.id);
    if (error) toast.error("Couldn’t save that."); else { setEditing(false); ctx.refresh(); }
  };
  const del = async () => {
    const { error } = await (supabase.from as any)("comments").delete().eq("id", r.id);
    setConfirmDel(false);
    if (error) toast.error("Couldn’t delete that."); else { toast.success("Comment deleted"); ctx.refresh(); }
  };
  const setHidden = async (hide: boolean) => {
    setMenu(false);
    const { error } = await (supabase.from as any)("comments").update(hide ? { hidden_at: new Date().toISOString(), hidden_by: "admin", reviewed_at: new Date().toISOString() } : { hidden_at: null, hidden_by: null, reviewed_at: new Date().toISOString() }).eq("id", r.id);
    if (error) toast.error("Couldn’t update that."); else ctx.refresh();
  };
  const agreed = ctx.agrees.has(r.id);
  return (
    <div className={`row${reply ? " rep" : ""}`} id={`comment-${r.id}`}>
      <span className="av" style={{ background: pastel(r.user_id) }} aria-hidden>{(r.author_name || "?").trim().charAt(0).toUpperCase()}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <span><span className="nm">{r.author_name || "Reader"}</span><span className="tm"> · {relTime(r.created_at)}{r.edited_at ? " · edited" : ""}</span>{r.is_hidden && <span className="badge">Hidden</span>}</span>
          <div style={{ position: "relative" }} ref={menuRef}>
            <button type="button" className="more" aria-label="More options" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>{I.dots}</button>
            {menu && (
              <div className="menu" role="menu">
                <button type="button" role="menuitem" onClick={copyLink}>{I.share}Copy link</button>
                {mine ? (<>
                  <button type="button" role="menuitem" onClick={() => { setMenu(false); setDraft(r.body ?? ""); setEditing(true); }}>Edit</button>
                  <button type="button" role="menuitem" className="danger" onClick={() => { setMenu(false); setConfirmDel(true); }}>Delete</button>
                </>) : ctx.canPost ? (
                  <button type="button" role="menuitem" className="danger" onClick={() => { setMenu(false); ctx.onFlag(r.id); }}>{I.flag}Flag for review</button>
                ) : null}
                {ctx.isAdmin && !mine && (<>
                  <button type="button" role="menuitem" onClick={() => setHidden(!r.is_hidden)}>{r.is_hidden ? "Unhide" : "Hide"}</button>
                  <button type="button" role="menuitem" className="danger" onClick={() => { setMenu(false); setConfirmDel(true); }}>Delete</button>
                </>)}
              </div>
            )}
          </div>
        </div>
        {editing ? (
          <div className="box" style={{ marginTop: 6 }}>
            <textarea value={draft} maxLength={MAX} onChange={(e) => setDraft(e.target.value)} aria-label="Edit comment" autoFocus />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><button type="button" className="post sec" onClick={() => setEditing(false)}>Cancel</button><button type="button" className="post" disabled={!draft.trim()} onClick={saveEdit}>Save</button></div>
          </div>
        ) : <div className="body">{linkify(r.body ?? "")}</div>}
        <div className="acts">
          <button type="button" className="act" aria-pressed={agreed} disabled={!ctx.canPost} title={ctx.canPost ? undefined : "Sign in to agree"} onClick={() => ctx.toggleAgree(r)}>{I.heart(agreed)}Agree · {r.agree_count}</button>
          {!reply && ctx.canPost && <button type="button" className="act" onClick={() => ctx.onReply(r.id)}>Reply</button>}
          {replyFooter}
        </div>
      </div>
      {confirmDel && (
        <div className="cv-dlg" role="dialog" aria-modal="true" aria-label="Delete comment"><div>
          <div style={{ fontFamily: "Poppins", fontSize: 17, fontWeight: 600, color: "#181A4D" }}>Delete this comment?</div>
          <p style={{ fontSize: 14, color: "#5F5D55", margin: "8px 0 18px" }}>This can’t be undone{replyCount ? " and removes its replies" : ""}.</p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><button type="button" className="post sec" onClick={() => setConfirmDel(false)}>Cancel</button><button type="button" className="post" style={{ background: "#9A2A2A" }} onClick={del}>Delete</button></div>
        </div></div>
      )}
    </div>
  );
}

function FlagDialog({ onClose, onFlag }: { onClose: () => void; onFlag: (reason: string | null) => void }) {
  const [reason, setReason] = useState<string | null>(null);
  return (
    <div className="cv-dlg" role="dialog" aria-modal="true" aria-label="Flag for review" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}><div>
      <div style={{ fontFamily: "Poppins", fontSize: 17, fontWeight: 600, color: "#181A4D", marginBottom: 8 }}>Flag for review</div>
      {REASONS.map((r) => <label key={r.v}><input type="radio" name="reason" checked={reason === r.v} onChange={() => setReason(r.v)} />{r.l}</label>)}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
        <button type="button" className="post sec" onClick={onClose}>Cancel</button>
        <button type="button" className="post" onClick={() => onFlag(reason)}>Flag</button>
      </div>
    </div></div>
  );
}
