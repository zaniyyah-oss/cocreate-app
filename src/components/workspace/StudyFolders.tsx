import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type StudyFolder = { id: string; name: string; sort_order: number; created_at: string; updated_at: string };

export function useStudyFolderList(userId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["study-folder-list", userId],
    enabled: enabled && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_folders" as any)
        .select("id,name,sort_order,created_at,updated_at")
        .eq("user_id", userId!)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as StudyFolder[];
    },
  });
}

export function invalidateFolders(qc: ReturnType<typeof useQueryClient>, userId: string) {
  qc.invalidateQueries({ queryKey: ["study-folder-list", userId] });
  qc.invalidateQueries({ queryKey: ["study-folders", userId] });
}

export async function createFolder(userId: string, name: string, sortOrder: number) {
  const { data, error } = await supabase
    .from("study_folders" as any)
    .insert({ user_id: userId, name: name.trim(), sort_order: sortOrder })
    .select("id")
    .single();
  if (error) throw error;
  return (data as any).id as string;
}

const CSS = `
.mtf-wrap{position:relative;display:inline-block;}
.mtf-pop{position:absolute;bottom:calc(100% + 8px);left:0;min-width:240px;max-width:300px;background:#fff;border:1px solid rgba(24,26,77,0.15);border-radius:12px;box-shadow:0 12px 32px rgba(24,26,77,0.18);padding:6px;z-index:90;font-family:'Poppins',sans-serif;}
.mtf-head{font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6f6b5e;padding:6px 8px 4px;}
.mtf-opt{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;background:none;border:none;border-radius:8px;padding:8px 10px;font-family:inherit;font-size:13px;color:#181A4D;cursor:pointer;text-align:left;}
.mtf-opt:hover{background:#FBF8ED;}
.mtf-opt.on{font-weight:700;}
.mtf-sep{height:1px;background:rgba(24,26,77,0.08);margin:4px 0;}
.mtf-new{display:flex;gap:6px;padding:4px;}
.mtf-new input{flex:1;min-width:0;border:1px solid rgba(24,26,77,0.18);border-radius:8px;padding:7px 9px;font-family:inherit;font-size:13px;outline:none;}
.mtf-new button{background:#181A4D;color:#DCE07A;border:none;border-radius:8px;padding:0 10px;font-family:inherit;font-weight:600;font-size:12px;cursor:pointer;}
`;

/** "Move to folder…" action: pick a folder, choose "No folder", or create one inline. */
export function MoveToFolderButton({
  userId,
  itemId,
  currentFolderId,
  onMoved,
  className = "ws-linkaction",
}: {
  userId: string;
  itemId: string;
  currentFolderId: string | null | undefined;
  onMoved?: (folderId: string | null) => void;
  className?: string;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const folders = useStudyFolderList(userId, open).data ?? [];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const move = async (folderId: string | null) => {
    setBusy(true);
    const { error } = await supabase.from("workspace_items" as any).update({ folder_id: folderId }).eq("id", itemId);
    setBusy(false);
    if (error) { console.error("move to folder failed", error); return; }
    qc.setQueryData<any[]>(["workspace-items", userId], (cur) => (cur ?? []).map((i) => (i.id === itemId ? { ...i, folder_id: folderId } : i)));
    qc.invalidateQueries({ queryKey: ["workspace-items", userId] });
    qc.invalidateQueries({ queryKey: ["study-links"] });
    onMoved?.(folderId);
    setOpen(false);
  };

  const createAndMove = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const id = await createFolder(userId, name, folders.length);
      invalidateFolders(qc, userId);
      setName("");
      await move(id);
    } catch (e) {
      console.error("create folder failed", e);
      setBusy(false);
    }
  };

  return (
    <div className="mtf-wrap" ref={ref}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <button type="button" className={className} onClick={() => setOpen((v) => !v)}>Move to folder…</button>
      {open && (
        <div className="mtf-pop" role="menu">
          <div className="mtf-head">Move to</div>
          {folders.map((f) => (
            <button key={f.id} type="button" className={`mtf-opt${f.id === currentFolderId ? " on" : ""}`} onClick={() => move(f.id)} disabled={busy}>
              {f.name}{f.id === currentFolderId ? <span>✓</span> : null}
            </button>
          ))}
          <button type="button" className={`mtf-opt${!currentFolderId ? " on" : ""}`} onClick={() => move(null)} disabled={busy}>
            Not in a folder{!currentFolderId ? <span>✓</span> : null}
          </button>
          <div className="mtf-sep" />
          <div className="mtf-new">
            <input
              placeholder="New folder name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void createAndMove(); } }}
            />
            <button type="button" onClick={createAndMove} disabled={!name.trim() || busy}>Create</button>
          </div>
        </div>
      )}
    </div>
  );
}
