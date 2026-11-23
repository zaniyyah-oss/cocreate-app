import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useStudioData, KIND_LABEL } from "@/lib/studio-data";
import { etLabel } from "@/lib/et-time";
import { TopBar, StatusPill, C } from "@/components/studio/ui";
import { NewPieceMenu } from "@/components/studio/NewPiece";

type S = { kind?: string; status?: string; series?: string; q?: string; attn?: string };
export const Route = createFileRoute("/studio/pieces/")({
  validateSearch: (s: Record<string, unknown>): S => {
    const o: S = {};
    for (const k of ["kind", "status", "series", "q", "attn"] as const) if (typeof s[k] === "string" && s[k]) o[k] = s[k] as string;
    return o;
  },
  component: Pieces,
  head: () => ({ meta: [{ title: "All pieces — CoCreate Studio" }, { name: "description", content: "Every CoCreate piece." }, { property: "og:title", content: "All pieces — CoCreate Studio" }, { property: "og:description", content: "Every CoCreate piece." }] }),
});

function Pieces() {
  const s = Route.useSearch();
  const navigate = useNavigate();
  const q = useStudioData();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const set = (patch: Partial<S>) => navigate({ to: "/studio/pieces", search: (prev: S) => { const n = { ...prev, ...patch }; (Object.keys(n) as (keyof S)[]).forEach((k) => { if (!n[k]) delete n[k]; }); return n; } });
  const d = q.data;
  const list = (d?.pieces ?? []).filter((p) =>
    (!s.kind || (s.kind === "essay" ? p.kind === "essay" : p.kind === s.kind)) &&
    (!s.status || p.status === s.status) &&
    (!s.series || (s.series === "none" ? !p.seriesId : p.seriesId === s.series)) &&
    (!s.q || p.title.toLowerCase().includes(s.q.toLowerCase())) &&
    (!s.attn || (p.status !== "live" && !p.checks.find((c) => c.key === s.attn)?.done)),
  ).sort((a, b) => (b.releaseAt ?? b.updatedAt).localeCompare(a.releaseAt ?? a.updatedAt));
  const sel = { minHeight: 40, padding: "0 12px", border: `1px solid ${C.LINE}`, borderRadius: 9, fontSize: 13.5, background: "#fff" } as const;
  return (
    <>
      <TopBar left={<h1>All pieces</h1>} right={
        <div ref={ref} style={{ position: "relative" }}>
          <button type="button" className="st-btn primary" onClick={() => setOpen((o) => !o)}><Plus size={16} strokeWidth={1.7} />New piece</button>
          {open && <NewPieceMenu onDone={() => setOpen(false)} style={{ top: 46, right: 0 }} />}
        </div>
      } />
      <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 18 }}>
        <div className="st-row" style={{ flexWrap: "wrap" }}>
          <label style={{ position: "relative", flex: "1 1 240px", maxWidth: 360 }}>
            <Search size={15} strokeWidth={1.7} style={{ position: "absolute", left: 12, top: 12, color: C.MUTED }} />
            <input className="st-input" style={{ paddingLeft: 34 }} placeholder="Search titles" defaultValue={s.q ?? ""} onChange={(e) => set({ q: e.target.value })} aria-label="Search titles" />
          </label>
          <select style={sel} value={s.kind ?? ""} onChange={(e) => set({ kind: e.target.value })} aria-label="Kind">
            <option value="">All kinds</option>{["teaching", "essay", "blog", "podcast", "devotional", "clip"].map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
          </select>
          <select style={sel} value={s.status ?? ""} onChange={(e) => set({ status: e.target.value })} aria-label="Status">
            <option value="">All statuses</option><option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="live">Live</option>
          </select>
          <select style={sel} value={s.series ?? ""} onChange={(e) => set({ series: e.target.value })} aria-label="Series">
            <option value="">All series</option><option value="none">No series</option>{(d?.series ?? []).map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
          </select>
          {s.attn && <button type="button" className="st-chip" onClick={() => set({ attn: undefined })}>Needs: {s.attn === "hero" ? "hero photo" : s.attn === "topics" ? "topics" : "release time"} <span aria-hidden>×</span></button>}
        </div>
        {d && list.length === 0 ? <div className="st-empty"><b>No pieces match</b>Try clearing a filter, or start a new piece.</div> : (
          <table className="st-table">
            <thead><tr><th>Title</th><th>Kind</th><th>Series · Part</th><th>Release (ET)</th><th>Status</th></tr></thead>
            <tbody>{list.map((p) => (
              <tr key={p.id} className="click" onClick={() => navigate({ to: "/studio/pieces/$id", params: { id: p.id } })}>
                <td style={{ fontWeight: 600 }}>{p.title}</td>
                <td>{KIND_LABEL[p.kind]}</td>
                <td style={{ color: C.MUTED }}>{p.seriesTitle ? `${p.seriesTitle}${p.part ? ` · Part ${p.part}` : ""}` : p.standalone ? "Standalone" : "—"}</td>
                <td style={{ color: C.MUTED, whiteSpace: "nowrap" }}>{p.releaseAt ? etLabel(p.releaseAt) : "—"}</td>
                <td><StatusPill status={p.status} /></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </>
  );
}
