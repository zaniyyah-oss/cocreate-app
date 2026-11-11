import { useMemo, useRef, useState } from "react";
import { WorkspaceEditor } from "./WorkspaceEditor";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { addPage, deletePage, mirrorFields, movePage, outlineOf, pagesFromItem, type DocPage } from "@/lib/doc-pages";

const CSS = `
.dp-bar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:6px 0 4px;}
.dp-pill{position:relative;display:inline-flex;align-items:center;gap:2px;border-radius:999px;background:transparent;border:1px solid rgba(24,26,77,0.12);color:#181A4D;font-family:inherit;font-size:12.5px;font-weight:600;padding:0;}
.dp-pill.sub{border-style:dashed;font-weight:500;font-size:12px;}
.dp-pill.sub::before{content:'↳';padding-left:9px;color:rgba(24,26,77,0.45);}
.dp-pill.on{background:#fff;border-color:rgba(24,26,77,0.25);box-shadow:0 2px 8px rgba(24,26,77,0.10);}
.dp-pill button.dp-name{background:none;border:none;font:inherit;color:inherit;padding:5px 4px 5px 11px;cursor:pointer;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dp-pill input{border:none;outline:none;background:transparent;font:inherit;color:inherit;padding:5px 4px 5px 11px;width:140px;}
.dp-more{background:none;border:none;color:rgba(24,26,77,0.5);cursor:pointer;padding:3px 9px 3px 3px;font-size:13px;line-height:1;}
.dp-more:hover{color:#181A4D;}
.dp-menu{position:absolute;top:calc(100% + 4px);left:0;z-index:220;background:#fff;border:1px solid rgba(24,26,77,0.1);border-radius:10px;box-shadow:0 8px 24px rgba(24,26,77,0.14);padding:4px;min-width:150px;display:flex;flex-direction:column;}
.dp-menu button{background:none;border:none;text-align:left;font-family:inherit;font-size:13px;color:#181A4D;padding:7px 10px;border-radius:7px;cursor:pointer;}
.dp-menu button:hover{background:rgba(24,26,77,0.06);}
.dp-menu button.del{color:#B3261E;}
.dp-menu button:disabled{opacity:.35;cursor:default;background:none;}
.dp-add{background:none;border:none;font-family:inherit;font-size:12.5px;color:rgba(24,26,77,0.55);cursor:pointer;padding:5px 6px;}
.dp-add:hover{color:#181A4D;}
.dp-outline{margin:6px 0 2px;padding:8px 12px;border-left:2px solid #DCE07A;}
.dp-outline-h{font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#8a8678;margin-bottom:4px;}
.dp-outline button{display:block;background:none;border:none;text-align:left;font-family:inherit;font-size:12.5px;color:#181A4D;padding:2px 0;cursor:pointer;}
.dp-outline button:hover{text-decoration:underline;}
`;

export function DocPages({
  item,
  userId,
  onSave,
  onTextChange,
  onBlur,
  ignoreExternalUpdates,
}: {
  item: { id: string; body: any; body_text: string; pages?: any };
  userId: string;
  onSave: (patch: Record<string, unknown>) => void;
  onTextChange?: (allText: string) => void;
  onBlur?: () => void;
  ignoreExternalUpdates?: boolean;
}) {
  const [pages, setPages] = useState<DocPage[]>(() => pagesFromItem(item));
  const [activeId, setActiveId] = useState(pages[0].id);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef(pages);
  pagesRef.current = pages;

  const active = pages.find((p) => p.id === activeId) ?? pages[0];
  const outline = useMemo(() => outlineOf(active.body), [active.body]);

  const commit = (next: DocPage[]) => {
    setPages(next);
    pagesRef.current = next;
    const m = mirrorFields(next);
    onTextChange?.(m.body_text);
    // A single untouched page stays in the classic shape.
    if (next.length === 1 && next[0].id === "main" && next[0].title === "Overview") onSave({ body: m.body, body_text: m.body_text });
    else onSave(m);
  };

  const add = (parentId: string | null) => {
    const r = addPage(pagesRef.current, parentId);
    commit(r.pages);
    setActiveId(r.id);
    setRenaming(r.id);
    setMenuFor(null);
  };

  const rename = (id: string, title: string) =>
    commit(pagesRef.current.map((p) => (p.id === id ? { ...p, title: title.trim() || "Untitled page" } : p)));

  const multi = pages.length > 1;

  return (
    <div ref={wrapRef} onClick={(e) => { if (!(e.target as HTMLElement).closest(".dp-pill")) setMenuFor(null); }}>
      <style>{CSS}</style>
      <div className="dp-bar">
        {multi && pages.map((p) => {
          const isRoot = !p.parentId;
          const sibs = pages.filter((x) => (x.parentId ?? null) === (p.parentId ?? null));
          const idx = sibs.findIndex((x) => x.id === p.id);
          return (
            <span key={p.id} className={`dp-pill${isRoot ? "" : " sub"}${p.id === active.id ? " on" : ""}`}>
              {renaming === p.id ? (
                <input
                  autoFocus
                  defaultValue={p.title}
                  onFocus={(e) => e.currentTarget.select()}
                  onBlur={(e) => { rename(p.id, e.currentTarget.value); setRenaming(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur(); }}
                />
              ) : (
                <button type="button" className="dp-name" onClick={() => setActiveId(p.id)} onDoubleClick={() => setRenaming(p.id)}>{p.title}</button>
              )}
              <button type="button" className="dp-more" aria-label="Page options" onClick={() => setMenuFor(menuFor === p.id ? null : p.id)}>⋯</button>
              {menuFor === p.id && (
                <div className="dp-menu">
                  <button type="button" onClick={() => { setRenaming(p.id); setMenuFor(null); }}>Rename</button>
                  {isRoot && <button type="button" onClick={() => add(p.id)}>Add sub-page</button>}
                  <button type="button" disabled={idx <= 0} onClick={() => { commit(movePage(pagesRef.current, p.id, -1)); setMenuFor(null); }}>Move left</button>
                  <button type="button" disabled={idx >= sibs.length - 1} onClick={() => { commit(movePage(pagesRef.current, p.id, 1)); setMenuFor(null); }}>Move right</button>
                  <button type="button" className="del" onClick={() => { setConfirmDel(p.id); setMenuFor(null); }}>Delete page</button>
                </div>
              )}
            </span>
          );
        })}
        <button type="button" className="dp-add" onClick={() => add(null)}>+ {multi ? "Page" : "Add page"}</button>
      </div>

      {outline.length >= 2 && (
        <div className="dp-outline">
          <div className="dp-outline-h">On this page</div>
          {outline.map((h) => (
            <button
              key={h.index}
              type="button"
              style={{ paddingLeft: (h.level - 1) * 12 }}
              onClick={() => {
                const hs = wrapRef.current?.querySelectorAll(".ws-editor-content h1, .ws-editor-content h2, .ws-editor-content h3");
                (hs?.[h.index] as HTMLElement | undefined)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >{h.text}</button>
          ))}
        </div>
      )}

      <WorkspaceEditor
        key={active.id}
        userId={userId}
        initialJSON={active.body}
        onChange={(json, text) => commit(pagesRef.current.map((p) => (p.id === active.id ? { ...p, body: json, text } : p)))}
        onBlur={onBlur}
        ignoreExternalUpdates={ignoreExternalUpdates}
      />

      <DeleteConfirmModal
        open={!!confirmDel}
        title="Delete this page?"
        message="This page, its sub-pages, and everything written on them will be removed. This can't be undone."
        onCancel={() => setConfirmDel(null)}
        onConfirm={() => {
          const id = confirmDel!;
          const next = deletePage(pagesRef.current, id);
          commit(next);
          if (!next.find((p) => p.id === activeId)) setActiveId(next[0].id);
          setConfirmDel(null);
        }}
      />
    </div>
  );
}
