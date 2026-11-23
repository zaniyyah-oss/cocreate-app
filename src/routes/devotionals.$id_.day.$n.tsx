import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DocView } from "@/components/content/PieceRenderer";
import { docHasContent } from "@/lib/piece-doc";
import { getRelated } from "@/lib/related.functions";
import { resolveDayEntry } from "@/lib/day-entry";
import { subscribeToDevotional } from "@/lib/devotional-start";
import { todayISO } from "@/lib/active-devotional";
import {
  validateStageSearch, useViewer, fetchSeries, seriesIdForTemplate, useProgress, useFollows, useReminders, useContentActions, upsertProgress,
  kindLabel, monD, monthD, photo, isReleased, UUID_RE, type SeriesPart,
} from "@/lib/content-pages";
import { PageFrame, Ico, Ph, SeriesRail, PartLink, shareLink } from "@/components/content/inner";

export const Route = createFileRoute("/devotionals/$id_/day/$n")({
  validateSearch: validateStageSearch,
  component: DayPage,
  errorComponent: ({ error }) => <div style={{ padding: 60, textAlign: "center" }}>{error instanceof Error ? error.message : String(error)}</div>,
  notFoundComponent: () => <div style={{ padding: 60, textAlign: "center" }}>Devotional not found.</div>,
  head: () => ({
    meta: [
      { title: "Devotional — CoCreate" },
      { name: "description", content: "Read today’s devotional: scripture, reflection, questions and a prayer." },
      { property: "og:title", content: "Devotional — CoCreate" },
      { property: "og:description", content: "Scripture, reflection, questions and a prayer for each day." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const CSS = `
.cd-head{display:flex;gap:40px;align-items:center;margin-top:20px;}
.cd-head .im{width:300px;flex:none;}
.cd-tabs{display:flex;gap:8px;margin-top:28px;overflow-x:auto;}
.cd-tab{flex:1 1 0;min-width:96px;padding:10px 6px;border-radius:10px;border:1px solid var(--line);background:#fff;display:flex;flex-direction:column;align-items:center;gap:2px;color:var(--ink);}
.cd-tab.cur{background:var(--ink);border-color:var(--ink);color:#fff;}
.cd-tab.sel{box-shadow:0 0 0 2px var(--ink) inset;}
.cd-grid{display:flex;gap:48px;margin-top:36px;align-items:flex-start;}
.cd-main{flex:1;min-width:0;max-width:700px;display:flex;flex-direction:column;gap:28px;}
.cd-right{width:320px;flex:none;display:flex;flex-direction:column;gap:32px;}
.cd-main .pc-body{margin-top:0;}
@media(max-width:1023px){.cd-grid{flex-direction:column;}.cd-right{width:100%;}}
@media(max-width:760px){
 .ci .wrap{padding-left:16px;padding-right:16px;}
 .cd-head{flex-direction:column;align-items:flex-start;gap:20px;}
 .cd-head .im{width:100%;max-width:300px;}
 .cd-head h1{font-size:32px!important;}
 .cd-tab{min-width:0;}
}`;

const addDays = (iso: string, n: number) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return d; };
const localISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function DayPage() {
  const { id: param, n: nParam } = Route.useParams();
  const search = Route.useSearch();
  const v = useViewer(search);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const tq = useQuery({
    queryKey: ["devo-day-template", param, v.realUserId], enabled: v.ready,
    queryFn: async () => {
      let q = supabase.from("devotional_templates").select("id, title, slug, description, summary, hero_url, hero_focal_desktop, hero_focal_mobile, duration_days, release_at, status");
      q = UUID_RE.test(param) ? q.eq("id", param) : q.eq("slug", param);
      const { data: t } = await q.maybeSingle();
      if (!t) return null;
      const { data: days } = await supabase.from("devotional_days").select("day_number, title, scripture_reference, scripture_passage, reflection_doc, questions, pray_prompt, preview_read, scripture_note").eq("template_id", t.id).order("day_number");
      return { t, days: (days ?? []) as any[] };
    },
  });
  const t = tq.data?.t ?? null;
  const released = !!t && (t.status === "published" || v.isAdmin) && (v.isAdmin && !v.staged ? true : isReleased(t.release_at, v.now)) && (tq.data?.days.length ?? 0) > 0;
  const total = t ? Math.max(t.duration_days ?? 0, tq.data?.days.length ?? 0) : 0;

  // Start date: when the reader started this devotional (saved_items / first progress); otherwise today.
  const startQ = useQuery({
    queryKey: ["devo-start", v.userId, t?.id], enabled: !!v.userId && !!t,
    queryFn: async () => {
      const { data } = await supabase.from("saved_items").select("saved_at").eq("user_id", v.userId!).eq("devotional_template_id", t!.id).maybeSingle();
      return data?.saved_at ? localISO(new Date(data.saved_at)) : null;
    },
  });
  const progress = useProgress(v.userId);
  const mine = useMemo(() => (progress.data ?? []).filter((r) => r.template_id === t?.id), [progress.data, t?.id]);
  const firstProgress = mine.map((r) => r.started_at).sort()[0];
  const start = startQ.data ?? (firstProgress ? localISO(new Date(firstProgress)) : localISO(v.now));
  const todayIdx = Math.min(Math.max(Math.round((new Date(`${localISO(v.now)}T12:00:00`).getTime() - new Date(`${start}T12:00:00`).getTime()) / 86400000) + 1, 1), Math.max(total, 1));
  const done = new Set(mine.filter((r) => r.finished_at).map((r) => r.day_number!));
  const n = /^\d+$/.test(nParam) ? Math.min(Math.max(Number(nParam), 1), Math.max(total, 1)) : (v.userId ? (Array.from({ length: total }, (_, i) => i + 1).find((d) => !done.has(d) && d >= 1) ?? todayIdx) : 1);
  const day = tq.data?.days.find((d) => d.day_number === n) ?? null;

  const seriesQ = useQuery({
    queryKey: ["devo-series", t?.id, v.now.toISOString().slice(0, 13)], enabled: !!t,
    queryFn: async () => { const sid = await seriesIdForTemplate(t!.id); return sid ? fetchSeries({ id: sid }, v.now) : null; },
  });
  const series = seriesQ.data?.series ?? null;
  const parts = seriesQ.data?.parts ?? [];
  const fetchRelated = useServerFn(getRelated);
  const pairsQ = useQuery({
    queryKey: ["devo-pairs", series?.id, v.now.toISOString().slice(0, 13)], enabled: !!series,
    queryFn: () => fetchRelated({ data: { now: v.now.toISOString(), seriesId: series!.id, topicLimit: 0, latestLimit: 0 } }),
  });
  const moreQ = useQuery({
    queryKey: ["more-devos", t?.id, v.now.toISOString().slice(0, 13)], enabled: !!t,
    queryFn: async () => {
      const { data } = await supabase.from("devotional_templates").select("id, title, hero_url, duration_days, release_at").eq("status", "published").eq("is_default", false).neq("id", t!.id).order("release_at", { ascending: false }).limit(12);
      return ((data ?? []) as any[]).filter((d) => isReleased(d.release_at, v.now)).slice(0, 3);
    },
  });
  const follows = useFollows(v.userId);
  const reminders = useReminders(v.userId);
  const actions = useContentActions(v.userId);

  // Journal: autosaves to the reader's private progress row and a single Notes note per devotional.
  const [resp, setResp] = useState("");
  const loadedKey = useRef("");
  useEffect(() => {
    const key = `${t?.id}:${n}:${progress.isFetched}`;
    if (!t || loadedKey.current === key) return;
    loadedKey.current = key;
    setResp(mine.find((r) => r.day_number === n)?.response ?? "");
  }, [t?.id, n, progress.isFetched]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveState, setSaveState] = useState<"" | "saving" | "saved">("");
  const saveResponse = (text: string, dayNo: number) => {
    if (!v.userId || !t) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("saving");
    saveTimer.current = setTimeout(async () => {
      try {
        await upsertProgress(v.userId!, { template_id: t.id, day_number: dayNo, response: text });
        await syncJournalNote(v.userId!, t.id, t.title, tq.data?.days ?? []);
        setSaveState("saved");
        actions.invalidateProgress();
      } catch { setSaveState(""); toast.error("Couldn’t save your response."); }
    }, 900);
  };

  const signedIn = !!v.userId;
  const needAuth = () => navigate({ to: "/auth" });
  if (!v.ready || tq.isLoading) return <PageFrame signedIn={signedIn} staged={v.staged} now={v.now}><div className="wrap" style={{ padding: 80, color: "var(--mut)" }}>Loading…</div></PageFrame>;
  if (!t) return <PageFrame signedIn={signedIn} staged={v.staged} now={v.now}><div className="wrap coming"><h1 className="ttl" style={{ fontSize: 32 }}>Devotional not found</h1></div></PageFrame>;
  if (!released) {
    return <PageFrame signedIn={signedIn} staged={v.staged} now={v.now}><div className="wrap coming"><div className="k">Devotional</div><h1 className="ttl" style={{ fontSize: 36, fontWeight: 700, margin: "10px 0 0" }}>{t.title}</h1>{t.release_at && !isReleased(t.release_at, v.now) && <p style={{ fontSize: 18, color: "var(--mut)" }}>Coming {monthD(t.release_at)}</p>}</div></PageFrame>;
  }

  const questions = Array.isArray(day?.questions) ? (day!.questions as string[]).filter(Boolean) : [];
  const following = !!series && !!follows.data?.has(series.id);
  const startedSet = new Set((progress.data ?? []).filter((r) => r.content_id).map((r) => r.content_id!));
  const explored = parts.filter((x) => x.piece && startedSet.has(x.piece.id)).length;
  const isReminded = (x: SeriesPart) => (reminders.data ?? []).some((r) => (x.piece && r.content_id === x.piece.id) || (!x.piece && r.collection_item_id === x.collectionItemId));
  const remindPart = async (x: SeriesPart) => {
    if (!signedIn) return needAuth();
    try { await actions.remind({ content_id: x.piece?.id, template_id: x.templateId, collection_item_id: x.collectionItemId, title: x.title }); toast.success(`We’ll remind you on ${monD(x.releaseAt)}`); } catch { toast.error("Couldn’t set that reminder."); }
  };
  const tomorrow = n < total ? tq.data!.days.find((d) => d.day_number === n + 1) ?? { day_number: n + 1, title: "" } : null;
  const tomorrowReminder = tomorrow ? (reminders.data ?? []).find((r) => r.template_id === t.id && r.day_number === tomorrow.day_number) : undefined;
  const remindTomorrow = async () => {
    if (!signedIn) return needAuth();
    if (!tomorrow) return;
    if (tomorrowReminder) { await actions.unremind(tomorrowReminder.id); return; }
    const at = addDays(start, tomorrow.day_number - 1); at.setHours(7, 0, 0, 0);
    const when = at.getTime() < Date.now() ? (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(7, 0, 0, 0); return d; })() : at;
    try { await actions.remind({ template_id: t.id, day_number: tomorrow.day_number, remind_at: when.toISOString(), title: `${t.title} · Day ${tomorrow.day_number}` }); toast.success(`We’ll remind you ${when.toLocaleDateString(undefined, { weekday: "long" })} at 7:00 am`); }
    catch { toast.error("Couldn’t set that reminder."); }
  };
  const markDone = async () => {
    if (!signedIn) return needAuth();
    try { await upsertProgress(v.userId!, { template_id: t.id, day_number: n, finished: true }); actions.invalidateProgress(); toast.success(`Day ${n} complete`); } catch { toast.error("Couldn’t save that."); }
  };
  const addToToday = async (scriptureOnly = false) => {
    if (!signedIn) return needAuth();
    try {
      await subscribeToDevotional(v.userId!, t.id);
      const entryId = await resolveDayEntry(v.userId!, t.id, todayISO());
      if (!entryId) throw new Error("no entry");
      const { data: e } = await supabase.from("devotional_entries").select("scripture_reference, scripture_text, pray_text").eq("id", entryId).maybeSingle();
      const patch: Record<string, string> = {};
      if (day?.scripture_reference && !e?.scripture_reference) patch.scripture_reference = day.scripture_reference;
      if (day?.scripture_passage && !e?.scripture_text) patch.scripture_text = day.scripture_passage;
      if (!scriptureOnly && day?.pray_prompt && !(e?.pray_text ?? "").includes(day.pray_prompt)) patch.pray_text = [e?.pray_text, day.pray_prompt].filter(Boolean).join("\n\n");
      if (Object.keys(patch).length) await supabase.from("devotional_entries").update(patch as any).eq("id", entryId);
      qc.invalidateQueries({ queryKey: ["saved"] });
      if (scriptureOnly) navigate({ to: "/devotionals/$id", params: { id: t.id }, search: {} as any });
      else toast.success("Added to today’s workspace");
    } catch { toast.error("Couldn’t add that to your workspace."); }
  };
  const url = typeof window !== "undefined" ? window.location.href.split("?")[0]! : "";
  const pairs = (pairsQ.data?.series ?? []).filter((x) => x.released);

  return (
    <PageFrame signedIn={signedIn} staged={v.staged} now={v.now}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="wrap" data-piece-id={t.id}>
        <nav className="crumb" style={{ marginTop: 20 }} aria-label="Breadcrumb"><Link to="/explore/devotionals">Devotionals</Link>{series && <><span className="sl">/</span><Link to="/series/$slug" params={{ slug: series.slug }}>{series.title} series</Link></>}</nav>
        <header className="cd-head">
          <div className="im"><Ph src={t.hero_url} ratio="1/1" radius={10} fd={t.hero_focal_desktop} fm={t.hero_focal_mobile} /></div>
          <div style={{ minWidth: 0 }}>
            <div className="k">{total}-day devotional{series ? ` · ${series.title} series` : ""}</div>
            <h1 className="ttl" style={{ fontSize: 46, fontWeight: 700, lineHeight: 1.1, letterSpacing: "-.025em", margin: "10px 0 0" }}>{t.title}</h1>
            {(t.summary || t.description) && <p style={{ fontSize: 17, color: "var(--mut)", margin: "12px 0 0", lineHeight: 1.5 }}>{t.summary || t.description}</p>}
            {signedIn && <p style={{ fontSize: 14, color: "var(--ink)", fontWeight: 600, margin: "14px 0 0" }}>{done.size} of {total} days done</p>}
          </div>
        </header>

        <nav className="cd-tabs" aria-label="Days">
          {Array.from({ length: total }, (_, i) => i + 1).map((d) => {
            const isToday = d === todayIdx;
            const sub = done.has(d) ? <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: isToday ? "#DADBEA" : "#0F4A42" }}>{Ico.check(11)}Done</span> : isToday ? "Today" : addDays(start, d - 1).toLocaleDateString(undefined, { month: "short", day: "numeric" });
            return (
              <Link key={d} to="/devotionals/$id/day/$n" params={{ id: param, n: String(d) }} search={search} className={`cd-tab${isToday ? " cur" : ""}${d === n && !isToday ? " sel" : ""}`} aria-current={d === n ? "page" : undefined}>
                <span className="ttl" style={{ fontSize: 15, fontWeight: 600, color: isToday ? "#fff" : "var(--ink)" }}>Day {d}</span>
                <span style={{ fontSize: 11.5, color: isToday ? "#DADBEA" : "var(--mut)" }}>{sub}</span>
              </Link>
            );
          })}
        </nav>

        <div className="cd-grid">
          <main className="cd-main">
            <div>
              <div className="k">Day {n} of {total}</div>
              {day?.title && <h2 className="ttl" style={{ fontSize: 34, fontWeight: 700, margin: "8px 0 0", lineHeight: 1.15 }}>{day.title}</h2>}
            </div>
            {(day?.scripture_reference || day?.scripture_passage) && (
              <section style={{ background: "var(--soft)", borderRadius: 12, padding: 30 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
                  <span className="k">Read{day.scripture_reference ? ` · ${day.scripture_reference}` : ""}</span>
                  <button type="button" className="linkbtn" style={{ fontSize: 13 }} onClick={() => addToToday(true)}>Open in Bible study</button>
                </div>
                {day.scripture_passage && <p style={{ fontSize: 17, lineHeight: 1.7, margin: "12px 0 0", whiteSpace: "pre-wrap" }}>{day.scripture_passage}</p>}
              </section>
            )}
            {day?.reflection_doc && docHasContent(day.reflection_doc) && <div className="pc-body"><DocView node={day.reflection_doc} /></div>}
            {questions.length > 0 && (
              <section>
                <div className="k" style={{ marginBottom: 8 }}>Pause and consider</div>
                {questions.map((q, i) => (
                  <div key={i} style={{ display: "flex", gap: 14, padding: "14px 0", borderTop: "1px solid var(--line)" }}>
                    <span className="ttl" style={{ fontSize: 15, fontWeight: 700 }}>{i + 1}</span>
                    <span className="ttl" style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.45 }}>{q}</span>
                  </div>
                ))}
              </section>
            )}
            {day?.pray_prompt && (
              <section style={{ background: "var(--ink)", borderRadius: 12, padding: 28 }}>
                <div className="k" style={{ color: "#C9CBE6" }}>Pray</div>
                <p className="ttl" style={{ fontSize: 21, fontWeight: 500, lineHeight: 1.45, color: "#fff", margin: "10px 0 0" }}>{day.pray_prompt}</p>
              </section>
            )}
            <section style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 10 }}>
                <span className="ttl" style={{ fontSize: 16, fontWeight: 600 }}>Your response</span>
                <span style={{ fontSize: 12, color: "var(--mut)", display: "inline-flex", gap: 4, alignItems: "center" }}>{Ico.lock()}Private · saves to Notes{saveState === "saving" ? " · Saving…" : saveState === "saved" ? " · Saved" : ""}</span>
              </div>
              {signedIn ? (
                <textarea value={resp} onChange={(e) => { setResp(e.target.value); saveResponse(e.target.value, n); }} aria-label="Your response" style={{ width: "100%", minHeight: 110, border: 0, outline: "none", resize: "vertical", fontFamily: "inherit", fontSize: 16, lineHeight: 1.6, color: "var(--txt)", background: "transparent" }} />
              ) : (
                <div style={{ fontSize: 14.5, color: "var(--mut)" }}><Link to="/auth" style={{ color: "var(--ink)", fontWeight: 600 }}>Sign in</Link> to write a private response.</div>
              )}
            </section>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {done.has(n) ? <span className="pill big done">{Ico.check(15)}Day {n} complete</span> : <button type="button" className="pill pri big" onClick={markDone}>{Ico.check(15)}Mark day {n} complete</button>}
              <button type="button" className="pill big" onClick={() => addToToday(false)}>{Ico.plus(15)}Add to today’s workspace</button>
              <button type="button" className="pill big" onClick={() => shareLink(t.title, url, (m) => toast.success(m))}>{Ico.share(15)}Share</button>
            </div>
            <div id="conversation" />
          </main>
          <aside className="cd-right">
            {pairs.length > 0 && (
              <div>
                <div className="k" style={{ marginBottom: 12 }}>Pairs with today</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {pairs.slice(0, 4).map((x) => (
                    <Link key={x.piece.id} to={x.piece.type === "teaching" || x.piece.type === "clip" ? "/teachings/$id" : x.piece.type === "podcast" ? "/podcasts/$id" : "/essays/$id"} params={{ id: x.piece.id }} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <Ph src={photo(x.piece)} ratio="16/10" style={{ width: 88, flex: "none" }} />
                      <span><span className="k" style={{ fontSize: 10.5, display: "block" }}>{kindLabel(x.piece.type)}</span><span className="ttl" style={{ fontSize: 14.5, fontWeight: 500, lineHeight: 1.3 }}>{x.piece.title}</span></span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {tomorrow && (
              <div style={{ background: "var(--soft)", borderRadius: 12, padding: 20 }}>
                <div className="k">Tomorrow · Day {tomorrow.day_number}</div>
                {tomorrow.title && <div className="ttl" style={{ fontSize: 17, fontWeight: 600, marginTop: 6 }}>{tomorrow.title}</div>}
                <button type="button" className="linkbtn" style={{ marginTop: 10, fontSize: 13 }} onClick={remindTomorrow}>{Ico.bell(14)}{tomorrowReminder ? "Reminder set for 7:00 am" : "Remind me at 7:00 am"}</button>
              </div>
            )}
            {series && parts.length > 0 && (
              <div>
                <div className="k" style={{ marginBottom: 12 }}>From the series</div>
                <SeriesRail series={series} parts={parts} currentKey={parts.find((x) => x.templateId === t.id)?.key} signedIn={signedIn} explored={explored} following={following} reminded={isReminded} onFollow={() => signedIn ? actions.toggleFollow(series.id, !following) : needAuth()} onRemind={remindPart} />
              </div>
            )}
          </aside>
        </div>

        {(moreQ.data?.length ?? 0) > 0 && (
          <section style={{ marginTop: 64 }}>
            <div className="sh"><h2>More devotionals</h2><Link to="/explore/devotionals">See all →</Link></div>
            <div className="cards3">
              {moreQ.data!.map((d) => (
                <Link key={d.id} to="/devotionals/$id/day/$n" params={{ id: d.id, n: "today" }} className="card">
                  <Ph src={d.hero_url} ratio="16/10" />
                  <div className="k" style={{ marginTop: 12 }}>{d.duration_days ? `${d.duration_days}-day devotional` : "Devotional"}</div>
                  <div className="ct">{d.title}</div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </PageFrame>
  );
}

/** One Notes note per devotional ("[title] · Responses"), a section per day with a response. */
async function syncJournalNote(userId: string, templateId: string, title: string, days: { day_number: number; title: string }[]) {
  const tag = `devotional:${templateId}`;
  const { data: rows } = await (supabase.from as any)("content_progress").select("day_number, response").eq("user_id", userId).eq("template_id", templateId).order("day_number");
  const sections = ((rows ?? []) as any[]).filter((r) => (r.response ?? "").trim());
  const content: any[] = [];
  let text = "";
  for (const r of sections) {
    const dt = days.find((d) => d.day_number === r.day_number)?.title;
    const head = `Day ${r.day_number}${dt ? ` · ${dt}` : ""}`;
    content.push({ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: head }] });
    for (const para of String(r.response).split(/\n+/)) if (para.trim()) content.push({ type: "paragraph", content: [{ type: "text", text: para }] });
    text += `${head}\n${r.response}\n\n`;
  }
  const body = { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
  const { data: existing } = await (supabase.from as any)("workspace_items").select("id").eq("user_id", userId).eq("kind", "note").contains("tags", [tag]).limit(1).maybeSingle();
  if (existing) {
    await (supabase.from as any)("workspace_items").update({ body, body_text: text.trim() }).eq("id", existing.id);
  } else if (sections.length) {
    await (supabase.from as any)("workspace_items").insert({ user_id: userId, kind: "note", title: `${title} · Responses`, body, body_text: text.trim(), tags: [tag] });
  }
}
