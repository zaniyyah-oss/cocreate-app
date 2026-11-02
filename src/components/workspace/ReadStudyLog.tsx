import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createStudy, logStudyOpen, shortDate, type StudyLinkStatus } from "@/lib/study-log";

type LinkRow = {
  id: string;
  status: StudyLinkStatus;
  entry_date: string;
  workspace_item_id: string;
  created_at: string;
  workspace_items: { id: string; title: string; updated_at: string; folder_id: string | null; kind: string } | null;
};

type StudyRow = { id: string; title: string; updated_at: string; folder_id: string | null };

const CSS = `
.rsl-list{display:flex;flex-direction:column;gap:6px;margin:0 0 10px;}
.rsl-row{display:flex;align-items:center;gap:10px;width:100%;background:#FBF8ED;border:1px solid rgba(24,26,77,0.10);border-radius:10px;padding:10px 12px;cursor:pointer;text-align:left;font-family:'Poppins',sans-serif;}
.rsl-row:hover{border-color:#181A4D;}
.rsl-ico{flex-shrink:0;color:#181A4D;display:inline-flex;}
.rsl-txt{flex:1;min-width:0;}
.rsl-title{font-size:14px;font-weight:600;color:#181A4D;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.rsl-sub{font-size:12px;color:#6f6b5e;margin-top:2px;}
.rsl-chev{flex-shrink:0;color:#181A4D;opacity:0.6;font-size:16px;}
.rsl-empty{font-size:12.5px;color:#8a8678;margin:0 0 10px;}
.rsl-actions{display:flex;gap:8px;flex-wrap:wrap;}
.rsl-pill{background:transparent;border:1px dashed rgba(24,26,77,0.35);color:#181A4D;border-radius:999px;padding:7px 14px;font-family:'Poppins',sans-serif;font-weight:600;font-size:12.5px;cursor:pointer;}
.rsl-pill:hover{border-style:solid;border-color:#181A4D;}
.rsl-pill:disabled{opacity:0.5;cursor:wait;}
.rsl-ov{position:fixed;inset:0;background:rgba(24,26,77,0.35);z-index:600;display:flex;align-items:flex-start;justify-content:center;padding:60px 16px;}
.rsl-panel{background:#fff;border-radius:16px;width:100%;max-width:520px;max-height:76vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.25);font-family:'Poppins',sans-serif;overflow:hidden;}
.rsl-phead{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid rgba(24,26,77,0.1);}
.rsl-phead h3{margin:0;font-size:15px;color:#181A4D;font-weight:700;}
.rsl-x{width:30px;height:30px;border-radius:50%;border:none;background:#F1EDDD;color:#181A4D;cursor:pointer;font-size:15px;}
.rsl-search{margin:12px 18px 8px;padding:9px 12px;border:1px solid rgba(24,26,77,0.18);border-radius:10px;font-family:inherit;font-size:14px;outline:none;}
.rsl-search:focus{border-color:#181A4D;}
.rsl-plist{overflow-y:auto;padding:4px 10px 14px;display:flex;flex-direction:column;gap:4px;}
.rsl-popt{display:flex;flex-direction:column;align-items:flex-start;background:none;border:none;border-radius:8px;padding:9px 10px;cursor:pointer;text-align:left;font-family:inherit;}
.rsl-popt:hover{background:#FBF8ED;}
.rsl-popt b{font-size:14px;font-weight:600;color:#181A4D;}
.rsl-popt span{font-size:12px;color:#6f6b5e;margin-top:2px;}
`;

const FileIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
  </svg>
);

export function useStudyFolders(userId: string, enabled = true) {
  return useQuery({
    queryKey: ["study-folders", userId],
    enabled: enabled && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("study_folders" as any).select("id,name").eq("user_id", userId);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const f of (data as any[]) ?? []) map[f.id] = f.name;
      return map;
    },
  });
}

export function ReadStudyLog({
  userId,
  date,
  guest,
  onGuestGate,
  ensureEntry,
  onOpen,
}: {
  userId: string;
  date: string;
  guest: boolean;
  onGuestGate?: () => void;
  ensureEntry: () => Promise<string | null>;
  onOpen: (itemId: string) => void;
}) {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [q, setQ] = useState("");
  const folders = useStudyFolders(userId, !guest).data ?? {};

  const linksQ = useQuery({
    queryKey: ["study-links", userId, date],
    enabled: !guest && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entry_study_links" as any)
        .select("id,status,entry_date,workspace_item_id,created_at,workspace_items(id,title,updated_at,folder_id,kind)")
        .eq("user_id", userId)
        .eq("entry_date", date)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const rows = ((data ?? []) as unknown as LinkRow[]).filter((r) => r.workspace_items?.kind === "study");
      // "last edited" for revisited rows: latest earlier day this study was started/continued.
      const ids = rows.filter((r) => r.status === "revisited").map((r) => r.workspace_item_id);
      const lastEdited: Record<string, string> = {};
      if (ids.length) {
        const { data: prior } = await supabase
          .from("entry_study_links" as any)
          .select("workspace_item_id,entry_date")
          .eq("user_id", userId)
          .in("workspace_item_id", ids)
          .in("status", ["new", "continued"])
          .lt("entry_date", date)
          .order("entry_date", { ascending: false });
        for (const p of (prior as any[]) ?? []) {
          if (!lastEdited[p.workspace_item_id]) lastEdited[p.workspace_item_id] = p.entry_date;
        }
      }
      return { rows, lastEdited };
    },
  });

  const studiesQ = useQuery({
    queryKey: ["study-picker", userId],
    enabled: pickerOpen && !guest && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_items" as any)
        .select("id,title,updated_at,folder_id")
        .eq("user_id", userId)
        .eq("kind", "study")
        .order("updated_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as unknown as StudyRow[];
    },
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const all = studiesQ.data ?? [];
    if (!term) return all;
    return all.filter((s) => (s.title ?? "").toLowerCase().includes(term) || (folders[s.folder_id ?? ""] ?? "").toLowerCase().includes(term));
  }, [studiesQ.data, q, folders]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["study-links", userId, date] });
    qc.invalidateQueries({ queryKey: ["workspace-items", userId] });
  };

  const newStudy = async () => {
    if (guest) { onGuestGate?.(); return; }
    setCreating(true);
    try {
      const entryId = await ensureEntry();
      const id = await createStudy(userId, date, entryId);
      refresh();
      onOpen(id);
    } catch (e) {
      console.error("create study failed", e);
    } finally {
      setCreating(false);
    }
  };

  const openExisting = async (id: string) => {
    setPickerOpen(false);
    setQ("");
    await logStudyOpen(userId, date, id, "revisited");
    refresh();
    onOpen(id);
  };

  const rows = linksQ.data?.rows ?? [];
  const sub = (r: LinkRow) => {
    const it = r.workspace_items!;
    let s =
      r.status === "new"
        ? "Started today"
        : r.status === "continued"
          ? "Continued today"
          : `Revisited · last edited ${shortDate(linksQ.data?.lastEdited[r.workspace_item_id] ?? it.updated_at)}`;
    const folder = it.folder_id ? folders[it.folder_id] : null;
    if (folder) s += ` · ${folder}`;
    return s;
  };

  return (
    <div className="rsl">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {rows.length > 0 ? (
        <div className="rsl-list">
          {rows.map((r) => (
            <button key={r.id} type="button" className="rsl-row" onClick={() => onOpen(r.workspace_item_id)}>
              <span className="rsl-ico"><FileIcon /></span>
              <span className="rsl-txt">
                <div className="rsl-title">{r.workspace_items?.title?.trim() || "Untitled study"}</div>
                <div className="rsl-sub">{sub(r)}</div>
              </span>
              <span className="rsl-chev" aria-hidden="true">›</span>
            </button>
          ))}
        </div>
      ) : linksQ.isLoading && !guest ? null : (
        <div className="rsl-empty">No studies logged for this day yet.</div>
      )}
      <div className="rsl-actions">
        <button type="button" className="rsl-pill" onClick={newStudy} disabled={creating}>
          {creating ? "Creating…" : "+ New study"}
        </button>
        <button
          type="button"
          className="rsl-pill"
          onClick={() => (guest ? onGuestGate?.() : setPickerOpen(true))}
        >
          Open a study
        </button>
      </div>

      {pickerOpen && (
        <div className="rsl-ov" onClick={() => setPickerOpen(false)}>
          <div className="rsl-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Open a study">
            <div className="rsl-phead">
              <h3>Open a study</h3>
              <button type="button" className="rsl-x" onClick={() => setPickerOpen(false)} aria-label="Close">✕</button>
            </div>
            <input className="rsl-search" placeholder="Search your studies…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
            <div className="rsl-plist">
              {studiesQ.isLoading ? (
                <div className="rsl-empty" style={{ padding: "8px 10px" }}>Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="rsl-empty" style={{ padding: "8px 10px" }}>No studies found.</div>
              ) : (
                filtered.map((s) => (
                  <button key={s.id} type="button" className="rsl-popt" onClick={() => openExisting(s.id)}>
                    <b>{s.title?.trim() || "Untitled study"}</b>
                    <span>
                      {s.folder_id && folders[s.folder_id] ? `${folders[s.folder_id]} · ` : ""}last edited {shortDate(s.updated_at)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
