import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { loadClips } from "@/lib/clips";
import { SeriesView } from "@/components/content/SeriesView";
import {
  validateStageSearch, useViewer, fetchSeries, useProgress, useFollows, useReminders, useContentActions,
  monD, monthD, verb, type SeriesPart,
} from "@/lib/content-pages";
import { PageFrame, Ico, Ph, PartLink, shareLink } from "@/components/content/inner";

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
        loadClips({ seriesId: s!.id }, { now: v.now }).catch(() => []),
      ]);
      const tc = new Map<string, { id: string; name: string; n: number }>();
      for (const r of (topicsR.data ?? []) as any[]) if (r.topics) { const cur = tc.get(r.topics.id) ?? { ...r.topics, n: 0 }; cur.n++; tc.set(r.topics.id, cur); }
      return { topics: [...tc.values()].sort((a, b) => b.n - a.n), devo: (devoR as any).data as any, clips: clipsR };
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
  const devoDone = devoDoneQ.data ?? new Set<number>();
  const devoNext = devo?.duration_days ? Array.from({ length: devo.duration_days }, (_, i) => i + 1).find((n) => !devoDone.has(n)) ?? devo.duration_days : 1;

  return (
    <PageFrame signedIn={signedIn} staged={v.staged} now={v.now}>
      <div className="wrap">
        <nav className="crumb" style={{ marginTop: 20 }} aria-label="Breadcrumb"><span>Series</span><span className="sl">/</span><span>{s.title}</span></nav>
        <SeriesView s={s} parts={parts} clips={extrasQ.data?.clips ?? []} devo={devo} topicNames={(extrasQ.data?.topics ?? []).map((t) => t.name)} authors={authors}
          heroActions={<>
            <PartLink part={nextUp ?? first} className="pill big" style={{ background: "#fff", borderColor: "#fff" }}>{Ico.play(13)}{signedIn && anyProgress && nextUp ? `Continue: part ${nextIdx}` : "Start the series"}</PartLink>
            <button type="button" className="pill big" style={{ background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,.8)" }} onClick={() => signedIn ? actions.toggleFollow(s.id, !following) : needAuth()}>{Ico.bell(15)}{following ? "Following" : "Follow series"}</button>
          </>}
          listTop={signedIn && parts.length > 0 ? <div style={{ marginBottom: 18 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--mut)", marginBottom: 6 }}><span>{doneCount} of {parts.length} done</span><span>{Math.round((doneCount / parts.length) * 100)}%</span></div><div className="bar"><i style={{ width: `${(doneCount / parts.length) * 100}%` }} /></div></div> : null}
          rowAction={(p) => {
            const isDone = !!p.piece && finished.has(p.piece.id);
            return !p.released ? <button type="button" className="pill" onClick={() => remind(p)}>{Ico.bell(14)}{reminded(p) ? "Reminder set" : "Remind me"}</button>
              : isDone ? <span className="pill done">{Ico.check(14)}Done</span>
              : <PartLink part={p} className="pill">{p.kind === "devotional" ? "Start" : verb(p.kind)}</PartLink>;
          }}
          devoDays={devo ? (n) => <>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{Array.from({ length: n }, (_, i) => i + 1).map((d) => (
              <Link key={d} to="/devotionals/$id/day/$n" params={{ id: devo.id, n: String(d) }} style={{ minWidth: 52, height: 32, borderRadius: 999, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, background: devoDone.has(d) ? "var(--ink)" : "#fff", color: devoDone.has(d) ? "#fff" : "var(--ink)", border: "1px solid var(--line)" }}>{d}</Link>
            ))}</div>
            <Link to="/devotionals/$id/day/$n" params={{ id: devo.id, n: String(devoNext) }} style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)", marginTop: 4 }}>{devoDone.size ? `Continue with day ${devoNext} →` : "Start day 1 →"}</Link>
          </> : undefined}
        />

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
