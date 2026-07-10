import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/collections/")({
  component: AdminCollectionsList,
});

const CSS = `
.cl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;margin-top:16px;}
.cl-card{background:#fff;border:1px solid rgba(20,20,20,0.06);border-radius:14px;padding:20px;text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:8px;text-decoration:none;color:inherit;transition:transform .1s ease;}
.cl-card:hover{transform:translateY(-1px);border-color:rgba(20,20,20,0.14);}
.cl-card .cover{height:120px;border-radius:10px;background:#FBF8ED center/cover no-repeat;border:1px solid rgba(20,20,20,0.06);margin-bottom:6px;}
.cl-card h3{font-size:15px;font-weight:800;color:#181A4D;margin:0;letter-spacing:-0.01em;}
.cl-card p{font-size:12.5px;color:#8a8678;margin:0;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.cl-card .meta{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:auto;padding-top:8px;}
.cl-status{font-size:9.5px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;padding:3px 9px;border-radius:12px;}
.cl-status.draft{background:#FBF8ED;color:#8a8678;border:1px solid rgba(20,20,20,0.1);}
.cl-status.published{background:#DCE07A;color:#181A4D;}
.cl-count{font-size:11.5px;color:#8a8678;font-weight:600;}
.cl-head{display:flex;flex-wrap:wrap;gap:14px;align-items:center;justify-content:space-between;margin-bottom:16px;}
`;

function AdminCollectionsList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const collectionsQ = useQuery({
    queryKey: ["admin-collections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("id,title,description,description_md,cover_image_url,banner_url,status,slug,updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const countsQ = useQuery({
    queryKey: ["admin-collection-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("collection_items").select("collection_id");
      if (error) throw error;
      const m: Record<string, number> = {};
      (data ?? []).forEach((r: any) => { m[r.collection_id] = (m[r.collection_id] ?? 0) + 1; });
      return m;
    },
  });

  const filtered = useMemo(() => {
    const list = collectionsQ.data ?? [];
    if (!q.trim()) return list;
    return list.filter((c: any) => c.title.toLowerCase().includes(q.toLowerCase()));
  }, [collectionsQ.data, q]);

  const counts = countsQ.data ?? {};

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="cl-head">
        <div>
          <h1 className="ad-h1">Collections</h1>
          <p className="ad-sub">Group teachings, essays, podcasts, blogs, and devotionals into a curated set.</p>
        </div>
        <Link to="/admin/collections/new" className="ad-btn">+ New collection</Link>
      </div>

      <div className="acl-filters" style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", background: "#fff", padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(20,20,20,0.06)" }}>
        <input placeholder="Search by title…" value={q} onChange={(e) => setQ(e.target.value)}
          style={{ fontFamily: "Poppins", fontSize: 12.5, padding: "8px 12px", border: "1px solid rgba(20,20,20,0.12)", borderRadius: 8, background: "#fff", color: "#20201c", minWidth: 200 }}
        />
        <span style={{ fontSize: 12, color: "#8a8678", marginLeft: "auto" }}>{filtered.length} collection{filtered.length === 1 ? "" : "s"}</span>
      </div>

      {collectionsQ.isLoading ? (
        <div className="ad-empty">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="ad-empty">
          <strong>No collections yet</strong>
          Create your first collection to group content together.
        </div>
      ) : (
        <div className="cl-grid">
          {filtered.map((c: any) => {
            const cover = c.cover_image_url || c.banner_url;
            const desc = c.description || c.description_md || "";
            return (
              <Link key={c.id} to="/admin/collections/$id" params={{ id: c.id }} className="cl-card">
                <div className="cover" style={cover ? { backgroundImage: `url(${cover})` } : undefined} />
                <h3>{c.title}</h3>
                {desc && <p>{desc}</p>}
                <div className="meta">
                  <span className={`cl-status ${c.status}`}>{c.status}</span>
                  <span className="cl-count">· {counts[c.id] ?? 0} item{(counts[c.id] ?? 0) === 1 ? "" : "s"}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
