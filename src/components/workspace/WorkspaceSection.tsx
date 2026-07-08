import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
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
.ws-root{background:#fff;border:1px solid rgba(24,26,77,0.12);border-radius:14px;padding:20px 22px;margin-top:16px;font-family:'Poppins',sans-serif;position:relative;}
.ws-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:12px;}
.ws-badge{display:inline-block;font-weight:600;font-size:11px;letter-spacing:0.03em;text-transform:uppercase;padding:5px 12px;border-radius:6px;background:#DCE07A;color:#181A4D;margin-bottom:6px;}
.ws-desc{font-size:13px;color:#20201C;opacity:0.6;max-width:460px;margin-top:2px;line-height:1.5;}
.ws-newbtn{background:#181A4D;color:#DCE07A;border:none;border-radius:999px;padding:8px 16px;font-family:'Poppins',sans-serif;font-weight:600;font-size:12px;cursor:pointer;white-space:nowrap;}
.ws-newbtn:hover{background:#0F4A42;color:#DCE07A;}

.ws-notetabs{display:flex;gap:16px;margin:4px 0 14px;border-bottom:1px solid rgba(24,26,77,0.12);flex-wrap:wrap;}
.ws-notetab{background:none;border:none;padding:0 0 9px;font-family:'Poppins',sans-serif;font-size:12.5px;font-weight:600;color:#181A4D;opacity:0.5;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;}
.ws-notetab:hover{opacity:0.85;}
.ws-notetab.active{opacity:1;border-bottom-color:#CAC307;}

.ws-note-body{}
.ws-note-title{width:100%;border:none;background:transparent;font-family:'Poppins',sans-serif;font-weight:600;font-size:14.5px;color:#181A4D;margin-bottom:8px;padding:0;outline:none;}
.ws-note-title::placeholder{color:#181A4D;opacity:0.35;}
.ws-tagrow{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;align-items:center;}
.ws-tag{background:rgba(15,74,66,0.08);color:#0F4A42;border-radius:999px;padding:4px 11px;font-size:11px;font-weight:600;display:inline-flex;align-items:center;gap:6px;font-family:'Poppins',sans-serif;}
.ws-tag button{background:none;border:none;color:#0F4A42;font-size:12px;cursor:pointer;padding:0;line-height:1;opacity:0.55;}
.ws-tag button:hover{opacity:1;}
.ws-tag-input{background:transparent;border:1px dashed rgba(24,26,77,0.15);color:#20201C;border-radius:999px;padding:4px 11px;font-size:11px;font-weight:600;font-family:'Poppins',sans-serif;outline:none;width:88px;}
.ws-tag-input:focus{border-color:#181A4D;border-style:solid;color:#181A4D;}
.ws-tag-input::placeholder{color:#20201C;opacity:0.5;}

.ws-editor{border:none;background:transparent;}
.ws-toolbar{display:flex;flex-wrap:wrap;gap:4px;padding:4px 0 6px;border-bottom:1px solid rgba(24,26,77,0.08);background:transparent;position:sticky;top:56px;z-index:60;}
.ws-tb-btn{background:transparent;border:none;color:#181A4D;font-family:'Poppins',sans-serif;font-weight:600;font-size:11.5px;padding:5px 9px;border-radius:6px;cursor:pointer;}
.ws-tb-btn:hover{background:rgba(24,26,77,0.06);}
.ws-tb-btn.on{background:#181A4D;color:#fff;}
.ws-editor-content{padding:8px 0 4px;min-height:56px;outline:none;font-family:'Poppins',sans-serif;font-size:14px;color:#20201C;line-height:1.55;}
.ws-editor-content p{margin:0 0 8px;}
.ws-editor-content p:last-child{margin-bottom:0;}
.ws-editor-content h2{font-size:17px;font-weight:700;color:#181A4D;margin:12px 0 6px;letter-spacing:-0.005em;}
.ws-editor-content h3{font-size:14.5px;font-weight:700;color:#181A4D;margin:10px 0 5px;}
.ws-editor-content ul{list-style:disc outside;padding-left:22px;margin:0 0 8px;}
.ws-editor-content ol{list-style:decimal outside;padding-left:22px;margin:0 0 8px;}
.ws-editor-content li{margin-bottom:3px;}
.ws-editor-content li > p{margin:0;}
.ws-editor-content blockquote{border-left:3px solid #DCE07A;padding:2px 0 2px 12px;margin:8px 0;color:#5c5847;font-style:italic;}
.ws-editor-content a.ws-link{color:#181A4D;text-decoration:underline;}
.ws-editor-content img.ws-img{max-width:100%;height:auto;border-radius:8px;margin:8px 0;display:block;}
.ws-editor-content p.is-editor-empty:first-child::before{content:attr(data-placeholder);color:#20201C;opacity:0.35;float:left;height:0;pointer-events:none;}
.ws-editor-content .ws-linkcard{display:flex;gap:12px;border:1px solid rgba(24,26,77,0.1);background:#FBF8ED;border-radius:10px;overflow:hidden;text-decoration:none;color:inherit;margin:8px 0;max-width:520px;}
.ws-editor-content .ws-linkcard:hover{background:#f5efd8;}
.ws-editor-content .ws-linkcard-img{flex:0 0 96px;background-size:cover;background-position:center;background-color:#DCE07A;}
.ws-editor-content .ws-linkcard-body{flex:1;padding:10px 12px;display:flex;flex-direction:column;gap:4px;min-width:0;}
.ws-editor-content .ws-linkcard-domain{font-size:10.5px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#181A4D;}
.ws-editor-content .ws-linkcard-title{font-size:13px;font-weight:700;color:#181A4D;line-height:1.35;}
.ws-editor-content .ws-linkcard-desc{font-size:12px;color:#8a8678;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}

.ws-note-actions{display:flex;gap:16px;margin-top:12px;align-items:center;}
.ws-linkaction{background:none;border:none;font-family:'Poppins',sans-serif;font-weight:600;font-size:12px;cursor:pointer;padding:0;color:#181A4D;}
.ws-linkaction:hover{text-decoration:underline;}
.ws-linkaction.del{color:#20201C;opacity:0.45;}
.ws-linkaction.del:hover{opacity:0.9;}
.ws-savestatus{font-size:10.5px;color:#8a8678;font-weight:600;margin-left:auto;}

.ws-empty-body{padding:22px 0;color:#8a8678;font-size:13px;text-align:center;}

.ws-library-strip{margin-top:16px;padding-top:14px;border-top:1px dashed rgba(24,26,77,0.12);}
.ws-library-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;gap:12px;}
.ws-library-head span.lbl{font-size:11px;font-weight:600;letter-spacing:0.03em;text-transform:uppercase;color:#20201C;opacity:0.4;}
.ws-library-head a{font-size:12px;color:#181A4D;font-weight:600;text-decoration:none;font-family:'Poppins',sans-serif;}
.ws-library-head a:hover{text-decoration:underline;}
.ws-libgrid{display:flex;gap:20px 24px;flex-wrap:wrap;}
.ws-libitem{font-size:12.5px;color:#181A4D;opacity:0.8;background:none;border:none;padding:0;font-family:'Poppins',sans-serif;cursor:pointer;text-align:left;}
.ws-libitem:hover{opacity:1;text-decoration:underline;}
.ws-libitem b{font-weight:600;opacity:1;}
.ws-libitem .tg{opacity:0.7;font-weight:500;}
.ws-libempty{font-size:12.5px;color:#8a8678;opacity:0.7;}

/* focus mode passthrough */
.ws-root.is-full{position:fixed;inset:0;z-index:400;background:#fff;margin:0;border:none;border-radius:0;overflow-y:auto;padding:64px 20px 80px;}
@media (min-width:720px){
  .ws-root.is-full{padding:64px 48px 80px;}
  .ws-root.is-full > *{max-width:880px;margin-left:auto;margin-right:auto;}
}
.ws-focus-btn{position:absolute;top:12px;right:14px;background:transparent;border:1px solid rgba(24,26,77,0.15);color:#181A4D;font-family:'Poppins',sans-serif;font-weight:600;font-size:10.5px;letter-spacing:0.05em;text-transform:uppercase;padding:4px 9px;border-radius:99px;cursor:pointer;z-index:5;}
.ws-focus-btn:hover{background:#181A4D;color:#fff;border-color:#181A4D;}
`;

function toPreview(text: string): string {
  return (text || "").replace(/\s+/g, " ").trim().slice(0, 140);
}

export function WorkspaceSection({
  userId,
  ensureEntry,
  isFocused,
  onToggleFocus,
}: {
  userId: string;
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

  const openNotes = useMemo(
    () =>
      items
        .filter((i) => i.status === "open")
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [items]
  );

  const libraryItems = useMemo(
    () =>
      items
        .filter((i) => i.status === "closed")
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 3),
    [items]
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  // Keep an active tab selected when possible.
  useEffect(() => {
    if (openNotes.length === 0) {
      if (activeId !== null) setActiveId(null);
      return;
    }
    if (!activeId || !openNotes.find((n) => n.id === activeId)) {
      setActiveId(openNotes[0].id);
    }
  }, [openNotes, activeId]);

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
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["workspace-items", userId] });
      if (created?.id) setActiveId(created.id);
    },
  });

  const reopen = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workspace_items" as any).update({ status: "open" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_r, id) => {
      qc.invalidateQueries({ queryKey: ["workspace-items", userId] });
      setActiveId(id);
    },
  });

  const activeNote = openNotes.find((n) => n.id === activeId) ?? null;

  return (
    <div className={`ws-root ${isFocused ? "is-full" : ""}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {onToggleFocus && (
        <button
          type="button"
          className="ws-focus-btn"
          onClick={onToggleFocus}
          aria-label={isFocused ? "Exit focus mode" : "Focus this section"}
        >
          {isFocused ? "✕ Exit focus" : "⛶ Focus"}
        </button>
      )}

      <div className="ws-head">
        <div>
          <span className="ws-badge">workspace</span>
          <div className="ws-desc">Where you work things out with him — quotes, links, half-formed thoughts.</div>
        </div>
        <button className="ws-newbtn" onClick={() => createItem.mutate()} disabled={createItem.isPending}>
          {createItem.isPending ? "Opening…" : "+ New note"}
        </button>
      </div>

      {openNotes.length > 0 && (
        <div className="ws-notetabs" role="tablist">
          {openNotes.map((n) => (
            <button
              key={n.id}
              role="tab"
              aria-selected={n.id === activeId}
              className={`ws-notetab ${n.id === activeId ? "active" : ""}`}
              onClick={() => setActiveId(n.id)}
              title={n.title || "Untitled"}
            >
              {n.title?.trim() || "Untitled"}
            </button>
          ))}
        </div>
      )}

      {itemsQ.isLoading ? (
        <div className="ws-empty-body">Loading…</div>
      ) : !activeNote ? (
        <div className="ws-empty-body">No open notes. Start a new one to begin.</div>
      ) : (
        <NoteBody key={activeNote.id} item={activeNote} userId={userId} onTitleChange={() => { /* live tab label */ }} />
      )}

      <div className="ws-library-strip">
        <div className="ws-library-head">
          <span className="lbl">from your library</span>
          <Link to="/notes">Open library →</Link>
        </div>
        {libraryItems.length === 0 ? (
          <div className="ws-libempty">Nothing filed away yet. Save a note to start your library.</div>
        ) : (
          <div className="ws-libgrid">
            {libraryItems.map((it) => (
              <button key={it.id} className="ws-libitem" onClick={() => reopen.mutate(it.id)}>
                <b>{it.title?.trim() || toPreview(it.body_text) || "Untitled"}</b>
                {it.tags[0] ? <span className="tg"> · #{it.tags[0]}</span> : null}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NoteBody({
  item,
  userId,
  onTitleChange,
}: {
  item: WorkspaceItem;
  userId: string;
  onTitleChange?: (title: string) => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(item.title);
  const [tags, setTags] = useState<string[]>(item.tags);
  const [tagDraft, setTagDraft] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTitle(item.title);
    setTags(item.tags);
  }, [item.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { error } = await supabase.from("workspace_items" as any).update(patch).eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-items", userId] });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1400);
    },
  });

  const scheduleSave = (patch: Record<string, unknown>) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save.mutate(patch), 700);
  };
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

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

  return (
    <div className="ws-note-body">
      <input
        className="ws-note-title"
        placeholder="Untitled note"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          onTitleChange?.(e.target.value);
          scheduleSave({ title: e.target.value });
        }}
      />

      <div className="ws-tagrow">
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
        onChange={(json, text) => scheduleSave({ body: json, body_text: text })}
      />

      <div className="ws-note-actions">
        <button className="ws-linkaction" onClick={() => close.mutate()}>Save &amp; file away</button>
        <button
          className="ws-linkaction del"
          onClick={() => { if (confirm("Delete this note?")) removeItem.mutate(); }}
        >
          Delete
        </button>
        <span className="ws-savestatus">{save.isPending ? "Saving…" : savedFlash ? "Saved" : ""}</span>
      </div>
    </div>
  );
}
