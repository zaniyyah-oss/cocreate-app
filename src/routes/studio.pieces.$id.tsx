import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Calendar, Clock, Eye, Check, ChevronDown, Plus, X, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStudioData, useInvalidateStudio, KIND_LABEL, partOf } from "@/lib/studio-data";
import { usePiece, savePatch, type PieceDraft, type LoadedPiece, type DayRow } from "@/lib/studio-piece";
import { checklist, readyCount, isReady, pieceStatus } from "@/lib/studio-checklist";
import { docHasContent, emptyDoc, type DocNode } from "@/lib/piece-doc";
import { etToUtcISO, utcToEt, etLabel } from "@/lib/et-time";
import { PieceRenderer, DevotionalDaysView } from "@/components/content/PieceRenderer";
import { BlockEditor, type DeeperOption } from "@/components/studio/BlockEditor";
import { HeroPhotoField, HeroSlot } from "@/components/studio/CropFrames";
import { ShareButton, publicHref } from "@/components/studio/ShareButton";
import { Segmented, StatusPill, Switch, Btn, C } from "@/components/studio/ui";

export const Route = createFileRoute("/studio/pieces/$id")({
  component: EditorPage,
  head: () => ({ meta: [{ title: "Edit piece — CoCreate Studio" }, { name: "description", content: "Write and schedule a CoCreate piece." }, { property: "og:title", content: "Edit piece — CoCreate Studio" }, { property: "og:description", content: "Write and schedule a CoCreate piece." }] }),
});

function EditorPage() {
  const { id } = Route.useParams();
  const q = usePiece(id);
  if (q.isLoading) return <div style={{ padding: 40, color: C.MUTED }}>Loading…</div>;
  if (!q.data) return <div style={{ padding: 40 }}><div className="st-empty"><b>Piece not found</b><Link to="/studio/pieces" className="st-btn" style={{ marginTop: 12 }}>All pieces</Link></div></div>;
  return <Editor key={id} loaded={q.data} />;
}

function useAgo(at: number | null) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 20_000); return () => clearInterval(t); }, []);
  if (!at) return "";
  const s = Math.round((Date.now() - at) / 1000);
  if (s < 30) return "Saved just now";
  const m = Math.round(s / 60);
  return m < 60 ? `Saved ${m} min ago` : `Saved ${Math.round(m / 60)} h ago`;
}


function Editor({ loaded }: { loaded: LoadedPiece }) {
  const navigate = useNavigate();
  const studio = useStudioData();
  const invalidate = useInvalidateStudio();
  const { table, id } = loaded;
  const [draft, setDraft] = useState<PieceDraft>(loaded.draft);
  const [topicIds, setTopicIds] = useState<string[]>(loaded.topicIds);
  const [link, setLink] = useState(loaded.link);
  const [days, setDays] = useState<DayRow[]>(loaded.days);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [tab, setTab] = useState<"details" | "placement" | "checklist">("details");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const pending = useRef<Partial<PieceDraft>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ago = useAgo(savedAt);

  const flush = async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    const p = pending.current; pending.current = {};
    if (!Object.keys(p).length) return;
    setSaving(true);
    try { await savePatch(table, id, p); setSavedAt(Date.now()); invalidate(); }
    catch (e: any) { pending.current = { ...p, ...pending.current }; toast.error(e?.message ?? "Couldn't save"); }
    finally { setSaving(false); }
  };
  const patch = (p: Partial<PieceDraft>, now = false) => {
    setDraft((d) => ({ ...d, ...p }));
    pending.current = { ...pending.current, ...p };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, now ? 0 : 900);
  };
  useEffect(() => () => { void flush(); }, []); // save on leave

  const series = studio.data?.series ?? [];
  const topics = studio.data?.topics ?? [];
  const mySeries = link ? series.find((s) => s.id === link.collection_id) ?? null : null;
  const part = link && mySeries ? partOf(mySeries.items.map((i) => (i.id === link.id ? { ...i, position: link.position } : i)), (i) => i.id === link.id) : null;
  const total = mySeries?.items.length ?? 0;
  const kicker = [KIND_LABEL[draft.kind] ?? draft.kind, mySeries?.title, part ? `Part ${part} of ${total}` : null].filter(Boolean).join(" · ");
  const hasBody = table === "devotional"
    ? days.some((d) => docHasContent(d.reflection_doc) || !!d.scripture_passage?.trim())
    : docHasContent(draft.body_doc) || (draft.kind !== "essay" && draft.kind !== "blog" && !!(draft.video_url || draft.media_url));
  const checks = checklist({ title: draft.title, summary: draft.summary, hasBody, inSeries: !!link, part, standalone: draft.is_standalone, heroUrl: draft.hero_url, focalDesktop: draft.hero_focal_desktop, focalMobile: draft.hero_focal_mobile, topicCount: topicIds.length, releaseAt: draft.release_at });
  const status = pieceStatus(draft.status, draft.release_at);
  const ready = isReady(checks);

  const deeper: DeeperOption[] = useMemo(() => (studio.data?.pieces ?? []).filter((p) => p.id !== id && p.kind !== "devotional").map((p) => ({ id: p.id, title: p.title, kind: KIND_LABEL[p.kind] ?? p.kind })), [studio.data, id]);
  const lookup = (pid: string) => { const p = studio.data?.pieces.find((x) => x.id === pid); return p ? { title: p.title, kind: KIND_LABEL[p.kind] ?? p.kind, href: publicHref(p.kind, p.id, p.slug) } : null; };

  const schedule = async () => {
    if (!ready) { setTab("checklist"); return; }
    patch({ status: "published" }, true);
    toast.success(new Date(draft.release_at!).getTime() > Date.now() ? `Scheduled for ${etLabel(draft.release_at!)} ET` : "Published");
  };
  const unschedule = () => { patch({ status: "draft" }, true); toast.success("Moved back to draft"); };

  /* topics */
  const topicTable = table === "content" ? "content_topics" : "devotional_topics";
  const fk = table === "content" ? "content_id" : "template_id";
  const addTopic = async (tid: string) => {
    if (topicIds.includes(tid) || topicIds.length >= 3) return;
    const next = [...topicIds, tid]; setTopicIds(next);
    const { error } = await (supabase.from as any)(topicTable).insert({ [fk]: id, topic_id: tid, position: next.length - 1 });
    if (error) { toast.error(error.message); setTopicIds(topicIds); } else { setSavedAt(Date.now()); invalidate(); }
  };
  const removeTopic = async (tid: string) => {
    setTopicIds((t) => t.filter((x) => x !== tid));
    const { error } = await (supabase.from as any)(topicTable).delete().eq(fk, id).eq("topic_id", tid);
    if (error) toast.error(error.message); else { setSavedAt(Date.now()); invalidate(); }
  };

  /* series */
  const setSeries = async (sid: string) => {
    if (sid === "__standalone") {
      if (link) await supabase.from("collection_items").delete().eq("id", link.id);
      setLink(null); patch({ is_standalone: true }, true); return;
    }
    if (link) await supabase.from("collection_items").delete().eq("id", link.id);
    if (!sid) { setLink(null); patch({ is_standalone: false }, true); return; }
    const s = series.find((x) => x.id === sid);
    const position = (s?.items.length ?? 0) + 1;
    const { data, error } = await supabase.from("collection_items").insert({ collection_id: sid, [fk]: id, position, content_kind: table === "content" ? draft.kind : "devotional" } as any).select("id, collection_id, position").single();
    if (error) { toast.error(error.message); setLink(null); return; }
    setLink(data); patch({ is_standalone: false }, true); invalidate();
  };
  const setPart = async (n: number) => {
    if (!link || !n || n < 1) return;
    setLink({ ...link, position: n });
    const { error } = await supabase.from("collection_items").update({ position: n }).eq("id", link.id);
    if (error) toast.error(error.message); else { setSavedAt(Date.now()); invalidate(); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <header className="st-top">
        <div className="st-row" style={{ gap: 14, minWidth: 0 }}>
          <button type="button" aria-label="Back" onClick={() => { void flush(); navigate({ to: "/studio/pieces" }); }} style={{ width: 36, height: 36, borderRadius: 99, border: `1px solid ${C.LINE}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><ArrowLeft size={16} strokeWidth={1.7} /></button>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <span style={{ fontSize: 12, color: C.MUTED }}>{mySeries ? `${mySeries.title}${part ? ` / Part ${part}` : ""}` : draft.is_standalone ? "Standalone" : KIND_LABEL[draft.kind]}</span>
            <span style={{ fontFamily: "Poppins", fontSize: 16, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 320 }}>{draft.title || "Untitled"}</span>
          </div>
          <StatusPill status={status} />
          <span style={{ fontSize: 12.5, color: C.MUTED, whiteSpace: "nowrap" }}>{saving ? "Saving…" : ago}</span>
        </div>
        <div className="st-row" style={{ gap: 10 }}>
          <Segmented value={mode} onChange={setMode} options={[{ value: "write", label: "Write" }, { value: "preview", label: "Preview" }]} />
          <ShareButton table={table} id={id} />
          {status === "draft" && <Btn primary disabled={!ready} title={ready ? undefined : "Finish the checklist first"} onClick={schedule}><Calendar size={15} strokeWidth={1.7} />Schedule</Btn>}
          {status === "scheduled" && <><Btn onClick={unschedule}>Unschedule</Btn><Btn primary onClick={() => setTab("details")}><Calendar size={15} strokeWidth={1.7} />Reschedule</Btn></>}
          {status === "live" && <Btn primary onClick={async () => { await flush(); toast.success("Live piece updated"); }}>Update</Btn>}
        </div>
      </header>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0, background: C.SBG, padding: "32px 40px" }}>
          {mode === "preview" && (
            <div style={{ maxWidth: 760, margin: "0 auto 14px", display: "flex", justifyContent: "flex-end" }}>
              <Link to="/studio/preview/$id" params={{ id }} className="st-btn sm" onClick={() => void flush()}><Eye size={14} strokeWidth={1.7} />Staged preview on the site</Link>
            </div>
          )}
          <div style={{ maxWidth: 760, margin: "0 auto", background: "#fff", border: `1px solid ${C.LINE}`, borderRadius: 14, padding: "44px 56px 56px", boxShadow: "0 1px 3px rgba(24,26,77,0.05)" }}>
            {mode === "preview" ? (
              <PieceRenderer lookup={lookup} piece={{ kicker, title: draft.title, summary: draft.summary, heroUrl: draft.hero_url, heroCaption: draft.hero_caption, focalDesktop: draft.hero_focal_desktop, focalMobile: draft.hero_focal_mobile, doc: table === "content" ? draft.body_doc : null }}>
                {table === "devotional" && <DevotionalDaysView days={days} />}
              </PieceRenderer>
            ) : (
              <WriteCanvas table={table} kicker={kicker} draft={draft} patch={patch} deeper={deeper} days={days} setDays={setDays} templateId={id} onSaved={() => { setSavedAt(Date.now()); invalidate(); }} />
            )}
          </div>
        </div>
        <aside style={{ flex: "0 0 340px", boxSizing: "border-box", borderLeft: `1px solid ${C.LINE}`, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 20, background: "#fff" }}>
          <Segmented value={tab} onChange={setTab} options={[{ value: "details", label: "Details" }, { value: "placement", label: "Placement" }, { value: "checklist", label: "Checklist" }]} />
          {tab === "details" && (
            <>
              <div className="st-field">
                <span className="st-label">Series</span>
                <div style={{ position: "relative" }}>
                  <select className="st-input" style={{ appearance: "none", paddingRight: 34 }} value={link?.collection_id ?? (draft.is_standalone ? "__standalone" : "")} onChange={(e) => setSeries(e.target.value)} aria-label="Series">
                    <option value="">No series yet</option>
                    <option value="__standalone">Standalone (not in a series)</option>
                    {series.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </select>
                  <ChevronDown size={15} strokeWidth={1.7} style={{ position: "absolute", right: 12, top: 12, pointerEvents: "none" }} />
                </div>
                {link && (
                  <label className="st-row" style={{ gap: 8, fontSize: 13.5 }}>Part
                    <input className="st-input" type="number" min={1} style={{ width: 80 }} value={link.position || part || 1} onChange={(e) => setPart(Number(e.target.value))} aria-label="Part number" />
                    <span className="st-help">of {total}</span>
                  </label>
                )}
                <span className="st-help">Shows in the series panel and “Up next”</span>
              </div>
              <TopicsField topics={topics} ids={topicIds} onAdd={addTopic} onRemove={removeTopic} />
              <ReleaseField value={draft.release_at} onChange={(v) => patch({ release_at: v }, true)} />
              <ToggleRow label="Feature in “New this month”" help="Shows on the homepage in its release month" on={draft.feature_new_this_month} onChange={(v) => patch({ feature_new_this_month: v }, true)} />
              <ToggleRow label="Comments" help="Signed-in readers with a confirmed email can comment" on={draft.comments_enabled} onChange={(v) => patch({ comments_enabled: v }, true)} />
              <HeroPhotoField url={draft.hero_url} fd={draft.hero_focal_desktop} fm={draft.hero_focal_mobile} onChange={(p) => patch({ ...(p.url !== undefined ? { hero_url: p.url } : {}), ...(p.fd !== undefined ? { hero_focal_desktop: p.fd } : {}), ...(p.fm !== undefined ? { hero_focal_mobile: p.fm } : {}) })} />
              {table === "content" && draft.hero_url && (
                <div className="st-field"><span className="st-label">Hero caption</span><input className="st-input" value={draft.hero_caption ?? ""} onChange={(e) => patch({ hero_caption: e.target.value })} placeholder="Optional" /></div>
              )}
            </>
          )}
          {tab === "placement" && <Placement id={id} draft={draft} inSeries={!!mySeries} seriesTitle={mySeries?.title ?? null} part={part} total={total} />}
          <div style={{ paddingTop: 16, borderTop: `1px solid ${C.LINE}` }}>
            <h3 className="st-h3">Ready to schedule · {readyCount(checks)} of 6</h3>
            {checks.map((c) => (
              <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 30, fontSize: 13.5, color: c.done ? C.INK : C.MUTED }}>
                {c.done ? <Check size={15} strokeWidth={2.2} color={C.GREEN} /> : <span style={{ width: 13, height: 13, borderRadius: 99, border: "1.5px solid #C9C6BE", display: "inline-block", margin: "0 1px" }} />}
                {c.label}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function AutoText({ value, onChange, className, placeholder, style }: { value: string; onChange: (v: string) => void; className: string; placeholder: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => { const el = ref.current; if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; } }, [value]);
  return <textarea ref={ref} rows={1} className={className} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value.replace(/\n/g, " "))} style={{ display: "block", width: "100%", border: 0, outline: "none", resize: "none", padding: 0, background: "transparent", overflow: "hidden", ...style }} />;
}

function WriteCanvas({ table, kicker, draft, patch, deeper, days, setDays, templateId, onSaved }: { table: "content" | "devotional"; kicker: string; draft: PieceDraft; patch: (p: Partial<PieceDraft>) => void; deeper: DeeperOption[]; days: DayRow[]; setDays: (d: DayRow[]) => void; templateId: string; onSaved: () => void }) {
  const isMedia = table === "content" && draft.kind !== "essay" && draft.kind !== "blog";
  return (
    <div className="pc-article">
      <style dangerouslySetInnerHTML={{ __html: ".pc-article textarea::placeholder{color:#A19E94;opacity:1}" }} />
      <span className="pc-kicker">{kicker}</span>
      <AutoText className="pc-title" value={draft.title} onChange={(v) => patch({ title: v })} placeholder="Title" />
      <AutoText className="pc-summary" value={draft.summary} onChange={(v) => patch({ summary: v })} placeholder="Add a one-line summary…" />
      <HeroSlot url={draft.hero_url} fd={draft.hero_focal_desktop} onUpload={(u) => patch({ hero_url: u, hero_focal_desktop: null, hero_focal_mobile: null })} />
      {isMedia && <MediaSection draft={draft} patch={patch} />}
      {table === "content" ? (
        <div style={{ marginTop: 26 }}>
          <BlockEditor value={draft.body_doc ?? emptyDoc()} onChange={(doc) => patch({ body_doc: doc })} pieces={deeper} />
        </div>
      ) : (
        <DevotionalDays templateId={templateId} days={days} setDays={setDays} onSaved={onSaved} />
      )}
    </div>
  );
}

function MediaSection({ draft, patch }: { draft: PieceDraft; patch: (p: Partial<PieceDraft>) => void }) {
  const isPod = draft.kind === "podcast";
  const mins = draft.duration_seconds ? Math.round(draft.duration_seconds / 60) : "";
  return (
    <section style={{ marginTop: 26, padding: 18, border: `1px solid ${C.LINE}`, borderRadius: 12, background: C.SBG, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <span className="st-h3" style={{ gridColumn: "1 / -1", margin: 0 }}>Media</span>
      <label className="st-field" style={{ gridColumn: "1 / -1" }}><span className="st-label">{isPod ? "Audio URL" : "YouTube URL"}</span>
        <input className="st-input" value={(isPod ? draft.media_url : draft.video_url) ?? ""} onChange={(e) => patch(isPod ? { media_url: e.target.value || null } : { video_url: e.target.value || null })} placeholder="https://" /></label>
      <label className="st-field"><span className="st-label">{isPod ? "Guest / host" : "Speaker"}</span>
        <input className="st-input" value={draft.author_name ?? ""} onChange={(e) => patch({ author_name: e.target.value || null })} /></label>
      <label className="st-field"><span className="st-label">Duration (minutes)</span>
        <input className="st-input" type="number" min={0} value={mins} onChange={(e) => patch({ duration_seconds: e.target.value ? Number(e.target.value) * 60 : null })} /></label>
    </section>
  );
}

function DevotionalDays({ templateId, days, setDays, onSaved }: { templateId: string; days: DayRow[]; setDays: (d: DayRow[]) => void; onSaved: () => void }) {
  const [active, setActive] = useState(days[0]?.id ?? null);
  const [confirmDel, setConfirmDel] = useState(false);
  const cur = days.find((d) => d.id === active) ?? days[0] ?? null;
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const update = (dayId: string, p: Partial<DayRow>) => {
    setDays(days.map((d) => (d.id === dayId ? { ...d, ...p } : d)));
    const t = timers.current[dayId]; if (t) clearTimeout(t);
    timers.current[dayId] = setTimeout(async () => {
      const { error } = await supabase.from("devotional_days").update(p as any).eq("id", dayId);
      if (error) toast.error(error.message); else onSaved();
    }, 800);
  };
  const addDay = async () => {
    const n = Math.max(0, ...days.map((d) => d.day_number)) + 1;
    const { data, error } = await supabase.from("devotional_days").insert({ template_id: templateId, day_number: n, title: "" }).select("id, day_number, title, scripture_reference, scripture_passage, reflection_doc, questions, pray_prompt, reflect_prompt").single();
    if (error) { toast.error(error.message); return; }
    setDays([...days, { ...(data as any), questions: [] }]); setActive(data.id);
    await supabase.from("devotional_templates").update({ duration_days: days.length + 1 }).eq("id", templateId);
    onSaved();
  };
  const delDay = async () => {
    if (!cur) return;
    const { error } = await supabase.from("devotional_days").delete().eq("id", cur.id);
    if (error) { toast.error(error.message); return; }
    const rest = days.filter((d) => d.id !== cur.id);
    setDays(rest); setActive(rest[0]?.id ?? null); setConfirmDel(false);
    await supabase.from("devotional_templates").update({ duration_days: rest.length }).eq("id", templateId);
    onSaved();
  };
  const qs = cur?.questions ?? [];
  return (
    <div style={{ marginTop: 30 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", borderBottom: `1px solid ${C.LINE}`, paddingBottom: 10 }} role="tablist">
        {days.map((d) => (
          <button key={d.id} type="button" role="tab" aria-selected={cur?.id === d.id} onClick={() => setActive(d.id)} className="st-chip" style={{ background: cur?.id === d.id ? C.INK : C.SOFT, color: cur?.id === d.id ? "#fff" : C.INK }}>Day {d.day_number}</button>
        ))}
        <button type="button" className="st-chip add" onClick={addDay}><Plus size={14} strokeWidth={1.7} />Add day</button>
      </div>
      {!cur ? <div className="st-empty" style={{ marginTop: 20 }}><b>No days yet</b>Add the first day.</div> : (
        <div key={cur.id} style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 20 }}>
          <AutoText className="pc-body" style={{ fontFamily: "Poppins", fontSize: 24, fontWeight: 600, color: C.INK, marginTop: 0 }} value={cur.title} onChange={(v) => update(cur.id, { title: v })} placeholder={`Day ${cur.day_number} title`} />
          <span className="pc-label">Scripture</span>
          <figure className="pc-scripture" style={{ margin: 0 }}>
            <input className="pc-ref" style={{ border: 0, background: "transparent", outline: "none", width: "100%", font: "inherit", letterSpacing: ".14em", textTransform: "uppercase", padding: 0 }} value={cur.scripture_reference ?? ""} onChange={(e) => update(cur.id, { scripture_reference: e.target.value })} placeholder="BOOK 0:0" aria-label="Scripture reference" />
            <AutoText className="pc-passage" value={cur.scripture_passage ?? ""} onChange={(v) => update(cur.id, { scripture_passage: v })} placeholder="Passage text" />
          </figure>
          <span className="pc-label">Reflection</span>
          <BlockEditor value={cur.reflection_doc ?? emptyDoc()} onChange={(doc: DocNode) => update(cur.id, { reflection_doc: doc })} minHeight={140} placeholder="Write the reflection · type / for blocks" />
          <span className="pc-label">Questions</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {qs.map((qq, i) => (
              <div key={i} className="st-row" style={{ gap: 8 }}>
                <span style={{ fontSize: 14, color: C.MUTED, width: 18 }}>{i + 1}.</span>
                <input className="st-input" value={qq} onChange={(e) => update(cur.id, { questions: qs.map((x, j) => (j === i ? e.target.value : x)) })} aria-label={`Question ${i + 1}`} />
                <button type="button" aria-label="Remove question" onClick={() => update(cur.id, { questions: qs.filter((_, j) => j !== i) })} style={{ border: 0, background: "none", color: C.MUTED }}><X size={16} strokeWidth={1.7} /></button>
              </div>
            ))}
            <button type="button" className="st-chip add" style={{ alignSelf: "flex-start" }} onClick={() => update(cur.id, { questions: [...qs, ""] })}><Plus size={14} strokeWidth={1.7} />Add question</button>
          </div>
          <span className="pc-label">Prayer prompt</span>
          <textarea className="st-input" rows={3} value={cur.pray_prompt ?? ""} onChange={(e) => update(cur.id, { pray_prompt: e.target.value })} aria-label="Prayer prompt" />
          <div style={{ marginTop: 24, display: "flex", gap: 8, alignItems: "center" }}>
            {!confirmDel ? <button type="button" className="st-btn sm danger" onClick={() => setConfirmDel(true)}><Trash2 size={14} strokeWidth={1.7} />Delete Day {cur.day_number}</button> : (
              <><span style={{ fontSize: 13.5 }}>Delete Day {cur.day_number} and everything in it?</span><button type="button" className="st-btn sm primary" onClick={delDay}>Delete</button><button type="button" className="st-btn sm" onClick={() => setConfirmDel(false)}>Cancel</button></>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TopicsField({ topics, ids, onAdd, onRemove }: { topics: { id: string; name: string; display_name: string | null }[]; ids: string[]; onAdd: (id: string) => void; onRemove: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const name = (t: { name: string; display_name: string | null }) => t.display_name || t.name;
  return (
    <div className="st-field">
      <span className="st-label">Topics</span>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", position: "relative" }}>
        {ids.map((tid) => { const t = topics.find((x) => x.id === tid); return <span key={tid} className="st-chip">{t ? name(t) : "Topic"}<button type="button" aria-label="Remove topic" onClick={() => onRemove(tid)}>×</button></span>; })}
        {ids.length < 3 && <button type="button" className="st-chip add" onClick={() => setOpen((o) => !o)}>+ Add topic</button>}
        {open && (
          <div className="st-pop" style={{ top: 40, left: 0, width: 260, maxHeight: 280, overflowY: "auto" }}>
            {topics.filter((t) => !ids.includes(t.id)).map((t) => <button key={t.id} type="button" className="st-popitem" onClick={() => { onAdd(t.id); setOpen(false); }}><span className="tt" style={{ fontWeight: 600 }}>{name(t)}</span></button>)}
          </div>
        )}
      </div>
      <span className="st-help">Pick 1–3</span>
    </div>
  );
}

function ReleaseField({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const init = value ? utcToEt(value) : { date: "", time: "" };
  const [date, setDate] = useState(init.date);
  const [time, setTime] = useState(init.time);
  const commit = (d: string, t: string) => { if (d) onChange(etToUtcISO(d, t || "09:00")); };
  const box = { display: "flex", alignItems: "center", gap: 8, minHeight: 40, padding: "0 10px", border: `1px solid ${C.LINE}`, borderRadius: 9, flex: 1, minWidth: 0 } as const;
  return (
    <div className="st-field">
      <span className="st-label">Release</span>
      <div style={{ display: "flex", gap: 8 }}>
        <label style={box}><Calendar size={15} strokeWidth={1.7} /><input type="date" value={date} onChange={(e) => { setDate(e.target.value); commit(e.target.value, time); }} style={{ border: 0, outline: "none", fontSize: 13.5, width: "100%", background: "transparent" }} aria-label="Release date" /></label>
        <label style={{ ...box, flex: "0 0 128px" }}><Clock size={15} strokeWidth={1.7} /><input type="time" value={time} onChange={(e) => { setTime(e.target.value); commit(date, e.target.value); }} style={{ border: 0, outline: "none", fontSize: 13.5, width: "100%", background: "transparent" }} aria-label="Release time (ET)" /></label>
      </div>
      <span className="st-help">Eastern time (ET). Your readers see this in their local time.{value ? "" : " Time defaults to 9:00 am."}</span>
      {value && <button type="button" onClick={() => { setDate(""); setTime(""); onChange(null); }} style={{ alignSelf: "flex-start", border: 0, background: "none", padding: 0, fontSize: 12, color: C.MUTED, textDecoration: "underline" }}>Clear release date</button>}
    </div>
  );
}

function ToggleRow({ label, help, on, onChange }: { label: string; help?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
      <span style={{ display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontSize: 14, color: C.INK }}>{label}</span>{help && <span className="st-help">{help}</span>}</span>
      <Switch on={on} onChange={onChange} label={label} />
    </div>
  );
}

function Placement({ id, draft, inSeries, seriesTitle, part, total }: { id: string; draft: PieceDraft; inSeries: boolean; seriesTitle: string | null; part: number | null; total: number }) {
  const copy = useQueryHome();
  const featured = copy?.["featured_piece_id"] === id;
  const ntm = (copy?.["new_this_month_ids"] ?? "").split(",").some((x) => x.endsWith(id)) || draft.feature_new_this_month;
  const rows = [
    { on: featured, label: "Homepage hero", help: featured ? "Chosen as the featured piece" : "Choose it in Homepage layout" },
    { on: ntm, label: "New this month", help: ntm ? "Shows in its release month" : "Turn on “Feature in New this month”" },
    { on: inSeries, label: "Series panel", help: inSeries ? `${seriesTitle}${part ? ` · Part ${part} of ${total}` : ""}` : "Not in a series" },
    { on: inSeries, label: "Up next", help: inSeries ? "Suggested after the previous part" : "Only for series pieces" },
  ];
  const cq = useQuery({ queryKey: ["studio-piece-comments", id], queryFn: async () => {
    const col = draft.kind === "devotional" ? "template_id" : "content_id";
    const [all, rev] = await Promise.all([
      (supabase.from as any)("comments").select("id", { count: "exact", head: true }).eq(col, id),
      (supabase.from as any)("comments").select("id", { count: "exact", head: true }).eq(col, id).is("reviewed_at", null).or("flag_count.gt.0,hidden_by.eq.auto"),
    ]);
    return { all: (all.count ?? 0) as number, review: (rev.count ?? 0) as number };
  } });
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ border: `1px solid ${C.LINE}`, borderRadius: 10, padding: 14, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <span style={{ display: "flex", flexDirection: "column" }}><span style={{ fontSize: 14, fontWeight: 600, color: C.INK }}>Comments</span><span className="st-help">{draft.comments_enabled ? `${cq.data?.all ?? 0} comments${cq.data?.review ? ` · ${cq.data.review} need review` : ""}` : "Turned off for this piece"}</span></span>
        <Link to="/studio/comments" search={{ piece: id }} className="st-btn sm">View</Link>
      </div>
      <span className="st-help" style={{ marginBottom: 8 }}>Where this piece will appear{draft.release_at ? ` from ${etLabel(draft.release_at)} ET` : ""}.</span>
      {rows.map((r) => (
        <div key={r.label} style={{ display: "flex", gap: 10, padding: "10px 0", borderTop: `1px solid ${C.LINE}` }}>
          {r.on ? <Check size={15} strokeWidth={2.2} color={C.GREEN} style={{ marginTop: 2 }} /> : <span style={{ width: 13, height: 13, borderRadius: 99, border: "1.5px solid #C9C6BE", display: "inline-block", margin: "3px 1px 0" }} />}
          <span style={{ display: "flex", flexDirection: "column" }}><span style={{ fontSize: 14, fontWeight: 600, color: r.on ? C.INK : C.MUTED }}>{r.label}</span><span className="st-help">{r.help}</span></span>
        </div>
      ))}
      <Link to="/studio/homepage" className="st-btn sm" style={{ marginTop: 10, alignSelf: "flex-start" }}>Homepage layout</Link>
    </div>
  );
}

function useQueryHome() {
  const [copy, setCopy] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    supabase.from("page_content").select("field_key, field_value").eq("page_key", "home").then(({ data }) => {
      const m: Record<string, string> = {}; for (const r of data ?? []) m[r.field_key] = r.field_value ?? ""; setCopy(m);
    });
  }, []);
  return copy;
}

