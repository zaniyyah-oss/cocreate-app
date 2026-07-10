import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ColorSwatches } from "@/components/admin/color-swatches";
import type { BrandColorKey } from "@/lib/brand-palette";

export type CollectionRow = {
  id: string;
  title: string;
  description: string | null;
  description_md: string | null;
  cover_image_url: string | null;
  banner_url: string | null;
  status: "draft" | "published";
  slug: string;
  tag_color?: string | null;
};

type ItemRow = {
  id: string;
  collection_id: string;
  content_id: string | null;
  template_id: string | null;
  position: number;
  layout_slot: string;
};

type ResolvedItem = ItemRow & {
  title: string;
  kind: "teaching" | "essay" | "podcast" | "blog" | "devotional";
  status: string;
};

const CSS = `
.cf-form{background:#fff;border:1px solid rgba(20,20,20,0.06);border-radius:14px;padding:26px;margin-top:16px;max-width:820px;}
.cf-form label{display:block;font-size:11.5px;font-weight:800;color:#181A4D;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:6px;}
.cf-form input, .cf-form textarea{width:100%;padding:11px 14px;border:1px solid rgba(20,20,20,0.14);border-radius:9px;font-family:'Poppins';font-size:13.5px;background:#fff;color:#20201c;box-sizing:border-box;}
.cf-form textarea{resize:vertical;min-height:100px;line-height:1.55;}
.cf-form input:focus, .cf-form textarea:focus{outline:none;border-color:#181A4D;}
.cf-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:24px;padding-top:20px;border-top:1px solid rgba(20,20,20,0.08);flex-wrap:wrap;align-items:center;}
.cf-err{background:#FFF0EC;color:#8f2600;border-left:3px solid #FF340C;padding:10px 14px;border-radius:8px;font-size:12.5px;margin-top:12px;}
.cf-note{font-size:11.5px;color:#8a8678;margin-top:6px;}
.cf-cover{display:flex;gap:12px;align-items:center;}
.cf-cover img{width:160px;height:100px;object-fit:cover;border-radius:8px;border:1px solid rgba(20,20,20,0.08);}
.ci-list{margin-top:16px;display:flex;flex-direction:column;gap:8px;}
.ci-row{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;padding:12px 14px;background:#FBF8ED;border:1px solid rgba(20,20,20,0.08);border-radius:10px;}
.ci-row h4{margin:0;font-size:13.5px;font-weight:800;color:#181A4D;}
.ci-row .meta{display:flex;gap:6px;align-items:center;margin-top:4px;}
.ci-badge{font-size:9.5px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;padding:2px 8px;border-radius:10px;background:#DCE07A;color:#181A4D;}
.ci-badge.draft{background:#FBF8ED;color:#8a8678;border:1px solid rgba(20,20,20,0.1);}
.ci-controls{display:flex;gap:4px;}
.ci-controls button{background:none;border:1px solid rgba(20,20,20,0.14);border-radius:6px;padding:4px 8px;font-size:11px;cursor:pointer;color:#181A4D;font-family:Poppins;font-weight:700;}
.ci-controls button.del{color:#8f2600;}
.modal-back{position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:100;padding:20px;}
.modal-box{background:#fff;border-radius:14px;padding:22px;width:100%;max-width:640px;max-height:80vh;display:flex;flex-direction:column;}
.modal-box h3{margin:0 0 8px;color:#181A4D;font-weight:800;}
.modal-search{display:flex;gap:8px;margin:12px 0;}
.modal-search input, .modal-search select{padding:9px 12px;font-family:Poppins;font-size:13px;border:1px solid rgba(20,20,20,0.14);border-radius:8px;background:#fff;}
.modal-search input{flex:1;}
.modal-results{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:6px;padding:2px;}
.mr-row{padding:10px 12px;background:#FBF8ED;border:1px solid rgba(20,20,20,0.08);border-radius:8px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:10px;}
.mr-row:hover{border-color:#181A4D;}
.mr-row.disabled{opacity:0.5;cursor:not-allowed;}
`;

type Kind = "teaching" | "essay" | "podcast" | "blog" | "devotional";
const KIND_LABEL: Record<Kind, string> = { teaching: "Teaching", essay: "Essay", podcast: "Podcast", blog: "Blog", devotional: "Devotional" };

export function CollectionForm({ existing }: { existing?: CollectionRow }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!existing;

  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? existing?.description_md ?? "");
  const [cover, setCover] = useState(existing?.cover_image_url ?? existing?.banner_url ?? "");
  const [status, setStatus] = useState<"draft" | "published">(existing?.status ?? "draft");
  const [err, setErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const itemsQ = useQuery({
    queryKey: ["admin-collection-items", existing?.id],
    enabled: !!existing?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collection_items")
        .select("id,collection_id,content_id,template_id,position,layout_slot")
        .eq("collection_id", existing!.id)
        .order("position");
      if (error) throw error;
      const items = (data ?? []) as ItemRow[];
      const contentIds = items.map((i) => i.content_id).filter(Boolean) as string[];
      const templateIds = items.map((i) => i.template_id).filter(Boolean) as string[];
      const [contents, templates] = await Promise.all([
        contentIds.length
          ? supabase.from("content_items").select("id,title,type,status").in("id", contentIds)
          : Promise.resolve({ data: [], error: null } as any),
        templateIds.length
          ? supabase.from("devotional_templates").select("id,title,status").in("id", templateIds)
          : Promise.resolve({ data: [], error: null } as any),
      ]);
      const cmap = new Map<string, any>((contents.data ?? []).map((r: any) => [r.id, r]));
      const tmap = new Map<string, any>((templates.data ?? []).map((r: any) => [r.id, r]));
      return items.map<ResolvedItem>((it) => {
        if (it.content_id && cmap.has(it.content_id)) {
          const c = cmap.get(it.content_id);
          return { ...it, title: c.title, kind: c.type, status: c.status };
        }
        if (it.template_id && tmap.has(it.template_id)) {
          const t = tmap.get(it.template_id);
          return { ...it, title: t.title, kind: "devotional", status: t.status };
        }
        return { ...it, title: "(missing)", kind: "essay", status: "draft" };
      });
    },
  });

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true); setErr(null);
    try {
      const ext = f.name.split(".").pop() ?? "jpg";
      const path = `collections/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("content-thumbnails").upload(path, f, { upsert: false, contentType: f.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("content-thumbnails").getPublicUrl(path);
      setCover(data.publicUrl);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || `c-${Date.now()}`;

  const save = useMutation({
    mutationFn: async (opts: { status: "draft" | "published" }) => {
      if (!title.trim()) throw new Error("Title is required.");
      const payload: any = {
        title: title.trim(),
        description: description || null,
        description_md: description || null,
        cover_image_url: cover || null,
        banner_url: cover || null,
        status: opts.status,
      };
      if (existing) {
        const { error } = await supabase.from("collections").update(payload).eq("id", existing.id);
        if (error) throw error;
        return existing.id;
      }
      payload.slug = slugify(title);
      if (opts.status === "published") payload.published_at = new Date().toISOString();
      const { data, error } = await supabase.from("collections").insert(payload).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-collections"] });
      qc.invalidateQueries({ queryKey: ["admin-collection-counts"] });
      setStatus(vars.status);
      if (!isEdit) navigate({ to: "/admin/collections/$id", params: { id } });
    },
    onError: (e) => setErr(e instanceof Error ? e.message : "Save failed"),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("collection_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-collection-items", existing?.id] }),
  });

  const moveItem = useMutation({
    mutationFn: async (opts: { id: string; dir: -1 | 1 }) => {
      const items = itemsQ.data ?? [];
      const idx = items.findIndex((i) => i.id === opts.id);
      const j = idx + opts.dir;
      if (idx < 0 || j < 0 || j >= items.length) return;
      const a = items[idx], b = items[j];
      await Promise.all([
        supabase.from("collection_items").update({ position: b.position }).eq("id", a.id),
        supabase.from("collection_items").update({ position: a.position }).eq("id", b.id),
      ]);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-collection-items", existing?.id] }),
  });

  const onSubmit = (e: FormEvent, s: "draft" | "published") => {
    e.preventDefault();
    setErr(null);
    save.mutate({ status: s });
  };

  return (
    <form className="cf-form" onSubmit={(e) => onSubmit(e, "published")}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div style={{ display: "grid", gap: 16 }}>
        <div>
          <label>Title *</label>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div>
          <label>Description</label>
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="cf-note">A short blurb shown in listings and on the collection page.</div>
        </div>

        <div>
          <label>Cover image</label>
          <div className="cf-cover">
            {cover && <img src={cover} alt="" />}
            <input type="file" accept="image/*" onChange={onFile} disabled={uploading} />
            {cover && <button type="button" className="ad-btn ghost sm" onClick={() => setCover("")}>Remove</button>}
          </div>
          {uploading && <div className="cf-note">Uploading…</div>}
        </div>

        {isEdit && (
          <div>
            <label>Items in this collection</label>
            <div className="cf-note" style={{ marginBottom: 8 }}>Reorder with ↑ ↓, remove with ×. Items appear on the collection page in this order.</div>
            {itemsQ.isLoading ? (
              <div className="cf-note">Loading…</div>
            ) : (itemsQ.data ?? []).length === 0 ? (
              <div className="cf-note">No items yet.</div>
            ) : (
              <div className="ci-list">
                {(itemsQ.data ?? []).map((it) => (
                  <div key={it.id} className="ci-row">
                    <div>
                      <h4>{it.title}</h4>
                      <div className="meta">
                        <span className="ci-badge">{KIND_LABEL[it.kind]}</span>
                        {it.status !== "published" && <span className="ci-badge draft">{it.status}</span>}
                      </div>
                    </div>
                    <div className="ci-controls">
                      <button type="button" onClick={() => moveItem.mutate({ id: it.id, dir: -1 })} aria-label="Move up">↑</button>
                      <button type="button" onClick={() => moveItem.mutate({ id: it.id, dir: 1 })} aria-label="Move down">↓</button>
                      <button type="button" className="del" onClick={() => removeItem.mutate(it.id)} aria-label="Remove">×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button type="button" className="ad-btn ghost sm" style={{ marginTop: 10 }} onClick={() => setShowPicker(true)}>+ Add item</button>
          </div>
        )}
      </div>

      {err && <div className="cf-err">{err}</div>}

      <div className="cf-actions">
        <span style={{ marginRight: "auto", fontSize: 12, color: "#8a8678" }}>
          {isEdit ? `Currently ${status}` : "New item starts as draft unless you publish"}
        </span>
        <button type="button" className="ad-btn ghost" onClick={() => navigate({ to: "/admin/collections" })}>Cancel</button>
        <button type="button" className="ad-btn ghost" onClick={(e) => onSubmit(e, "draft")} disabled={save.isPending || uploading}>
          {save.isPending ? "Saving…" : "Save draft"}
        </button>
        <button type="submit" className="ad-btn" disabled={save.isPending || uploading}>
          {save.isPending ? "Publishing…" : (status === "published" && isEdit ? "Save & keep published" : "Publish")}
        </button>
      </div>

      {showPicker && existing && (
        <AddItemModal
          collectionId={existing.id}
          existingContentIds={new Set((itemsQ.data ?? []).filter((i) => i.content_id).map((i) => i.content_id as string))}
          existingTemplateIds={new Set((itemsQ.data ?? []).filter((i) => i.template_id).map((i) => i.template_id as string))}
          nextPosition={((itemsQ.data ?? []).at(-1)?.position ?? -1) + 1}
          onClose={() => setShowPicker(false)}
          onAdded={() => {
            setShowPicker(false);
            qc.invalidateQueries({ queryKey: ["admin-collection-items", existing.id] });
            qc.invalidateQueries({ queryKey: ["admin-collection-counts"] });
          }}
        />
      )}
    </form>
  );
}

function AddItemModal({
  collectionId, existingContentIds, existingTemplateIds, nextPosition, onClose, onAdded,
}: {
  collectionId: string;
  existingContentIds: Set<string>;
  existingTemplateIds: Set<string>;
  nextPosition: number;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [q, setQ] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | Kind>("all");
  const [adding, setAdding] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const contentsQ = useQuery({
    queryKey: ["picker-contents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("content_items").select("id,title,type,status").order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const templatesQ = useQuery({
    queryKey: ["picker-templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("devotional_templates").select("id,title,status").order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const results = useMemo(() => {
    const list: { key: string; id: string; title: string; kind: Kind; status: string; taken: boolean; isTemplate: boolean }[] = [];
    (contentsQ.data ?? []).forEach((r: any) => {
      list.push({ key: `c-${r.id}`, id: r.id, title: r.title, kind: r.type, status: r.status, taken: existingContentIds.has(r.id), isTemplate: false });
    });
    (templatesQ.data ?? []).forEach((r: any) => {
      list.push({ key: `t-${r.id}`, id: r.id, title: r.title, kind: "devotional", status: r.status, taken: existingTemplateIds.has(r.id), isTemplate: true });
    });
    return list.filter((r) => {
      if (kindFilter !== "all" && r.kind !== kindFilter) return false;
      if (q && !r.title.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [contentsQ.data, templatesQ.data, q, kindFilter, existingContentIds, existingTemplateIds]);

  const addRow = async (r: typeof results[number]) => {
    setAdding(r.key); setErr(null);
    try {
      const payload: any = {
        collection_id: collectionId,
        position: nextPosition,
        layout_slot: "half",
      };
      if (r.isTemplate) payload.template_id = r.id;
      else payload.content_id = r.id;
      const { error } = await supabase.from("collection_items").insert(payload);
      if (error) throw error;
      onAdded();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Add failed");
      setAdding(null);
    }
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3>Add item to collection</h3>
        <div className="modal-search">
          <input placeholder="Search by title…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value as any)}>
            <option value="all">All kinds</option>
            <option value="teaching">Teaching</option>
            <option value="essay">Essay</option>
            <option value="podcast">Podcast</option>
            <option value="blog">Blog</option>
            <option value="devotional">Devotional</option>
          </select>
        </div>
        {err && <div className="cf-err">{err}</div>}
        <div className="modal-results">
          {(contentsQ.isLoading || templatesQ.isLoading) ? (
            <div className="cf-note">Loading…</div>
          ) : results.length === 0 ? (
            <div className="cf-note">Nothing matches.</div>
          ) : results.map((r) => (
            <div key={r.key} className={`mr-row ${r.taken ? "disabled" : ""}`} onClick={() => !r.taken && adding === null && addRow(r)}>
              <div>
                <div style={{ fontWeight: 700, color: "#181A4D", fontSize: 13.5 }}>{r.title}</div>
                <div className="meta" style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  <span className="ci-badge">{KIND_LABEL[r.kind]}</span>
                  {r.status !== "published" && <span className="ci-badge draft">{r.status}</span>}
                  {r.taken && <span className="ci-badge draft">already added</span>}
                </div>
              </div>
              {adding === r.key && <span style={{ fontSize: 12, color: "#8a8678" }}>Adding…</span>}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <button type="button" className="ad-btn ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
