import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, GripVertical, Plus, X, Monitor, Smartphone, ExternalLink, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStudioData, useInvalidateStudio, KIND_LABEL, NEW_KINDS, type StudioSeries, type SeriesItem, type StudioPiece, type StudioKind } from "@/lib/studio-data";
import { pieceStatus } from "@/lib/studio-checklist";
import { seriesStatus } from "@/lib/series-status";
import { WEEKDAYS, nextRhythmDates, timeLabel } from "@/lib/series-rhythm";
import { etToUtcISO, utcToEt } from "@/lib/et-time";
import { useStudioClips, useInvalidateClips, fmtDur, type StudioClip, type PublicClip } from "@/lib/clips";
import type { DocNode } from "@/lib/piece-doc";
import type { SeriesPart } from "@/lib/content-pages";
import { TopBar, Btn, StatusPill, Segmented, Switch, C } from "@/components/studio/ui";
import { ShareButton } from "@/components/studio/ShareButton";
import { HeroPhotoField } from "@/components/studio/CropFrames";
import { createPiece } from "@/components/studio/NewPiece";
import { ClipEditor } from "@/components/studio/ClipEditor";
import { SeriesView, type SeriesEdit } from "@/components/content/SeriesView";
import { ContentScope } from "@/components/content/inner";

type Tab = "build" | "preview" | "stats";
export const Route = createFileRoute("/studio/series/$id")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } => (s.tab === "preview" || s.tab === "stats" || s.tab === "build" ? { tab: s.tab } : {}),
  component: BuilderPage,
  head: () => ({ meta: [{ title: "Series builder — CoCreate Studio" }, { name: "description", content: "Plan a CoCreate series: order, rhythm, clips and its page." }, { property: "og:title", content: "Series builder — CoCreate Studio" }, { property: "og:description", content: "Plan a CoCreate series: order, rhythm, clips and its page." }] }),
});

const CSS = `
.sb-row{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid ${C.LINE};border-radius:10px;padding:10px 12px;cursor:pointer;position:relative;}
.sb-row:focus-visible{outline:2px solid ${C.INK};outline-offset:1px;}
.sb-row.planned{border:1.5px dashed #C9C6BE;color:${C.MUTED};}
.sb-row.over{box-shadow:0 -3px 0 ${C.INK};}
.sb-row .mv{display:none;gap:2px;}
.sb-row:hover .mv,.sb-row:focus-within .mv{display:inline-flex;}
.sb-row .mv button,.sb-x{border:0;background:none;padding:3px;color:${C.MUTED};display:inline-flex;}
.sb-chip{position:relative;display:inline-flex;align-items:center;height:34px;padding:0 14px;border-radius:999px;background:#fff;border:1px solid ${C.LINE};font-size:13px;font-weight:600;color:${C.INK};}
.sb-chip select,.sb-chip input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;}
.sb-add{display:flex;align-items:center;justify-content:center;gap:8px;height:52px;border:1.5px dashed #C9C6BE;border-radius:10px;background:none;width:100%;font-size:13.5px;font-weight:600;color:${C.INK};}
.sb-kick{font-size:11.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${C.MUTED};margin:0 0 12px;}
`;

const monD = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");
function ago(t: number | null) {
  if (!t) return "";
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 10) return "Saved just now";
  if (s < 60) return `Saved ${s}s ago`;
  const m = Math.round(s / 60);
  return m < 60 ? `Saved ${m} min ago` : `Saved ${Math.round(m / 60)} h ago`;
}

function BuilderPage() {
  const { id } = Route.useParams();
  const studio = useStudioData();
  const s = studio.data?.series.find((x) => x.id === id) ?? null;
  if (studio.isLoading) return <div style={{ padding: 28 }} className="st-help">Loading…</div>;
  if (!s) return <div style={{ padding: 28 }}><div className="st-empty"><b>Series not found</b><Link to="/studio/series">Back to series</Link></div></div>;
  return <Builder key={s.id} s={s} />;
}

type Fields = Pick<StudioSeries, "title" | "summary" | "eyebrow" | "writeup_title" | "about_doc" | "themes" | "taught_by" | "banner_url" | "hero_focal_desktop" | "hero_focal_mobile" | "series_month" | "status" | "rhythm_weekday" | "rhythm_time">;

function Builder({ s }: { s: StudioSeries }) {
  const studio = useStudioData();
  const invalidate = useInvalidateStudio();
  const navigate = useNavigate();
  const tab = Route.useSearch().tab ?? "build";
  const setTab = (t: Tab) => navigate({ to: "/studio/series/$id", params: { id: s.id }, search: t === "build" ? {} : { tab: t }, replace: true });
  const [f, setF] = useState<Fields>(() => ({ title: s.title, summary: s.summary, eyebrow: s.eyebrow, writeup_title: s.writeup_title, about_doc: s.about_doc, themes: s.themes, taught_by: s.taught_by, banner_url: s.banner_url ?? s.cover_image_url, hero_focal_desktop: s.hero_focal_desktop, hero_focal_mobile: s.hero_focal_mobile, series_month: s.series_month, status: s.status, rhythm_weekday: s.rhythm_weekday, rhythm_time: s.rhythm_time }));
  const pending = useRef<Partial<Fields>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 10_000); return () => clearInterval(t); }, []);
  const flush = async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    const p = pending.current; pending.current = {};
    if (!Object.keys(p).length) return;
    setSaving(true);
    const { error } = await supabase.from("collections").update(p as any).eq("id", s.id);
    setSaving(false);
    if (error) { toast.error(`Couldn’t save: ${error.message}`); pending.current = { ...p, ...pending.current }; return; }
    setSavedAt(Date.now()); invalidate();
  };
  useEffect(() => () => { void flush(); }, []);
  const patch = (p: Partial<Fields>, now = false) => {
    setF((cur) => ({ ...cur, ...p }));
    pending.current = { ...pending.current, ...p };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), now ? 0 : 800);
  };

  const items = useMemo(() => [...s.items].sort((a, b) => a.position - b.position), [s.items]);
  const pieceOf = (i: SeriesItem): StudioPiece | null => studio.data?.pieces.find((p) => p.id === (i.content_id ?? i.template_id)) ?? null;
  const st = seriesStatus(items.map((i) => { const p = pieceOf(i); return p ? pieceStatus(p.rawStatus, p.releaseAt) : "planned"; }));
  const clipsQ = useStudioClips();
  const myClips = useMemo(() => (clipsQ.data ?? []).filter((c) => c.series_id === s.id).sort((a, b) => a.position - b.position), [clipsQ.data, s.id]);
  const firstPiece = items.map(pieceOf).find(Boolean) ?? null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <TopBar
        left={<>
          <Link to="/studio/series" aria-label="Back to series" style={{ width: 36, height: 36, borderRadius: 99, border: `1px solid ${C.LINE}`, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none" }}><ArrowLeft size={16} strokeWidth={1.7} /></Link>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <span style={{ fontSize: 12, color: C.MUTED }}>Series</span>
            <span style={{ fontFamily: "Poppins", fontSize: 16, fontWeight: 600, color: C.INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 320 }}>{f.title || "Untitled series"}</span>
          </div>
          <StatusPill status={st.status} />
          <span style={{ fontSize: 12.5, color: C.MUTED, whiteSpace: "nowrap" }}>{st.released} of {st.total} released</span>
          <span style={{ fontSize: 12, color: C.MUTED, whiteSpace: "nowrap" }} aria-live="polite">{saving ? "Saving…" : ago(savedAt)}</span>
        </>}
        right={<>
          <Segmented value={tab} onChange={setTab} options={[{ value: "build", label: "Build" }, { value: "preview", label: "Preview" }, { value: "stats", label: "Stats" }]} />
          <ShareButton table="series" id={s.id} />
        </>}
      />
      {tab === "stats" ? <StatsTab s={s} items={items} pieceOf={pieceOf} />
        : tab === "preview" ? <div style={{ background: C.SBG, padding: "24px 28px", flex: 1 }}><PagePreview s={s} f={f} items={items} pieceOf={pieceOf} clips={myClips} /></div>
        : (
          <div style={{ display: "flex", flex: 1, minHeight: 0, alignItems: "stretch" }}>
            <div style={{ flex: "0 0 460px", padding: "24px 28px", borderRight: `1px solid ${C.LINE}`, display: "flex", flexDirection: "column", gap: 26, minWidth: 0 }}>
              <Rhythm s={s} f={f} patch={patch} items={items} pieceOf={pieceOf} />
              <PieceList s={s} items={items} pieceOf={pieceOf} rhythmTime={f.rhythm_time} />
              <ClipsStrip s={s} clips={myClips} />
              <Settings s={s} f={f} patch={patch} />
            </div>
            <div style={{ flex: 1, minWidth: 0, background: C.SBG, padding: "24px 28px" }}>
              <PagePreview s={s} f={f} items={items} pieceOf={pieceOf} clips={myClips} patch={patch} firstPieceId={firstPiece?.id ?? null} />
            </div>
          </div>
        )}
    </>
  );
}

/* ---------------- release rhythm ---------------- */

function Rhythm({ s, f, patch, items, pieceOf }: { s: StudioSeries; f: Fields; patch: (p: Partial<Fields>, now?: boolean) => void; items: SeriesItem[]; pieceOf: (i: SeriesItem) => StudioPiece | null }) {
  const invalidate = useInvalidateStudio();
  const [offer, setOffer] = useState(false);
  const dates = items.map((i) => pieceOf(i)?.releaseAt ?? i.planned_at).filter(Boolean).sort() as string[];
  const unscheduled = items.filter((i) => !i.content_id && !i.template_id && !i.planned_at);
  const change = (p: Partial<Fields>) => { patch(p, true); setOffer(true); };
  const apply = async () => {
    if (f.rhythm_weekday == null) return;
    const after = [dates[dates.length - 1], new Date().toISOString()].filter(Boolean).sort().pop()!;
    const next = nextRhythmDates(after, f.rhythm_weekday, f.rhythm_time || "09:00", unscheduled.length);
    const res = await Promise.all(unscheduled.map((i, k) => supabase.from("collection_items").update({ planned_at: next[k]! }).eq("id", i.id)));
    const err = res.find((r) => r.error)?.error;
    if (err) toast.error(err.message); else { toast.success(`Dated ${unscheduled.length} planned ${unscheduled.length === 1 ? "slot" : "slots"}`); setOffer(false); invalidate(); }
  };
  return (
    <section>
      <h3 className="sb-kick">Release rhythm</h3>
      <div className="st-row" style={{ gap: 8, flexWrap: "wrap" }}>
        <label className="sb-chip">{f.rhythm_weekday == null ? "Pick a weekday" : `Every ${WEEKDAYS[f.rhythm_weekday]}`}
          <select aria-label="Release weekday" value={f.rhythm_weekday ?? ""} onChange={(e) => change({ rhythm_weekday: e.target.value === "" ? null : Number(e.target.value) })}>
            <option value="">No weekly rhythm</option>
            {WEEKDAYS.map((w, i) => <option key={w} value={i}>Every {w}</option>)}
          </select>
        </label>
        <label className="sb-chip">{timeLabel(f.rhythm_time)}
          <input type="time" aria-label="Release time (ET)" value={f.rhythm_time ?? ""} onChange={(e) => change({ rhythm_time: e.target.value || null })} />
        </label>
        <span className="sb-chip" style={{ color: dates.length ? C.INK : C.MUTED }} title="From the dated parts">{dates.length ? `${monD(dates[0])}${dates.length > 1 ? ` – ${monD(dates[dates.length - 1])}` : ""}` : "No dates yet"}</span>
      </div>
      {offer && f.rhythm_weekday != null && unscheduled.length > 0 && (
        <div className="st-row" style={{ marginTop: 10, gap: 8 }}>
          <Btn sm primary onClick={apply}>Apply to unscheduled slots ({unscheduled.length})</Btn>
          <Btn sm onClick={() => setOffer(false)}>Not now</Btn>
        </div>
      )}
    </section>
  );
}

/* ---------------- pieces, in order ---------------- */

async function persistOrder(list: SeriesItem[]) {
  const res = await Promise.all(list.map((it, idx) => supabase.from("collection_items").update({ position: idx + 1, sort_order: idx + 1 }).eq("id", it.id)));
  const err = res.find((r) => r.error)?.error;
  if (err) throw err;
}

function PieceList({ s, items, pieceOf, rhythmTime }: { s: StudioSeries; items: SeriesItem[]; pieceOf: (i: SeriesItem) => StudioPiece | null; rhythmTime: string | null }) {
  const invalidate = useInvalidateStudio();
  const navigate = useNavigate();
  const [order, setOrder] = useState(items);
  useEffect(() => setOrder(items), [items]);
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [openSlot, setOpenSlot] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const commit = async (list: SeriesItem[]) => {
    setOrder(list);
    try { await persistOrder(list); invalidate(); } catch (e: any) { toast.error(e?.message ?? "Couldn’t reorder"); setOrder(items); }
  };
  const move = (i: number, d: -1 | 1) => { const j = i + d; if (j < 0 || j >= order.length) return; const l = [...order]; [l[i], l[j]] = [l[j]!, l[i]!]; void commit(l); };
  const remove = async (it: SeriesItem) => {
    const { error } = await supabase.from("collection_items").delete().eq("id", it.id);
    if (error) { toast.error(error.message); return; }
    setConfirm(null);
    await persistOrder(order.filter((x) => x.id !== it.id)).catch(() => {});
    invalidate();
  };
  return (
    <section>
      <h3 className="sb-kick">Pieces, in order · drag to reorder</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {order.map((it, i) => {
          const p = pieceOf(it);
          const planned = !p;
          const at = p?.releaseAt ?? it.planned_at;
          const kind = p?.kind ?? it.planned_kind ?? "";
          return (
            <div key={it.id}>
              <div className={`sb-row${planned ? " planned" : ""}${over === i && drag !== null && drag !== i ? " over" : ""}`} tabIndex={0} role="button"
                aria-label={`Part ${i + 1}: ${p?.title ?? it.planned_title ?? "Planned slot"}. Alt+arrow keys to move.`}
                draggable onDragStart={(e) => { setDrag(i); e.dataTransfer.effectAllowed = "move"; }} onDragOver={(e) => { e.preventDefault(); setOver(i); }} onDragLeave={() => setOver((o) => (o === i ? null : o))}
                onDragEnd={() => { setDrag(null); setOver(null); }}
                onDrop={(e) => { e.preventDefault(); if (drag === null || drag === i) return; const l = [...order]; const [m] = l.splice(drag, 1); l.splice(i, 0, m!); setDrag(null); setOver(null); void commit(l); }}
                onKeyDown={(e) => { if (e.altKey && e.key === "ArrowUp") { e.preventDefault(); move(i, -1); } else if (e.altKey && e.key === "ArrowDown") { e.preventDefault(); move(i, 1); } else if (e.key === "Enter") { p ? navigate({ to: "/studio/pieces/$id", params: { id: p.id } }) : setOpenSlot(openSlot === it.id ? null : it.id); } }}
                onClick={(e) => { if ((e.target as HTMLElement).closest("button")) return; p ? navigate({ to: "/studio/pieces/$id", params: { id: p.id } }) : setOpenSlot(openSlot === it.id ? null : it.id); }}>
                <GripVertical size={16} color="#B5B2A8" style={{ flex: "none", cursor: "grab" }} aria-hidden />
                <span style={{ fontFamily: "Poppins", fontSize: 13, fontWeight: 600, width: 20, flex: "none" }}>{String(i + 1).padStart(2, "0")}</span>
                <span style={{ width: 64, aspectRatio: "16/10", borderRadius: 6, background: planned ? C.SOFT : "#E9E6DF", overflow: "hidden", flex: "none" }}>{p?.photo && <img src={p.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: p.fd || "center" }} />}</span>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 11.5, color: C.MUTED }}>{[KIND_LABEL[kind] ?? "Piece", at ? monD(at) : "No date"].join(" · ")}</span>
                  <span style={{ fontFamily: "Poppins", fontSize: 14.5, fontWeight: 500, color: planned ? C.MUTED : C.INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p?.title ?? (it.planned_title || "[Working title]")}</span>
                </span>
                <span className="mv">
                  <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={14} /></button>
                  <button type="button" aria-label="Move down" disabled={i === order.length - 1} onClick={() => move(i, 1)}><ArrowDown size={14} /></button>
                </span>
                {p ? <StatusPill status={p.status} /> : <StatusPill status="planned" />}
                <button type="button" className="sb-x" aria-label={p ? "Remove from series" : "Delete planned slot"} onClick={() => setConfirm(confirm === it.id ? null : it.id)}><X size={14} /></button>
              </div>
              {confirm === it.id && (
                <div style={{ marginTop: 6, border: "1px solid #E5B8B8", background: "#FBF1F1", borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, flex: 1 }}>{p ? "Remove this piece from the series? The piece itself stays in your library." : "Delete this planned slot?"}</span>
                  <Btn sm onClick={() => setConfirm(null)}>Keep</Btn>
                  <Btn sm className="danger" onClick={() => remove(it)}>{p ? "Remove" : "Delete slot"}</Btn>
                </div>
              )}
              {planned && openSlot === it.id && <SlotForm item={it} onDone={() => { setOpenSlot(null); invalidate(); }} rhythmTime={rhythmTime} />}
            </div>
          );
        })}
        <div style={{ position: "relative" }}>
          <button type="button" className="sb-add" onClick={() => setMenu((m) => !m)} aria-expanded={menu}><Plus size={15} />Add a piece or an empty slot</button>
          {menu && <AddMenu s={s} count={order.length} rhythmTime={rhythmTime} onClose={() => setMenu(false)} />}
        </div>
      </div>
    </section>
  );
}

function SlotForm({ item, onDone, rhythmTime, seriesId, position }: { item?: SeriesItem; onDone: () => void; rhythmTime: string | null; seriesId?: string; position?: number }) {
  const init = item?.planned_at ? utcToEt(item.planned_at) : null;
  const [kind, setKind] = useState(item?.planned_kind ?? "teaching");
  const [title, setTitle] = useState(item?.planned_title ?? "");
  const [date, setDate] = useState(init?.date ?? "");
  const [time, setTime] = useState(init?.time ?? rhythmTime ?? "09:00");
  const [show, setShow] = useState(!!item?.show_title_publicly);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    const row = { planned_kind: kind, planned_title: title.trim() || null, planned_at: date ? etToUtcISO(date, time || "09:00") : null, show_title_publicly: show };
    const { error } = item
      ? await supabase.from("collection_items").update(row).eq("id", item.id)
      : await supabase.from("collection_items").insert({ ...row, collection_id: seriesId!, position: position!, sort_order: position!, content_kind: kind } as any);
    setBusy(false);
    if (error) toast.error(error.message); else onDone();
  };
  return (
    <div style={{ marginTop: 6, background: C.SBG, border: `1px solid ${C.LINE}`, borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: 8 }}>
        <select className="st-input" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Kind">{NEW_KINDS.map((k) => <option key={k.kind} value={k.kind}>{KIND_LABEL[k.kind]}</option>)}</select>
        <input className="st-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="[Working title]" aria-label="Working title" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 8 }}>
        <input className="st-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date (ET)" />
        <input className="st-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Time (ET)" />
      </div>
      <label className="st-row" style={{ gap: 8, fontSize: 13 }}><Switch on={show} onChange={setShow} label="Show title publicly" />Show title publicly <span className="st-help">(otherwise the site only says “Coming [date]”)</span></label>
      <div className="st-row" style={{ gap: 8 }}><Btn sm primary onClick={save} disabled={busy}>{item ? "Save slot" : "Add slot"}</Btn><Btn sm onClick={onDone}>Cancel</Btn></div>
    </div>
  );
}

function AddMenu({ s, count, rhythmTime, onClose }: { s: StudioSeries; count: number; rhythmTime: string | null; onClose: () => void }) {
  const studio = useStudioData();
  const invalidate = useInvalidateStudio();
  const [mode, setMode] = useState<"pick" | "existing" | "new" | "slot">("pick");
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const inThis = new Set(s.items.map((i) => i.content_id ?? i.template_id));
  const options = (studio.data?.pieces ?? []).filter((p) => !inThis.has(p.id) && p.title.toLowerCase().includes(q.toLowerCase())).slice(0, 30);
  const attach = async (p: { id: string; kind: string }) => {
    const col = p.kind === "devotional" ? "template_id" : "content_id";
    await supabase.from("collection_items").delete().eq(col, p.id); // a piece lives in one series
    const { error } = await supabase.from("collection_items").insert({ collection_id: s.id, [col]: p.id, position: count + 1, sort_order: count + 1, content_kind: p.kind } as any);
    if (error) { toast.error(error.message); return false; }
    invalidate(); return true;
  };
  const createNew = async (kind: StudioKind) => {
    try { const id = await createPiece(kind); if (await attach({ id, kind })) { toast.success(`New ${KIND_LABEL[kind]?.toLowerCase()} added as part ${count + 1}`); onClose(); } }
    catch (e: any) { toast.error(e?.message ?? "Couldn’t create the piece"); }
  };
  return (
    <div ref={ref} className="st-pop" style={{ left: 0, right: 0, top: 58, padding: 10 }} role="menu">
      {mode === "pick" && <>
        <button type="button" className="st-popitem" onClick={() => setMode("existing")}><span><span className="tt">Add existing piece</span><span className="dd">Search your library</span></span></button>
        <button type="button" className="st-popitem" onClick={() => setMode("new")}><span><span className="tt">New piece in this series</span><span className="dd">Creates a draft at part {count + 1}</span></span></button>
        <button type="button" className="st-popitem" onClick={() => setMode("slot")}><span><span className="tt">Planned slot</span><span className="dd">Kind, working title and date</span></span></button>
      </>}
      {mode === "existing" && <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <input autoFocus className="st-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pieces" aria-label="Search pieces" />
        <div style={{ maxHeight: 280, overflow: "auto" }}>
          {options.length === 0 && <span className="st-help" style={{ padding: 8, display: "block" }}>No matching pieces.</span>}
          {options.map((p) => <button key={p.id} type="button" className="st-popitem" onClick={async () => { if (await attach(p)) onClose(); }}><span><span className="tt">{p.title}</span><span className="dd">{KIND_LABEL[p.kind]}{p.seriesTitle ? ` · moves from ${p.seriesTitle}` : ""}</span></span></button>)}
        </div>
      </div>}
      {mode === "new" && NEW_KINDS.map((k) => <button key={k.kind} type="button" className="st-popitem" onClick={() => createNew(k.kind)}><span><span className="tt">{k.label}</span><span className="dd">{k.desc}</span></span></button>)}
      {mode === "slot" && <SlotForm seriesId={s.id} position={count + 1} rhythmTime={rhythmTime} onDone={() => { invalidate(); onClose(); }} />}
    </div>
  );
}

/* ---------------- clips strip ---------------- */

function ClipsStrip({ s, clips }: { s: StudioSeries; clips: StudioClip[] }) {
  const invalidate = useInvalidateClips();
  const [order, setOrder] = useState(clips);
  useEffect(() => setOrder(clips), [clips]);
  const [drag, setDrag] = useState<number | null>(null);
  const [open, setOpen] = useState<StudioClip | "new" | null>(null);
  const commit = async (l: StudioClip[]) => {
    setOrder(l);
    const res = await Promise.all(l.map((c, i) => supabase.from("clips").update({ position: i + 1 }).eq("id", c.id)));
    const err = res.find((r) => r.error)?.error;
    if (err) toast.error(err.message);
    invalidate();
  };
  const move = (i: number, d: -1 | 1) => { const j = i + d; if (j < 0 || j >= order.length) return; const l = [...order]; [l[i], l[j]] = [l[j]!, l[i]!]; void commit(l); };
  return (
    <section>
      <h3 className="sb-kick">Clips · shown on the series page</h3>
      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
        {order.map((c, i) => (
          <button key={c.id} type="button" draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); if (drag === null || drag === i) return; const l = [...order]; const [m] = l.splice(drag, 1); l.splice(i, 0, m!); setDrag(null); void commit(l); }}
            onKeyDown={(e) => { if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) { e.preventDefault(); move(i, e.key === "ArrowLeft" ? -1 : 1); } }}
            onClick={() => setOpen(c)} aria-label={`Clip: ${c.caption || "no caption"}. Alt+arrow keys to move.`} title={c.caption || "Needs caption"}
            style={{ width: 76, flex: "none", aspectRatio: "9/16", borderRadius: 8, border: c.caption ? 0 : `1.5px solid ${C.AMBER}`, padding: 0, position: "relative", overflow: "hidden", background: "#E9E6DF" }}>
            {c.posterUrl && <img src={c.posterUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
            {c.duration_seconds != null && <span style={{ position: "absolute", left: 6, bottom: 6, color: "#fff", fontSize: 10.5, fontWeight: 600, textShadow: "0 1px 4px rgba(0,0,0,.6)" }}>{fmtDur(c.duration_seconds)}</span>}
          </button>
        ))}
        <button type="button" onClick={() => setOpen("new")} style={{ width: 76, flex: "none", aspectRatio: "9/16", borderRadius: 8, border: "1.5px dashed #C9C6BE", background: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 11.5, fontWeight: 600, color: C.INK }}><Plus size={16} />Add clip</button>
      </div>
      {open && <ClipEditor key={open === "new" ? "new" : open.id} clip={open === "new" ? null : open} defaultSeriesId={s.id} onClose={() => setOpen(null)} />}
    </section>
  );
}

/* ---------------- settings ---------------- */

function Settings({ s, f, patch }: { s: StudioSeries; f: Fields; patch: (p: Partial<Fields>, now?: boolean) => void }) {
  const invalidate = useInvalidateStudio();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const del = async () => {
    setDeleting(true);
    const { error } = await supabase.from("collections").delete().eq("id", s.id);
    setDeleting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Series deleted"); invalidate(); navigate({ to: "/studio/series" });
  };
  return (
    <section style={{ borderTop: `1px solid ${C.LINE}`, paddingTop: 20, display: "flex", flexDirection: "column", gap: 14 }}>
      <h3 className="sb-kick" style={{ margin: 0 }}>Series settings</h3>
      <label className="st-field"><span className="st-label">Month</span><input className="st-input" type="month" value={f.series_month?.slice(0, 7) ?? ""} onChange={(e) => patch({ series_month: e.target.value ? `${e.target.value}-01` : null }, true)} /></label>
      <label className="st-row" style={{ gap: 10, fontSize: 13.5, fontWeight: 600 }}><Switch on={f.status === "published"} onChange={(v) => patch({ status: v ? "published" : "draft" } as any, true)} label="Show this series on the site" />Show this series on the site</label>
      <span className="st-help" style={{ marginTop: -8 }}>Each piece still waits for its own release time.</span>
      {confirming ? (
        <div style={{ border: "1px solid #E5B8B8", background: "#FBF1F1", borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <b style={{ fontFamily: "Poppins", fontSize: 14 }}>Delete “{f.title}”?</b>
          <span style={{ fontSize: 13, color: C.MUTED }}>The series and its part list are removed. Pieces stay in your library; clips stay but leave the series.</span>
          <div className="st-row"><Btn sm onClick={() => setConfirming(false)}>Keep series</Btn><Btn sm className="danger" onClick={del} disabled={deleting}>{deleting ? "Deleting…" : "Yes, delete it"}</Btn></div>
        </div>
      ) : <div><Btn sm className="danger" onClick={() => setConfirming(true)}><Trash2 size={14} />Delete series</Btn></div>}
    </section>
  );
}

/* ---------------- series page preview (editable) ---------------- */

function toPublicClip(c: StudioClip): PublicClip {
  return { id: c.id, caption: c.caption, videoUrl: c.videoUrl, posterUrl: c.posterUrl, duration: c.duration_seconds, seriesId: c.series_id, releaseAt: c.release_at, alt: c.alt_text, position: c.position, source: null, sourceSeconds: c.source_seconds };
}

function PagePreview({ s, f, items, pieceOf, clips, patch, firstPieceId }: { s: StudioSeries; f: Fields; items: SeriesItem[]; pieceOf: (i: SeriesItem) => StudioPiece | null; clips: StudioClip[]; patch?: (p: Partial<Fields>, now?: boolean) => void; firstPieceId?: string | null }) {
  const studio = useStudioData();
  const navigate = useNavigate();
  const [phone, setPhone] = useState(false);
  const [photo, setPhoto] = useState(false);
  const authorsQ = useQuery({
    queryKey: ["studio-authors"], staleTime: 5 * 60_000,
    queryFn: async () => { const { data } = await supabase.from("content_items").select("author_name").not("author_name", "is", null).limit(500); return [...new Set(((data ?? []) as any[]).map((r) => r.author_name as string).filter(Boolean))].sort(); },
  });
  const parts: SeriesPart[] = items.flatMap((it) => {
    const p = pieceOf(it);
    if (p) return [{ key: it.id, kind: p.kind as string, title: p.title, releaseAt: p.releaseAt, released: p.status === "live", piece: null, templateId: null, collectionItemId: it.id, thumb: p.photo, summary: p.summary, length: "" }];
    if (it.planned_at) return [{ key: it.id, kind: it.planned_kind ?? "essay", title: it.show_title_publicly ? it.planned_title ?? "" : "", releaseAt: it.planned_at, released: false, piece: null, templateId: null, collectionItemId: it.id, thumb: null, summary: null, length: "" }];
    return [];
  });
  const topicNames = useMemo(() => {
    const ids = new Map<string, number>();
    for (const it of items) for (const t of pieceOf(it)?.topicIds ?? []) ids.set(t, (ids.get(t) ?? 0) + 1);
    return [...ids.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => { const t = studio.data?.topics.find((x) => x.id === id); return t?.display_name || t?.name || ""; }).filter(Boolean);
  }, [items, studio.data]);
  const devoPiece = s.devotional_template_id ? studio.data?.pieces.find((p) => p.id === s.devotional_template_id) ?? null : null;
  const edit: SeriesEdit | undefined = patch ? {
    set: (p) => patch(p as Partial<Fields>),
    setAbout: (doc: DocNode) => patch({ about_doc: doc }),
    setThemes: (t) => patch({ themes: t }),
    setTaughtBy: (t) => patch({ taught_by: t }),
    authorOptions: authorsQ.data ?? [],
    onPhoto: () => setPhoto(true),
  } : undefined;
  const view = { ...s, ...f, banner_url: f.banner_url, cover_image_url: null, description: s.description, writeup_body: s.writeup_body, devotional_template_id: s.devotional_template_id, slug: s.slug, id: s.id } as any;
  const inert = <>
    <span className="pill big" style={{ background: "#fff", borderColor: "#fff" }}>Start the series</span>
    <span className="pill big" style={{ background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,.8)" }}>Follow series</span>
  </>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: "Poppins", fontSize: 15, fontWeight: 600 }}>Series page</div>
          <div style={{ fontSize: 12.5, color: C.MUTED }}>{patch ? "Click any text to edit it in place" : "How readers see it today"}</div>
        </div>
        <div className="st-row" style={{ gap: 8 }}>
          <Segmented value={phone ? "phone" : "desktop"} onChange={(v) => setPhone(v === "phone")} options={[{ value: "desktop", label: "Desktop" }, { value: "phone", label: "Phone" }]} />
          {patch && <Btn sm disabled={!firstPieceId} title={firstPieceId ? undefined : "Add a piece first"} onClick={() => firstPieceId && navigate({ to: "/studio/preview/$id", params: { id: firstPieceId }, search: { tab: "series" } })}><ExternalLink size={14} />Open full preview</Btn>}
        </div>
      </div>
      <div style={{ background: "#fff", border: `1px solid ${C.LINE}`, borderRadius: 12, boxShadow: "0 12px 32px rgba(24,26,77,.08)", overflow: "hidden", width: phone ? 390 : "100%", maxWidth: "100%", alignSelf: "center" }}>
        <ContentScope>
          <div style={{ padding: phone ? "0 0 32px" : "8px 24px 40px" }}>
            <SeriesView s={view} parts={parts} clips={clips.filter((c) => c.caption.trim()).map(toPublicClip)} links={false} phone={phone} edit={edit}
              devo={devoPiece ? { id: devoPiece.id, title: devoPiece.title, hero_url: devoPiece.photo, duration_days: null } : null}
              topicNames={topicNames} authors={[]} heroActions={inert} />
          </div>
        </ContentScope>
      </div>
      {photo && patch && (
        <div role="dialog" aria-modal="true" aria-label="Change photo" style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(24,26,77,.35)", display: "flex", alignItems: "center", justifyContent: "center" }} onMouseDown={(e) => { if (e.target === e.currentTarget) setPhoto(false); }}>
          <div style={{ width: "min(720px, 94vw)", background: "#fff", borderRadius: 14, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <HeroPhotoField url={f.banner_url} fd={f.hero_focal_desktop} fm={f.hero_focal_mobile} onChange={(p) => patch({ ...(p.url !== undefined ? { banner_url: p.url } : {}), ...(p.fd !== undefined ? { hero_focal_desktop: p.fd } : {}), ...(p.fm !== undefined ? { hero_focal_mobile: p.fm } : {}) })} />
            <div style={{ display: "flex", justifyContent: "flex-end" }}><Btn primary onClick={() => setPhoto(false)}>Done</Btn></div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- stats ---------------- */

function StatsTab({ s, items, pieceOf }: { s: StudioSeries; items: SeriesItem[]; pieceOf: (i: SeriesItem) => StudioPiece | null }) {
  const q = useQuery({
    queryKey: ["series-stats", s.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("series_stats", { _collection_id: s.id });
      if (error) throw error;
      return data as { follows: number; parts: { item_id: string; views: number; finished: number; saves: number; comments: number }[] } | null;
    },
  });
  const rows = items.map((it, i) => ({ it, i, p: pieceOf(it), st: q.data?.parts.find((x) => x.item_id === it.id) })).filter((r) => r.p);
  const maxV = Math.max(1, ...rows.map((r) => r.st?.views ?? 0));
  const bar = (n: number, max: number) => <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ minWidth: 28, fontVariantNumeric: "tabular-nums" }}>{n}</span><span style={{ flex: 1, height: 6, borderRadius: 99, background: C.SOFT, minWidth: 60 }}><span style={{ display: "block", height: "100%", width: `${(n / max) * 100}%`, borderRadius: 99, background: C.INK }} /></span></div>;
  return (
    <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 20, maxWidth: 1100 }}>
      <div className="st-row" style={{ gap: 28 }}>
        <div><div style={{ fontFamily: "Poppins", fontSize: 22, fontWeight: 600 }}>{q.data?.follows ?? "–"}</div><div className="st-help">follows</div></div>
        <div><div style={{ fontFamily: "Poppins", fontSize: 22, fontWeight: 600 }}>{q.data ? q.data.parts.reduce((a, p) => a + p.comments, 0) : "–"}</div><div className="st-help">comments</div></div>
      </div>
      {q.isError ? <div className="st-empty"><b>Couldn’t load stats</b>{String((q.error as any)?.message ?? "")}</div>
        : rows.length === 0 ? <div className="st-empty"><b>No pieces yet</b>Stats appear once the series has pieces.</div>
        : (
          <table className="st-table">
            <thead><tr><th>Part</th><th>Views</th><th>Finished</th><th>Saves</th><th>Comments</th></tr></thead>
            <tbody>{rows.map(({ it, i, p, st }) => {
              const v = st?.views ?? 0; const fin = st?.finished ?? 0;
              return (
                <tr key={it.id}>
                  <td><span style={{ fontSize: 12, color: C.MUTED }}>Part {i + 1} · {KIND_LABEL[p!.kind]}</span><br /><span style={{ fontWeight: 600 }}>{p!.title}</span></td>
                  <td style={{ width: "22%" }}>{bar(v, maxV)}</td>
                  <td style={{ width: "22%" }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ minWidth: 36 }}>{v ? `${Math.round((fin / v) * 100)}%` : "–"}</span><span style={{ flex: 1, height: 6, borderRadius: 99, background: C.SOFT, minWidth: 60 }}><span style={{ display: "block", height: "100%", width: `${v ? (fin / v) * 100 : 0}%`, borderRadius: 99, background: C.GREEN }} /></span></div></td>
                  <td>{st?.saves ?? 0}</td>
                  <td>{st?.comments ?? 0}</td>
                </tr>
              );
            })}</tbody>
          </table>
        )}
      <span className="st-help">Views count signed-in readers who opened a part; finished % is of those readers.</span>
    </div>
  );
}
