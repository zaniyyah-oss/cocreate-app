import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DocView } from "@/components/content/PieceRenderer";
import { textToDoc, docHasContent } from "@/lib/piece-doc";
import { Conversation, useCommentCount } from "@/components/content/Conversation";
import { getRelated } from "@/lib/related.functions";
import { saveForLater, removeSaved, markFinished, createReflectionNote } from "@/lib/up-next";
import { trackEvent } from "@/lib/track";
import {
  useViewer, fetchSeries, seriesIdForPiece, useProgress, useFollows, useReminders, useContentActions, upsertProgress, markStarted,
  useOnTheCalendar, useMostRead, usePageCopy, useIsPreviewHost, kindLabel, monD, monthD, photo, lengthOf, pieceRoute, verb, isReleased, UUID_RE,
  type SeriesPart,
} from "@/lib/content-pages";
import { PageFrame, Ico, Ph, SeriesRail, CalendarRail, MostReadRail, CardRow, PartLink, shareLink, focalStyle, type CardItem } from "@/components/content/inner";

const ART_CSS = `
.ca-grid{display:flex;gap:48px;padding-top:20px;align-items:flex-start;}
.ca-left{width:64px;flex:none;position:sticky;top:24px;display:flex;flex-direction:column;gap:12px;align-items:center;}
.ca-main{flex:1;min-width:0;max-width:680px;}
.ca-right{width:320px;flex:none;display:flex;flex-direction:column;gap:32px;}
.ca-title{margin:12px 0 0;font-family:Poppins,sans-serif;font-size:46px;font-weight:700;line-height:1.1;letter-spacing:-.025em;color:var(--ink);}
.ca-sum{margin:14px 0 0;font-size:19px;line-height:1.5;color:var(--mut);}
.ca-hero{margin-top:26px;aspect-ratio:16/9;border-radius:8px;}
.ca-actions-m{display:none;gap:10px;margin-top:18px;}
.ca-body{margin-top:32px;}
.ca-body .pc-body{margin-top:0;}
.ca-body .pc-scripture{padding:22px 26px;}
.ca-body .pc-pull{font-size:28px;margin:40px 0;}
.ca-body .pc-deeper{padding:14px;border-radius:10px;}
.ca-upnext{display:flex;border:1px solid var(--line);border-radius:12px;overflow:hidden;margin-top:32px;}
.ca-upnext .im{width:300px;flex:none;}
.ca-mlist{display:none;}
.ca-media{margin-top:26px;border-radius:8px;overflow:hidden;background:#000;aspect-ratio:16/9;}
.ca-media iframe,.ca-media video{width:100%;height:100%;border:0;display:block;}
@media(max-width:1023px){.ca-right{display:none;}.ca-mlist{display:block;}}
@media(max-width:760px){
 .ci .wrap{padding-left:16px;padding-right:16px;}
 .ca-grid{display:block;}
 .ca-left{display:none;}
 .ca-actions-m{display:flex;}
 .ca-title{font-size:32px;}
 .ca-hero{aspect-ratio:4/3;}
 .ca-upnext{flex-direction:column;}
 .ca-upnext .im{width:100%;}
}`;

function ytId(url: string | null | undefined) {
  const m = url?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1]! : null;
}

type FullPiece = {
  id: string; type: string; title: string; summary: string | null; excerpt: string | null; body: string | null; body_doc: any;
  hero_url: string | null; cover_image_url: string | null; thumbnail_url: string | null; hero_caption: string | null;
  hero_focal_desktop: string | null; hero_focal_mobile: string | null; author_name: string | null; release_at: string | null;
  read_time_minutes: number | null; duration_seconds: number | null; video_url: string | null; media_url: string | null; topic_id: string | null; slug: string | null; comments_enabled: boolean;
};

async function loadPiece(param: string, kinds: string[]) {
  const by = UUID_RE.test(param) ? { col: "id", val: param } : { col: "slug", val: param };
  const full = await supabase.from("content_items").select("id, type, title, summary, excerpt, body, body_doc, hero_url, cover_image_url, thumbnail_url, hero_caption, hero_focal_desktop, hero_focal_mobile, author_name, release_at, read_time_minutes, duration_seconds, video_url, media_url, topic_id, slug, comments_enabled")
    .eq(by.col, by.val).in("type", kinds as any).limit(1).maybeSingle();
  if (full.data) return { full: full.data as unknown as FullPiece, teaser: null };
  // Not readable (unreleased for this viewer, or missing). The teaser view never carries a body before release.
  const t = await supabase.from("content_items_public").select("id, type, title, release_at, hero_url, cover_image_url, thumbnail_url").eq(by.col, by.val).in("type", kinds as any).limit(1).maybeSingle();
  return { full: null, teaser: t.data ?? null };
}

export function ArticlePage({ param, kinds, search }: { param: string; kinds: string[]; search: { at?: string; stage?: string; viewer?: "in" | "out" } }) {
  const v = useViewer(search);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const preview = useIsPreviewHost();
  const pq = useQuery({ queryKey: ["article", param, kinds.join(","), v.realUserId], queryFn: () => loadPiece(param, kinds), enabled: v.ready });
  const p = pq.data?.full ?? null;
  // Staged preview at a simulated time: a piece that isn't out yet at that time stays locked, except the staged piece itself.
  const lockedByTime = !!p && v.staged && p.id !== search.stage && !isReleased(p.release_at, v.now);
  const piece = lockedByTime ? null : p;
  const teaser = pq.data?.teaser ?? (lockedByTime ? p : null);

  const seriesQ = useQuery({
    queryKey: ["article-series", piece?.id, v.now.toISOString().slice(0, 13)], enabled: !!piece,
    queryFn: async () => { const sid = await seriesIdForPiece(piece!.id); return sid ? fetchSeries({ id: sid }, v.now) : null; },
  });
  const topicsQ = useQuery({
    queryKey: ["article-topics", piece?.id], enabled: !!piece,
    queryFn: async () => {
      const { data } = await supabase.from("content_topics").select("position, topics(id, name, slug)").eq("content_id", piece!.id).order("position");
      const list = ((data ?? []) as any[]).map((r) => r.topics).filter(Boolean) as { id: string; name: string; slug: string }[];
      if (!list.length && piece!.topic_id) {
        const { data: t } = await supabase.from("topics").select("id, name, slug").eq("id", piece!.topic_id).maybeSingle();
        if (t) list.push(t as any);
      }
      return list;
    },
  });
  const progress = useProgress(v.userId);
  const finishedIds = useMemo(() => (progress.data ?? []).filter((r) => r.content_id && r.finished_at).map((r) => r.content_id!), [progress.data]);
  const startedIds = useMemo(() => new Set((progress.data ?? []).filter((r) => r.content_id).map((r) => r.content_id!)), [progress.data]);
  const series = seriesQ.data?.series ?? null;
  const parts = seriesQ.data?.parts ?? [];
  const fetchRelated = useServerFn(getRelated);
  const relQ = useQuery({
    queryKey: ["related", piece?.id, series?.id, topicsQ.data?.[0]?.id, finishedIds.join(","), v.now.toISOString().slice(0, 13)],
    enabled: !!piece && seriesQ.isFetched && topicsQ.isFetched,
    queryFn: () => fetchRelated({ data: { now: v.now.toISOString(), seriesId: series?.id ?? null, topicId: topicsQ.data?.[0]?.id ?? null, exclude: [piece!.id, ...parts.map((x) => x.piece?.id).filter(Boolean) as string[]], finished: finishedIds } }),
  });
  const savedQ = useQuery({
    queryKey: ["saved", "piece", v.userId, piece?.id], enabled: !!v.userId && !!piece,
    queryFn: async () => (await supabase.from("saved_items").select("id").eq("user_id", v.userId!).eq("content_item_id", piece!.id).maybeSingle()).data?.id ?? null,
  });
  const commentsQ = useCommentCount(piece && piece.comments_enabled ? { contentId: piece.id } : null);
  const follows = useFollows(v.userId);
  const reminders = useReminders(v.userId);
  const actions = useContentActions(v.userId);
  const cal = useOnTheCalendar(v.now);
  const most = useMostRead(v.now);
  const copy = usePageCopy("article");

  // Started on open; finished at 80% scroll for reading pieces.
  const articleRef = useRef<HTMLDivElement | null>(null);
  const finishedRef = useRef(false);
  const isMedia = piece?.type === "teaching" || piece?.type === "podcast" || piece?.type === "clip";
  useEffect(() => {
    if (!piece || v.staged) return;
    trackEvent("content_view", { content_id: piece.id });
    if (v.userId) void markStarted(v.userId, { content_id: piece.id }).then(actions.invalidateProgress);
    finishedRef.current = false;
  }, [piece?.id, v.userId]);
  const finish = async () => {
    if (!v.userId || !piece || finishedRef.current) return;
    finishedRef.current = true;
    await upsertProgress(v.userId, { content_id: piece.id, finished: true, progress: 1 });
    await markFinished(v.userId, piece.id);
    actions.invalidateProgress();
  };
  useEffect(() => {
    if (!piece || isMedia || !v.userId || v.staged) return;
    const on = () => {
      const el = articleRef.current; if (!el) return;
      const r = el.getBoundingClientRect();
      const seen = (window.innerHeight - r.top) / Math.max(1, r.height);
      if (seen >= 0.8) void finish();
    };
    window.addEventListener("scroll", on, { passive: true }); on();
    return () => window.removeEventListener("scroll", on);
  }, [piece?.id, v.userId, isMedia]);

  const signedIn = !!v.userId;
  const needAuth = () => navigate({ to: "/auth" });
  const url = typeof window !== "undefined" ? window.location.href.split("?")[0]! : "";

  if (!v.ready || pq.isLoading) return <PageFrame signedIn={signedIn} staged={v.staged} now={v.now}><div className="wrap" style={{ padding: "80px 32px", color: "var(--mut)" }}>Loading…</div></PageFrame>;
  if (!piece) {
    return (
      <PageFrame signedIn={signedIn} staged={v.staged} now={v.now}>
        <div className="wrap coming">
          {teaser ? (<>
            <div className="k">{kindLabel(teaser.type)}</div>
            <h1 className="ca-title" style={{ fontSize: 36 }}>{teaser.title}</h1>
            <p className="ca-sum">Coming {monthD(teaser.release_at)}</p>
          </>) : (<>
            <h1 className="ca-title" style={{ fontSize: 32 }}>Not found</h1>
            <p className="ca-sum">This piece isn’t available.</p>
          </>)}
          <div style={{ marginTop: 24 }}><Link to="/" search={{ feed: 1 }} className="pill">Back to home</Link></div>
        </div>
      </PageFrame>
    );
  }

  const idx = parts.findIndex((x) => x.piece?.id === piece.id);
  const partN = idx >= 0 ? idx + 1 : null;
  const next: SeriesPart | null = idx >= 0 ? parts[idx + 1] ?? null : null;
  const upcoming = idx >= 0 ? parts.slice(idx + 1).find((x) => !x.released) ?? null : null;
  const explored = parts.filter((x) => x.piece && startedIds.has(x.piece.id)).length;
  const following = !!series && !!follows.data?.has(series.id);
  const isReminded = (x: SeriesPart) => (reminders.data ?? []).some((r) => (x.piece && r.content_id === x.piece.id) || (x.templateId && r.template_id === x.templateId && r.day_number == null) || (!x.piece && !x.templateId && r.collection_item_id === x.collectionItemId));
  const remind = async (x: SeriesPart) => {
    if (!signedIn) return needAuth();
    const r = (reminders.data ?? []).find((rr) => (x.piece && rr.content_id === x.piece.id) || (x.templateId && rr.template_id === x.templateId) || rr.collection_item_id === x.collectionItemId);
    try { if (r) await actions.unremind(r.id); else { await actions.remind({ content_id: x.piece?.id, template_id: x.templateId, collection_item_id: x.collectionItemId, title: x.title }); toast.success(`We’ll remind you ${x.releaseAt ? `on ${monD(x.releaseAt)}` : "when it’s out"}`); } }
    catch { toast.error("Couldn’t set that reminder."); }
  };
  const follow = async () => { if (!signedIn) return needAuth(); if (series) await actions.toggleFollow(series.id, !following); };
  const saved = savedQ.data ?? null;
  const toggleSave = async () => {
    if (!signedIn) return needAuth();
    try {
      if (saved) { await removeSaved(saved); toast.success("Removed from saved"); }
      else { await saveForLater(v.userId!, piece.id); trackEvent("content_save", { content_id: piece.id }); toast.success("Saved"); }
      qc.invalidateQueries({ queryKey: ["saved"] }); qc.invalidateQueries({ queryKey: ["up-next"] });
    } catch { toast.error("Couldn’t save that."); }
  };
  const share = () => shareLink(piece.title, url, (m) => toast.success(m));
  const addToWorkspace = async () => {
    if (!signedIn) return needAuth();
    try { await createReflectionNote(v.userId!, piece as any); toast.success("Added to your workspace"); } catch { toast.error("Couldn’t add that."); }
  };

  const doc = piece.body_doc && docHasContent(piece.body_doc) ? piece.body_doc : piece.body ? textToDoc(piece.body) : null;
  const kicker = [kindLabel(piece.type), series?.title, partN && series ? `Part ${partN} of ${parts.length}` : null].filter(Boolean).join(" · ");
  const length = lengthOf(piece) || (piece.body ? `${Math.max(1, Math.round(piece.body.split(/\s+/).length / 220))} min read` : "");
  const yt = ytId(piece.video_url) ?? ytId(piece.media_url);
  const mediaSrc = piece.video_url || piece.media_url;
  const topics = topicsQ.data ?? [];
  const toCard = (it: { piece: any; reason: string }): CardItem => ({ key: it.piece.id, id: it.piece.id, type: it.piece.type, title: it.piece.title ?? "", at: it.piece.release_at, img: photo(it.piece), fd: it.piece.hero_focal_desktop, fm: it.piece.hero_focal_mobile, reason: it.reason });
  const onMedia = (e: React.SyntheticEvent<HTMLMediaElement>) => { const m = e.currentTarget; if (m.duration && m.currentTime / m.duration >= 0.9) void finish(); };
  const lookup = (gid: string) => {
    const hit = parts.find((x) => x.piece?.id === gid)?.piece ?? relQ.data?.latest.find((x) => x.piece.id === gid)?.piece ?? relQ.data?.topic.find((x) => x.piece.id === gid)?.piece;
    return hit ? { title: hit.title ?? "", kind: kindLabel(hit.type), href: `${pieceRoute(hit.type).replace("$id", hit.id)}` } : null;
  };

  const iconButtons = (
    <>
      <button type="button" className={`iconbtn${saved ? " on" : ""}`} aria-label={saved ? "Saved" : "Save"} onClick={toggleSave}>{Ico.bookmark(!!saved)}</button>
      <button type="button" className="iconbtn" aria-label="Share" onClick={share}>{Ico.share()}</button>
      {piece.comments_enabled && <a href="#conversation" className="iconbtn" aria-label="Jump to conversation" style={{ flexDirection: "column" }}>{Ico.chat()}</a>}
      {commentsQ.data ? <span style={{ fontSize: 12, fontWeight: 600, color: "var(--mut)", marginTop: -8 }}>{commentsQ.data}</span> : null}
      {signedIn && <button type="button" className="iconbtn" aria-label="Add to my workspace" onClick={addToWorkspace}>{Ico.plus()}</button>}
    </>
  );

  return (
    <PageFrame signedIn={signedIn} staged={v.staged} now={v.now}>
      <style dangerouslySetInnerHTML={{ __html: ART_CSS }} />
      <div className="wrap">
        <div className="ca-grid">
          <aside className="ca-left" aria-label="Actions">{iconButtons}</aside>
          <main className="ca-main" ref={articleRef} data-piece-id={piece.id}>
            <nav className="crumb" aria-label="Breadcrumb"><Link to="/explore">Read</Link>{series && <><span className="sl">/</span><Link to="/series/$slug" params={{ slug: series.slug }}>{series.title} series</Link></>}</nav>
            <div className="k" style={{ marginTop: 18 }}>{kicker}</div>
            <h1 className="ca-title">{piece.title}</h1>
            {(piece.summary || piece.excerpt) && <p className="ca-sum">{piece.summary || piece.excerpt}</p>}
            {(piece.author_name || piece.release_at) && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 20 }}>
                {piece.author_name && <span style={{ width: 38, height: 38, borderRadius: 999, background: "#E8E6F5", color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Poppins", fontWeight: 600 }}>{piece.author_name.trim().charAt(0).toUpperCase()}</span>}
                <span style={{ display: "flex", flexDirection: "column" }}>
                  {piece.author_name && <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{piece.author_name}</span>}
                  <span style={{ fontSize: 13.5, color: "var(--mut)" }}>{[monthD(piece.release_at), length].filter(Boolean).join(" · ")}</span>
                </span>
              </div>
            )}
            <div className="ca-actions-m">{iconButtons}</div>
            {isMedia && mediaSrc ? (
              piece.type === "podcast" && !yt ? <audio controls src={mediaSrc} preload="metadata" style={{ width: "100%", marginTop: 26 }} onTimeUpdate={onMedia} />
              : <div className="ca-media">{yt ? <iframe src={`https://www.youtube.com/embed/${yt}`} title={piece.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /> : <video src={mediaSrc} controls playsInline onTimeUpdate={onMedia} />}</div>
            ) : photo(piece) ? (
              <div className="ci-ph ca-hero" style={focalStyle(piece.hero_focal_desktop, piece.hero_focal_mobile)}><img src={photo(piece)!} alt="" /></div>
            ) : null}
            {piece.hero_caption && <div style={{ marginTop: 8, fontSize: 12, color: "var(--mut)" }}>{piece.hero_caption}</div>}
            {isMedia && signedIn && yt && !finishedIds.includes(piece.id) && <button type="button" className="pill sm" style={{ marginTop: 12 }} onClick={() => void finish()}>{Ico.check(14)}Mark as finished</button>}
            {doc && <div className="ca-body"><div className="pc-body"><DocView node={doc} lookup={lookup} /></div></div>}

            {(series || topics.length > 0) && (
              <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, color: "var(--mut)", marginRight: 4 }}>Filed under</span>
                {series && <Link to="/series/$slug" params={{ slug: series.slug }} style={{ minHeight: 34, padding: "0 14px", borderRadius: 999, background: "var(--ink)", color: "#fff", fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center" }}>{series.title}</Link>}
                {topics.map((t) => <Link key={t.id} to="/topics/$slug" params={{ slug: t.slug }} style={{ minHeight: 34, padding: "0 14px", borderRadius: 999, background: "var(--soft)", color: "var(--ink)", fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center" }}>{t.name}</Link>)}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 24 }}>
              <button type="button" className="pill" onClick={toggleSave}>{Ico.bookmark(!!saved, 16)}{saved ? "Saved" : "Save"}</button>
              <button type="button" className="pill" onClick={share}>{Ico.share(16)}Share with someone</button>
              {signedIn && <button type="button" className="pill" onClick={addToWorkspace}>{Ico.plus(16)}Add to my workspace</button>}
            </div>

            {next && series && partN && (
              <PartLink part={next} className="ca-upnext">
                <div className="im"><Ph src={next.thumb} ratio="4/3" radius={0} gray={!next.released} /></div>
                <div style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
                  <span className="k">Up next in {series.title} · Part {partN + 1}</span>
                  <span className="ttl" style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.25 }}>{next.title}</span>
                  {next.released ? (<>
                    <span style={{ fontSize: 14, color: "var(--mut)" }}>{[kindLabel(next.kind), next.length].filter(Boolean).join(" · ")} · Out now</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{next.kind === "devotional" ? "Start" : verb(next.kind)} →</span>
                  </>) : (<>
                    <span style={{ fontSize: 14, color: "var(--mut)" }}>Coming {monthD(next.releaseAt)}</span>
                    <button type="button" className="pill sm" style={{ alignSelf: "flex-start" }} onClick={(e) => { e.preventDefault(); void remind(next); }}>{Ico.bell(14)}{isReminded(next) ? "Reminder set" : "Remind me"}</button>
                  </>)}
                </div>
              </PartLink>
            )}

            {series && parts.length > 0 && (
              <div className="ca-mlist" style={{ marginTop: 32 }}>
                <SeriesRail series={series} parts={parts} currentKey={parts[idx]?.key} signedIn={signedIn} explored={explored} following={following} reminded={isReminded} onFollow={follow} onRemind={remind} />
              </div>
            )}

            {!signedIn && upcoming && <SubscribeBox date={upcoming.releaseAt} line={copy.data?.["subscribe_subline"] ?? ""} preview={preview} />}
            {piece.comments_enabled && <Conversation target={{ contentId: piece.id }} userId={v.userId} isAdmin={v.isAdmin && !v.staged} />}
          </main>
          <aside className="ca-right">
            {series && parts.length > 0 && <SeriesRail series={series} parts={parts} currentKey={parts[idx]?.key} signedIn={signedIn} explored={explored} following={following} reminded={isReminded} onFollow={follow} onRemind={remind} />}
            <CalendarRail items={cal.data ?? []} />
            <MostReadRail items={(most.data ?? []).filter((m) => m.id !== piece.id)} />
          </aside>
        </div>
        {relQ.data && topics[0] && <CardRow title={`More on ${relQ.data.topicName ?? topics[0].name}`} items={relQ.data.topic.map(toCard)} more={{ label: "See all", to: `/topics/${topics[0].slug}` }} />}
        {relQ.data && <CardRow title="Just released" items={relQ.data.latest.map(toCard)} />}
      </div>
    </PageFrame>
  );
}

export function SubscribeBox({ date, line, preview }: { date: string | null; line: string; preview: boolean }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { toast.error("Enter a valid email"); return; }
    setBusy(true);
    const { error } = await (supabase.rpc as any)("subscribe_email", { _email: v, _first_name: null, _tags: ["everything"], _season: null, _source: "article_next_part" });
    setBusy(false);
    if (error) toast.error("Couldn’t subscribe. Please try again."); else { toast.success("You’re subscribed"); setEmail(""); }
  };
  return (
    <div style={{ marginTop: 32, background: "var(--soft)", borderRadius: 12, padding: "26px 28px", display: "flex", flexWrap: "wrap", gap: 18, alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ minWidth: 0, flex: "1 1 260px" }}>
        <div className="ttl" style={{ fontSize: 18, fontWeight: 600 }}>The next part comes out {monthD(date)}</div>
        {line ? <div style={{ fontSize: 14, color: "var(--mut)", marginTop: 4 }}>{line}</div> : preview ? <div style={{ fontSize: 14, color: "var(--mut)", marginTop: 4, opacity: .55 }}>[Subscribe line — set in page content: article / subscribe_subline]</div> : null}
      </div>
      <form onSubmit={submit} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" aria-label="Email address" style={{ width: 220, minHeight: 40, borderRadius: 999, border: "1.5px solid var(--line)", padding: "0 16px", fontSize: 14, fontFamily: "inherit", background: "#fff" }} />
        <button type="submit" className="pill pri" disabled={busy}>Subscribe</button>
      </form>
    </div>
  );
}
