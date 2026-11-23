import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { useStudioClips, fmtDur, clipIsPublic, type StudioClip } from "@/lib/clips";
import { useStudioData } from "@/lib/studio-data";
import { ClipEditor } from "@/components/studio/ClipEditor";
import { TopBar, Btn, C, Switch } from "@/components/studio/ui";

export const Route = createFileRoute("/studio/clips")({
  component: ClipsPage,
  head: () => ({ meta: [{ title: "Clips & media — CoCreate Studio" }, { name: "description", content: "Vertical clips with captions for CoCreate series." }, { property: "og:title", content: "Clips & media — CoCreate Studio" }, { property: "og:description", content: "Vertical clips with captions for CoCreate series." }] }),
});

export function ClipTile({ c, seriesTitle, onClick, width }: { c: StudioClip; seriesTitle?: string | null; onClick: () => void; width?: number }) {
  const needs = !c.caption.trim();
  return (
    <button type="button" onClick={onClick} style={{ width: width ?? "100%", border: 0, background: "none", padding: 0, textAlign: "left", display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ position: "relative", display: "block", width: "100%", aspectRatio: "9/16", borderRadius: 8, overflow: "hidden", background: "#E9E6DF" }}>
        {c.posterUrl && <img src={c.posterUrl} alt={c.alt_text ?? ""} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
        {c.duration_seconds != null && <span style={{ position: "absolute", left: 8, bottom: 8, color: "#fff", fontSize: 10.5, fontWeight: 600, textShadow: "0 1px 4px rgba(0,0,0,.6)" }}>{fmtDur(c.duration_seconds)}</span>}
        {needs && <span className="st-pill" style={{ position: "absolute", top: 8, left: 8, background: "#FFF3E0", color: C.AMBER, height: 22, fontSize: 11 }}>Needs caption</span>}
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: needs ? C.MUTED : C.INK, lineHeight: 1.3 }}>{c.caption || "No caption yet"}</span>
      <span style={{ fontSize: 12, color: C.MUTED }}>{[seriesTitle, clipIsPublic(c) ? "Live" : c.release_at ? `From ${new Date(c.release_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : "No release time"].filter(Boolean).join(" · ")}</span>
    </button>
  );
}

function ClipsPage() {
  const clips = useStudioClips();
  const studio = useStudioData();
  const [series, setSeries] = useState("");
  const [needs, setNeeds] = useState(false);
  const [open, setOpen] = useState<StudioClip | "new" | null>(null);
  const titleOf = useMemo(() => new Map((studio.data?.series ?? []).map((s) => [s.id, s.title])), [studio.data]);
  const list = (clips.data ?? []).filter((c) => (!series || (series === "none" ? !c.series_id : c.series_id === series)) && (!needs || !c.caption.trim()));
  return (
    <>
      <TopBar left={<h1>Clips & media</h1>} right={<Btn primary onClick={() => setOpen("new")}><Upload size={16} strokeWidth={1.7} />Upload clip</Btn>} />
      <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="st-row" style={{ flexWrap: "wrap" }}>
          <select className="st-input" style={{ width: 240 }} value={series} onChange={(e) => setSeries(e.target.value)} aria-label="Filter by series">
            <option value="">All series</option>
            <option value="none">Not in a series</option>
            {(studio.data?.series ?? []).map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
          <label className="st-row" style={{ gap: 8, fontSize: 13.5, fontWeight: 600 }}><Switch on={needs} onChange={setNeeds} label="Needs caption only" />Needs caption</label>
          <span className="st-help" style={{ marginLeft: "auto" }}>{list.length} {list.length === 1 ? "clip" : "clips"}</span>
        </div>
        {clips.isLoading ? <span className="st-help">Loading…</span>
          : clips.isError ? <div className="st-empty"><b>Couldn’t load clips</b>{String((clips.error as any)?.message ?? "")}</div>
          : list.length === 0 ? <div className="st-empty"><b>{(clips.data ?? []).length ? "No clips match" : "No clips yet"}</b>{(clips.data ?? []).length ? "Try another filter." : "Upload a vertical video to start the library."}</div>
          : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 20 }}>{list.map((c) => <ClipTile key={c.id} c={c} seriesTitle={c.series_id ? titleOf.get(c.series_id) : null} onClick={() => setOpen(c)} />)}</div>}
      </div>
      {open && <ClipEditor key={open === "new" ? "new" : open.id} clip={open === "new" ? null : open} onClose={() => setOpen(null)} />}
    </>
  );
}
