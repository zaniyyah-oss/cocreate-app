import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { WorkspaceEditor } from "./WorkspaceEditor";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { addPage, deletePage, mirrorFields, movePage, outlineOf, pagesFromItem, type DocPage } from "@/lib/doc-pages";

const CSS = `
.dp-wrap{position:relative;}
.dp-wrap.focus{display:flex;align-items:flex-start;min-height:100vh;}
.dp-wrap.focus .dp-main{padding:56px 40px 120px;max-width:900px;margin:0 auto;}
.dp-main{flex:1;min-width:0;}
/* compact peek bar */
.dp-peekrow{display:flex;align-items:center;gap:8px;margin:2px 0 6px;position:relative;z-index:60;}
.dp-peek{display:inline-flex;align-items:center;gap:7px;height:28px;padding:0 11px;border-radius:8px;border:1px solid rgba(24,26,77,0.12);background:#fff;color:#181A4D;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;max-width:100%;}
.dp-peek:hover,.dp-peek.on{border-color:rgba(24,26,77,0.3);box-shadow:0 2px 8px rgba(24,26,77,0.08);}
.dp-peek .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:220px;}
.dp-peek .ct{color:rgba(24,26,77,0.5);font-weight:500;}
.dp-pop{position:absolute;top:calc(100% + 6px);left:0;z-index:230;width:min(320px,calc(100vw - 32px));max-height:min(420px,60vh);overflow:auto;background:#fff;border:1px solid rgba(24,26,77,0.1);border-radius:12px;box-shadow:0 12px 32px rgba(24,26,77,0.16);padding:10px;}
@media (max-width:719px){.dp-pop{position:fixed;top:auto;bottom:0;left:0;right:0;width:auto;max-height:70vh;border-radius:16px 16px 0 0;padding:14px 14px 24px;}}
/* shared tree */
.dp-head{display:flex;align-items:center;justify-content:space-between;font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#8a8678;padding:2px 6px 8px;}
.dp-head button{background:none;border:none;color:#181A4D;font-size:17px;line-height:1;cursor:pointer;padding:0 4px;}
.dp-tab{position:relative;display:flex;align-items:center;gap:6px;border-radius:9px;padding:0 4px 0 8px;}
.dp-tab.sub{margin-left:16px;}
.dp-tab:hover{background:rgba(24,26,77,0.04);}
.dp-tab.on{background:#fff;box-shadow:0 1px 6px rgba(24,26,77,0.10);border:1px solid rgba(24,26,77,0.08);}
.dp-tab .ic{color:rgba(24,26,77,0.5);font-size:12px;flex-shrink:0;}
.dp-tab button.dp-name{flex:1;min-width:0;background:none;border:none;font:inherit;font-size:13.5px;font-weight:600;color:#181A4D;text-align:left;padding:8px 0;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dp-tab input{flex:1;min-width:0;border:none;outline:none;background:transparent;font:inherit;font-size:13.5px;font-weight:600;color:#181A4D;padding:8px 0;}
.dp-more{background:none;border:none;color:rgba(24,26,77,0.45);cursor:pointer;padding:4px 6px;font-size:14px;line-height:1;border-radius:6px;}
.dp-more:hover{color:#181A4D;background:rgba(24,26,77,0.06);}
.dp-menu{position:absolute;top:calc(100% + 2px);right:0;z-index:240;background:#fff;border:1px solid rgba(24,26,77,0.1);border-radius:10px;box-shadow:0 8px 24px rgba(24,26,77,0.14);padding:4px;min-width:150px;display:flex;flex-direction:column;}
.dp-menu button{background:none;border:none;text-align:left;font-family:inherit;font-size:13px;color:#181A4D;padding:7px 10px;border-radius:7px;cursor:pointer;}
.dp-menu button:hover{background:rgba(24,26,77,0.06);}
.dp-menu button.del{color:#B3261E;}
.dp-menu button:disabled{opacity:.35;cursor:default;background:none;}
.dp-toc{margin:4px 0 8px 14px;border-left:2px solid rgba(24,26,77,0.12);}
.dp-tab.sub + .dp-toc{margin-left:30px;}
.dp-toc button{display:block;width:100%;background:none;border:none;border-left:2px solid transparent;margin-left:-2px;text-align:left;font-family:inherit;font-size:13px;color:rgba(24,26,77,0.72);padding:5px 8px;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dp-toc button:hover{color:#181A4D;border-left-color:#181A4D;}
.dp-addtab{display:block;width:100%;margin-top:10px;background:none;border:1px dashed rgba(24,26,77,0.18);border-radius:9px;font-family:inherit;font-size:13px;color:rgba(24,26,77,0.6);padding:8px;cursor:pointer;}
.dp-addtab:hover{color:#181A4D;border-color:rgba(24,26,77,0.35);}
/* focus sidebar */
.dp-side{position:sticky;top:0;width:280px;flex-shrink:0;height:100vh;overflow:auto;padding:16px 14px 24px;background:#f7f6f1;border-right:1px solid rgba(24,26,77,0.08);box-sizing:border-box;}
.dp-side.closed{width:auto;background:transparent;border-right:none;padding:16px 10px;}
.dp-collapse{background:none;border:1px solid rgba(24,26,77,0.12);border-radius:7px;color:#181A4D;cursor:pointer;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;font-size:13px;}
.dp-collapse:hover{background:rgba(24,26,77,0.05);}
@media (max-width:899px){.dp-wrap.focus{display:block;}.dp-wrap.focus .dp-main{padding:56px 18px 100px;}.dp-side{position:static;width:auto;height:auto;border-right:none;border-bottom:1px solid rgba(24,26,77,0.08);margin-bottom:14px;}}
`;

export function DocPages({
  item,
  userId,
  onSave,
  onTextChange,
  onBlur,
  ignoreExternalUpdates,
  focused = false,
  header,
}: {
  header?: React.ReactNode;
  item: { id: string; body: any; body_text: string; pages?: any };
  userId: string;
  onSave: (patch: Record<string, unknown>) => void;
  onTextChange?: (allText: string) => void;
  onBlur?: () => void;
  ignoreExternalUpdates?: boolean;
  focused?: boolean;
}) {
  const [pages, setPages] = useState<DocPage[]>(() => pagesFromItem(item));
  const [activeId, setActiveId] = useState(pages[0].id);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [peekOpen, setPeekOpen] = useState(false);
  const [sideOpen, setSideOpen] = useState(true);
  const [pendingJump, setPendingJump] = useState<number | null>(null);
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

  const scrollToHeading = (index: number) => {
    const hs = wrapRef.current?.querySelectorAll(".ws-editor-content h1, .ws-editor-content h2, .ws-editor-content h3");
    (hs?.[index] as HTMLElement | undefined)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // After switching tabs from the navigator, jump once the new page has rendered.
  useEffect(() => {
    if (pendingJump == null) return;
    const t = setTimeout(() => { scrollToHeading(pendingJump); setPendingJump(null); }, 60);
    return () => clearTimeout(t);
  }, [pendingJump, activeId]);

  const pickPage = (id: string) => { setActiveId(id); setMenuFor(null); if (!focused) setPeekOpen(false); };

  const tree = (
    <>
      <div className="dp-head">
        <span>Tabs {pages.length}</span>
        <button type="button" aria-label="Add tab" onClick={() => add(null)}>+</button>
      </div>
      {pages.map((p) => {
        const isRoot = !p.parentId;
        const sibs = pages.filter((x) => (x.parentId ?? null) === (p.parentId ?? null));
        const idx = sibs.findIndex((x) => x.id === p.id);
        const isOn = p.id === active.id;
        return (
          <div key={p.id}>
            <div className={`dp-tab${isRoot ? "" : " sub"}${isOn ? " on" : ""}`}>
              <span className="ic">{isRoot ? "▤" : "↳"}</span>
              {renaming === p.id ? (
                <input
                  autoFocus
                  defaultValue={p.title}
                  onFocus={(e) => e.currentTarget.select()}
                  onBlur={(e) => { rename(p.id, e.currentTarget.value); setRenaming(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur(); }}
                />
              ) : (
                <button type="button" className="dp-name" onClick={() => pickPage(p.id)} onDoubleClick={() => setRenaming(p.id)} title={p.title}>{p.title}</button>
              )}
              <button type="button" className="dp-more" aria-label="Tab options" onClick={(e) => { e.stopPropagation(); setMenuFor(menuFor === p.id ? null : p.id); }}>⋯</button>
              {menuFor === p.id && (
                <div className="dp-menu" onClick={(e) => e.stopPropagation()}>
                  <button type="button" onClick={() => { setRenaming(p.id); setMenuFor(null); }}>Rename</button>
                  {isRoot && <button type="button" onClick={() => add(p.id)}>Add sub-page</button>}
                  <button type="button" disabled={idx <= 0} onClick={() => { commit(movePage(pagesRef.current, p.id, -1)); setMenuFor(null); }}>Move up</button>
                  <button type="button" disabled={idx >= sibs.length - 1} onClick={() => { commit(movePage(pagesRef.current, p.id, 1)); setMenuFor(null); }}>Move down</button>
                  <button type="button" className="del" disabled={pages.length <= 1} onClick={() => { setConfirmDel(p.id); setMenuFor(null); }}>Delete tab</button>
                </div>
              )}
            </div>
            {isOn && outline.length > 0 && (
              <div className="dp-toc">
                {outline.map((h) => (
                  <button
                    key={h.index}
                    type="button"
                    style={{ paddingLeft: 8 + (h.level - 1) * 12 }}
                    onClick={() => { scrollToHeading(h.index); if (!focused) setPeekOpen(false); }}
                    title={h.text}
                  >{h.text}</button>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <button type="button" className="dp-addtab" onClick={() => add(null)}>+ Add tab</button>
    </>
  );

  return (
    <div
      ref={wrapRef}
      className={`dp-wrap${focused ? " focus" : ""}`}
      onClick={(e) => {
        const t = e.target as HTMLElement;
        if (!t.closest(".dp-tab")) setMenuFor(null);
        if (!focused && peekOpen && !t.closest(".dp-pop") && !t.closest(".dp-peek")) setPeekOpen(false);
      }}
    >
      <style>{CSS}</style>

      {focused && (
        <aside className={`dp-side${sideOpen ? "" : " closed"}`}>
          <button type="button" className="dp-collapse" aria-label={sideOpen ? "Hide tabs panel" : "Show tabs panel"} onClick={() => setSideOpen((v) => !v)} style={{ marginBottom: sideOpen ? 8 : 0 }}>{sideOpen ? "⇤" : "☰"}</button>
          {sideOpen && tree}
        </aside>
      )}

      <div className="dp-main">
        {header}
        {!focused && (
          <div className="dp-peekrow">
            <button type="button" className={`dp-peek${peekOpen ? " on" : ""}`} onClick={() => setPeekOpen((v) => !v)} aria-label="Tabs and outline">
              <span>☰</span>
              <span className="nm">{active.title}</span>
              {(pages.length > 1 || outline.length > 0) && <span className="ct">· {pages.length} {pages.length === 1 ? "tab" : "tabs"}</span>}
              <span className="ct">▾</span>
            </button>
            {peekOpen && <div className="dp-pop">{tree}</div>}
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
      </div>

      <DeleteConfirmModal
        open={!!confirmDel}
        title="Delete this tab?"
        message="This tab, its sub-pages, and everything written on them will be removed. This can't be undone."
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
