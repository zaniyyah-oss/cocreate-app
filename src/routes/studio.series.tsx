import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, ArrowUp, ArrowDown, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStudioData, useInvalidateStudio, KIND_LABEL, type StudioSeries } from "@/lib/studio-data";
import { HeroPhotoField } from "@/components/studio/CropFrames";
import { TopBar, Btn, StatusPill, C } from "@/components/studio/ui";

export const Route = createFileRoute("/studio/series")({
  validateSearch: (s: Record<string, unknown>): { id?: string } => (typeof s.id === "string" ? { id: s.id } : {}),
  component: SeriesPage,
  head: () => ({ meta: [{ title: "Series — CoCreate Studio" }, { name: "description", content: "CoCreate series." }, { property: "og:title", content: "Series — CoCreate Studio" }, { property: "og:description", content: "CoCreate series." }] }),
});

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "series";

function SeriesPage() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const q = useStudioData();
  const invalidate = useInvalidateStudio();
  const series = q.data?.series ?? [];
  const sel = series.find((s) => s.id === id) ?? null;
  const create = async () => {
    const title = "Untitled series";
    const { data, error } = await supabase.from("collections").insert({ title, slug: `${slugify(title)}-${Math.random().toString(36).slice(2, 7)}`, status: "draft" }).select("id").single();
    if (error) { toast.error(error.message); return; }
    invalidate(); navigate({ to: "/studio/series", search: { id: data.id } });
  };
  return (
    <>
      <TopBar left={<h1>Series</h1>} right={<Btn primary onClick={create}><Plus size={16} strokeWidth={1.7} />New series</Btn>} />
      <div style={{ padding: 28, display: "flex", gap: 28, alignItems: "flex-start" }}>
        <div style={{ flex: "0 0 300px", display: "flex", flexDirection: "column" }}>
          {series.length === 0 && q.data && <div className="st-empty"><b>No series yet</b>Create the first one.</div>}
          {series.map((s) => (
            <Link key={s.id} to="/studio/series" search={{ id: s.id }} style={{ padding: "12px 14px", borderRadius: 10, background: s.id === id ? C.SOFT : "transparent", display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontFamily: "Poppins", fontSize: 15, fontWeight: 600 }}>{s.title}</span>
              <span style={{ fontSize: 12.5, color: C.MUTED }}>{s.series_month ? new Date(`${s.series_month}T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "No month"} · {s.items.length} parts</span>
            </Link>
          ))}
        </div>
        <div style={{ flex: 1, minWidth: 0, maxWidth: 720 }}>
          {sel ? <SeriesForm key={sel.id} s={sel} /> : <div className="st-empty"><b>Choose a series</b>Pick one on the left to edit it. The full series builder with planned slots and clips comes later.</div>}
        </div>
      </div>
    </>
  );
}

function SeriesForm({ s }: { s: StudioSeries }) {
  const studio = useStudioData();
  const invalidate = useInvalidateStudio();
  const [f, setF] = useState({ title: s.title, month: s.series_month?.slice(0, 7) ?? "", summary: s.summary ?? "", banner_url: s.banner_url ?? s.cover_image_url, fd: s.hero_focal_desktop, fm: s.hero_focal_mobile, status: s.status });
  const [busy, setBusy] = useState(false);
  useEffect(() => setF({ title: s.title, month: s.series_month?.slice(0, 7) ?? "", summary: s.summary ?? "", banner_url: s.banner_url ?? s.cover_image_url, fd: s.hero_focal_desktop, fm: s.hero_focal_mobile, status: s.status }), [s.id]);
  const items = [...s.items].sort((a, b) => a.position - b.position);
  const pieceOf = (i: (typeof items)[number]) => studio.data?.pieces.find((p) => p.id === (i.content_id ?? i.template_id)) ?? null;
  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("collections").update({ title: f.title, series_month: f.month ? `${f.month}-01` : null, summary: f.summary || null, banner_url: f.banner_url, hero_focal_desktop: f.fd, hero_focal_mobile: f.fm, status: f.status as any }).eq("id", s.id);
    setBusy(false);
    if (error) toast.error(error.message); else { toast.success("Series saved"); invalidate(); }
  };
  const reorder = async (list: typeof items) => {
    await Promise.all(list.map((it, idx) => supabase.from("collection_items").update({ position: idx + 1 }).eq("id", it.id)));
    invalidate();
  };
  const move = (i: number, d: -1 | 1) => { const l = [...items]; const j = i + d; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j]!, l[i]!]; void reorder(l); };
  const remove = async (itemId: string) => { const { error } = await supabase.from("collection_items").delete().eq("id", itemId); if (error) toast.error(error.message); else invalidate(); };
  const add = async (pid: string) => {
    const p = studio.data?.pieces.find((x) => x.id === pid); if (!p) return;
    if (p.seriesId) await supabase.from("collection_items").delete().eq(p.kind === "devotional" ? "template_id" : "content_id", p.id);
    const { error } = await supabase.from("collection_items").insert({ collection_id: s.id, [p.kind === "devotional" ? "template_id" : "content_id"]: p.id, position: items.length + 1, content_kind: p.kind } as any);
    if (error) toast.error(error.message); else invalidate();
  };
  const inSeries = new Set(items.map((i) => i.content_id ?? i.template_id));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <label className="st-field"><span className="st-label">Name</span><input className="st-input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label className="st-field"><span className="st-label">Month</span><input className="st-input" type="month" value={f.month} onChange={(e) => setF({ ...f, month: e.target.value })} /></label>
        <label className="st-field"><span className="st-label">Visibility</span><select className="st-input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="draft">Draft (hidden)</option><option value="published">Published</option></select></label>
      </div>
      <label className="st-field"><span className="st-label">Summary line</span><input className="st-input" value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} placeholder="[One line about this series]" /></label>
      <HeroPhotoField url={f.banner_url} fd={f.fd} fm={f.fm} onChange={(p) => setF({ ...f, ...(p.url !== undefined ? { banner_url: p.url } : {}), ...(p.fd !== undefined ? { fd: p.fd } : {}), ...(p.fm !== undefined ? { fm: p.fm } : {}) })} />
      <div><Btn primary onClick={save} disabled={busy}>{busy ? "Saving…" : "Save series"}</Btn></div>
      <section style={{ borderTop: `1px solid ${C.LINE}`, paddingTop: 18, display: "flex", flexDirection: "column", gap: 8 }}>
        <h2 className="st-h2" style={{ marginBottom: 6 }}>Pieces, in order</h2>
        {items.length === 0 && <span className="st-help">No pieces yet.</span>}
        {items.map((it, i) => {
          const p = pieceOf(it);
          return (
            <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: `1px ${p ? "solid" : "dashed"} ${p ? C.LINE : "#C9C6BE"}`, borderRadius: 9 }}>
              <span style={{ fontSize: 12.5, color: C.MUTED, width: 48 }}>Part {i + 1}</span>
              {p ? <Link to="/studio/pieces/$id" params={{ id: p.id }} style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{KIND_LABEL[p.kind]} · {p.title}</Link> : <span style={{ flex: 1, fontSize: 14, color: C.MUTED }}>{it.planned_title ? `Planned · ${it.planned_title}` : "Planned slot"}</span>}
              {p && <StatusPill status={p.status} />}
              <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} style={{ border: 0, background: "none" }}><ArrowUp size={15} strokeWidth={1.7} /></button>
              <button type="button" aria-label="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)} style={{ border: 0, background: "none" }}><ArrowDown size={15} strokeWidth={1.7} /></button>
              <button type="button" aria-label="Remove from series" onClick={() => remove(it.id)} style={{ border: 0, background: "none", color: C.MUTED }}><X size={15} strokeWidth={1.7} /></button>
            </div>
          );
        })}
        <select className="st-input" value="" onChange={(e) => e.target.value && add(e.target.value)} aria-label="Add a piece">
          <option value="">+ Add a piece</option>
          {(studio.data?.pieces ?? []).filter((p) => !inSeries.has(p.id)).map((p) => <option key={p.id} value={p.id}>{KIND_LABEL[p.kind]} · {p.title}{p.seriesTitle ? ` (in ${p.seriesTitle})` : ""}</option>)}
        </select>
      </section>
    </div>
  );
}
