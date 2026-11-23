import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, X, Plus, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStudioData, useInvalidateStudio, KIND_LABEL, uploadStudioPhoto } from "@/lib/studio-data";
import { TopBar, Btn, C } from "@/components/studio/ui";

export const Route = createFileRoute("/studio/homepage")({
  component: HomepageLayout,
  head: () => ({ meta: [{ title: "Homepage layout — CoCreate Studio" }, { name: "description", content: "Choose what the CoCreate homepage features." }, { property: "og:title", content: "Homepage layout — CoCreate Studio" }, { property: "og:description", content: "Choose what the CoCreate homepage features." }] }),
});

const COPY_FIELDS = [
  { key: "devotionals_headline", label: "Devotionals headline" },
  { key: "devotionals_subline", label: "Devotionals subline" },
  { key: "newsletter_headline", label: "Newsletter headline" },
  { key: "newsletter_subline", label: "Newsletter subline" },
  { key: "workspace_card_subline", label: "Workspace card subline" },
];

const monthStart = (offset: number) => { const d = new Date(); const m = new Date(d.getFullYear(), d.getMonth() + offset, 1); return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}-01`; };

function useHomeCopy() {
  return useQuery({
    queryKey: ["page-content", "home"],
    queryFn: async () => {
      const { data, error } = await supabase.from("page_content").select("field_key, field_value").eq("page_key", "home");
      if (error) throw error;
      const m: Record<string, string> = {}; for (const r of data ?? []) m[r.field_key] = r.field_value ?? ""; return m;
    },
  });
}

function HomepageLayout() {
  const studio = useStudioData();
  const invalidate = useInvalidateStudio();
  const copyQ = useHomeCopy();
  const qc = useQueryClient();
  const [frameKey, setFrameKey] = useState(0);
  const save = async (field: string, value: string) => {
    const { error } = await supabase.from("page_content").upsert({ page_key: "home", field_key: field, field_value: value }, { onConflict: "page_key,field_key" });
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["page-content", "home"] });
    qc.invalidateQueries({ queryKey: ["content-home"] });
    setFrameKey((k) => k + 1);
  };
  const copy = copyQ.data ?? {};
  const pieces = (studio.data?.pieces ?? []).filter((p) => p.status !== "draft");
  const contentPieces = pieces.filter((p) => p.kind !== "devotional");
  const picks = (copy["new_this_month_ids"] ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const setPicks = (list: string[]) => save("new_this_month_ids", list.slice(0, 3).join(","));
  const label = (ref: string) => { const id = ref.split(":")[1]; const p = studio.data?.pieces.find((x) => x.id === id); return p ? `${KIND_LABEL[p.kind]} · ${p.title}` : "[Removed piece]"; };
  const series = studio.data?.series ?? [];
  const thisM = monthStart(0), nextM = monthStart(1);
  const seriesFor = (m: string) => series.find((s) => s.series_month?.slice(0, 7) === m.slice(0, 7))?.id ?? "";
  const setSeriesMonth = async (sid: string, m: string) => {
    const prev = seriesFor(m);
    if (prev && prev !== sid) await supabase.from("collections").update({ series_month: null }).eq("id", prev);
    if (sid) {
      const { error } = await supabase.from("collections").update({ series_month: m }).eq("id", sid);
      if (error) { toast.error(error.message); return; }
    }
    invalidate(); qc.invalidateQueries({ queryKey: ["content-home"] }); setFrameKey((k) => k + 1); toast.success("Series updated");
  };

  return (
    <>
      <TopBar left={<h1>Homepage layout</h1>} right={<a href="/?feed=1" target="_blank" rel="noopener" className="st-btn">View live homepage</a>} />
      <div style={{ padding: 28, display: "flex", gap: 28, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 28, maxWidth: 640 }}>
          <section className="st-field">
            <h2 className="st-h2">Featured hero</h2>
            <span className="st-help">The big photo at the top of the homepage. Only shows once the piece is live.</span>
            <select className="st-input" value={copy["featured_piece_id"] ?? ""} onChange={(e) => save("featured_piece_id", e.target.value)} aria-label="Featured hero piece">
              <option value="">Automatic (latest featured release)</option>
              {contentPieces.map((p) => <option key={p.id} value={p.id}>{KIND_LABEL[p.kind]} · {p.title}{p.status === "scheduled" ? " (scheduled)" : ""}</option>)}
            </select>
          </section>
          <section className="st-field">
            <h2 className="st-h2">New this month</h2>
            <span className="st-help">Pick up to 3, in order. Leave empty to use pieces marked “Feature in New this month”.</span>
            {picks.map((ref, i) => (
              <div key={ref} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", border: `1px solid ${C.LINE}`, borderRadius: 9 }}>
                <span style={{ width: 20, fontSize: 13, color: C.MUTED }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: 14 }}>{label(ref)}</span>
                <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => { const l = [...picks]; [l[i - 1], l[i]] = [l[i]!, l[i - 1]!]; setPicks(l); }} style={{ border: 0, background: "none" }}><ArrowUp size={15} strokeWidth={1.7} /></button>
                <button type="button" aria-label="Move down" disabled={i === picks.length - 1} onClick={() => { const l = [...picks]; [l[i + 1], l[i]] = [l[i]!, l[i + 1]!]; setPicks(l); }} style={{ border: 0, background: "none" }}><ArrowDown size={15} strokeWidth={1.7} /></button>
                <button type="button" aria-label="Remove" onClick={() => setPicks(picks.filter((x) => x !== ref))} style={{ border: 0, background: "none", color: C.MUTED }}><X size={15} strokeWidth={1.7} /></button>
              </div>
            ))}
            {picks.length < 3 && (
              <select className="st-input" value="" onChange={(e) => e.target.value && setPicks([...picks, e.target.value])} aria-label="Add to New this month">
                <option value="">+ Add a piece</option>
                {pieces.filter((p) => !picks.some((r) => r.endsWith(p.id))).map((p) => <option key={p.id} value={`${p.kind === "devotional" ? "d" : "c"}:${p.id}`}>{KIND_LABEL[p.kind]} · {p.title}</option>)}
              </select>
            )}
          </section>
          <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <h2 className="st-h2" style={{ gridColumn: "1 / -1" }}>Series</h2>
            <label className="st-field"><span className="st-label">This month’s series</span>
              <select className="st-input" value={seriesFor(thisM)} onChange={(e) => setSeriesMonth(e.target.value, thisM)}><option value="">None</option>{series.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
            <label className="st-field"><span className="st-label">Next series</span>
              <select className="st-input" value={seriesFor(nextM)} onChange={(e) => setSeriesMonth(e.target.value, nextM)}><option value="">None</option>{series.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
          </section>
          <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <h2 className="st-h2">Homepage lines</h2>
            {COPY_FIELDS.map((f) => <CopyField key={f.key + (copyQ.dataUpdatedAt ? "" : "x")} label={f.label} value={copy[f.key] ?? ""} onSave={(v) => save(f.key, v)} />)}
            <NewsletterPhoto url={copy["newsletter_image_url"] ?? ""} onSave={(v) => save("newsletter_image_url", v)} />
          </section>
        </div>
        <aside style={{ flex: "0 0 380px", position: "sticky", top: 96, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h3 className="st-h3" style={{ margin: 0 }}>Live preview</h3><Btn sm onClick={() => setFrameKey((k) => k + 1)}><RefreshCw size={13} strokeWidth={1.7} />Refresh</Btn></div>
          <MiniFrame key={frameKey} />
        </aside>
      </div>
    </>
  );
}

function MiniFrame() {
  const scale = 380 / 1000;
  return (
    <div style={{ width: 380, height: 1800 * scale, overflow: "hidden", border: `1px solid ${C.LINE}`, borderRadius: 12, position: "relative", background: "#fff" }}>
      <iframe src={`/?feed=1&viewer=out&at=${encodeURIComponent(new Date().toISOString())}`} title="Homepage preview" style={{ width: 1000, height: 1800, border: 0, transform: `scale(${scale})`, transformOrigin: "0 0", position: "absolute", top: 0, left: 0 }} />
    </div>
  );
}

function CopyField({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <label className="st-field"><span className="st-label">{label}</span>
      <input className="st-input" value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== value && onSave(v)} placeholder="[Not set]" />
    </label>
  );
}

function NewsletterPhoto({ url, onSave }: { url: string; onSave: (v: string) => void }) {
  const ref = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="st-field"><span className="st-label">Newsletter photo</span>
      <input ref={ref} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; setBusy(true); try { onSave(await uploadStudioPhoto(f)); } catch (er: any) { toast.error(er?.message ?? "Upload failed"); } finally { setBusy(false); } }} />
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <span style={{ width: 120, aspectRatio: "4 / 3", borderRadius: 8, background: "#E9E6DF", overflow: "hidden", position: "relative" }}>{url && <img src={url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}</span>
        <Btn sm onClick={() => ref.current?.click()} disabled={busy}><Plus size={13} strokeWidth={1.7} />{busy ? "Uploading…" : url ? "Replace" : "Upload"}</Btn>
        {url && <Btn sm className="danger" onClick={() => onSave("")}>Remove</Btn>}
      </div>
    </div>
  );
}
