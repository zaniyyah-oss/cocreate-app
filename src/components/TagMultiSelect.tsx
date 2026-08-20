import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function TagMultiSelect({
  userId,
  guest,
  selected,
  colors,
  onToggle,
  onCreate,
  onDeleted,
  draft,
  setDraft,
}: {
  userId: string;
  guest: boolean;
  selected: string[];
  colors: Record<string, string>;
  onToggle: (t: string) => void;
  onCreate: (t: string) => void;
  onDeleted: (t: string) => void;
  draft: string;
  setDraft: (v: string) => void;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) { setOpen(false); setDraft(""); }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, setDraft]);

  const allQ = useQuery({
    queryKey: ["workspace-all-tags", userId],
    enabled: !guest && !!userId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_items" as any)
        .select("tags")
        .eq("user_id", userId)
        .limit(500);
      if (error) throw error;
      const set = new Set<string>();
      for (const r of (data as any[]) || []) for (const t of (r.tags || [])) set.add(String(t));
      return Array.from(set).sort();
    },
  });

  const options = useMemo(() => {
    const set = new Set<string>([...(allQ.data ?? []), ...Object.keys(colors), ...selected]);
    const q = draft.trim().replace(/^#/, "").toLowerCase();
    const list = Array.from(set).sort();
    return q ? list.filter((t) => t.includes(q)) : list;
  }, [allQ.data, colors, selected, draft]);

  const cleanDraft = draft.trim().replace(/^#/, "").toLowerCase();
  const canCreate = !!cleanDraft && !options.includes(cleanDraft);

  // Deletes a tag everywhere: it's removed from every note that carries it,
  // and from the saved tag colors. The notes themselves are untouched — they
  // simply become untagged.
  const deleteTagEverywhere = async (tag: string) => {
    if (deleting) return;
    if (typeof window !== "undefined") {
      const ok = window.confirm(
        `Delete the tag "#${tag}" from all of your notes? The notes stay — they just become untagged.`
      );
      if (!ok) return;
    }
    setDeleting(tag);
    try {
      if (!guest) {
        const { data, error } = await supabase
          .from("workspace_items" as any)
          .select("id,tags")
          .eq("user_id", userId)
          .contains("tags", [tag]);
        if (error) throw error;
        for (const row of (data as any[]) || []) {
          const next = ((row.tags as string[]) || []).filter((x) => x !== tag);
          const { error: uErr } = await supabase
            .from("workspace_items" as any)
            .update({ tags: next })
            .eq("id", row.id);
          if (uErr) throw uErr;
        }
        await supabase.from("user_tag_colors" as any).delete().eq("user_id", userId).eq("tag", tag);
        qc.invalidateQueries({ queryKey: ["workspace-items", userId] });
        qc.invalidateQueries({ queryKey: ["workspace-all-tags", userId] });
        qc.invalidateQueries({ queryKey: ["user-tag-colors", userId] });
      }
      onDeleted(tag);
    } catch (e) {
      console.error("deleteTagEverywhere failed", e);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="ws-tagms" ref={wrapRef} onClick={(e) => e.stopPropagation()}>
      <style>{`
        .ws-tagms{position:relative;display:inline-block;font-family:'Poppins',sans-serif;}
        .ws-tagms-btn{background:transparent;border:1px dashed rgba(24,26,77,0.25);color:#20201C;border-radius:999px;padding:4px 11px;font-size:11px;font-weight:600;font-family:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:5px;}
        .ws-tagms-btn:hover{border-color:#181A4D;border-style:solid;color:#181A4D;}
        .ws-tagms-menu{position:absolute;top:calc(100% + 6px);left:0;z-index:90;background:#fff;border:1px solid rgba(24,26,77,0.15);border-radius:12px;padding:8px;min-width:220px;max-height:280px;overflow:auto;box-shadow:0 8px 24px rgba(24,26,77,0.15);}
        .ws-tagms-menu input{width:100%;border:1px solid rgba(24,26,77,0.15);border-radius:8px;padding:6px 8px;font-size:12px;font-family:inherit;margin-bottom:6px;outline:none;background:#fff;}
        .ws-tagms-menu input:focus{border-color:#181A4D;}
        .ws-tagms-row{display:flex;align-items:center;gap:2px;border-radius:8px;}
        .ws-tagms-row:hover{background:#FBF8ED;}
        .ws-tagms-row.on{background:rgba(15,74,66,0.08);}
        .ws-tagms-row.on .ws-tagms-opt{font-weight:700;color:#0F4A42;}
        .ws-tagms-del{border:none;background:transparent;cursor:pointer;font-size:12px;line-height:1;padding:6px 8px;border-radius:8px;opacity:.45;}
        .ws-tagms-row:hover .ws-tagms-del{opacity:1;}
        .ws-tagms-del:hover{background:#FDE2E2;}
        .ws-tagms-del[disabled]{opacity:.3;cursor:not-allowed;}
        .ws-tagms-opt{display:flex;align-items:center;justify-content:space-between;gap:8px;flex:1;min-width:0;padding:7px 9px;border:none;background:transparent;border-radius:8px;cursor:pointer;font-family:inherit;font-size:12px;color:#20201C;text-align:left;}
        .ws-tagms-opt:hover{background:transparent;}
        .ws-tagms-dot{width:10px;height:10px;border-radius:50%;border:1px solid rgba(24,26,77,0.15);flex-shrink:0;}
        .ws-tagms-create{display:block;width:100%;padding:7px 9px;border:none;border-radius:8px;background:#F2FBF4;color:#0F4A42;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;margin-top:4px;text-align:left;}
        .ws-tagms-empty{padding:8px 9px;font-size:11.5px;color:#8a8879;}
      `}</style>
      <button type="button" className="ws-tagms-btn" onClick={() => setOpen((o) => !o)}>
        + tag <span aria-hidden>▾</span>
      </button>
      {open && (
        <div className="ws-tagms-menu">
          <input
            autoFocus
            placeholder="Search or create a tag…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && cleanDraft) {
                e.preventDefault();
                if (canCreate) onCreate(cleanDraft);
                else if (!selected.includes(cleanDraft)) onToggle(cleanDraft);
                setDraft("");
              }
            }}
          />
          {options.length === 0 && !canCreate && <div className="ws-tagms-empty">No tags yet.</div>}
          {options.map((t) => {
            const on = selected.includes(t);
            return (
              <div key={t} className={`ws-tagms-row ${on ? "on" : ""}`}>
                <button
                  type="button"
                  className="ws-tagms-opt"
                  onClick={() => onToggle(t)}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span className="ws-tagms-dot" style={colors[t] ? { background: colors[t] } : undefined} />
                    #{t}
                  </span>
                  {on && <span>✓</span>}
                </button>
                <button
                  type="button"
                  className="ws-tagms-del"
                  title={`Delete "${t}" from every note`}
                  aria-label={`Delete tag ${t}`}
                  disabled={deleting === t}
                  onClick={() => void deleteTagEverywhere(t)}
                >
                  🗑
                </button>
              </div>
            );
          })}
          {canCreate && (
            <button type="button" className="ws-tagms-create" onClick={() => { onCreate(cleanDraft); setDraft(""); }}>
              + Create "{cleanDraft}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}

