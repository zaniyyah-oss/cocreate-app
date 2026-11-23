import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TopBar, Segmented, C } from "@/components/studio/ui";
import { publicHref } from "@/components/studio/ShareButton";

type Tab = "review" | "hidden" | "all";
export const Route = createFileRoute("/studio/comments")({
  validateSearch: (s: Record<string, unknown>): { piece?: string } => (typeof s.piece === "string" && /^[0-9a-f-]{36}$/i.test(s.piece) ? { piece: s.piece } : {}),
  component: CommentsPage,
  head: () => ({ meta: [{ title: "Comments — CoCreate Studio" }, { name: "description", content: "Review and moderate reader comments." }, { property: "og:title", content: "Comments — CoCreate Studio" }, { property: "og:description", content: "Review and moderate reader comments." }] }),
});

const REASON: Record<string, string> = { unkind: "Unkind", off_topic: "Off-topic", spam: "Spam", other: "Other" };
type CRow = { id: string; body: string; author_name: string | null; created_at: string; flag_count: number; hidden_at: string | null; hidden_by: string | null; reviewed_at: string | null; content_id: string | null; template_id: string | null; day_number: number | null; parent_id: string | null };

function CommentsPage() {
  const { piece } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("review");
  const [confirm, setConfirm] = useState<CRow | null>(null);
  const q = useQuery({
    queryKey: ["studio-comments"],
    queryFn: async () => {
      const { data } = await (supabase.from as any)("comments").select("id, body, author_name, created_at, flag_count, hidden_at, hidden_by, reviewed_at, content_id, template_id, day_number, parent_id").order("created_at", { ascending: false }).limit(1000);
      const rows = (data ?? []) as CRow[];
      const cids = [...new Set(rows.map((r) => r.content_id).filter(Boolean))] as string[];
      const tids = [...new Set(rows.map((r) => r.template_id).filter(Boolean))] as string[];
      const [c, t, f] = await Promise.all([
        cids.length ? supabase.from("content_items").select("id, title, type, slug").in("id", cids) : Promise.resolve({ data: [] as any[] }),
        tids.length ? supabase.from("devotional_templates").select("id, title").in("id", tids) : Promise.resolve({ data: [] as any[] }),
        (supabase.from as any)("comment_flags").select("comment_id, reason"),
      ]);
      const pieces = new Map<string, { title: string; type: string; slug: string | null }>();
      for (const x of (c.data ?? []) as any[]) pieces.set(x.id, { title: x.title, type: x.type, slug: x.slug });
      for (const x of (t.data ?? []) as any[]) pieces.set(x.id, { title: x.title, type: "devotional", slug: null });
      const reasons = new Map<string, string[]>();
      for (const x of (f.data ?? []) as any[]) reasons.set(x.comment_id, [...(reasons.get(x.comment_id) ?? []), x.reason ? REASON[x.reason] ?? x.reason : "No reason"]);
      return { rows, pieces, reasons };
    },
  });
  const thQ = useQuery({ queryKey: ["comment-threshold"], queryFn: async () => {
    const { data } = await (supabase.from as any)("site_settings").select("value").eq("key", "comment_flag_threshold").maybeSingle();
    return Number(data?.value ?? 3) || 3;
  } });
  const [th, setTh] = useState(3);
  useEffect(() => { if (thQ.data) setTh(thQ.data); }, [thQ.data]);

  const refresh = () => { qc.invalidateQueries({ queryKey: ["studio-comments"] }); qc.invalidateQueries({ queryKey: ["comments-review-count"] }); qc.invalidateQueries({ queryKey: ["comments"] }); };
  const needs = (r: CRow) => !r.reviewed_at && (r.flag_count > 0 || r.hidden_by === "auto");
  const rows = (q.data?.rows ?? []).filter((r) => !piece || r.content_id === piece || r.template_id === piece);
  const lists = { review: rows.filter(needs), hidden: rows.filter((r) => r.hidden_at), all: rows };
  const shown = lists[tab];
  const pieceOptions = useMemo(() => [...(q.data?.pieces.entries() ?? [])].sort((a, b) => a[1].title.localeCompare(b[1].title)), [q.data]);

  const keep = async (r: CRow) => {
    await (supabase.from as any)("comment_flags").delete().eq("comment_id", r.id);
    const { error } = await (supabase.from as any)("comments").update({ hidden_at: null, hidden_by: null, reviewed_at: new Date().toISOString(), flag_count: 0 }).eq("id", r.id);
    if (error) toast.error(error.message); else { toast.success("Kept visible"); refresh(); }
  };
  const hide = async (r: CRow) => {
    const { error } = await (supabase.from as any)("comments").update({ hidden_at: new Date().toISOString(), hidden_by: "admin", reviewed_at: new Date().toISOString() }).eq("id", r.id);
    if (error) toast.error(error.message); else { toast.success("Hidden"); refresh(); }
  };
  const del = async (r: CRow) => {
    const { error } = await (supabase.from as any)("comments").delete().eq("id", r.id);
    setConfirm(null);
    if (error) toast.error(error.message); else { toast.success("Deleted"); refresh(); }
  };
  const saveTh = async () => {
    const v = Math.min(Math.max(Math.round(th), 1), 50);
    const { error } = await (supabase.from as any)("site_settings").upsert({ key: "comment_flag_threshold", value: v, updated_at: new Date().toISOString() });
    if (error) toast.error(error.message); else { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["comment-threshold"] }); }
  };
  const linkFor = (r: CRow) => {
    const p = (r.content_id && q.data?.pieces.get(r.content_id)) || (r.template_id && q.data?.pieces.get(r.template_id));
    if (!p) return null;
    const href = r.template_id ? `/devotionals/${r.template_id}/day/${r.day_number}` : publicHref(p.type, r.content_id!, p.slug);
    return { title: p.title + (r.template_id ? ` · Day ${r.day_number}` : ""), href: `${href}#comment-${r.id}` };
  };

  return (
    <>
      <TopBar left={<h1>Comments</h1>} />
      <div style={{ padding: 28, display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <Segmented value={tab} onChange={setTab} options={[{ value: "review", label: `Needs review (${lists.review.length})` }, { value: "hidden", label: "Hidden" }, { value: "all", label: "All" }]} />
            <select className="st-input" style={{ width: 260 }} aria-label="Filter by piece" value={piece ?? ""} onChange={(e) => navigate({ to: "/studio/comments", search: e.target.value ? { piece: e.target.value } : {} })}>
              <option value="">All pieces</option>
              {pieceOptions.map(([id, p]) => <option key={id} value={id}>{p.title}</option>)}
            </select>
          </div>
          {q.isLoading ? <div className="st-empty">Loading…</div> : shown.length === 0 ? (
            <div className="st-empty"><b>{tab === "review" ? "Nothing to review" : tab === "hidden" ? "No hidden comments" : "No comments yet"}</b></div>
          ) : (
            <div style={{ background: "#fff", border: `1px solid ${C.LINE}`, borderRadius: 12 }}>
              {shown.map((r, i) => {
                const l = linkFor(r);
                const rs = q.data?.reasons.get(r.id) ?? [];
                return (
                  <div key={r.id} style={{ padding: "16px 18px", borderTop: i ? `1px solid ${C.LINE}` : 0, display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 260 }}>
                      <div style={{ fontSize: 13, color: C.MUTED }}>
                        {l ? <a href={l.href} target="_blank" rel="noreferrer" style={{ color: C.INK, fontWeight: 600 }}>{l.title}</a> : "Removed piece"} · {r.author_name || "Reader"} · {new Date(r.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}{r.parent_id ? " · reply" : ""}
                      </div>
                      <div style={{ fontSize: 14.5, color: "#2A2B33", marginTop: 6, whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{r.body}</div>
                      <div style={{ fontSize: 12.5, color: r.flag_count ? "#9A2A2A" : C.MUTED, marginTop: 6, fontWeight: 600 }}>
                        {r.flag_count ? `${r.flag_count} ${r.flag_count === 1 ? "flag" : "flags"}${rs.length ? ` · ${[...new Set(rs)].join(", ")}` : ""}` : "No flags"}
                        {r.hidden_at ? ` · Hidden${r.hidden_by === "auto" ? " automatically" : ""}` : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" className="st-btn sm" onClick={() => keep(r)}>Keep visible</button>
                      {!r.hidden_at && <button type="button" className="st-btn sm" onClick={() => hide(r)}>Hide</button>}
                      <button type="button" className="st-btn sm danger" onClick={() => setConfirm(r)}>Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div style={{ width: 280, background: "#fff", border: `1px solid ${C.LINE}`, borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.INK, marginBottom: 10 }}>Settings</div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: C.INK }}>Auto-hide after
            <input type="number" min={1} max={50} className="st-input" style={{ width: 64 }} value={th} onChange={(e) => setTh(Number(e.target.value))} aria-label="Flags before auto-hide" /> flags
          </label>
          <button type="button" className="st-btn sm primary" style={{ marginTop: 12 }} disabled={th === thQ.data} onClick={saveTh}>Save</button>
          <div style={{ marginTop: 14 }}><Link to="/studio" style={{ fontSize: 12.5, color: C.MUTED }}>Back to Releases</Link></div>
        </div>
      </div>
      {confirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,14,36,.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} role="dialog" aria-modal="true" aria-label="Delete comment">
          <div style={{ background: "#fff", borderRadius: 12, padding: 22, width: 360 }}>
            <div style={{ fontFamily: "Poppins", fontSize: 17, fontWeight: 600, color: C.INK }}>Delete this comment?</div>
            <p style={{ fontSize: 14, color: C.MUTED, margin: "8px 0 18px" }}>This removes it and any replies. It can’t be undone.</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><button type="button" className="st-btn" onClick={() => setConfirm(null)}>Cancel</button><button type="button" className="st-btn primary" style={{ background: "#9A2A2A", borderColor: "#9A2A2A" }} onClick={() => del(confirm)}>Delete</button></div>
          </div>
        </div>
      )}
    </>
  );
}
