import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/admin/content")({
  component: AdminContentList,
});

function formatCountdown(ms: number): string {
  if (ms <= 0) return "now";
  const m = Math.floor(ms / 60000);
  if (m < 60) return `in ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `in ${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `in ${d}d ${h % 24}h`;
}

type Row = Database["public"]["Tables"]["content_items"]["Row"] & { _kind: "content" };
type TplRow = Database["public"]["Tables"]["devotional_templates"]["Row"] & { _kind: "template" };
type AnyRow = Row | TplRow;

const KIND_LABEL: Record<string, { label: string; bg: string; fg: string }> = {
  teaching:   { label: "Teaching",   bg: "#FFAE00", fg: "#181A4D" },
  essay:      { label: "Essay",      bg: "#DCE07A", fg: "#181A4D" },
  podcast:    { label: "Podcast",    bg: "#0F4A42", fg: "#FBF8ED" },
  blog:       { label: "Blog",       bg: "#DCE07A", fg: "#181A4D" },
  devotional: { label: "Devotional", bg: "#CAC307", fg: "#181A4D" },
};

const PAGE_CSS = `
.acl-row{display:grid;grid-template-columns:1fr auto;gap:16px;align-items:center;padding:16px;background:#fff;border:1px solid rgba(20,20,20,0.06);border-radius:12px;margin-bottom:10px;}
.acl-row .meta{display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:11px;color:#8a8678;margin-top:6px;}
.acl-row .badge{font-size:9.5px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;padding:3px 9px;border-radius:12px;}
.acl-row h3{font-size:15px;font-weight:800;color:#181A4D;margin:0;letter-spacing:-0.01em;}
.acl-row .actions{display:flex;gap:6px;flex-shrink:0;}
.acl-filters{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:20px;align-items:center;background:#fff;padding:14px 16px;border-radius:12px;border:1px solid rgba(20,20,20,0.06);}
.acl-filters input, .acl-filters select{font-family:'Poppins';font-size:12.5px;padding:8px 12px;border:1px solid rgba(20,20,20,0.12);border-radius:8px;background:#fff;color:#20201c;min-width:120px;}
.acl-filters input:focus, .acl-filters select:focus{outline:none;border-color:#181A4D;}
.acl-status{font-size:9.5px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;padding:3px 9px;border-radius:12px;}
.acl-status.draft{background:#FBF8ED;color:#8a8678;border:1px solid rgba(20,20,20,0.1);}
.acl-status.published{background:#DCE07A;color:#181A4D;}
.acl-confirm{background:rgba(0,0,0,0.4);position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:100;padding:20px;}
.acl-confirm .box{background:#fff;border-radius:14px;padding:26px;max-width:420px;width:100%;}
.acl-confirm h3{color:#181A4D;font-weight:800;margin:0 0 8px;}
.acl-confirm p{color:#8a8678;font-size:13.5px;margin:0 0 20px;line-height:1.55;}
.acl-confirm .row{display:flex;gap:8px;justify-content:flex-end;}
.acl-head{display:flex;flex-wrap:wrap;gap:14px;align-items:center;justify-content:space-between;margin-bottom:20px;}
`;

function AdminContentList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("all");
  const [topic, setTopic] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [confirmDelete, setConfirmDelete] = useState<AnyRow | null>(null);

  const topicsQ = useQuery({
    queryKey: ["admin-topics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("topics").select("id,name,slug").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const contentQ = useQuery({
    queryKey: ["admin-content"],
    queryFn: async () => {
      const { data, error } = await supabase.from("content_items").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({ ...r, _kind: "content" as const }));
    },
  });

  const templatesQ = useQuery({
    queryKey: ["admin-templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("devotional_templates").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({ ...r, _kind: "template" as const }));
    },
  });

  const del = useMutation({
    mutationFn: async (r: AnyRow) => {
      if (r._kind === "content") {
        const { error } = await supabase.from("content_items").delete().eq("id", r.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("devotional_templates").delete().eq("id", r.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-content"] });
      qc.invalidateQueries({ queryKey: ["admin-templates"] });
      setConfirmDelete(null);
    },
  });

  const togglePublish = useMutation({
    mutationFn: async (r: AnyRow) => {
      const next = r.status === "published" ? "draft" : "published";
      if (r._kind === "content") {
        const update: Database["public"]["Tables"]["content_items"]["Update"] = { status: next };
        if (next === "published" && !r.published_at) update.published_at = new Date().toISOString();
        const { error } = await supabase.from("content_items").update(update).eq("id", r.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("devotional_templates").update({ status: next }).eq("id", r.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-content"] });
      qc.invalidateQueries({ queryKey: ["admin-templates"] });
    },
  });

  const topicMap = useMemo(() => {
    const m: Record<string, string> = {};
    (topicsQ.data ?? []).forEach((t) => { m[t.id] = t.name; });
    return m;
  }, [topicsQ.data]);

  const all: AnyRow[] = useMemo(() => {
    const list: AnyRow[] = [];
    (contentQ.data ?? []).forEach((r) => list.push(r as Row));
    (templatesQ.data ?? []).forEach((r) => list.push(r as TplRow));
    return list.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
  }, [contentQ.data, templatesQ.data]);

  const now = Date.now();
  const isScheduled = (r: AnyRow) => {
    const s = (r as any).scheduled_at as string | null | undefined;
    return !!s && new Date(s).getTime() > now;
  };

  const filtered = useMemo(() => all.filter((r) => {
    const kind = r._kind === "template" ? "devotional" : r.type;
    if (type !== "all" && kind !== type) return false;
    if (topic !== "all" && r.topic_id !== topic) return false;
    if (status === "scheduled") { if (!isScheduled(r)) return false; }
    else if (status !== "all" && r.status !== status) return false;
    if (q && !r.title.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [all, q, type, topic, status]);

  const loading = contentQ.isLoading || templatesQ.isLoading;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />
      <div className="acl-head">
        <div>
          <h1 className="ad-h1">Content</h1>
          <p className="ad-sub">All essays, teachings, podcasts, and devotional templates. Drafts stay hidden from the public until you publish them.</p>
        </div>
        <Link to="/admin/new" className="ad-btn">+ New content</Link>
      </div>

      <div className="acl-filters">
        <input placeholder="Search by title…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">All types</option>
          <option value="teaching">Teaching</option>
          <option value="essay">Essay</option>
          <option value="podcast">Podcast</option>
          <option value="blog">Blog</option>
          <option value="devotional">Devotional</option>
        </select>
        <select value={topic} onChange={(e) => setTopic(e.target.value)}>
          <option value="all">All topics</option>
          {(topicsQ.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="scheduled">Scheduled</option>
          <option value="draft">Draft</option>
        </select>
        <span style={{ fontSize: 12, color: "#8a8678", marginLeft: "auto" }}>{filtered.length} item{filtered.length === 1 ? "" : "s"}</span>
      </div>

      {loading ? (
        <div className="ad-empty">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="ad-empty">
          <strong>Nothing matches those filters</strong>
          Try clearing them, or add your first piece of content.
        </div>
      ) : (
        filtered.map((r) => {
          const kind = r._kind === "template" ? "devotional" : r.type;
          const meta = KIND_LABEL[kind] ?? KIND_LABEL.essay;
          const scheduledAt = (r as any).scheduled_at as string | null | undefined;
          const scheduled = scheduledAt && new Date(scheduledAt).getTime() > now ? new Date(scheduledAt) : null;
          return (
            <div key={`${r._kind}-${r.id}`} className="acl-row">
              <div>
                <h3>{r.title}</h3>
                <div className="meta">
                  <span className="badge" style={{ background: meta.bg, color: meta.fg }}>{meta.label}</span>
                  {scheduled ? (
                    <span className="acl-status" style={{ background: "#FFAE00", color: "#181A4D" }}>scheduled</span>
                  ) : (
                    <span className={`acl-status ${r.status}`}>{r.status}</span>
                  )}
                  {scheduled && (
                    <span>· {scheduled.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} ({formatCountdown(scheduled.getTime() - now)})</span>
                  )}
                  {r.topic_id && <span>· {topicMap[r.topic_id] ?? "Topic"}</span>}
                  <span>· Updated {new Date(r.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="actions">
                <button className="ad-btn ghost sm" onClick={() => togglePublish.mutate(r)} disabled={togglePublish.isPending}>
                  {r.status === "published" ? "Unpublish" : "Publish"}
                </button>
                <button className="ad-btn ghost sm" onClick={() => navigate({ to: "/admin/edit/$id", params: { id: r.id }, search: { kind: r._kind } })}>Edit</button>
                <button className="ad-btn danger sm" onClick={() => setConfirmDelete(r)}>Delete</button>
              </div>
            </div>
          );
        })
      )}

      {confirmDelete && (
        <div className="acl-confirm" onClick={() => setConfirmDelete(null)}>
          <div className="box" onClick={(e) => e.stopPropagation()}>
            <h3>Delete "{confirmDelete.title}"?</h3>
            <p>This permanently removes the {confirmDelete._kind === "template" ? "devotional template" : "content item"}. Any saved copies or notes that reference it will be detached. This can't be undone.</p>
            <div className="row">
              <button className="ad-btn ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="ad-btn danger" onClick={() => del.mutate(confirmDelete)} disabled={del.isPending}>
                {del.isPending ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
