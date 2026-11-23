import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Eye, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StudioGate } from "@/components/studio/shell";
import { STUDIO_CSS, Segmented, C } from "@/components/studio/ui";
import { useStudioData, KIND_LABEL, useInvalidateStudio } from "@/lib/studio-data";
import { isReady } from "@/lib/studio-checklist";
import { etToUtcISO, utcToEt, ET_ZONE } from "@/lib/et-time";
import { ShareButton, publicHref } from "@/components/studio/ShareButton";

export const Route = createFileRoute("/studio_/preview/$id")({
  ssr: false,
  component: () => <StudioGate><StagedPreview /></StudioGate>,
  head: () => ({ meta: [{ title: "Staged preview — CoCreate Studio" }, { name: "description", content: "See the site as it will look on release day." }, { property: "og:title", content: "Staged preview — CoCreate Studio" }, { property: "og:description", content: "See the site as it will look on release day." }, { name: "robots", content: "noindex,nofollow" }] }),
});

type TabKey = "piece" | "series" | "home" | "newsletter";

function ScaledFrame({ src, baseWidth, height, label, phone }: { src: string; baseWidth: number; height: number; label: string; phone?: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(phone ? 250 : 800);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el); setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const scale = w / baseWidth;
  const frame = (
    <div ref={ref} style={{ position: "relative", width: "100%", height: height * scale, overflow: "hidden", background: "#fff" }}>
      <iframe key={src} src={src} title={label} style={{ position: "absolute", left: 0, top: 0, width: baseWidth, height, border: 0, transform: `scale(${scale})`, transformOrigin: "0 0" }} />
    </div>
  );
  if (phone) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, flex: "0 0 270px" }}>
      <div style={{ width: 270, border: "10px solid #1C1D2E", borderRadius: 36, overflow: "hidden", boxSizing: "border-box", background: "#fff" }}>{frame}</div>
      <span style={{ fontSize: 12.5, color: C.MUTED }}>Mobile</span>
    </div>
  );
  return (
    <div style={{ flex: 1, minWidth: 0, border: `1px solid ${C.LINE}`, borderRadius: 12, overflow: "hidden", boxShadow: "0 12px 32px rgba(24,26,77,.08)", background: "#fff" }}>
      <div style={{ height: 38, background: "#F0EEE9", display: "flex", alignItems: "center", gap: 6, padding: "0 12px" }}>
        {[0, 1, 2].map((i) => <span key={i} style={{ width: 10, height: 10, borderRadius: 99, background: "#D9D6CE" }} />)}
        <span style={{ marginLeft: 12, flex: 1, maxWidth: 320, height: 24, borderRadius: 99, background: "#fff", fontSize: 12, color: C.MUTED, display: "flex", alignItems: "center", padding: "0 12px" }}>justcocreate.com</span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: C.MUTED }}>Desktop</span>
      </div>
      {frame}
    </div>
  );
}

function StagedPreview() {
  const { id } = Route.useParams();
  const studio = useStudioData();
  const invalidate = useInvalidateStudio();
  const piece = studio.data?.pieces.find((p) => p.id === id) ?? null;
  const series = piece?.seriesId ? studio.data?.series.find((s) => s.id === piece.seriesId) ?? null : null;
  const [tab, setTab] = useState<TabKey>("home");
  const [viewer, setViewer] = useState<"out" | "in">("out");
  const [at, setAt] = useState<string | null>(null);
  useEffect(() => { if (piece && !at) setAt(piece.releaseAt ?? new Date().toISOString()); }, [piece, at]);
  const et = at ? utcToEt(at) : { date: "", time: "" };
  const atLabel = at ? `${new Date(at).toLocaleDateString("en-US", { timeZone: ET_ZONE, weekday: "short", month: "short", day: "numeric" })} · ${new Date(at).toLocaleTimeString("en-US", { timeZone: ET_ZONE, hour: "numeric", minute: "2-digit" }).toLowerCase()}` : "";
  const golive = piece?.releaseAt ? new Date(piece.releaseAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
  const qs = useMemo(() => at ? `at=${encodeURIComponent(at)}&stage=${id}&viewer=${viewer}${golive ? `&golive=${encodeURIComponent(golive)}` : ""}` : "", [at, id, viewer, golive]);

  const src = (() => {
    if (!piece || !at) return null;
    if (tab === "piece") return `${publicHref(piece.kind, piece.id, piece.slug)}${publicHref(piece.kind, piece.id, piece.slug).includes("?") ? "&" : "?"}${qs}`;
    if (tab === "series") return series ? `/collections/${series.slug}?${qs}` : null;
    if (tab === "home") return `/?feed=1&${qs}`;
    return null;
  })();

  const schedule = async () => {
    if (!piece) return;
    const table = piece.kind === "devotional" ? "devotional_templates" : "content_items";
    const { error } = await (supabase.from as any)(table).update({ status: "published" }).eq("id", piece.id);
    if (error) toast.error(error.message); else { toast.success("Scheduled"); invalidate(); }
  };
  const pillSel = { background: "rgba(255,255,255,.12)", color: "#fff", border: 0, borderRadius: 999, minHeight: 36, padding: "0 12px", fontSize: 13.5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 8 } as const;

  return (
    <div className="st-root" style={{ flexDirection: "column", background: C.SBG }}>
      <style dangerouslySetInnerHTML={{ __html: STUDIO_CSS + ".st-root .pv-in{background:transparent;border:0;color:#fff;font:inherit;font-size:13.5px;font-weight:600;outline:none;color-scheme:dark;} .st-root .pv-in option{color:#181A4D}" }} />
      <header style={{ background: C.INK, minHeight: 64, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div className="st-row" style={{ gap: 14, flexWrap: "wrap" }}>
          <Link to="/studio/pieces/$id" params={{ id }} style={{ color: "#fff", fontSize: 13.5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}><ArrowLeft size={15} strokeWidth={1.7} />Back to editing</Link>
          <span style={{ width: 1, height: 22, background: "rgba(255,255,255,.25)" }} />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#C9CBE6", fontSize: 13.5 }}><Eye size={16} strokeWidth={1.7} color="#fff" /><b style={{ color: "#fff" }}>Staged preview</b>· the site as it will look on</span>
          <label style={pillSel}><Calendar size={15} strokeWidth={1.7} />
            <input className="pv-in" type="date" value={et.date} onChange={(e) => e.target.value && setAt(etToUtcISO(e.target.value, et.time || "09:00"))} aria-label="Preview date" />
            <input className="pv-in" type="time" value={et.time} onChange={(e) => et.date && setAt(etToUtcISO(et.date, e.target.value || "09:00"))} aria-label="Preview time (ET)" style={{ width: 96 }} />
          </label>
          <label style={pillSel}>
            <select className="pv-in" value={viewer} onChange={(e) => setViewer(e.target.value as any)} aria-label="Viewer"><option value="out">Signed out reader</option><option value="in">Signed in reader</option></select>
          </label>
        </div>
        <div className="st-row" style={{ gap: 10 }}>
          {piece && <ShareButton table={piece.kind === "devotional" ? "devotional" : "content"} id={id} variant="dark" />}
          {piece && piece.status === "draft" && (
            <button type="button" className="st-btn" style={{ background: "#fff", color: C.INK, borderColor: "#fff" }} disabled={!isReady(piece.checks)} title={isReady(piece.checks) ? undefined : "Finish the checklist first"} onClick={schedule}>
              Schedule{golive ? ` for ${golive}` : ""}
            </button>
          )}
        </div>
      </header>
      <div style={{ padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Segmented value={tab} onChange={setTab} options={[{ value: "piece", label: piece?.kind === "devotional" ? "This devotional" : piece?.kind === "essay" || piece?.kind === "blog" ? "This article" : "This piece" }, { value: "series", label: "Series page" }, { value: "home", label: "Homepage" }, { value: "newsletter", label: "In the newsletter" }]} />
        <span style={{ fontSize: 13, color: C.MUTED }}>Highlighted: where this piece lands{at ? ` · ${atLabel} ET` : ""}</span>
      </div>
      <div style={{ padding: "0 24px 32px", display: "flex", gap: 24, alignItems: "flex-start" }}>
        {!piece ? <div className="st-empty" style={{ flex: 1 }}>{studio.isLoading ? "Loading…" : <b>Piece not found</b>}</div>
          : tab === "newsletter" ? <Newsletter at={at} stageId={id} />
          : !src ? <div className="st-empty" style={{ flex: 1 }}><b>Not in a series</b>Add this piece to a series to preview its series page.</div>
          : <><ScaledFrame src={src} baseWidth={1000} height={1500} label="Desktop preview" /><ScaledFrame src={src} baseWidth={390} height={844} label="Mobile preview" phone /></>}
      </div>
    </div>
  );
}

function Newsletter({ at, stageId }: { at: string | null; stageId: string }) {
  const studio = useStudioData();
  const [copy, setCopy] = useState<Record<string, string>>({});
  useEffect(() => { supabase.from("page_content").select("field_key, field_value").eq("page_key", "home").then(({ data }) => { const m: Record<string, string> = {}; for (const r of data ?? []) m[r.field_key] = r.field_value ?? ""; setCopy(m); }); }, []);
  if (!at || !studio.data) return null;
  const d = new Date(at);
  const key = d.toLocaleDateString("en-CA", { timeZone: ET_ZONE }).slice(0, 7);
  const items = studio.data.pieces.filter((p) => p.releaseAt && new Date(p.releaseAt).toLocaleDateString("en-CA", { timeZone: ET_ZONE }).slice(0, 7) === key && (p.status !== "draft" || p.id === stageId))
    .sort((a, b) => a.releaseAt!.localeCompare(b.releaseAt!));
  return (
    <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
      <div style={{ width: 600, maxWidth: "100%", background: "#fff", border: `1px solid ${C.LINE}`, borderRadius: 12, padding: 32, display: "flex", flexDirection: "column", gap: 18 }}>
        <span style={{ fontSize: 12, color: C.MUTED }}>From: CoCreate · Subject: {copy.newsletter_headline || "[Newsletter subject]"}</span>
        <span style={{ fontFamily: "Poppins", fontSize: 20, fontWeight: 900, color: C.INK }}>CoCreate</span>
        <span style={{ fontFamily: "Poppins", fontSize: 24, fontWeight: 600, color: C.INK }}>{d.toLocaleDateString("en-US", { timeZone: ET_ZONE, month: "long", year: "numeric" })}</span>
        {copy.newsletter_subline ? <span style={{ fontSize: 15, color: C.MUTED }}>{copy.newsletter_subline}</span> : null}
        {items.length === 0 && <span className="st-help">No releases this month yet.</span>}
        {items.map((p) => (
          <div key={p.id} style={{ display: "flex", gap: 14, alignItems: "flex-start", position: "relative", outline: p.id === stageId ? `3px solid ${C.INK}` : undefined, outlineOffset: 3, borderRadius: 8 }}>
            {p.id === stageId && p.releaseAt && <span style={{ position: "absolute", top: -12, left: 6, background: C.INK, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99 }}>Goes live {new Date(p.releaseAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
            <span style={{ width: 120, aspectRatio: "4 / 3", borderRadius: 6, background: "#E9E6DF", overflow: "hidden", flex: "none", position: "relative" }}>{p.photo && <img src={p.photo} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: p.fd || "center" }} />}</span>
            <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: C.MUTED }}>{KIND_LABEL[p.kind]} · {new Date(p.releaseAt!).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
              <span style={{ fontFamily: "Poppins", fontSize: 16, fontWeight: 600, color: C.INK }}>{p.title}</span>
              {p.summary && <span style={{ fontSize: 13.5, color: C.MUTED }}>{p.summary}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
