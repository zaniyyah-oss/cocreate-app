import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SAVED_CSS, SignGate, useAuth } from "@/components/saved-shared";
import { supabase } from "@/integrations/supabase/client";
import { WorkspaceEditor } from "@/components/workspace/WorkspaceEditor";

export const Route = createFileRoute("/notes")({
  component: NotesPage,
  head: () => ({
    meta: [
      { title: "Notes — CoCreate" },
      { name: "description", content: "All of your workspace documents in one place — open, edit, and filter by tag." },
      { property: "og:title", content: "Notes — CoCreate" },
      { property: "og:description", content: "Every workspace document you've written, right where you can return to it." },
    ],
  }),
});

type Doc = {
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

// Normalize a tag so "Deep-Prayer", "deep prayer", and "DEEP_PRAYER" collapse
// into the same filter bucket. We collapse dashes, underscores, and whitespace
// to a single space, then lowercase.
const normalizeTag = (t: string) =>
  (t ?? "").toString().trim().toLowerCase().replace(/[\s_-]+/g, " ").trim();

const displayTag = (t: string) => {
  const n = normalizeTag(t);
  if (!n) return "";
  return n.replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatShort = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const formatLong = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

// ─── Layout / styles ────────────────────────────────────────────────
const NOTES_CSS = `
.nt-frame{max-width:1400px;margin:0 auto;background:#FBF8ED;border-radius:18px;overflow:hidden;box-shadow:0 10px 40px rgba(24,26,77,0.08);display:flex;height:calc(100vh - 140px);min-height:520px;font-family:'Poppins',sans-serif;border:1px solid rgba(24,26,77,0.06);}
.nt-panel-body .ws-editor-content, .nt-panel-body .ProseMirror{font-size:13.5px;line-height:1.55;}
.nt-panel-body .ws-editor-content h1, .nt-panel-body .ProseMirror h1{font-size:20px;}
.nt-panel-body .ws-editor-content h2, .nt-panel-body .ProseMirror h2{font-size:17px;}
.nt-panel-body .ws-editor-content h3, .nt-panel-body .ProseMirror h3{font-size:15px;}
.nt-edit-btn{background:#FBF8ED;border:1px solid rgba(24,26,77,0.15);color:#181A4D;border-radius:999px;padding:5px 14px;font-family:'Poppins',sans-serif;font-weight:600;font-size:11.5px;cursor:pointer;margin-right:4px;}
.nt-edit-btn:hover{background:#DCE07A;border-color:#CAC307;}
.nt-edit-btn.active{background:#181A4D;color:#DCE07A;border-color:#181A4D;}
.nt-list-col{width:320px;flex-shrink:0;background:#fff;border-right:1px solid rgba(24,26,77,0.07);display:flex;flex-direction:column;}
.nt-list-header{padding:18px 18px 12px;border-bottom:1px solid rgba(24,26,77,0.06);}
.nt-list-header .title{font-weight:900;font-size:19px;color:#181A4D;letter-spacing:-0.01em;margin-bottom:12px;}
.nt-filter{display:flex;flex-direction:column;gap:6px;}
.nt-filter label{font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8a8678;}
.nt-select{appearance:none;-webkit-appearance:none;border:1px solid rgba(24,26,77,0.15);background:#FBF8ED url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'><path fill='%23181A4D' d='M6 8L0 0h12z'/></svg>") no-repeat right 10px center;background-size:9px 6px;border-radius:8px;padding:8px 28px 8px 10px;font-family:'Poppins',sans-serif;font-size:12.5px;font-weight:600;color:#181A4D;cursor:pointer;}
.nt-select:focus{outline:none;border-color:#181A4D;}
.nt-doc-list{overflow-y:auto;flex:1;}
.nt-doc-row{padding:14px 18px;border-bottom:1px solid rgba(24,26,77,0.05);cursor:pointer;background:#fff;text-align:left;width:100%;border-left:3px solid transparent;font-family:'Poppins',sans-serif;}
.nt-doc-row:hover{background:#FBF8ED;}
.nt-doc-row.open{background:rgba(220,224,122,0.28);border-left-color:#CAC307;padding-left:15px;}
.nt-doc-top{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:5px;}
.nt-doc-title{font-weight:700;font-size:13px;color:#20201C;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.nt-doc-date{font-size:10px;color:#9a968a;font-weight:500;flex-shrink:0;}
.nt-doc-tags{display:flex;gap:4px;flex-wrap:wrap;}
.nt-doc-tag{display:inline-block;font-size:9px;font-weight:700;padding:3px 8px;border-radius:10px;background:rgba(220,224,122,0.55);color:#0F4A42;letter-spacing:0.02em;}
.nt-doc-preview{font-size:11px;color:#8a8678;line-height:1.4;margin-top:5px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.nt-doc-empty{padding:32px 22px;text-align:center;color:#8a8678;font-size:12.5px;line-height:1.55;}

.nt-panel-region{flex:1;display:flex;flex-direction:column;min-width:0;background:#f0ede3;}
.nt-layout-toolbar{padding:10px 18px;display:flex;align-items:center;gap:8px;background:#fff;border-bottom:1px solid rgba(24,26,77,0.07);flex-wrap:wrap;}
.nt-layout-toolbar .label{font-size:10px;font-weight:700;color:#181A4D;opacity:0.55;text-transform:uppercase;letter-spacing:0.1em;margin-right:2px;}
.nt-layout-btn{width:34px;height:28px;border-radius:8px;background:#FBF8ED;display:flex;align-items:center;justify-content:center;gap:2px;cursor:pointer;border:1.5px solid transparent;padding:0;}
.nt-layout-btn.active{background:#DCE07A;border-color:#CAC307;}
.nt-layout-btn .col{width:6px;height:16px;border-radius:2px;background:#181A4D;opacity:0.35;}
.nt-layout-btn.active .col{opacity:0.85;}
.nt-layout-btn .col.wide{width:14px;}
.nt-new-btn{margin-left:auto;background:#181A4D;color:#DCE07A;border:none;border-radius:999px;padding:7px 15px;font-family:'Poppins',sans-serif;font-weight:600;font-size:11.5px;cursor:pointer;}
.nt-new-btn:hover{background:#0F4A42;}

.nt-panels{flex:1;display:flex;background:#f0ede3;overflow:hidden;}
.nt-panel{flex:1;border-right:1px solid rgba(24,26,77,0.08);display:flex;flex-direction:column;background:#FBF8ED;min-width:0;overflow:hidden;}
.nt-panel:last-child{border-right:none;}
.nt-panel-header{padding:12px 16px;display:flex;align-items:flex-start;justify-content:space-between;gap:10px;border-bottom:1px solid rgba(24,26,77,0.07);background:#fff;flex-shrink:0;}
.nt-panel-header-info{min-width:0;flex:1;}
.nt-tag-pill{display:inline-block;font-size:9px;font-weight:700;padding:3px 8px;border-radius:10px;background:#DCE07A;color:#181A4D;margin-bottom:4px;letter-spacing:0.02em;}
.nt-p-title{font-weight:700;font-size:13.5px;color:#181A4D;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.nt-p-date{font-size:10.5px;color:#9a968a;font-weight:500;margin-top:2px;}
.nt-panel-close{background:none;border:none;cursor:pointer;color:#8a8678;font-size:18px;line-height:1;padding:2px 6px;border-radius:6px;flex-shrink:0;}
.nt-panel-close:hover{background:rgba(24,26,77,0.06);color:#181A4D;}
.nt-panel-body{flex:1;overflow-y:auto;padding:18px 20px;}

.nt-panel-title-input{width:100%;border:none;background:transparent;font-family:'Poppins',sans-serif;font-weight:700;font-size:20px;color:#181A4D;margin-bottom:8px;padding:0;outline:none;letter-spacing:-0.005em;}
.nt-panel-title-input::placeholder{color:#181A4D;opacity:0.3;}
.nt-panel-tagrow{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;align-items:center;}
.nt-panel-tag{background:rgba(15,74,66,0.08);color:#0F4A42;border-radius:999px;padding:3px 10px;font-size:11px;font-weight:600;display:inline-flex;align-items:center;gap:6px;font-family:'Poppins',sans-serif;}
.nt-panel-tag button{background:none;border:none;color:#0F4A42;font-size:12px;cursor:pointer;padding:0;line-height:1;opacity:0.55;}
.nt-panel-tag button:hover{opacity:1;}
.nt-tag-input{background:transparent;border:1px dashed rgba(24,26,77,0.15);color:#20201C;border-radius:999px;padding:3px 10px;font-size:11px;font-weight:600;font-family:'Poppins',sans-serif;outline:none;width:88px;}
.nt-tag-input:focus{border-color:#181A4D;border-style:solid;color:#181A4D;}

.nt-panel-actions{display:flex;gap:16px;margin-top:14px;align-items:center;padding-top:12px;border-top:1px dashed rgba(24,26,77,0.1);}
.nt-panel-link{background:none;border:none;font-family:'Poppins',sans-serif;font-weight:600;font-size:11.5px;cursor:pointer;padding:0;color:#181A4D;}
.nt-panel-link:hover{text-decoration:underline;}
.nt-panel-link.del{color:#20201C;opacity:0.45;}
.nt-panel-link.del:hover{opacity:0.9;}
.nt-panel-status{font-size:10px;color:#8a8678;font-weight:600;margin-left:auto;}

.nt-panel-empty{flex:1;display:flex;align-items:center;justify-content:center;color:#8a8678;font-size:12.5px;text-align:center;padding:32px;}

@media (max-width:820px){
  .nt-frame{flex-direction:column;height:auto;min-height:0;}
  .nt-list-col{width:100%;max-height:280px;}
  .nt-panel-region{min-height:60vh;}
  .nt-layout-toolbar .label,
  .nt-layout-btn:nth-child(3),
  .nt-layout-btn:nth-child(4){display:none;}
  .nt-panels{flex-direction:column;}
  .nt-panel{border-right:none;border-bottom:1px solid rgba(24,26,77,0.08);}
}
`;

function NotesPage() {
  const { userId, ready } = useAuth();

  if (ready && !userId) {
    return (
      <AppShell current="notes">
        <style dangerouslySetInnerHTML={{ __html: SAVED_CSS }} />
        <div className="sv-shell">
          <h1 className="sv-h1">Notes</h1>
          <p className="sv-sub">Every workspace document you create, in one place.</p>
          <SignGate />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell current="notes">
      <style dangerouslySetInnerHTML={{ __html: SAVED_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: NOTES_CSS }} />
      {userId ? <NotesLibrary userId={userId} /> : null}
    </AppShell>
  );
}

// ─── The library ────────────────────────────────────────────────────

function NotesLibrary({ userId }: { userId: string }) {
  const qc = useQueryClient();

  const docsQ = useQuery({
    queryKey: ["notes-docs-all", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_items" as any)
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Doc[];
    },
  });

  const docs = docsQ.data ?? [];

  // Build canonical tag options: normalized -> display + count.
  const tagOptions = useMemo(() => {
    const map = new Map<string, { display: string; count: number }>();
    for (const d of docs) {
      for (const t of d.tags ?? []) {
        const n = normalizeTag(t);
        if (!n) continue;
        const existing = map.get(n);
        if (existing) existing.count += 1;
        else map.set(n, { display: displayTag(t), count: 1 });
      }
    }
    return Array.from(map.entries())
      .map(([key, v]) => ({ key, display: v.display, count: v.count }))
      .sort((a, b) => a.display.localeCompare(b.display));
  }, [docs]);

  const [tagFilter, setTagFilter] = useState<string>("");

  const filteredDocs = useMemo(() => {
    if (!tagFilter) return docs;
    return docs.filter((d) => (d.tags ?? []).some((t) => normalizeTag(t) === tagFilter));
  }, [docs, tagFilter]);

  // Layout: 1, 2, or 3 open panels.
  const [layout, setLayout] = useState<1 | 2 | 3>(1);
  // Ordered list of open doc IDs. First = most recently opened. When we need
  // to evict, we drop the last (least recently opened).
  const [openIds, setOpenIds] = useState<string[]>([]);

  // Trim open panels when layout shrinks.
  useEffect(() => {
    setOpenIds((cur) => cur.slice(0, layout));
  }, [layout]);

  // Auto-open the newest doc on first load so the workspace never looks empty.
  const bootstrappedRef = useRef(false);
  useEffect(() => {
    if (bootstrappedRef.current) return;
    if (!docsQ.isSuccess) return;
    if (docs.length === 0) { bootstrappedRef.current = true; return; }
    bootstrappedRef.current = true;
    setOpenIds([docs[0].id]);
  }, [docsQ.isSuccess, docs]);

  const openDoc = (id: string) => {
    setOpenIds((cur) => {
      if (cur[0] === id) return cur;
      const without = cur.filter((x) => x !== id);
      const next = [id, ...without].slice(0, layout);
      return next;
    });
  };

  const closePanel = (id: string) => {
    setOpenIds((cur) => cur.filter((x) => x !== id));
  };

  const createDoc = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("workspace_items" as any)
        .insert({
          user_id: userId,
          devotional_entry_id: null,
          title: "",
          body: {},
          body_text: "",
          tags: [],
          status: "open",
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Doc;
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["notes-docs-all", userId] });
      if (created?.id) openDoc(created.id);
    },
  });

  const openDocs = openIds
    .map((id) => docs.find((d) => d.id === id))
    .filter((d): d is Doc => !!d);

  return (
    <div className="nt-frame">
      <aside className="nt-list-col">
        <div className="nt-list-header">
          <div className="title">Notes</div>
          <div className="nt-filter">
            <label htmlFor="nt-tag-filter">Filter by tag</label>
            <select
              id="nt-tag-filter"
              className="nt-select"
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
            >
              <option value="">All tags ({docs.length})</option>
              {tagOptions.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.display} ({t.count})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="nt-doc-list">
          {docsQ.isLoading ? (
            <div className="nt-doc-empty">Loading…</div>
          ) : filteredDocs.length === 0 ? (
            <div className="nt-doc-empty">
              {docs.length === 0
                ? "No workspace documents yet. Create one on the right to begin."
                : "No documents match this tag."}
            </div>
          ) : (
            filteredDocs.map((d) => {
              const isOpen = openIds.includes(d.id);
              const preview = (d.body_text || "").replace(/\s+/g, " ").trim().slice(0, 120);
              return (
                <button
                  key={d.id}
                  className={`nt-doc-row ${isOpen ? "open" : ""}`}
                  onClick={() => openDoc(d.id)}
                >
                  <div className="nt-doc-top">
                    <span className="nt-doc-title">{d.title?.trim() || "Untitled"}</span>
                    <span className="nt-doc-date">{formatShort(d.updated_at)}</span>
                  </div>
                  {d.tags && d.tags.length > 0 && (
                    <div className="nt-doc-tags">
                      {d.tags.slice(0, 3).map((t, i) => (
                        <span key={`${d.id}-${t}-${i}`} className="nt-doc-tag">{displayTag(t)}</span>
                      ))}
                    </div>
                  )}
                  {preview && <div className="nt-doc-preview">{preview}</div>}
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section className="nt-panel-region">
        <div className="nt-layout-toolbar">
          <span className="label">View</span>
          <button
            type="button"
            className={`nt-layout-btn ${layout === 1 ? "active" : ""}`}
            onClick={() => setLayout(1)}
            aria-label="Single panel"
          >
            <span className="col wide" />
          </button>
          <button
            type="button"
            className={`nt-layout-btn ${layout === 2 ? "active" : ""}`}
            onClick={() => setLayout(2)}
            aria-label="Two panels"
          >
            <span className="col" /><span className="col" />
          </button>
          <button
            type="button"
            className={`nt-layout-btn ${layout === 3 ? "active" : ""}`}
            onClick={() => setLayout(3)}
            aria-label="Three panels"
          >
            <span className="col" /><span className="col" /><span className="col" />
          </button>
          <button className="nt-new-btn" onClick={() => createDoc.mutate()} disabled={createDoc.isPending}>
            {createDoc.isPending ? "Creating…" : "+ New document"}
          </button>
        </div>

        <div className="nt-panels">
          {openDocs.length === 0 ? (
            <div className="nt-panel-empty">
              Choose a document from the list to open it here.
            </div>
          ) : (
            openDocs.map((d) => (
              <DocPanel
                key={d.id}
                doc={d}
                userId={userId}
                onClose={() => closePanel(d.id)}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

// ─── Panel: title + tags + editor + save ────────────────────────────

function DocPanel({
  doc,
  userId,
  onClose,
}: {
  doc: Doc;
  userId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(doc.title);
  const [tags, setTags] = useState<string[]>(doc.tags ?? []);
  const [tagDraft, setTagDraft] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  const [hasPending, setHasPending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Record<string, unknown> | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    setTitle(doc.title);
    setTags(doc.tags ?? []);
    setEditing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id]);

  const flushSave = async () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (!pendingRef.current) return;
    if (inFlightRef.current) return;
    const patch = pendingRef.current;
    pendingRef.current = null;
    setHasPending(false);
    inFlightRef.current = true;
    setSaving(true);
    try {
      const { error } = await supabase.from("workspace_items" as any).update(patch).eq("id", doc.id);
      if (error) throw error;
      qc.setQueryData<Doc[]>(["notes-docs-all", userId], (cur) =>
        (cur ?? []).map((it) =>
          it.id === doc.id ? ({ ...it, ...patch, updated_at: new Date().toISOString() } as Doc) : it,
        ),
      );
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1400);
      qc.invalidateQueries({ queryKey: ["notes-docs-all", userId], refetchType: "none" });
    } catch (e) {
      pendingRef.current = { ...(patch as any), ...(pendingRef.current ?? {}) };
      setHasPending(true);
      console.error("notes save failed", e);
    } finally {
      inFlightRef.current = false;
      setSaving(false);
      if (pendingRef.current) void flushSave();
    }
  };

  const schedule = (patch: Record<string, unknown>) => {
    pendingRef.current = { ...(pendingRef.current ?? {}), ...patch };
    setHasPending(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { void flushSave(); }, 600);
  };

  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "hidden") void flushSave(); };
    const onHide = () => { void flushSave(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onHide);
      if (timerRef.current) clearTimeout(timerRef.current);
      void flushSave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id]);

  const removeDoc = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("workspace_items" as any).delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes-docs-all", userId] });
      onClose();
    },
  });

  const addTag = (t: string) => {
    const clean = normalizeTag(t);
    if (!clean) return;
    if (tags.map(normalizeTag).includes(clean)) return;
    const next = [...tags, clean];
    setTags(next);
    schedule({ tags: next });
  };
  const removeTag = (t: string) => {
    const next = tags.filter((x) => x !== t);
    setTags(next);
    schedule({ tags: next });
  };

  const primaryTag = tags[0] ? displayTag(tags[0]) : null;

  return (
    <div className="nt-panel">
      <header className="nt-panel-header">
        <div className="nt-panel-header-info">
          {primaryTag && <div className="nt-tag-pill">{primaryTag}</div>}
          <div className="nt-p-title">{title?.trim() || "Untitled"}</div>
          <div className="nt-p-date">{formatLong(doc.updated_at)}</div>
        </div>
        <button
          type="button"
          className={`nt-edit-btn ${editing ? "active" : ""}`}
          onClick={() => {
            if (editing) void flushSave();
            setEditing((v) => !v);
          }}
        >
          {editing ? "Done" : "Edit"}
        </button>
        <button
          type="button"
          className="nt-panel-close"
          onClick={() => { void flushSave(); onClose(); }}
          aria-label="Close panel"
        >
          ✕
        </button>
      </header>
      <div className="nt-panel-body">
        {editing ? (
          <input
            className="nt-panel-title-input"
            placeholder="Untitled"
            value={title}
            onChange={(e) => { setTitle(e.target.value); schedule({ title: e.target.value }); }}
            onBlur={() => { void flushSave(); }}
          />
        ) : (
          <div className="nt-panel-title-input" style={{ cursor: "default" }}>
            {title?.trim() || "Untitled"}
          </div>
        )}

        <div className="nt-panel-tagrow">
          {tags.map((t) => (
            <span key={t} className="nt-panel-tag">
              #{displayTag(t)}
              {editing && <button onClick={() => removeTag(t)} aria-label="Remove tag">×</button>}
            </span>
          ))}
          {editing && (
            <input
              className="nt-tag-input"
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
          )}
        </div>

        <WorkspaceEditor
          userId={userId}
          initialJSON={doc.body}
          onChange={(json, text) => schedule({ body: json, body_text: text })}
          onBlur={() => { void flushSave(); }}
          ignoreExternalUpdates={hasPending || saving}
          editable={editing}
        />

        <div className="nt-panel-actions">
          <button
            className="nt-panel-link del"
            onClick={() => { if (confirm("Delete this document?")) removeDoc.mutate(); }}
          >
            Delete
          </button>
          <span className="nt-panel-status">
            {saving || hasPending ? "Saving…" : savedFlash ? "Saved" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
