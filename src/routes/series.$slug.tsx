import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { textToDoc } from "@/lib/piece-doc";
import { DocView } from "@/components/content/PieceRenderer";
import {
  validateStageSearch, useViewer, fetchSeries, useProgress, useFollows, useReminders, useContentActions,
  kindLabel, monD, monthD, verb, type SeriesPart,
} from "@/lib/content-pages";
import { PageFrame, Ico, Ph, PlayBadge, PartLink, shareLink, focalStyle } from "@/components/content/inner";

export const Route = createFileRoute("/series/$slug")({
  validateSearch: validateStageSearch,
  component: SeriesPage,
  errorComponent: ({ error }) => <div style={{ padding: 60, textAlign: "center" }}>{error instanceof Error ? error.message : String(error)}</div>,
  notFoundComponent: () => <div style={{ padding: 60, textAlign: "center" }}>Series not found.</div>,
  head: () => ({
    meta: [
      { title: "Series — CoCreate" },
      { name: "description", content: "A CoCreate series: teachings, articles, podcasts and a devotional released in order." },
      { property: "og:title", content: "Series — CoCreate" },
      { property: "og:description", content: "Teachings, articles, podcasts and a devotional released in order." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const CSS = `
.cs-hero{position:relative;border-radius:6px;overflow:hidden;min-height:540px;display:flex;align-items:flex-end;margin-top:16px;background:var(--ph);}
.cs-hero>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:var(--fd,center);}
.cs-hero .ov{position:absolute;inset:0;background:linear-gradient(90deg,rgba(10,14,36,.62),rgba(10,14,36,.12) 70%);}
.cs-hero .in{position:relative;padding:52px;max-width:640px;}
.cs-hero h1{margin:10px 0 0;font-family:Poppins,sans-serif;font-size:64px;font-weight:700;line-height:1.02;letter-spacing:-.03em;color:#fff;}
.cs-about{margin-top:72px;display:flex;gap:64px;}
.cs-clips{display:flex;gap:16px;overflow-x:auto;padding-bottom:6px;}
.cs-row{display:flex;gap:22px;align-items:center;padding:18px 0;border-top:1px solid var(--line);}
.cs-row .th{width:200px;flex:none;}
.cs-devo{margin-top:72px;background:var(--soft);border-radius:12px;display:flex;overflow:hidden;}
.cs-devo .im{width:48%;flex:none;}
@media(max-width:760px){
 .ci .wrap{padding-left:16px;padding-right:16px;}
 .cs-hero{min-height:0;aspect-ratio:4/5;}
 .cs-hero>img{object-position:var(--fm,var(--fd,center));}
 .cs-hero .in{padding:22px;}
 .cs-hero h1{font-size:40px;}
 .cs-about{flex-direction:column;gap:32px;margin-top:48px;}
 .cs-row{flex-wrap:wrap;gap:12px;}
 .cs-row .th{width:120px;}
 .cs-devo{flex-direction:column;}
 .cs-devo .im{width:100%;}
}`;

function SeriesPage() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const v = useViewer(search);
  const navigate = useNavigate();
  const q = useQuery({ queryKey: ["series-page", slug, v.now.toISOString().slice(0, 13), v.realUserId], enabled: v.ready, queryFn: () => fetchSeries({ slug }, v.now) });
  const s = q.data?.series ?? null;
  const parts = q.data?.parts ?? [];
  const progress = useProgress(v.userId);
  const follows = useFollows(v.userId);
  const reminders = useReminders(v.userId);
  const actions = useContentActions(v.userId);
  const finished = useMemo(() => new Set((progress.data ?? []).filter((r) => r.content_id && r.finished_at).map((r) => r.content_id!)), [progress.data]);
  const started = useMemo(() => new Set((progress.data ?? []).filter((r) => r.content_id).map((r) => r.content_id!)), [progress.data]);

  const extrasQ = useQuery({
    queryKey: ["series-extras", s?.id], enabled: !!s,
    queryFn: async () => {
      const ids = parts.map((p) => p.piece?.id).filter(Boolean) as string[];
      const [topicsR, devoR, clipsR] = await Promise.all([
        ids.length ? supabase.from("content_topics").select("topics(id, name)").in("content_id", ids) : Promise.resolve({ data: [] as any[] }),
        s!.devotional_template_id ? supabase.from("devotional_templates").select("id, title, hero_url, duration_days, release_at, status").eq("id", s!.devotional_template_id).maybeSingle() : Promise.resolve({ data: null }),
        ids.length ? supabase.from("content_items_public").select("id, title, thumbnail_url, hero_url, duration_seconds, release_at").eq("type", "clip").in("id", ids) : Promise.resolve({ data: [] as any[] }),
      ]);
      const tc = new Map<string, { id: string; name: string; n: number }>();
      for (const r of (topicsR.data ?? []) as any[]) if (r.topics) { const cur = tc.get(r.topics.id) ?? { ...r.topics, n: 0 }; cur.n++; tc.set(r.topics.id, cur); }
      return { topics: [...tc.values()].sort((a, b) => b.n - a.n), devo: (devoR as any).data as any, clips: (clipsR.data ?? []) as any[] };
    },
  });
  const devo = extrasQ.data?.devo && extrasQ.data.devo.status === "published" ? extrasQ.data.devo : null;
  const devoDoneQ = useQuery({
    queryKey: ["series-devo-done", v.userId, devo?.id], enabled: !!v.userId && !!devo,
    queryFn: async () => {
      const { data } = await (supabase.from as any)("content_progress").select("day_number, finished_at").eq("user_id", v.userId).eq("template_id", devo.id).not("finished_at", "is", null);
      return new Set(((data ?? []) as any[]).map((r) => r.day_number as number));
    },
  });
  const moreQ = useQuery({
    queryKey: ["more-series", s?.id, extrasQ.data?.topics[0]?.id], enabled: !!s && !!extrasQ.data,
    queryFn: async () => {
      const { data } = await supabase.from("collections").select("id, slug, title, series_month, banner_url, cover_image_url, hero_focal_desktop, hero_focal_mobile").eq("status", "published").neq("id", s!.id).order("series_month", { ascending: false, nullsFirst: false }).limit(12);
      const list = (data ?? []) as any[];
      const myTopics = new Set((extrasQ.data?.topics ?? []).map((t) => t.id));
      const topicName = new Map((extrasQ.data?.topics ?? []).map((t) => [t.id, t.name]));
      // reason: a shared topic, else "Coming next" for a later series, else nothing
      const out: { s: any; reason: string }[] = [];
      for (const c of list) {
        const { data: ci } = await supabase.from("collection_items").select("content_id").eq("collection_id", c.id).not("content_id", "is", null).limit(30);
        const cids = ((ci ?? []) as any[]).map((r) => r.content_id);
        let reason = "";
        if (cids.length && myTopics.size) {
          const { data: tt } = await supabase.from("content_topics").select("topic_id").in("content_id", cids);
          const hit = ((tt ?? []) as any[]).find((r) => myTopics.has(r.topic_id));
          if (hit) reason = `Shares the topic ${topicName.get(hit.topic_id)}`;
        }
        if (!reason && c.series_month && s!.series_month && c.series_month > s!.series_month) reason = "Coming next";
        out.push({ s: c, reason });
        if (out.length >= 3) break;
      }
      return out;
    },
  });

  const signedIn = !!v.userId;
  const needAuth = () => navigate({ to: "/auth" });
  if (!v.ready || q.isLoading) return <PageFrame signedIn={signedIn} staged={v.staged} now={v.now}><div className="wrap" style={{ padding: 80, color: "var(--mut)" }}>Loading…</div></PageFrame>;
  if (!s) return <PageFrame signedIn={signedIn} staged={v.staged} now={v.now}><div className="wrap coming"><h1 className="ttl" style={{ fontSize: 32 }}>Series not found</h1><Link to="/" search={{ feed: 1 }} className="pill" style={{ marginTop: 20 }}>Back to home</Link></div></PageFrame>;

  const releasedParts = parts.filter((p) => p.released);
  const first = parts.find((p) => p.released) ?? null;
  // Before any part is out: "Coming [date]" with no body.
  if (!first) {
    const at = parts.find((p) => p.releaseAt)?.releaseAt ?? (s.series_month ? `${s.series_month}T12:00:00` : null);
    return (
      <PageFrame signedIn={signedIn} staged={v.staged} now={v.now}>
        <div className="wrap coming"><div className="k">Series</div><h1 className="ttl" style={{ fontSize: 40, fontWeight: 700, margin: "10px 0 0" }}>{s.title}</h1>{at && <p style={{ fontSize: 18, color: "var(--mut)" }}>Coming {monthD(at)}</p>}</div>
      </PageFrame>
    );
  }
  const following = follows.data?.has(s.id) ?? false;
  const nextUp = parts.find((p) => p.released && p.piece && !finished.has(p.piece.id));
  const anyProgress = parts.some((p) => p.piece && started.has(p.piece.id));
  const nextIdx = nextUp ? parts.indexOf(nextUp) + 1 : 1;
  const months = (() => {
    const ds = parts.map((p) => p.releaseAt).filter(Boolean).sort() as string[];
    if (!ds.length) return "";
    const f = (x: string) => new Date(x).toLocaleDateString(undefined, { month: "long" });
    return f(ds[0]!) === f(ds[ds.length - 1]!) ? f(ds[0]!) : `${f(ds[0]!)}–${f(ds[ds.length - 1]!)}`;
  })();
  const finalDate = [...parts].map((p) => p.releaseAt).filter(Boolean).sort().pop() ?? null;
  const authors = (() => {
    const m = new Map<string, number>();
    for (const p of parts) if (p.piece?.author_name) m.set(p.piece.author_name, (m.get(p.piece.author_name) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
  })();
  const doneCount = parts.filter((p) => p.piece && finished.has(p.piece.id)).length;
  const reminded = (p: SeriesPart) => (reminders.data ?? []).find((r) => (p.piece && r.content_id === p.piece.id) || (p.templateId && r.template_id === p.templateId && r.day_number == null) || (!p.piece && !p.templateId && r.collection_item_id === p.collectionItemId));
  const remind = async (p: SeriesPart) => {
    if (!signedIn) return needAuth();
    const r = reminded(p);
    try { if (r) await actions.unremind(r.id); else { await actions.remind({ content_id: p.piece?.id, template_id: p.templateId, collection_item_id: p.collectionItemId, title: p.title }); toast.success(`We’ll remind you on ${monD(p.releaseAt)}`); } }
    catch { toast.error("Couldn’t set that reminder."); }
  };
  const url = typeof window !== "undefined" ? `${window.location.origin}/series/${s.slug}` : "";
  const heroImg = s.banner_url || s.cover_image_url;
  const devoDone = devoDoneQ.data ?? new Set<number>();
  const devoNext = devo?.duration_days ? Array.from({ length: devo.duration_days }, (_, i) => i + 1).find((n) => !devoDone.has(n)) ?? devo.duration_days : 1;

  return (
    <PageFrame signedIn={signedIn} staged={v.staged} now={v.now}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="wrap">
        <nav className="crumb" style={{ marginTop: 20 }} aria-label="Breadcrumb"><span>Series</span><span className="sl">/</span><span>{s.title}</span></nav>
        <section className="cs-hero" style={focalStyle(s.hero_focal_desktop, s.hero_focal_mobile)}>
          {heroImg && <img src={heroImg} alt="" />}
          <div className="ov" />
          <div className="in">
            <div className="k" style={{ color: "#fff" }}>Series{months ? ` · ${months}` : ""}</div>
            <h1>{s.title}</h1>
            {s.summary && <p style={{ fontSize: 18, color: "#fff", margin: "14px 0 0", lineHeight: 1.45 }}>{s.summary}</p>}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 24 }}>
              <PartLink part={nextUp ?? first} className="pill big" style={{ background: "#fff", borderColor: "#fff" }}>{Ico.play(13)}{signedIn && anyProgress && nextUp ? `Continue: part ${nextIdx}` : "Start the series"}</PartLink>
              <button type="button" className="pill big" style={{ background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,.8)" }} onClick={() => signedIn ? actions.toggleFollow(s.id, !following) : needAuth()}>{Ico.bell(15)}{following ? "Following" : "Follow series"}</button>
            </div>
          </div>
        </section>

        <section className="cs-about">
          <div style={{ flex: 2, minWidth: 0 }}>
            <div className="k">About this series</div>
            {(s.description || s.writeup_title) && <p className="ttl" style={{ fontSize: 26, fontWeight: 500, lineHeight: 1.35, margin: "14px 0 0" }}>{s.writeup_title || s.description}</p>}
            {s.writeup_body && <div className="pc-body" style={{ marginTop: 20 }}><DocView node={textToDoc(s.writeup_body)} /></div>}
          </div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 28 }}>
            <div style={{ display: "flex", gap: 28 }}>
              <Stat n={String(parts.length)} l="pieces" />
              <Stat n={String(releasedParts.length)} l="out now" />
              {finalDate && <Stat n={monD(finalDate)} l="final release" />}
            </div>
            {(extrasQ.data?.topics.length ?? 0) > 0 && (
              <div><div className="k" style={{ marginBottom: 10 }}>What you’ll explore</div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>{extrasQ.data!.topics.slice(0, 5).map((t) => <li key={t.id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 15, color: "var(--ink)" }}>{Ico.check(15)}{t.name}</li>)}</ul>
              </div>
            )}
            {authors.length > 0 && (
              <div><div className="k" style={{ marginBottom: 10 }}>Taught by</div>
                {authors.slice(0, 3).map((a) => <div key={a} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}><span style={{ width: 44, height: 44, borderRadius: 999, background: "#E8E6F5", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Poppins", fontWeight: 600, color: "var(--ink)" }}>{a.charAt(0).toUpperCase()}</span><span style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{a}</span></div>)}
              </div>
            )}
          </div>
        </section>

        {(extrasQ.data?.clips.length ?? 0) > 0 && (
          <section style={{ marginTop: 80 }}>
            <div className="sh" style={{ marginBottom: 4 }}><h2>Inside the series</h2></div>
            <p style={{ fontSize: 14, color: "var(--mut)", margin: "0 0 18px" }}>Short clips from the series</p>
            <div className="cs-clips">
              {extrasQ.data!.clips.map((c) => (
                <Link key={c.id} to="/teachings/$id" params={{ id: c.id }} style={{ width: 200, flex: "none" }}>
                  <div className="ph" style={{ aspectRatio: "9/16", borderRadius: 10 }}>
                    {(c.thumbnail_url || c.hero_url) && <img src={c.thumbnail_url || c.hero_url} alt="" />}
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,transparent 50%,rgba(10,14,36,.75))" }} />
                    {c.duration_seconds ? <span style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,.45)", color: "#fff", fontSize: 11.5, fontWeight: 600, borderRadius: 999, padding: "3px 8px" }}>{Math.floor(c.duration_seconds / 60)}:{String(c.duration_seconds % 60).padStart(2, "0")}</span> : null}
                    <PlayBadge size={46} center />
                    <span className="ttl" style={{ position: "absolute", left: 12, right: 12, bottom: 12, color: "#fff", fontSize: 14, fontWeight: 600 }}>{c.title}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section style={{ marginTop: 80 }}>
          <div className="sh"><h2>The series, in order</h2></div>
          {signedIn && parts.length > 0 && <div style={{ marginBottom: 18 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--mut)", marginBottom: 6 }}><span>{doneCount} of {parts.length} done</span><span>{Math.round((doneCount / parts.length) * 100)}%</span></div><div className="bar"><i style={{ width: `${(doneCount / parts.length) * 100}%` }} /></div></div>}
          {parts.map((p, i) => {
            const isDone = !!p.piece && finished.has(p.piece.id);
            const media = p.kind === "teaching" || p.kind === "podcast" || p.kind === "clip";
            return (
              <div key={p.key} className="cs-row" data-piece-id={p.piece?.id}>
                <span className="ttl" style={{ fontSize: 26, fontWeight: 700, color: p.released ? "var(--ink)" : "#B5B2A8", width: 40 }}>{i + 1}</span>
                <div className="th"><Ph src={p.thumb} ratio="16/10" gray={!p.released}>{media && p.released ? <PlayBadge /> : null}</Ph></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="k">{p.released ? [kindLabel(p.kind), p.length, monD(p.releaseAt)].filter(Boolean).join(" · ") : `${kindLabel(p.kind)} · Coming ${monD(p.releaseAt)}`}</div>
                  <PartLink part={p}><div className="ttl" style={{ fontSize: 19, fontWeight: 600, marginTop: 4, color: p.released ? "var(--ink)" : "var(--mut)" }}>{p.title}</div></PartLink>
                  {p.summary && <div style={{ fontSize: 14, color: "var(--mut)", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.summary}</div>}
                </div>
                {!p.released ? <button type="button" className="pill" onClick={() => remind(p)}>{Ico.bell(14)}{reminded(p) ? "Reminder set" : "Remind me"}</button>
                  : isDone ? <span className="pill done">{Ico.check(14)}Done</span>
                  : <PartLink part={p} className="pill">{p.kind === "devotional" ? "Start" : verb(p.kind)}</PartLink>}
              </div>
            );
          })}
        </section>

        {devo && (
          <section className="cs-devo">
            <div className="im"><Ph src={devo.hero_url} ratio="16/10" radius={0} /></div>
            <div style={{ padding: 40, display: "flex", flexDirection: "column", gap: 12, justifyContent: "center" }}>
              <div className="k">The series devotional</div>
              <div className="ttl" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.15 }}>{devo.title}</div>
              {devo.duration_days ? <div style={{ fontSize: 15, color: "var(--mut)" }}>{devo.duration_days} days · Read alongside the teaching</div> : null}
              {devo.duration_days ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{Array.from({ length: devo.duration_days }, (_, i) => i + 1).map((n) => (
                <Link key={n} to="/devotionals/$id/day/$n" params={{ id: devo.id, n: String(n) }} style={{ minWidth: 52, height: 32, borderRadius: 999, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, background: devoDone.has(n) ? "var(--ink)" : "#fff", color: devoDone.has(n) ? "#fff" : "var(--ink)", border: "1px solid var(--line)" }}>{n}</Link>
              ))}</div> : null}
              <Link to="/devotionals/$id/day/$n" params={{ id: devo.id, n: String(devoNext) }} style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)", marginTop: 4 }}>{devoDone.size ? `Continue with day ${devoNext} →` : "Start day 1 →"}</Link>
            </div>
          </section>
        )}

        <section style={{ marginTop: 56, border: "1px solid var(--line)", borderRadius: 12, padding: 28, display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
          <div className="ttl" style={{ fontSize: 18, fontWeight: 600 }}>Go through it with someone</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="pill pri" onClick={() => shareLink(s.title, url, (m) => toast.success(m))}>{Ico.share(15)}Share series</button>
            <button type="button" className="pill" onClick={async () => { try { await navigator.clipboard.writeText(url); toast.success("Link copied"); } catch { toast.error(url); } }}>Copy link</button>
          </div>
        </section>

        {(moreQ.data?.length ?? 0) > 0 && (
          <section style={{ marginTop: 64 }}>
            <div className="sh"><h2>More series</h2></div>
            <div className="cards3">
              {moreQ.data!.map(({ s: c, reason }) => (
                <Link key={c.id} to="/series/$slug" params={{ slug: c.slug }} className="card">
                  <Ph src={c.banner_url || c.cover_image_url} ratio="16/10" fd={c.hero_focal_desktop} fm={c.hero_focal_mobile} />
                  <div className="k" style={{ marginTop: 12 }}>Series{c.series_month ? ` · ${new Date(`${c.series_month}T12:00:00`).toLocaleDateString(undefined, { month: "long" })}` : ""}</div>
                  <div className="ct">{c.title}</div>
                  {reason && <div className="why">{reason}</div>}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </PageFrame>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return <div><div className="ttl" style={{ fontSize: 22, fontWeight: 700 }}>{n}</div><div style={{ fontSize: 13, color: "var(--mut)" }}>{l}</div></div>;
}
