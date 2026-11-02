import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBibleBooks } from "@/components/BookTagger";
import { useAllTopics } from "@/components/TopicPicker";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { WorkspaceSection, type WorkspaceItem } from "@/components/workspace/WorkspaceSection";
import { createFolder, invalidateFolders, useStudyFolderList } from "@/components/workspace/StudyFolders";
import { createStudy, logStudyOpen, shortDate } from "@/lib/study-log";

type Study = WorkspaceItem & { topic_ids?: string[] | null };
type ListView = "folders" | "books" | "topics";

const localISO = (d = new Date()) => {
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const dayOf = (iso: string) => (iso.length === 10 ? iso : localISO(new Date(iso)));
function relDay(iso: string) {
  const d = dayOf(iso);
  const today = localISO();
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (d === today) return "today";
  if (d === localISO(y)) return "yesterday";
  return shortDate(d);
}

const CSS = `
.sl-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 22px;}
.sl-outline{display:inline-flex;align-items:center;gap:8px;background:#fff;border:1.5px solid #ECE4CE;color:#181A4D;font-family:inherit;font-size:14px;font-weight:700;padding:10px 18px;border-radius:999px;cursor:pointer;}
.sl-outline:hover{border-color:#181A4D;}
.sl-search{margin-left:auto;display:flex;align-items:center;gap:8px;background:#fff;border:1.5px solid #ECE4CE;border-radius:999px;padding:0 14px;min-width:260px;}
.sl-search input{border:none;outline:none;background:transparent;font-family:inherit;font-size:14px;padding:10px 0;flex:1;min-width:0;color:#20201C;}
.sl-searchbtn{display:none;margin-left:auto;}
.sl-newfolder{display:flex;gap:8px;margin:-10px 0 20px;max-width:420px;}
.sl-newfolder input{flex:1;border:1.5px solid #ECE4CE;border-radius:999px;padding:9px 14px;font-family:inherit;font-size:14px;outline:none;}
.sl-newfolder input:focus{border-color:#181A4D;}
.sl-label{font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#8a8879;margin:0 0 12px;}
.sl-rail{display:flex;gap:12px;overflow-x:auto;padding-bottom:18px;margin-bottom:22px;border-bottom:1px solid #E7E1CF;}
.sl-card{flex:0 0 210px;width:210px;min-width:0;box-sizing:border-box;background:#fff;border:1px solid #E7E1CF;border-radius:14px;padding:14px 16px;cursor:pointer;text-align:left;font-family:inherit;position:relative;}
.sl-card:hover,.sl-card.pinned{border-color:#181A4D;}
.sl-chip{font-size:10px;font-weight:700;padding:3px 9px;border-radius:999px;display:inline-block;margin-bottom:8px;background:#FFE3A3;color:#5c3d00;}
.sl-chip.topic{background:#D6CDF0;color:#3d2a7a;}
.sl-card-title{font-size:13px;font-weight:700;line-height:1.3;margin-bottom:6px;color:#20201C;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:18px;}
.sl-card-date{font-size:11px;color:#8a8678;}
.sl-star{position:absolute;top:10px;right:10px;background:none;border:none;cursor:pointer;font-size:15px;color:#8a8678;padding:2px;line-height:1;}
.sl-star.on{color:#181A4D;}
.sl-empty{font-size:13px;color:#8a8879;padding:6px 0 18px;}
.sl-cols{display:grid;grid-template-columns:1fr;gap:22px;align-items:start;}
@media (min-width:1024px){.sl-cols{grid-template-columns:360px minmax(0,1fr);}.sl-cols.wide{grid-template-columns:1fr;}}
.sl-listhead{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;flex-wrap:wrap;}
.sl-bible{font-size:13px;font-weight:700;color:#0F4A42;text-decoration:none;background:none;border:none;cursor:pointer;font-family:inherit;padding:0;}
.sl-bible:hover{text-decoration:underline;}
.sl-list{display:flex;flex-direction:column;gap:8px;}
.sl-row{display:flex;align-items:center;gap:12px;width:100%;background:#fff;border:1.5px solid #ECE4CE;border-radius:14px;padding:12px 14px;cursor:pointer;text-align:left;font-family:inherit;color:#20201C;}
.sl-row:hover{border-color:#181A4D;}
.sl-row.dashed{border-style:dashed;background:transparent;}
.sl-row .ico{color:#181A4D;flex-shrink:0;display:inline-flex;}
.sl-row .txt{flex:1;min-width:0;}
.sl-row .nm{font-size:14px;font-weight:600;color:#181A4D;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.sl-row .sb{font-size:12px;color:#6f6b5e;margin-top:2px;}
.sl-row .ch{color:#181A4D;opacity:.55;font-size:18px;flex-shrink:0;}
.sl-row .cnt{font-size:12px;font-weight:700;color:#0F4A42;background:rgba(15,74,66,.08);border-radius:999px;padding:2px 9px;flex-shrink:0;}
.sl-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#FFAE00;margin-right:6px;vertical-align:middle;position:relative;top:-1px;}
.sl-sub{display:flex;flex-direction:column;gap:6px;margin:2px 0 6px 14px;padding-left:12px;border-left:2px solid #ECE4CE;}
.sl-back{display:block;background:none;border:none;font-family:inherit;font-size:13px;font-weight:700;color:#181A4D;cursor:pointer;padding:0;margin-bottom:10px;}
.sl-fhead{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:14px;}
.sl-fname{font-family:'Archivo Black','Poppins',sans-serif;font-size:26px;font-weight:900;color:#20201C;line-height:1.15;margin:0;}
.sl-fcount{font-size:13px;color:#6f6b5e;margin-top:4px;}
.sl-menuwrap{position:relative;}
.sl-menubtn{width:34px;height:34px;border-radius:999px;border:1.5px solid #ECE4CE;background:#fff;color:#181A4D;cursor:pointer;font-size:16px;}
.sl-menu{position:absolute;right:0;top:calc(100% + 6px);background:#fff;border:1px solid rgba(24,26,77,.15);border-radius:12px;box-shadow:0 12px 32px rgba(24,26,77,.18);padding:6px;z-index:50;min-width:170px;}
.sl-menu button{display:block;width:100%;text-align:left;background:none;border:none;border-radius:8px;padding:8px 10px;font-family:inherit;font-size:13px;color:#181A4D;cursor:pointer;}
.sl-menu button:hover{background:#FBF8ED;}
.sl-menu button.danger{color:#B3220C;}
.sl-group{font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#8a8879;margin:16px 0 8px;}
.sl-dashed{background:transparent;border:1.5px dashed #ECE4CE;color:#181A4D;border-radius:999px;padding:9px 16px;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:6px;}
.sl-dashed:hover{border-color:#181A4D;}
.sl-rename{display:flex;gap:8px;margin-bottom:12px;}
.sl-rename input{flex:1;border:1.5px solid #ECE4CE;border-radius:10px;padding:8px 12px;font-family:inherit;font-size:15px;outline:none;}
#sec-workspace .ws-root{margin-top:0;}
@media (max-width:719px){
  .sl-search{display:none;}
  .sl-search.show{display:flex;width:100%;min-width:0;margin-left:0;order:9;}
  .sl-searchbtn{display:inline-flex;}
  .sl-bar .rd-newstudy,.sl-outline{padding:8px 14px;font-size:12px;}
  .sl-card{flex:0 0 165px;width:165px;padding:12px 14px;}
}
`;

const FolderIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </svg>
);
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8a8879" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
);

export function StudyLibrary({
  userId,
  ready,
  openId,
  bibleGrid,
}: {
  userId: string | null;
  ready: boolean;
  openId?: string;
  /** The existing 66-book coverage view, rendered for "Whole Bible". */
  bibleGrid: (counts: Record<string, number>) => React.ReactNode;
}) {
  const qc = useQueryClient();
  const uid = userId ?? "";
  const booksQ = useBibleBooks();
  const topicsQ = useAllTopics();
  const foldersQ = useStudyFolderList(userId);
  const folders = foldersQ.data ?? [];

  // Same cache as the Workspace widget so open/filed state is shared.
  const itemsQ = useQuery({
    queryKey: ["workspace-items", uid],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_items" as any)
        .select("*")
        .eq("user_id", uid)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as WorkspaceItem[];
    },
  });
  const studies = useMemo(
    () => ((itemsQ.data ?? []) as Study[]).filter((i) => i.kind === "study"),
    [itemsQ.data],
  );

  // Latest "revisited" date per study, for the rail's status line.
  const revisitQ = useQuery({
    queryKey: ["study-links", "revisits", uid],
    enabled: !!userId,
    queryFn: async () => {
      const since = new Date(); since.setDate(since.getDate() - 60);
      const { data } = await supabase
        .from("entry_study_links" as any)
        .select("workspace_item_id,entry_date,status")
        .eq("user_id", uid)
        .eq("status", "revisited")
        .gte("entry_date", localISO(since))
        .order("entry_date", { ascending: false });
      const m: Record<string, string> = {};
      for (const r of (data as any[]) ?? []) if (!m[r.workspace_item_id]) m[r.workspace_item_id] = r.entry_date;
      return m;
    },
  });
  const revisits = revisitQ.data ?? {};

  const bookName = (abbr: string) => booksQ.data?.find((b) => b.abbreviation === abbr)?.full_name ?? abbr;
  const bookOrder = (abbr: string) => booksQ.data?.find((b) => b.abbreviation === abbr)?.sort_order ?? 999;
  const topicName = (id: string) => {
    const t = (topicsQ.data ?? []).find((x) => x.id === id);
    return t ? (t.display_name ?? t.name) : "Topic";
  };
  const folderName = (id: string | null | undefined) => (id ? folders.find((f) => f.id === id)?.name : undefined);

  const [view, setView] = useState<ListView>("folders");
  const [folderView, setFolderView] = useState<string | null>(null); // folder id or "__none"
  const [bible, setBible] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState(false);
  const [openReq, setOpenReq] = useState<{ id: string; n: number } | null>(null);
  const [focused, setFocused] = useState(false);

  const refreshItems = () => qc.invalidateQueries({ queryKey: ["workspace-items", uid] });

  const openStudy = async (id: string) => {
    setOpenReq({ id, n: Date.now() });
    if (!userId) return;
    await logStudyOpen(userId, localISO(), id, "revisited");
    qc.invalidateQueries({ queryKey: ["study-links"] });
  };

  const openedFromUrl = useRef<string | null>(null);
  useEffect(() => {
    if (!openId || openedFromUrl.current === openId || !studies.some((s) => s.id === openId)) return;
    openedFromUrl.current = openId;
    void openStudy(openId);
  }, [openId, studies]); // eslint-disable-line react-hooks/exhaustive-deps

  const newStudy = async (folderId: string | null = null) => {
    if (!userId || busy) return;
    setBusy(true);
    try {
      const id = await createStudy(userId, localISO(), null, folderId);
      await refreshItems();
      qc.invalidateQueries({ queryKey: ["study-links"] });
      setOpenReq({ id, n: Date.now() });
    } catch (e) {
      console.error("create study failed", e);
    } finally {
      setBusy(false);
    }
  };

  const addFolder = async () => {
    if (!userId || !newFolderName.trim()) return;
    try {
      await createFolder(userId, newFolderName, folders.length);
      invalidateFolders(qc, userId);
      setNewFolderName("");
      setNewFolderOpen(false);
    } catch (e) { console.error("create folder failed", e); }
  };

  const renameFolder = async (id: string, name: string) => {
    if (!name.trim()) return;
    await supabase.from("study_folders" as any).update({ name: name.trim() }).eq("id", id);
    invalidateFolders(qc, uid);
    setRenaming(null);
  };

  const deleteFolder = async (id: string) => {
    // Studies stay; the folder link is cleared (on delete set null).
    await supabase.from("study_folders" as any).delete().eq("id", id);
    invalidateFolders(qc, uid);
    refreshItems();
    setConfirmDeleteFolder(false);
    setFolderView(null);
  };

  const togglePin = async (s: Study) => {
    const next = !s.pinned;
    qc.setQueryData<WorkspaceItem[]>(["workspace-items", uid], (cur) => (cur ?? []).map((i) => (i.id === s.id ? { ...i, pinned: next } : i)));
    await supabase.from("workspace_items" as any).update({ pinned: next }).eq("id", s.id);
  };

  // ---- Rail: pinned, then open, then recently edited / revisited (max 6)
  const lastTouch = (s: Study) => {
    const rv = revisits[s.id];
    const ed = dayOf(s.updated_at);
    return rv && rv >= ed ? { kind: "revisited", day: rv } : { kind: "edited", day: s.updated_at };
  };
  const rail = useMemo(() => {
    const touchKey = (s: Study) => { const t = lastTouch(s); return dayOf(t.day) + s.updated_at; };
    const rank = (s: Study) => (s.pinned ? 0 : s.status === "open" ? 1 : 2);
    return [...studies]
      .sort((a, b) => rank(a) - rank(b) || touchKey(b).localeCompare(touchKey(a)))
      .slice(0, 6);
  }, [studies, revisits]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Aggregates
  const byFolder = useMemo(() => {
    const m = new Map<string, Study[]>();
    for (const s of studies) {
      const k = s.folder_id ?? "__none";
      m.set(k, [...(m.get(k) ?? []), s]);
    }
    return m;
  }, [studies]);
  const bookCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of studies) for (const b of s.books_of_bible ?? []) c[b] = (c[b] ?? 0) + 1;
    return c;
  }, [studies]);
  const topicCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of studies) for (const t of s.topic_ids ?? []) c[t] = (c[t] ?? 0) + 1;
    return c;
  }, [studies]);

  const searchResults = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return studies.filter((s) => (s.title ?? "").toLowerCase().includes(term) || (s.body_text ?? "").toLowerCase().includes(term));
  }, [q, studies]);

  const StudyRow = ({ s }: { s: Study }) => {
    const books = (s.books_of_bible ?? []).map(bookName).join(", ");
    return (
      <button type="button" className="sl-row" onClick={() => openStudy(s.id)}>
        <span className="txt">
          <div className="nm">{s.status === "open" && <span className="sl-dot" />}{s.title?.trim() || "Untitled study"}</div>
          <div className="sb">{books ? `${books} · ` : ""}edited {relDay(s.updated_at)}</div>
        </span>
        <span className="ch" aria-hidden>›</span>
      </button>
    );
  };

  const groupByBook = (list: Study[]) => {
    const groups = new Map<string, Study[]>();
    for (const s of list) {
      const k = s.books_of_bible?.[0] ?? "";
      groups.set(k, [...(groups.get(k) ?? []), s]);
    }
    return [...groups.entries()]
      .map(([k, arr]) => ({ k, arr: [...arr].sort((a, b) => b.updated_at.localeCompare(a.updated_at)) }))
      .sort((a, b) => b.arr[0].updated_at.localeCompare(a.arr[0].updated_at));
  };

  if (ready && !userId) {
    return (
      <div className="sl-empty">
        <Link to="/auth" style={{ color: "#181A4D", fontWeight: 700 }}>Sign in</Link> to see and write your studies.
      </div>
    );
  }

  const currentFolder = folderView && folderView !== "__none" ? folders.find((f) => f.id === folderView) : null;
  const folderStudies = folderView ? byFolder.get(folderView) ?? [] : [];

  let left: React.ReactNode;
  if (q.trim()) {
    left = (
      <>
        <div className="sl-label">Search results · {searchResults.length}</div>
        <div className="sl-list">
          {searchResults.length === 0 ? <div className="sl-empty">No studies match “{q.trim()}”.</div> : searchResults.map((s) => <StudyRow key={s.id} s={s} />)}
        </div>
      </>
    );
  } else if (bible) {
    left = (
      <>
        <button type="button" className="sl-back" onClick={() => setBible(false)}>← Read</button>
        {bibleGrid(bookCounts)}
      </>
    );
  } else if (folderView) {
    left = (
      <>
        <button type="button" className="sl-back" onClick={() => { setFolderView(null); setMenuOpen(false); }}>← Read</button>
        <div className="sl-fhead">
          <div style={{ minWidth: 0, flex: 1 }}>
            {renaming !== null && currentFolder ? (
              <div className="sl-rename">
                <input autoFocus value={renaming} onChange={(e) => setRenaming(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void renameFolder(currentFolder.id, renaming); if (e.key === "Escape") setRenaming(null); }} />
                <button type="button" className="rd-newstudy" onClick={() => renameFolder(currentFolder.id, renaming)}>Save</button>
              </div>
            ) : (
              <h2 className="sl-fname">{currentFolder?.name ?? "Not in a folder"}</h2>
            )}
            <div className="sl-fcount">{folderStudies.length} {folderStudies.length === 1 ? "study" : "studies"}</div>
          </div>
          {currentFolder && (
            <div className="sl-menuwrap">
              <button type="button" className="sl-menubtn" aria-label="Folder options" onClick={() => setMenuOpen((v) => !v)}>⋯</button>
              {menuOpen && (
                <div className="sl-menu" role="menu">
                  <button type="button" onClick={() => { setRenaming(currentFolder.name); setMenuOpen(false); }}>Rename</button>
                  <button type="button" className="danger" onClick={() => { setConfirmDeleteFolder(true); setMenuOpen(false); }}>Delete folder</button>
                </div>
              )}
            </div>
          )}
        </div>
        <button type="button" className="sl-dashed" onClick={() => newStudy(currentFolder?.id ?? null)} disabled={busy}>
          + New study in this folder
        </button>
        {folderStudies.length === 0 && <div className="sl-empty">No studies here yet.</div>}
        {groupByBook(folderStudies).map((g) => (
          <div key={g.k || "none"}>
            <div className="sl-group">{g.k ? bookName(g.k) : "No book"}</div>
            <div className="sl-list">{g.arr.map((s) => <StudyRow key={s.id} s={s} />)}</div>
          </div>
        ))}
      </>
    );
  } else {
    const unfiled = byFolder.get("__none") ?? [];
    left = (
      <>
        <div className="sl-listhead">
          <div className="rd-viewtoggle" role="tablist">
            {(["folders", "books", "topics"] as ListView[]).map((v) => (
              <button key={v} type="button" role="tab" className={view === v ? "active" : ""} onClick={() => { setView(v); setExpanded(null); }}>
                {v[0].toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <button type="button" className="sl-bible" onClick={() => setBible(true)}>Whole Bible →</button>
        </div>
        <div className="sl-list">
          {view === "folders" && (
            <>
              {folders.map((f) => {
                const list = byFolder.get(f.id) ?? [];
                const last = list.reduce<string | null>((m, s) => (!m || s.updated_at > m ? s.updated_at : m), null);
                return (
                  <button key={f.id} type="button" className="sl-row" onClick={() => setFolderView(f.id)}>
                    <span className="ico"><FolderIcon /></span>
                    <span className="txt">
                      <div className="nm">{f.name}</div>
                      <div className="sb">{list.length} {list.length === 1 ? "study" : "studies"}{last ? ` · edited ${shortDate(last)}` : ""}</div>
                    </span>
                    <span className="ch" aria-hidden>›</span>
                  </button>
                );
              })}
              <button type="button" className="sl-row dashed" onClick={() => setFolderView("__none")}>
                <span className="txt"><div className="nm">Not in a folder · {unfiled.length} {unfiled.length === 1 ? "study" : "studies"}</div></span>
                <span className="ch" aria-hidden>›</span>
              </button>
            </>
          )}
          {view === "books" && (
            Object.keys(bookCounts).length === 0 ? <div className="sl-empty">No studies are tagged with a book yet.</div> :
            Object.keys(bookCounts).sort((a, b) => bookOrder(a) - bookOrder(b)).map((abbr) => (
              <div key={abbr}>
                <button type="button" className="sl-row" onClick={() => setExpanded(expanded === abbr ? null : abbr)} aria-expanded={expanded === abbr}>
                  <span className="txt"><div className="nm">{bookName(abbr)}</div></span>
                  <span className="cnt">{bookCounts[abbr]}</span>
                  <span className="ch" aria-hidden>{expanded === abbr ? "⌄" : "›"}</span>
                </button>
                {expanded === abbr && (
                  <div className="sl-sub">
                    {studies.filter((s) => (s.books_of_bible ?? []).includes(abbr)).map((s) => <StudyRow key={s.id} s={s} />)}
                  </div>
                )}
              </div>
            ))
          )}
          {view === "topics" && (
            Object.keys(topicCounts).length === 0 ? <div className="sl-empty">No studies are tagged with a topic yet.</div> :
            Object.keys(topicCounts).sort((a, b) => topicCounts[b] - topicCounts[a]).map((tid) => (
              <div key={tid}>
                <button type="button" className="sl-row" onClick={() => setExpanded(expanded === tid ? null : tid)} aria-expanded={expanded === tid}>
                  <span className="txt"><div className="nm">{topicName(tid)}</div></span>
                  <span className="cnt">{topicCounts[tid]}</span>
                  <span className="ch" aria-hidden>{expanded === tid ? "⌄" : "›"}</span>
                </button>
                {expanded === tid && (
                  <div className="sl-sub">
                    {studies.filter((s) => (s.topic_ids ?? []).includes(tid)).map((s) => <StudyRow key={s.id} s={s} />)}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </>
    );
  }

  return (
    <div className="sl">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="sl-bar">
        <button type="button" className="rd-newstudy" onClick={() => newStudy(folderView && folderView !== "__none" ? folderView : null)} disabled={busy || !userId}>
          <span aria-hidden style={{ fontSize: 16, lineHeight: 1 }}>+</span> New study
        </button>
        <button type="button" className="sl-outline" onClick={() => setNewFolderOpen((v) => !v)}>+ New folder</button>
        <button type="button" className="sl-outline sl-searchbtn" aria-label="Search your studies" onClick={() => setShowSearch((v) => !v)}><SearchIcon /></button>
        <label className={`sl-search${showSearch ? " show" : ""}`}>
          <SearchIcon />
          <input placeholder="Search your studies…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>

      {newFolderOpen && (
        <div className="sl-newfolder">
          <input autoFocus placeholder="Folder name" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void addFolder(); if (e.key === "Escape") setNewFolderOpen(false); }} />
          <button type="button" className="rd-newstudy" onClick={addFolder} disabled={!newFolderName.trim()}>Create</button>
        </div>
      )}

      <div className="sl-label">Pick up where you left off</div>
      {rail.length === 0 ? (
        <div className="sl-empty">No studies yet. Start one with “+ New study”.</div>
      ) : (
        <div className="sl-rail">
          {rail.map((s) => {
            const t = lastTouch(s);
            const book = s.books_of_bible?.[0];
            const topicOnly = !book && (s.topic_ids ?? []).length > 0;
            return (
              <div key={s.id} className={`sl-card${s.pinned ? " pinned" : ""}`} role="button" tabIndex={0}
                onClick={() => openStudy(s.id)} onKeyDown={(e) => { if (e.key === "Enter") void openStudy(s.id); }}>
                <button type="button" className={`sl-star${s.pinned ? " on" : ""}`} aria-label={s.pinned ? "Unstar" : "Star"}
                  onClick={(e) => { e.stopPropagation(); void togglePin(s); }}>{s.pinned ? "★" : "☆"}</button>
                {book ? <span className="sl-chip">{bookName(book)}</span> : topicOnly ? <span className="sl-chip topic">Topic</span> : <span className="sl-chip">Study</span>}
                <div className="sl-card-title">{s.title?.trim() || "Untitled study"}</div>
                <div className="sl-card-date">
                  {s.status === "open" ? "Open" : "Filed"} · {t.kind} {relDay(t.day)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className={`sl-cols${bible ? " wide" : ""}`}>
        <div className="sl-left">{left}</div>
        <div id="sec-workspace" className="sl-right">
          {userId && (
            <WorkspaceSection
              mode="studies"
              userId={uid}
              ensureEntry={async () => null}
              currentEntryId={null}
              openRequest={openReq}
              logDate={localISO()}
              isFocused={focused}
              onToggleFocus={() => setFocused((v) => !v)}
            />
          )}
        </div>
      </div>

      <DeleteConfirmModal
        open={confirmDeleteFolder}
        title="Delete this folder?"
        message="The folder is removed. Its studies are kept and become unfiled."
        onCancel={() => setConfirmDeleteFolder(false)}
        onConfirm={() => { if (currentFolder) void deleteFolder(currentFolder.id); }}
      />
    </div>
  );
}
