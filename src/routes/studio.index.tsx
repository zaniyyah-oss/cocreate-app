import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, AlertTriangle, ChevronLeft, ChevronRight, ImageOff, Tags, Clock, Layers, MessageSquare, Film } from "lucide-react";
import { useStudioData, calendarEntries, type CalEntry, type StudioData } from "@/lib/studio-data";
import { readyCount, isReady, missingText } from "@/lib/studio-checklist";
import { ET_ZONE } from "@/lib/et-time";
import { TopBar, Segmented, StatusPill, C } from "@/components/studio/ui";

export const Route = createFileRoute("/studio/")({
  validateSearch: (s: Record<string, unknown>): { view?: "calendar" | "list" | "board" } =>
    s.view === "list" || s.view === "board" ? { view: s.view } : {},
  component: Releases,
  head: () => ({ meta: [{ title: "Releases — CoCreate Studio" }, { name: "description", content: "Upcoming CoCreate releases." }, { property: "og:title", content: "Releases — CoCreate Studio" }, { property: "og:description", content: "Upcoming CoCreate releases." }] }),
});

const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const md = d.toLocaleDateString("en-US", { timeZone: ET_ZONE, month: "short", day: "numeric" });
  const wd = d.toLocaleDateString("en-US", { timeZone: ET_ZONE, weekday: "short" });
  return `${md} · ${wd}`;
};
const etDayKey = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: ET_ZONE });

function Releases() {
  const { view = "calendar" } = Route.useSearch();
  const navigate = useNavigate();
  const q = useStudioData();
  const d = q.data;
  const entries = useMemo(() => (d ? calendarEntries(d) : []), [d]);
  const now = Date.now();
  const upcoming = entries.filter((e) => new Date(e.at).getTime() > now && e.status !== "live").slice(0, 3);
  const setView = (v: string) => navigate({ to: "/studio", search: v === "calendar" ? {} : { view: v as any } });

  return (
    <>
      <TopBar left={<><h1>Releases</h1><Segmented value={view} onChange={setView} options={[{ value: "calendar", label: "Calendar" }, { value: "list", label: "List" }, { value: "board", label: "Board" }]} /></>} />
      {q.isError && <div style={{ padding: 28 }} className="st-empty"><b>Couldn't load Studio</b>{String((q.error as any)?.message ?? "")}</div>}
      {d && (
        <div style={{ padding: 28, display: "flex", gap: 28, alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 28 }}>
            <section>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
                <h2 className="st-h2">Going live next</h2>
                <Link to="/studio" search={{ view: "list" }} style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 36, fontSize: 13, fontWeight: 600 }}>All upcoming<ArrowRight size={15} strokeWidth={1.7} /></Link>
              </div>
              {upcoming.length === 0 ? <div className="st-empty"><b>Nothing scheduled yet</b>Give a piece a release date to see it here.</div> : (
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>{upcoming.map((e) => <NextCard key={e.key} e={e} />)}</div>
              )}
            </section>
            {view === "calendar" && <MonthCalendar entries={entries} />}
            {view === "list" && <ListView entries={entries.filter((e) => new Date(e.at).getTime() > now - 86400000 * 31)} />}
            {view === "board" && <BoardView d={d} />}
          </div>
          <aside style={{ flex: "0 0 300px", display: "flex", flexDirection: "column", gap: 28 }}>
            <NeedsAttention d={d} />
            <SeriesProgress d={d} />
          </aside>
        </div>
      )}
    </>
  );
}

function entryHref(e: CalEntry) {
  if (e.piece) return { to: "/studio/pieces/$id" as const, params: { id: e.piece.id } };
  return { to: "/studio/series" as const, search: e.seriesId ? { id: e.seriesId } : {} };
}

function NextCard({ e }: { e: CalEntry }) {
  const p = e.piece;
  const href = entryHref(e);
  return (
    <Link {...(href as any)} style={{ flex: "1 1 260px", minWidth: 0, display: "flex", flexDirection: "column", border: `1px solid ${C.LINE}`, borderRadius: 12, overflow: "hidden", background: "#fff" }}>
      <span style={{ position: "relative", display: "block", width: "100%", aspectRatio: "16 / 7", background: "#E9E6DF" }}>
        {e.photo && <img src={e.photo} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: p?.fd || "center" }} />}
      </span>
      <span style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: C.MUTED }}>{dayLabel(e.at)} · {e.kindLabel}</span>
          <StatusPill status={e.status === "planned" ? "notstarted" : e.status} />
        </span>
        <span style={{ fontFamily: "Poppins", fontSize: 17, fontWeight: 600, color: C.INK }}>{e.title}</span>
        <span style={{ fontSize: 13, color: C.MUTED }}>{[e.seriesLine, p ? `${readyCount(p.checks)} of 6 ready` : null].filter(Boolean).join(" · ")}</span>
        {p && (isReady(p.checks)
          ? <span style={{ fontSize: 12.5, color: C.GREEN, fontWeight: 600 }}>✓ Ready to go live</span>
          : <span style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12.5, color: C.AMBER }}><AlertTriangle size={14} strokeWidth={1.7} />{missingText(p.checks)}</span>)}
      </span>
    </Link>
  );
}

const PILL_BG: Record<string, string> = { scheduled: "#E8E9F4", draft: "#F0EEE9", live: "#E3EEEA", planned: "#fff" };

function MonthCalendar({ entries }: { entries: CalEntry[] }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const y = cursor.getFullYear(), m = cursor.getMonth();
  const startOffset = (new Date(y, m, 1).getDay() + 6) % 7; // Monday start
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) cells.push(new Date(y, m, 1 - startOffset + i));
  const rows = cells.slice(35).every((c) => c.getMonth() !== m) ? cells.slice(0, 35) : cells;
  const byDay = new Map<string, CalEntry[]>();
  for (const e of entries) { const k = etDayKey(e.at); byDay.set(k, [...(byDay.get(k) ?? []), e]); }
  const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const navBtn = { width: 32, height: 32, borderRadius: 99, border: `1px solid ${C.LINE}`, background: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", color: C.INK } as const;
  const sq = (bg: string, dashed?: boolean) => <span style={{ width: 10, height: 10, borderRadius: 3, background: bg, border: dashed ? "1px dashed #C9C6BE" : undefined, display: "inline-block" }} />;
  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 className="st-h2">{cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h2>
          <button type="button" style={navBtn} aria-label="Previous month" onClick={() => setCursor(new Date(y, m - 1, 1))}><ChevronLeft size={16} strokeWidth={1.7} /></button>
          <button type="button" style={navBtn} aria-label="Next month" onClick={() => setCursor(new Date(y, m + 1, 1))}><ChevronRight size={16} strokeWidth={1.7} /></button>
        </span>
        <span style={{ display: "flex", gap: 14, fontSize: 12.5, color: C.MUTED }}>
          <span style={{ display: "flex", gap: 6, alignItems: "center" }}>{sq("#E8E9F4")}Scheduled</span>
          <span style={{ display: "flex", gap: 6, alignItems: "center" }}>{sq("#F0EEE9")}Draft</span>
          <span style={{ display: "flex", gap: 6, alignItems: "center" }}>{sq("#fff", true)}Planned slot</span>
        </span>
      </div>
      <div style={{ borderTop: `1px solid ${C.LINE}`, borderLeft: `1px solid ${C.LINE}`, borderRadius: 10, overflow: "hidden", display: "grid", gridTemplateColumns: "repeat(7, minmax(0,1fr))" }}>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((w) => <div key={w} style={{ padding: "10px 8px", borderRight: `1px solid ${C.LINE}`, borderBottom: `1px solid ${C.LINE}`, fontSize: 11.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: C.MUTED }}>{w}</div>)}
        {rows.map((c) => {
          const other = c.getMonth() !== m;
          const list = byDay.get(key(c)) ?? [];
          return (
            <div key={key(c)} style={{ minHeight: 92, padding: 8, borderRight: `1px solid ${C.LINE}`, borderBottom: `1px solid ${C.LINE}`, display: "flex", flexDirection: "column", gap: 6, background: other ? C.SBG : "#fff", minWidth: 0 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: other ? "#B5B2A8" : C.INK }}>{c.getDate()}</span>
              {list.map((e) => (
                <Link key={e.key} {...(entryHref(e) as any)} title={e.title} style={{ display: "flex", flexDirection: "column", gap: 1, padding: "6px 8px", borderRadius: 7, background: PILL_BG[e.status], border: e.status === "planned" ? "1px dashed #C9C6BE" : undefined, minWidth: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.kindLabel}</span>
                  <span style={{ fontSize: 11, color: C.MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.seriesLine ?? e.title}</span>
                </Link>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ListView({ entries }: { entries: CalEntry[] }) {
  const navigate = useNavigate();
  if (!entries.length) return <div className="st-empty"><b>No releases</b>Dated pieces and planned slots show here.</div>;
  return (
    <section>
      <h2 className="st-h2" style={{ marginBottom: 14 }}>Upcoming</h2>
      <table className="st-table"><thead><tr><th>Release</th><th>Title</th><th>Kind</th><th>Series</th><th>Status</th></tr></thead><tbody>
        {entries.map((e) => (
          <tr key={e.key} className="click" onClick={() => navigate(entryHref(e) as any)}>
            <td style={{ whiteSpace: "nowrap", color: C.MUTED }}>{dayLabel(e.at)}</td><td style={{ fontWeight: 600 }}>{e.title}</td><td>{e.kindLabel}</td><td style={{ color: C.MUTED }}>{e.seriesLine ?? "—"}</td>
            <td><StatusPill status={e.status === "planned" ? "notstarted" : e.status} label={e.status === "planned" ? "Planned" : undefined} /></td>
          </tr>
        ))}
      </tbody></table>
    </section>
  );
}

function BoardView({ d }: { d: StudioData }) {
  const cols = [{ k: "draft", label: "Draft" }, { k: "scheduled", label: "Scheduled" }, { k: "live", label: "Live" }] as const;
  return (
    <section style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 16 }}>
      {cols.map((c) => {
        const list = d.pieces.filter((p) => p.status === c.k);
        return (
          <div key={c.k} style={{ background: C.SBG, border: `1px solid ${C.LINE}`, borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 4px 6px" }}><StatusPill status={c.k} /><span style={{ fontSize: 12.5, color: C.MUTED }}>{list.length}</span></div>
            {list.map((p) => (
              <Link key={p.id} to="/studio/pieces/$id" params={{ id: p.id }} style={{ background: "#fff", border: `1px solid ${C.LINE}`, borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: C.MUTED }}>{p.releaseAt ? dayLabel(p.releaseAt) : "No date"} · {p.kind === "essay" ? "Article" : p.kind}</span>
                <span style={{ fontFamily: "Poppins", fontSize: 14.5, fontWeight: 600 }}>{p.title}</span>
                <span style={{ fontSize: 12, color: C.MUTED }}>{readyCount(p.checks)} of 6 ready</span>
              </Link>
            ))}
          </div>
        );
      })}
    </section>
  );
}

function NeedsAttention({ d }: { d: StudioData }) {
  const open = d.pieces.filter((p) => p.status !== "live");
  const miss = (k: string) => open.filter((p) => !p.checks.find((c) => c.key === k)?.done).length;
  const emptySeries = d.series.filter((s) => s.items.length === 0).length;
  const rows = [
    { icon: ImageOff, n: miss("hero"), text: (n: number) => `${n} ${n === 1 ? "piece" : "pieces"} missing a hero photo`, to: { to: "/studio/pieces", search: { attn: "hero" } } },
    { icon: Tags, n: miss("topics"), text: (n: number) => `${n} ${n === 1 ? "piece" : "pieces"} missing topics`, to: { to: "/studio/pieces", search: { attn: "topics" } } },
    { icon: Clock, n: miss("release"), text: (n: number) => `${n} ${n === 1 ? "piece" : "pieces"} with no release time`, to: { to: "/studio/pieces", search: { attn: "release" } } },
    { icon: Layers, n: emptySeries, text: (n: number) => `${n} ${n === 1 ? "series" : "series"} with no pieces`, to: { to: "/studio/series" } },
    { icon: MessageSquare, n: 0, text: () => "0 flagged comments", to: { to: "/studio/comments" } },
    { icon: Film, n: 0, text: () => "0 clips without captions", to: { to: "/studio/clips" } },
  ];
  return (
    <div>
      <h3 className="st-h3">Needs attention</h3>
      {rows.map((r, i) => {
        const Icon = r.icon;
        return (
          <Link key={i} {...(r.to as any)} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 0", borderTop: `1px solid ${C.LINE}`, opacity: r.n ? 1 : 0.6 }}>
            <Icon size={17} strokeWidth={1.7} color={C.INK} /><span style={{ fontSize: 14, color: C.INK, flex: 1 }}>{r.text(r.n)}</span><ChevronRight size={15} strokeWidth={1.7} color={C.MUTED} />
          </Link>
        );
      })}
    </div>
  );
}

function SeriesProgress({ d }: { d: StudioData }) {
  const live = new Set(d.pieces.filter((p) => p.status === "live").map((p) => p.id));
  if (!d.series.length) return <div><h3 className="st-h3">Series</h3><div className="st-help">No series yet.</div></div>;
  return (
    <div>
      <h3 className="st-h3">Series</h3>
      {d.series.map((s) => {
        const total = s.items.length;
        const released = s.items.filter((i) => (i.content_id && live.has(i.content_id)) || (i.template_id && live.has(i.template_id))).length;
        const pct = total ? Math.round((released / total) * 100) : 0;
        return (
          <Link key={s.id} to="/studio/series" search={{ id: s.id }} style={{ display: "block", padding: "14px 0", borderTop: `1px solid ${C.LINE}` }}>
            <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: "Poppins", fontSize: 15, fontWeight: 600, color: C.INK }}>{s.title}</span>
              <StatusPill status={released > 0 ? "live" : "notstarted"} />
            </span>
            <span style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: C.MUTED, margin: "8px 0 6px" }}><span>{released} of {total} released</span><span>{pct}%</span></span>
            <span style={{ display: "block", height: 6, borderRadius: 99, background: "#ECEAE4", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${pct}%`, background: C.INK }} /></span>
          </Link>
        );
      })}
    </div>
  );
}
