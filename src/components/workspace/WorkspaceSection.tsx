import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WorkspaceEditor } from "./WorkspaceEditor";

export type WorkspaceItem = {
  id: string;
  user_id: string;
  devotional_entry_id: string | null;
  title: string;
  body: any;
  body_text: string;
  tags: string[];
  status: "open" | "closed";
  created_at: string;
  updated_at: string;
};

const CSS = `
.ws-root{background:#fff;border:1px solid rgba(20,20,20,0.05);border-radius:16px;padding:26px 28px;margin-bottom:22px;}
.ws-head{display:flex;align-items:center;gap:10px;margin-bottom:6px;}
.ws-head .dot{width:8px;height:8px;border-radius:50%;background:#0F4A42;}
.ws-head .name{font-size:11px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#181A4D;}
.ws-head .num{font-size:10px;font-weight:800;color:#8a8678;letter-spacing:0.12em;}
.ws-intro{font-size:13.5px;color:#8a8678;line-height:1.6;margin:0 0 22px;}

.ws-new-btn{background:#181A4D;color:#fff;border:none;font-family:'Poppins';font-weight:700;font-size:12.5px;padding:10px 18px;border-radius:20px;cursor:pointer;}
.ws-new-btn:hover{background:#0F4A42;}

.ws-item{border:1px solid rgba(20,20,20,0.08);border-radius:14px;padding:18px 20px;margin-bottom:16px;background:#FBF8ED;}
.ws-item.open{background:#fff;border-color:rgba(15,74,66,0.25);}
.ws-item-head{display:flex;gap:10px;align-items:center;margin-bottom:10px;flex-wrap:wrap;}
.ws-item-title{flex:1;min-width:200px;background:transparent;border:none;font-family:'Poppins';font-size:16px;font-weight:800;color:#181A4D;letter-spacing:-0.01em;outline:none;padding:4px 0;}
.ws-item-title::placeholder{color:#c4b8a0;}
.ws-tags{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:10px;}
.ws-tag{background:#0F4A42;color:#fff;font-size:10.5px;font-weight:700;letter-spacing:0.06em;padding:3px 10px;border-radius:99px;display:inline-flex;align-items:center;gap:6px;}
.ws-tag button{background:none;border:none;color:#fff;font-size:12px;cursor:pointer;padding:0;line-height:1;opacity:0.7;}
.ws-tag button:hover{opacity:1;}
.ws-tag-input{border:1px dashed rgba(20,20,20,0.2);background:transparent;font-family:'Poppins';font-size:11px;padding:3px 10px;border-radius:99px;outline:none;width:110px;}
.ws-tag-input:focus{border-color:#0F4A42;border-style:solid;}

.ws-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;padding-top:12px;border-top:1px solid rgba(20,20,20,0.06);}
.ws-btn{background:transparent;border:1px solid rgba(20,20,20,0.15);color:#181A4D;font-family:'Poppins';font-weight:700;font-size:11px;letter-spacing:0.04em;text-transform:uppercase;padding:6px 12px;border-radius:99px;cursor:pointer;}
.ws-btn:hover{background:#181A4D;color:#fff;border-color:#181A4D;}
.ws-btn.danger:hover{background:#FF340C;border-color:#FF340C;}
.ws-btn.primary{background:#0F4A42;color:#fff;border-color:#0F4A42;}
.ws-btn.primary:hover{background:#181A4D;border-color:#181A4D;}
.ws-status-pill{font-size:9.5px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;padding:3px 8px;border-radius:99px;background:#DCE07A;color:#181A4D;}
.ws-status-pill.closed{background:#FBF8ED;color:#8a8678;}

/* Editor */
.ws-editor{border:1px solid rgba(20,20,20,0.08);border-radius:10px;overflow:visible;background:#fff;}
.ws-toolbar{display:flex;flex-wrap:wrap;gap:4px;padding:6px 8px;border-bottom:1px solid rgba(20,20,20,0.06);background:#FBF8ED;position:sticky;top:56px;z-index:60;border-top-left-radius:10px;border-top-right-radius:10px;}
.ws-root.is-full .ws-toolbar{top:0;}
.ws-tb-btn{background:transparent;border:none;color:#181A4D;font-family:'Poppins';font-weight:700;font-size:11.5px;padding:5px 9px;border-radius:6px;cursor:pointer;}
.ws-tb-btn:hover{background:#fff;}
.ws-tb-btn.on{background:#181A4D;color:#fff;}
.ws-editor-content{padding:14px 16px;min-height:110px;outline:none;font-family:'Poppins';font-size:14px;color:#20201c;line-height:1.65;}
.ws-editor-content p{margin:0 0 10px;}
.ws-editor-content p:last-child{margin-bottom:0;}
.ws-editor-content h2{font-size:18px;font-weight:800;color:#181A4D;margin:14px 0 8px;letter-spacing:-0.01em;}
.ws-editor-content h3{font-size:15px;font-weight:800;color:#181A4D;margin:12px 0 6px;letter-spacing:-0.005em;}
.ws-editor-content ul, .ws-editor-content ol{padding-left:22px;margin:0 0 10px;}
.ws-editor-content li{margin-bottom:4px;}
.ws-editor-content blockquote{border-left:3px solid #DCE07A;padding:4px 0 4px 14px;margin:10px 0;color:#5c5847;font-style:italic;}
.ws-editor-content a.ws-link{color:#0F4A42;text-decoration:underline;}
.ws-editor-content img.ws-img{max-width:100%;height:auto;border-radius:8px;margin:8px 0;display:block;}
.ws-editor-content p.is-editor-empty:first-child::before{content:attr(data-placeholder);color:#c4b8a0;float:left;height:0;pointer-events:none;}
.ws-editor-content .ws-linkcard{display:flex;gap:12px;border:1px solid rgba(20,20,20,0.1);background:#FBF8ED;border-radius:10px;overflow:hidden;text-decoration:none;color:inherit;margin:10px 0;max-width:520px;}
.ws-editor-content .ws-linkcard:hover{background:#f5efd8;}
.ws-editor-content .ws-linkcard-img{flex:0 0 110px;background-size:cover;background-position:center;background-color:#DCE07A;}
.ws-editor-content .ws-linkcard-body{flex:1;padding:12px 14px;display:flex;flex-direction:column;gap:4px;min-width:0;}
.ws-editor-content .ws-linkcard-domain{font-size:10.5px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#0F4A42;}
.ws-editor-content .ws-linkcard-title{font-size:13.5px;font-weight:800;color:#181A4D;line-height:1.35;letter-spacing:-0.005em;}
.ws-editor-content .ws-linkcard-desc{font-size:12px;color:#8a8678;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}

/* Gallery */
.ws-gallery-head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:28px 0 12px;flex-wrap:wrap;}
.ws-gallery-title{font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#8a8678;margin:0;}
.ws-search{flex:1;max-width:260px;min-width:180px;border:1px solid rgba(20,20,20,0.12);background:#fff;border-radius:99px;padding:8px 14px;font-family:'Poppins';font-size:12.5px;outline:none;color:#20201c;}
.ws-search:focus{border-color:#0F4A42;}
.ws-tagbar{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;}
.ws-tagchip{background:transparent;border:1px solid rgba(20,20,20,0.15);color:#181A4D;font-family:'Poppins';font-size:11px;font-weight:700;padding:5px 12px;border-radius:99px;cursor:pointer;letter-spacing:0.04em;}
.ws-tagchip.on{background:#0F4A42;border-color:#0F4A42;color:#fff;}
.ws-tagchip:hover:not(.on){background:#FBF8ED;}
.ws-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;}
.ws-card{background:#FBF8ED;border:1px solid rgba(20,20,20,0.06);border-radius:12px;padding:14px 16px;cursor:pointer;transition:transform .15s ease, box-shadow .15s ease;display:flex;flex-direction:column;gap:8px;min-height:130px;}
.ws-card:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(0,0,0,0.06);}
.ws-card h4{font-size:14px;font-weight:800;color:#181A4D;letter-spacing:-0.005em;margin:0;line-height:1.35;}
.ws-card .snippet{font-size:12px;color:#8a8678;line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;flex:1;}
.ws-card .meta{font-size:10.5px;font-weight:700;color:#8a8678;letter-spacing:0.04em;}
.ws-card .taglist{display:flex;flex-wrap:wrap;gap:4px;}
.ws-card .taglist span{background:#fff;color:#0F4A42;font-size:9.5px;font-weight:800;letter-spacing:0.06em;padding:2px 7px;border-radius:99px;text-transform:uppercase;border:1px solid rgba(15,74,66,0.15);}
.ws-empty{text-align:center;color:#8a8678;font-size:13px;padding:24px;background:#FBF8ED;border-radius:12px;border:1px dashed rgba(20,20,20,0.1);}
`;

function toPreview(text: string): string {
  return (text || "").replace(/\s+/g, " ").trim().slice(0, 180);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function isToday(iso: string) {
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

const GALLERY_DEFAULT_LIMIT = 5;

export function WorkspaceSection({
  userId,
  ensureEntry,
  currentEntryId,
  isFocused,
  onToggleFocus,
}: {
  userId: string;
  /** Creates today's devotional_entries row if needed and returns its id. */
  ensureEntry: () => Promise<string | null>;
  currentEntryId: string | null;
  isFocused?: boolean;
  onToggleFocus?: () => void;
}) {
  const qc = useQueryClient();
  const itemsQ = useQuery({
    queryKey: ["workspace-items", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_items" as any)
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as WorkspaceItem[];
    },
  });

  const items = itemsQ.data ?? [];
  // Today = anything created today (even if saved). Open items always show first.
  const todayItems = useMemo(
    () =>
      items
        .filter((i) => isToday(i.created_at))
        .sort((a, b) => {
          if (a.status !== b.status) return a.status === "open" ? -1 : 1;
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        }),
    [items]
  );
  // Gallery = everything NOT created today, sorted by most recently edited.
  const galleryPool = useMemo(
    () =>
      items
        .filter((i) => !isToday(i.created_at))
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    [items]
  );

  const allTags = useMemo(() => {
    const s = new Set<string>();
    galleryPool.forEach((i) => i.tags.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [galleryPool]);

  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const isFiltering = !!activeTag || search.trim().length > 0;

  const filteredGallery = useMemo(() => {
    const filtered = galleryPool.filter((i) => {
      if (activeTag && !i.tags.includes(activeTag)) return false;
      if (search && !(i.title.toLowerCase().includes(search.toLowerCase()) || i.body_text.toLowerCase().includes(search.toLowerCase()))) return false;
      return true;
    });
    return isFiltering ? filtered : filtered.slice(0, GALLERY_DEFAULT_LIMIT);
  }, [galleryPool, activeTag, search, isFiltering]);
  const hiddenCount = isFiltering ? 0 : Math.max(0, galleryPool.length - filteredGallery.length);


  const createItem = useMutation({
    mutationFn: async () => {
      const entryId = await ensureEntry();
      if (!entryId) throw new Error("Could not create today's entry");
      const { data, error } = await supabase
        .from("workspace_items" as any)
        .insert({
          user_id: userId,
          devotional_entry_id: entryId,
          title: "",
          body: {},
          body_text: "",
          tags: [],
          status: "open",
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as WorkspaceItem;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspace-items", userId] }),
  });

  const attachCopy = useMutation({
    mutationFn: async (item: WorkspaceItem) => {
      const entryId = await ensureEntry();
      if (!entryId) throw new Error("Could not create today's entry");
      const { data, error } = await supabase
        .from("workspace_items" as any)
        .insert({
          user_id: userId,
          devotional_entry_id: entryId,
          title: item.title ? `${item.title} (continued)` : "",
          body: item.body,
          body_text: item.body_text,
          tags: item.tags,
          status: "open",
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as WorkspaceItem;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspace-items", userId] }),
  });

  const reopen = useMutation({
    mutationFn: async (item: WorkspaceItem) => {
      const { error } = await supabase
        .from("workspace_items" as any)
        .update({ status: "open" })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspace-items", userId] }),
  });

  return (
    <div className={`ws-root ${isFocused ? "is-full" : ""}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {onToggleFocus && (
        <button
          type="button"
          className="de-focus-btn"
          onClick={onToggleFocus}
          aria-label={isFocused ? "Exit focus mode" : "Focus this section"}
        >
          {isFocused ? "✕ Exit focus" : "⛶ Focus"}
        </button>
      )}
      <div className="ws-head">
        <span className="dot" />
        <span className="name">Workspace</span>
        <span className="num">· 05</span>
      </div>
      <p className="ws-intro">
        A place to work things out — quotes to sit with, links to come back to, images that
        strike you, rough thoughts. Items you start today stay under today. Close one to file it
        into your gallery for later.
      </p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#0F4A42" }}>
          Today · {todayItems.length}
        </div>
        <button className="ws-new-btn" onClick={() => createItem.mutate()} disabled={createItem.isPending}>
          {createItem.isPending ? "Creating…" : "+ New workspace item"}
        </button>
      </div>

      {itemsQ.isLoading ? (
        <div className="ws-empty">Loading…</div>
      ) : todayItems.length === 0 ? (
        <div className="ws-empty">Nothing started today yet. Start a new item, or reopen one from the gallery below.</div>
      ) : (
        todayItems.map((item) =>
          item.status === "open" ? (
            <OpenItemCard key={item.id} item={item} userId={userId} />
          ) : (
            <ClosedTodayCard key={item.id} item={item} userId={userId} />
          )
        )
      )}

      {/* Gallery */}
      <div className="ws-gallery-head">
        <h4 className="ws-gallery-title">
          Gallery · {isFiltering ? `${filteredGallery.length} match` : `${galleryPool.length} total`}
        </h4>
        <input
          className="ws-search"
          placeholder="Search title or content…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {allTags.length > 0 && (
        <div className="ws-tagbar">
          <button className={`ws-tagchip ${!activeTag ? "on" : ""}`} onClick={() => setActiveTag(null)}>All</button>
          {allTags.map((t) => (
            <button
              key={t}
              className={`ws-tagchip ${activeTag === t ? "on" : ""}`}
              onClick={() => setActiveTag(activeTag === t ? null : t)}
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      {filteredGallery.length === 0 ? (
        <div className="ws-empty">
          {galleryPool.length === 0
            ? "Items from previous days will collect here."
            : "No items match this filter."}
        </div>
      ) : (
        <>
          <div className="ws-grid">
            {filteredGallery.map((item) => (
              <div key={item.id} className="ws-card" onClick={() => reopen.mutate(item)}>
                <h4>{item.title || "Untitled"}</h4>
                {item.tags.length > 0 && (
                  <div className="taglist">
                    {item.tags.slice(0, 4).map((t) => <span key={t}>#{t}</span>)}
                  </div>
                )}
                <div className="snippet">{toPreview(item.body_text) || "—"}</div>
                <div className="meta" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span>Created {formatDate(item.created_at)} · edited {formatDate(item.updated_at)}</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      className="ws-btn"
                      onClick={(e) => { e.stopPropagation(); reopen.mutate(item); }}
                    >Reopen</button>
                    <button
                      className="ws-btn primary"
                      onClick={(e) => { e.stopPropagation(); attachCopy.mutate(item); }}
                    >Attach to today</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {hiddenCount > 0 && (
            <div className="ws-empty" style={{ marginTop: 12 }}>
              {hiddenCount} more in the gallery — search or filter by tag to find them.
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ClosedTodayCard({ item, userId }: { item: WorkspaceItem; userId: string }) {
  const qc = useQueryClient();
  const reopen = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("workspace_items" as any).update({ status: "open" }).eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspace-items", userId] }),
  });
  return (
    <div className="ws-item" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="ws-item-head">
        <span className="ws-status-pill closed">Closed</span>
        <div style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 800, color: "#181A4D", letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.title || "Untitled"}
        </div>
        <button className="ws-btn" onClick={() => reopen.mutate()}>Reopen</button>
      </div>
      {item.tags.length > 0 && (
        <div className="ws-tags">
          {item.tags.map((t) => <span key={t} className="ws-tag">#{t}</span>)}
        </div>
      )}
      <div style={{ fontSize: 12.5, color: "#8a8678", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {toPreview(item.body_text) || "—"}
      </div>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: "#8a8678", letterSpacing: "0.04em" }}>
        Created {formatDate(item.created_at)} · edited {formatDate(item.updated_at)}
      </div>
    </div>
  );
}


function OpenItemCard({ item, userId }: { item: WorkspaceItem; userId: string }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(item.title);
  const [tags, setTags] = useState<string[]>(item.tags);
  const [tagDraft, setTagDraft] = useState("");
  const bodyRef = useRef<{ json: any; text: string }>({ json: item.body, text: item.body_text });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { error } = await supabase
        .from("workspace_items" as any)
        .update(patch)
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspace-items", userId] }),
  });

  const scheduleSave = (patch: Record<string, unknown>) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save.mutate(patch), 700);
  };

  const removeItem = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("workspace_items" as any).delete().eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspace-items", userId] }),
  });

  const close = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("workspace_items" as any).update({ status: "closed" }).eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspace-items", userId] }),
  });

  const addTag = (t: string) => {
    const clean = t.trim().replace(/^#/, "").toLowerCase();
    if (!clean || tags.includes(clean)) return;
    const next = [...tags, clean];
    setTags(next);
    scheduleSave({ tags: next });
  };

  const removeTag = (t: string) => {
    const next = tags.filter((x) => x !== t);
    setTags(next);
    scheduleSave({ tags: next });
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <div className="ws-item open">
      <div className="ws-item-head">
        <span className="ws-status-pill">Open</span>
        <input
          className="ws-item-title"
          placeholder="Untitled workspace item"
          value={title}
          onChange={(e) => { setTitle(e.target.value); scheduleSave({ title: e.target.value }); }}
        />
      </div>
      <div className="ws-tags">
        {tags.map((t) => (
          <span key={t} className="ws-tag">
            #{t}
            <button onClick={() => removeTag(t)} aria-label="Remove tag">×</button>
          </span>
        ))}
        <input
          className="ws-tag-input"
          placeholder="+ tag"
          value={tagDraft}
          onChange={(e) => setTagDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag(tagDraft);
              setTagDraft("");
            }
          }}
          onBlur={() => { if (tagDraft.trim()) { addTag(tagDraft); setTagDraft(""); } }}
        />
      </div>

      <WorkspaceEditor
        userId={userId}
        initialJSON={item.body}
        onChange={(json, text) => {
          bodyRef.current = { json, text };
          scheduleSave({ body: json, body_text: text });
        }}
      />

      <div className="ws-actions">
        <button className="ws-btn primary" onClick={() => close.mutate()}>Close & file away</button>
        <button className="ws-btn danger" onClick={() => { if (confirm("Delete this workspace item?")) removeItem.mutate(); }}>Delete</button>
      </div>
    </div>
  );
}
