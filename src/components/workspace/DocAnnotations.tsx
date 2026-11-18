import type React from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { ANNO_CIRCLE, annoPluginKey, annotationRanges, type AnnoKind, type AnnoRange } from "./annotation-mark";

export type AnnoRow = {
  id: string; user_id: string; workspace_item_id: string; kind: AnnoKind;
  quote: string; body: string; resolved_at: string | null; created_at: string;
};

const LABEL: Record<AnnoKind, string> = { note: "Note", question: "Question", word: "Word study" };
const DOT: Record<AnnoKind, string> = { note: "#CAC307", question: "#E990A2", word: "#E08F00" };
const STRIP_BG: Record<AnnoKind, string> = { note: "#FBF8ED", question: "#FDF1F4", word: "#FFF8E6" };
const MARGIN_W = 300, GAP = 44, DOC_MIN = 560;
type Filter = "all" | AnnoKind;
type MarginMode = "full" | "compact" | "off";

export const annoQueryKey = (itemId: string) => ["doc-annotations", itemId] as const;

const STYLES = `
.an-root{position:relative;}
.an-grid{display:grid;grid-template-columns:minmax(0,1fr) ${MARGIN_W}px;column-gap:${GAP}px;align-items:start;}
.an-grid.off{grid-template-columns:minmax(0,1fr);}
.an-bar{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin:0 0 10px;}
.an-bar.wide{display:grid;grid-template-columns:minmax(0,1fr) ${MARGIN_W}px;column-gap:${GAP}px;}
.an-bar.wide.off{grid-template-columns:minmax(0,1fr) auto;}
.an-ctl{display:flex;flex-direction:column;gap:7px;}
.an-seg{display:inline-flex;align-items:center;gap:2px;padding:2px;border-radius:8px;background:rgba(24,26,77,0.05);font-size:11.5px;color:rgba(24,26,77,0.6);}
.an-seg>span{padding:0 6px 0 4px;font-weight:600;}
.an-seg button{border:none;background:transparent;font:inherit;font-weight:600;color:rgba(24,26,77,0.6);padding:4px 9px;border-radius:6px;cursor:pointer;}
.an-seg button.on{background:#fff;color:#181A4D;box-shadow:0 1px 3px rgba(24,26,77,0.12);}
.an-chips{display:flex;flex-wrap:wrap;gap:5px;}
.an-chip{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 9px;border-radius:999px;border:1px solid #ECE4CE;background:#fff;font:inherit;font-size:11.5px;font-weight:600;color:rgba(24,26,77,0.7);cursor:pointer;}
.an-chip.on{border-color:#181A4D;color:#181A4D;}
.an-dot{width:7px;height:7px;border-radius:50%;display:inline-block;flex-shrink:0;}
.an-margin{position:relative;}
.an-card{position:absolute;left:0;right:0;background:#fff;border:1px solid #ECE4CE;border-radius:12px;padding:10px 12px;box-sizing:border-box;cursor:pointer;transition:box-shadow .15s,border-color .15s,opacity .15s,top .15s;}
.an-card.hot{border-color:#181A4D;box-shadow:0 4px 14px rgba(24,26,77,0.12);}
.an-card.res,.an-strip.res{opacity:.5;}
.an-head{display:flex;align-items:center;gap:7px;}
.an-num{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;font-size:9.5px;font-weight:700;color:#181A4D;flex-shrink:0;}
.an-lab{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#181A4D;flex:1;}
.an-quote{font-size:11.5px;color:rgba(24,26,77,0.55);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:5px;font-style:italic;}
.an-body{font-size:13px;line-height:1.45;color:#181A4D;margin-top:5px;white-space:pre-wrap;word-break:break-word;}
.an-body.clamp{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.an-body ul{margin:2px 0;padding-left:18px;}.an-body li{margin:0;}.an-body p{margin:0;}
.an-tb{display:flex;gap:3px;margin-top:6px;}
.an-tb button{border:1px solid #ECE4CE;background:#fff;border-radius:6px;min-width:26px;height:24px;font:inherit;font-size:12px;color:#181A4D;cursor:pointer;padding:0 6px;}
.an-tb button:hover{background:rgba(24,26,77,0.06);}
.an-body.empty{color:rgba(24,26,77,0.4);}
.an-ta{display:block;width:100%;box-sizing:border-box;margin-top:6px;min-height:64px;resize:none;overflow:hidden;border:1px solid #ECE4CE;border-radius:8px;padding:7px 8px;font:inherit;font-size:13px;line-height:1.45;color:#181A4D;background:#FFFDF6;outline:none;}
.an-ta:not(.big){max-height:320px;}
.an-ta.big{min-height:60vh;font-size:15px;line-height:1.6;padding:12px 14px;}
.an-side-bg{position:fixed;inset:0;z-index:300;background:rgba(24,26,77,0.18);}
.an-side{position:fixed;top:0;right:0;bottom:0;z-index:301;width:min(560px,100vw);background:#fff;box-shadow:-10px 0 30px rgba(24,26,77,0.18);padding:18px 22px calc(env(safe-area-inset-bottom,0px) + 24px);overflow-y:auto;box-sizing:border-box;color:#181A4D;}
.an-side-head{display:flex;align-items:center;gap:8px;}
.an-side-head .an-more{font-size:20px;}
.an-side-quote{font-size:13px;font-style:italic;color:rgba(24,26,77,0.6);margin:10px 0 4px;}
.an-ta:focus{border-color:#CAC307;}
.an-more{background:none;border:none;color:rgba(24,26,77,0.5);cursor:pointer;padding:0 4px;font-size:14px;line-height:1;border-radius:6px;}
.an-more:hover{color:#181A4D;background:rgba(24,26,77,0.06);}
.an-menu{position:absolute;top:30px;right:8px;z-index:30;background:#fff;border:1px solid rgba(24,26,77,0.1);border-radius:10px;box-shadow:0 8px 24px rgba(24,26,77,0.14);padding:4px;min-width:130px;display:flex;flex-direction:column;}
.an-menu button{background:none;border:none;text-align:left;font:inherit;font-size:13px;color:#181A4D;padding:7px 10px;border-radius:7px;cursor:pointer;}
.an-menu button:hover{background:rgba(24,26,77,0.06);}
.an-menu button.del{color:#B3261E;}
.an-det{position:absolute;left:0;right:0;}
.an-det h4{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#8a8678;margin:0 0 8px;}
.an-det .an-card{position:relative;margin-bottom:10px;}
.an-strip{margin:4px 0 10px 14px;border-radius:10px;padding:8px 10px;cursor:pointer;color:#181A4D;font-family:inherit;}
.an-strip .an-body{font-size:12.5px;margin-top:4px;}
.an-strip-acts{display:flex;gap:6px;margin-top:6px;}
.an-strip-acts button{border:1px solid rgba(24,26,77,0.15);background:#fff;border-radius:7px;font:inherit;font-size:12px;font-weight:600;color:#181A4D;padding:4px 10px;cursor:pointer;}
.an-strip-acts button.del{color:#B3261E;}
.an-pill{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 84px);z-index:180;border:none;border-radius:999px;background:#181A4D;color:#fff;font:inherit;font-size:12.5px;font-weight:600;padding:9px 16px;box-shadow:0 6px 20px rgba(24,26,77,0.25);cursor:pointer;}
.an-sheet-bg{position:fixed;inset:0;z-index:300;background:rgba(24,26,77,0.25);}
.an-sheet{position:fixed;left:0;right:0;bottom:0;z-index:301;background:#fff;border-radius:16px 16px 0 0;max-height:72vh;overflow:auto;padding:14px 14px calc(env(safe-area-inset-bottom,0px) + 22px);box-shadow:0 -10px 30px rgba(24,26,77,0.18);}
.an-sheet h3{margin:0 0 10px;font-size:14px;color:#181A4D;display:flex;justify-content:space-between;align-items:center;}
.an-sheet h3 button{background:none;border:none;font-size:18px;color:#181A4D;cursor:pointer;}
.an-sheet .an-card{position:relative;margin-top:10px;}
`;

function useStored<T extends string>(key: string, fallback: T, allowed: readonly T[]) {
  const [v, setV] = useState<T>(fallback);
  useEffect(() => {
    try { const s = localStorage.getItem(key) as T | null; if (s && allowed.includes(s)) setV(s); } catch { /* ignore */ }
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (n: T) => { setV(n); try { localStorage.setItem(key, n); } catch { /* ignore */ } };
  return [v, set] as const;
}

export function AnnotationLayer({
  editor, itemId, userId, otherPageIds, createRef, children,
}: {
  editor: Editor; itemId: string; userId: string;
  /** Annotation ids anchored on other tabs of the same document (not detached). */
  otherPageIds?: Set<string>;
  createRef: React.MutableRefObject<((k: AnnoKind) => void) | null>;
  children: React.ReactNode;
}) {
  const qc = useQueryClient();
  const key = annoQueryKey(itemId);
  const q = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("doc_annotations").select("*").eq("workspace_item_id", itemId).order("created_at");
      if (error) throw error;
      return (data ?? []) as AnnoRow[];
    },
  });
  const rows = q.data ?? [];
  const setRows = (fn: (r: AnnoRow[]) => AnnoRow[]) => qc.setQueryData<AnnoRow[]>(key, (old) => fn(old ?? []));

  const [ranges, setRanges] = useState<AnnoRange[]>(() => annotationRanges(editor.state.doc));
  const [hosts, setHosts] = useState<Map<string, HTMLElement>>(new Map());
  useEffect(() => {
    const upd = () => {
      const next = annotationRanges(editor.state.doc);
      setRanges((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      const m = new Map<string, HTMLElement>();
      editor.view.dom.querySelectorAll<HTMLElement>("[data-strip-id]").forEach((el) => m.set(el.getAttribute("data-strip-id")!, el));
      setHosts((prev) => (prev.size === m.size && [...m].every(([k, el]) => prev.get(k) === el) ? prev : m));
    };
    upd();
    editor.on("transaction", upd);
    return () => { editor.off("transaction", upd); };
  }, [editor]);

  const rootRef = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const el = rootRef.current; if (!el) return;
    const check = () => setWide(window.matchMedia("(min-width: 900px)").matches && el.clientWidth >= DOC_MIN + GAP + MARGIN_W);
    check();
    const ro = new ResizeObserver(check); ro.observe(el);
    window.addEventListener("resize", check);
    return () => { ro.disconnect(); window.removeEventListener("resize", check); };
  }, []);

  const [mode, setMode] = useStored<MarginMode>(`cc-margin-mode:${userId}`, "compact", ["full", "compact", "off"]);
  const [inline, setInline] = useStored<"on" | "off">(`cc-margin-inline:${userId}`, "on", ["on", "off"]);
  const [filter, setFilter] = useState<Filter>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bigId, setBigId] = useState<string | null>(null);
  const openBig = (id: string) => { setEditingId(null); setMenuId(null); setBigId(id); };
  const [menuId, setMenuId] = useState<string | null>(null);
  const [hotId, setHotId] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);

  const rowById = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
  const rangeById = useMemo(() => new Map(ranges.map((r) => [r.id, r])), [ranges]);
  const attached = ranges.filter((r) => rowById.has(r.id)).map((r) => ({ r, row: rowById.get(r.id)! }));
  const detached = rows.filter((row) => !rangeById.has(row.id) && !otherPageIds?.has(row.id));
  const visibleRows = [...attached.map((a) => a.row), ...detached];
  const has = visibleRows.length > 0;
  const counts = { all: visibleRows.length, note: 0, question: 0, word: 0 } as Record<Filter, number>;
  visibleRows.forEach((r) => counts[r.kind]++);
  const pass = (r: AnnoRow) => filter === "all" || r.kind === filter;

  // Inline strips live inside the document on narrow layouts.
  const strips = !wide && inline === "on" && has;
  useEffect(() => {
    const st = (editor.storage as any).annotation as { strips: boolean } | undefined;
    if (!st || st.strips === strips) return;
    st.strips = strips;
    editor.view.dispatch(editor.state.tr.setMeta(annoPluginKey, true));
  }, [editor, strips]);
  useEffect(() => () => {
    const st = (editor.storage as any).annotation as { strips: boolean } | undefined;
    if (st) st.strips = false;
  }, [editor]);

  /* ── actions ── */
  const create = async (kind: AnnoKind) => {
    const { from, to, empty } = editor.state.selection;
    if (empty) return;
    const quote = editor.state.doc.textBetween(from, to, " ").trim().slice(0, 500);
    if (!quote) return;
    const id = crypto.randomUUID();
    editor.chain().focus().setTextSelection({ from, to }).setMark("annotation", { id, kind }).setTextSelection(to).run();
    const row: AnnoRow = { id, user_id: userId, workspace_item_id: itemId, kind, quote, body: "", resolved_at: null, created_at: new Date().toISOString() };
    setRows((r) => [...r, row]);
    setFilter("all");
    if (wide && mode === "off") setMode("compact");
    if (!wide && inline === "off") setInline("on");
    setEditingId(id);
    const { error } = await supabase.from("doc_annotations").insert({ id, user_id: userId, workspace_item_id: itemId, kind, quote, body: "" });
    if (error) {
      console.error(error);
      removeMark(id);
      setRows((r) => r.filter((x) => x.id !== id));
      toast.error("Couldn't add that margin note. Try again.");
    }
  };
  createRef.current = create;

  const removeMark = (id: string) => {
    const tr = editor.state.tr;
    editor.state.doc.descendants((node, pos) => {
      if (!node.isText) return;
      const m = node.marks.find((x) => x.type.name === "annotation" && x.attrs.id === id);
      if (m) tr.removeMark(pos, pos + node.nodeSize, m);
    });
    if (tr.docChanged) editor.view.dispatch(tr);
  };

  const patch = async (id: string, p: Partial<AnnoRow>) => {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...p } : x)));
    const { error } = await supabase.from("doc_annotations").update(p as any).eq("id", id);
    if (error) { console.error(error); toast.error("Couldn't save that margin note."); }
  };
  const toggleResolve = (row: AnnoRow) => patch(row.id, { resolved_at: row.resolved_at ? null : new Date().toISOString() });
  const doDelete = async (id: string) => {
    removeMark(id);
    setRows((r) => r.filter((x) => x.id !== id));
    const { error } = await supabase.from("doc_annotations").delete().eq("id", id);
    if (error) { console.error(error); toast.error("Couldn't delete that margin note."); qc.invalidateQueries({ queryKey: key }); }
  };

  /* ── hover pairing ── */
  useEffect(() => {
    const dom = editor.view.dom;
    const over = (e: Event) => {
      const t = (e.target as HTMLElement).closest?.("[data-anno-id],[data-anno-num]") as HTMLElement | null;
      setHotId(t ? t.getAttribute("data-anno-id") ?? t.getAttribute("data-anno-num") : null);
    };
    dom.addEventListener("mouseover", over);
    return () => dom.removeEventListener("mouseover", over);
  }, [editor]);
  useEffect(() => {
    const dom = editor.view.dom;
    dom.querySelectorAll(".ws-anno.is-hot").forEach((el) => el.classList.remove("is-hot"));
    if (hotId) dom.querySelectorAll(`[data-anno-id="${CSS.escape(hotId)}"]`).forEach((el) => el.classList.add("is-hot"));
  });

  /* ── margin card placement ── */
  const showMargin = wide && has && mode !== "off";
  const marginRef = useRef<HTMLDivElement>(null);
  const cardEls = useRef(new Map<string, HTMLDivElement>());
  const detRef = useRef<HTMLDivElement>(null);
  const layout = () => {
    const m = marginRef.current; if (!m) return;
    const base = m.getBoundingClientRect().top;
    let bottom = 0;
    for (const { r, row } of attached) {
      if (!pass(row)) continue;
      const el = cardEls.current.get(r.id); if (!el) continue;
      let top = 0;
      try { top = editor.view.coordsAtPos(r.from).top - base - 4; } catch { /* stale pos */ }
      top = Math.max(top, bottom ? bottom + 10 : 0, 0);
      el.style.top = `${top}px`;
      bottom = top + el.offsetHeight;
    }
    if (detRef.current) { detRef.current.style.top = `${bottom ? bottom + 22 : 0}px`; bottom = (bottom ? bottom + 22 : 0) + detRef.current.offsetHeight; }
    m.style.minHeight = `${bottom}px`;
  };
  useLayoutEffect(layout);
  useEffect(() => {
    if (!showMargin) return;
    const ro = new ResizeObserver(() => layout());
    ro.observe(editor.view.dom);
    if (marginRef.current) ro.observe(marginRef.current);
    return () => ro.disconnect();
  });

  const scrollTo = (id: string) => {
    setSheet(false);
    const el = editor.view.dom.querySelector(`[data-anno-id="${CSS.escape(id)}"]`) as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHotId(id);
    if (inline === "on") setEditingId(id);
  };

  const card = (row: AnnoRow, n: number | null, opts: { placed?: boolean; onPick?: () => void } = {}) => {
    const editing = editingId === row.id;
    return (
      <div
        key={row.id}
        ref={opts.placed ? (el) => { if (el) cardEls.current.set(row.id, el); else cardEls.current.delete(row.id); } : undefined}
        className={`an-card${hotId === row.id ? " hot" : ""}${row.resolved_at ? " res" : ""}`}
        onMouseEnter={() => setHotId(row.id)}
        onMouseLeave={() => setHotId((h) => (h === row.id ? null : h))}
        onClick={() => { if (opts.onPick) opts.onPick(); else setEditingId(row.id); }}
      >
        <CardInner row={row} n={n} editing={editing} clamp={mode === "compact" && !editing}
          menuOpen={menuId === row.id}
          onMenu={() => setMenuId(menuId === row.id ? null : row.id)}
          onEdit={() => { setEditingId(row.id); setMenuId(null); }}
          onExpand={() => openBig(row.id)}
          onResolve={() => { toggleResolve(row); setMenuId(null); }}
          onDelete={() => { setConfirmDel(row.id); setMenuId(null); }}
          onSave={(body) => patch(row.id, { body })}
          onDone={() => setEditingId(null)}
        />
      </div>
    );
  };

  const chips = (
    <div className="an-chips">
      {(["all", "note", "question", "word"] as Filter[]).map((f) => (
        <button key={f} type="button" className={`an-chip${filter === f ? " on" : ""}`} onClick={() => setFilter(f)}>
          {f !== "all" && <span className="an-dot" style={{ background: DOT[f] }} />}
          {f === "all" ? "All" : f === "note" ? "Notes" : f === "question" ? "Questions" : "Words"} {counts[f]}
        </button>
      ))}
    </div>
  );

  return (
    <div className="an-root" ref={rootRef} onClick={(e) => { if (!(e.target as HTMLElement).closest(".an-menu,.an-more")) setMenuId(null); }}>
      <style>{STYLES}</style>
      {has && wide && (
        <div className={`an-bar wide${mode === "off" ? " off" : ""}`}>
          <div />
          <div className="an-ctl">
            <div className="an-seg" role="group" aria-label="Margin">
              <span>Margin:</span>
              {(["full", "compact", "off"] as MarginMode[]).map((m) => (
                <button key={m} type="button" className={mode === m ? "on" : ""} onClick={() => setMode(m)}>{m[0].toUpperCase() + m.slice(1)}</button>
              ))}
            </div>
            {mode !== "off" && chips}
          </div>
        </div>
      )}
      {has && !wide && (
        <div className="an-bar">
          <div className="an-seg" role="group" aria-label="Margin notes">
            <button type="button" className={inline === "on" ? "on" : ""} onClick={() => setInline("on")}>Notes inline</button>
            <button type="button" className={inline === "off" ? "on" : ""} onClick={() => setInline("off")}>Off</button>
          </div>
        </div>
      )}

      <div className={showMargin ? "an-grid" : ""}>
        <div style={{ minWidth: 0 }}>{children}</div>
        {showMargin && (
          <div className="an-margin" ref={marginRef}>
            {attached.filter((a) => pass(a.row)).map((a) => card(a.row, a.r.n, { placed: true }))}
            {detached.filter(pass).length > 0 && (
              <div className="an-det" ref={detRef}>
                <h4>Detached</h4>
                {detached.filter(pass).map((row) => card(row, null))}
              </div>
            )}
          </div>
        )}
      </div>

      {strips && attached.map(({ r, row }) => {
        const host = hosts.get(r.id); if (!host) return null;
        const editing = editingId === row.id;
        return createPortal(
          <div className={`an-strip${row.resolved_at ? " res" : ""}`} style={{ background: STRIP_BG[row.kind] }} onClick={() => !editing && setEditingId(row.id)}>
            <div className="an-head">
              <span className="an-num" style={{ background: ANNO_CIRCLE[row.kind] }}>{r.n}</span>
              <span className="an-lab">{LABEL[row.kind]}</span>
            </div>
            {editing ? (
              <>
                <BodyEditor row={row} onSave={(b) => patch(row.id, { body: b })} onDone={() => setEditingId(null)} onExpand={() => openBig(row.id)} />
                <div className="an-strip-acts" onPointerDown={(e) => e.preventDefault()} onMouseDown={(e) => e.preventDefault()}>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setEditingId(null); }}>Done</button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); toggleResolve(row); }}>{row.resolved_at ? "Unresolve" : "Resolve"}</button>
                  <button type="button" className="del" onClick={(e) => { e.stopPropagation(); setConfirmDel(row.id); }}>Delete</button>
                </div>
              </>
            ) : (
              <div className={`an-body clamp${row.body ? "" : " empty"}`}>{row.body ? <RichBody text={row.body} /> : (row.kind === "word" ? row.quote : "Tap to write…")}</div>
            )}
          </div>,
          host,
          row.id,
        );
      })}

      {!wide && has && (
        <button type="button" className="an-pill" onClick={() => setSheet(true)}>All margin notes · {visibleRows.length}</button>
      )}
      {sheet && createPortal(
        <>
          <div className="an-sheet-bg" onClick={() => setSheet(false)} />
          <div className="an-sheet" role="dialog" aria-label="Margin notes">
            <style>{STYLES}</style>
            <h3>Margin notes <button type="button" aria-label="Close" onClick={() => setSheet(false)}>×</button></h3>
            {chips}
            {attached.filter((a) => pass(a.row)).map((a) => card(a.row, a.r.n, { onPick: () => scrollTo(a.row.id) }))}
            {detached.filter(pass).length > 0 && <h4 style={{ fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "#8a8678", margin: "16px 0 0" }}>Detached</h4>}
            {detached.filter(pass).map((row) => card(row, null))}
          </div>
        </>,
        document.body,
      )}

      {bigId && (() => {
        const row = rows.find((r) => r.id === bigId);
        if (!row) return null;
        return createPortal(
          <>
            <div className="an-side-bg" onClick={() => setBigId(null)} />
            <aside className="an-side" role="dialog" aria-label={LABEL[row.kind]}>
              <style>{STYLES}</style>
              <div className="an-side-head">
                <span className="an-num" style={{ background: ANNO_CIRCLE[row.kind] }}>{attached.find((a) => a.row.id === row.id)?.r.n ?? "–"}</span>
                <span className="an-lab">{LABEL[row.kind]}</span>
                <button type="button" className="an-more" aria-label="Close" onClick={() => setBigId(null)}>×</button>
              </div>
              {row.quote && <div className="an-side-quote">“{row.quote}”</div>}
              <BodyEditor key={row.id} row={row} big onSave={(b) => patch(row.id, { body: b })} onDone={() => {}} />
            </aside>
          </>,
          document.body,
        );
      })()}

      <DeleteConfirmModal
        open={!!confirmDel}
        title="Delete this margin note?"
        message="The note will be removed and its highlight taken off the text. Your document text stays the same."
        onCancel={() => setConfirmDel(null)}
        onConfirm={() => { const id = confirmDel!; setConfirmDel(null); if (editingId === id) setEditingId(null); void doDelete(id); }}
      />
    </div>
  );
}

function CardInner({ row, n, editing, clamp, menuOpen, onMenu, onEdit, onExpand, onResolve, onDelete, onSave, onDone }: {
  onExpand: () => void;
  row: AnnoRow; n: number | null; editing: boolean; clamp: boolean; menuOpen: boolean;
  onMenu: () => void; onEdit: () => void; onResolve: () => void; onDelete: () => void;
  onSave: (b: string) => void; onDone: () => void;
}) {
  return (
    <>
      <div className="an-head">
        <span className="an-num" style={{ background: ANNO_CIRCLE[row.kind] }}>{n ?? "–"}</span>
        <span className="an-lab">{LABEL[row.kind]}</span>
        <button type="button" className="an-more" aria-label="Margin note options" onClick={(e) => { e.stopPropagation(); onMenu(); }}>⋯</button>
      </div>
      {menuOpen && (
        <div className="an-menu" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={onEdit}>Edit</button>
          <button type="button" onClick={onExpand}>Open in side panel</button>
          <button type="button" onClick={onResolve}>{row.resolved_at ? "Unresolve" : "Resolve"}</button>
          <button type="button" className="del" onClick={onDelete}>Delete</button>
        </div>
      )}
      {row.kind !== "word" && row.quote && <div className="an-quote" title={row.quote}>“{row.quote}”</div>}
      {editing ? (
        <BodyEditor row={row} onSave={onSave} onDone={onDone} onExpand={onExpand} />
      ) : (
        <div className={`an-body${clamp ? " clamp" : ""}${row.body ? "" : " empty"}`}>
          {row.body ? <RichBody text={row.body} /> : (row.kind === "word" ? row.quote : row.kind === "question" ? "Write your question…" : "Write a note…")}
        </div>
      )}
    </>
  );
}

function renderInline(t: string, key: string): React.ReactNode[] {
  const parts = t.split(/(\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*)/g);
  return parts.map((p, i) => {
    const k = `${key}-${i}`;
    if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={k}>{renderInline(p.slice(2, -2), k)}</strong>;
    if (/^__[^_]+__$/.test(p)) return <u key={k}>{renderInline(p.slice(2, -2), k)}</u>;
    if (/^\*[^*]+\*$/.test(p)) return <em key={k}>{renderInline(p.slice(1, -1), k)}</em>;
    return p;
  });
}

/** Renders a margin-note body: **bold**, *italic*, __underline__, and "- " bullet lines. */
export function RichBody({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  let list: string[] = [];
  const lines = text.split("\n");
  const flushList = (k: number) => {
    if (!list.length) return;
    out.push(<ul key={`u${k}`}>{list.map((l, j) => <li key={j}>{renderInline(l, `l${k}-${j}`)}</li>)}</ul>);
    list = [];
  };
  lines.forEach((l, i) => {
    const m = /^\s*[-•*]\s+(.*)$/.exec(l);
    if (m) { list.push(m[1]); return; }
    flushList(i);
    out.push(<p key={`p${i}`}>{l ? renderInline(l, `p${i}`) : "\u00a0"}</p>);
  });
  flushList(lines.length);
  return <>{out}</>;
}

function BodyEditor({ row, onSave, onDone, onExpand, big }: { row: AnnoRow; onSave: (b: string) => void; onDone: () => void; onExpand?: () => void; big?: boolean }) {
  const [v, setV] = useState(row.body);
  const ref = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const last = useRef(row.body);
  const flush = (val: string) => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (val !== last.current) { last.current = val; onSave(val); }
  };
  const grow = () => { const el = ref.current; if (!el) return; el.style.height = "auto"; el.style.height = `${el.scrollHeight + 2}px`; el.style.overflowY = !big && el.scrollHeight > 320 ? "auto" : "hidden"; };
  useLayoutEffect(grow, [v]);
  useEffect(() => {
    const t = setTimeout(() => {
      const el = ref.current; if (!el) return;
      el.focus({ preventScroll: true });
      const end = el.value.length; el.setSelectionRange(end, end);
      grow();
    }, 30);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const change = (val: string) => {
    setV(val);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => flush(val), 600);
  };
  const wrap = (m: string) => {
    const el = ref.current; if (!el) return;
    const a = el.selectionStart, b = el.selectionEnd;
    const sel = v.slice(a, b);
    let next: string, na: number, nb: number;
    if (sel && v.slice(a - m.length, a) === m && v.slice(b, b + m.length) === m) {
      next = v.slice(0, a - m.length) + sel + v.slice(b + m.length); na = a - m.length; nb = b - m.length;
    } else {
      next = v.slice(0, a) + m + sel + m + v.slice(b); na = a + m.length; nb = b + m.length;
    }
    change(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(na, nb); });
  };
  const bullet = () => {
    const el = ref.current; if (!el) return;
    const a = el.selectionStart, b = el.selectionEnd;
    const ls = v.lastIndexOf("\n", a - 1) + 1;
    const le = (() => { const i = v.indexOf("\n", b); return i < 0 ? v.length : i; })();
    const block = v.slice(ls, le).split("\n");
    const allB = block.every((l) => /^- /.test(l));
    const nb2 = block.map((l) => allB ? l.replace(/^- /, "") : `- ${l}`).join("\n");
    const next = v.slice(0, ls) + nb2 + v.slice(le);
    change(next);
    const caret = ls + nb2.length;
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(caret, caret); });
  };
  const keep = (e: React.SyntheticEvent) => { e.preventDefault(); e.stopPropagation(); };
  return (
    <>
      <div className="an-tb" onMouseDown={keep} onPointerDown={keep} onClick={(e) => e.stopPropagation()}>
        <button type="button" aria-label="Bold" onClick={() => wrap("**")}><b>B</b></button>
        <button type="button" aria-label="Italic" onClick={() => wrap("*")}><i>I</i></button>
        <button type="button" aria-label="Underline" onClick={() => wrap("__")}><u>U</u></button>
        <button type="button" aria-label="Bullet list" onClick={bullet}>•</button>
        {onExpand && <button type="button" aria-label="Open in side panel" title="Open larger" style={{ marginLeft: "auto" }} onClick={() => { flush(v); onExpand(); }}>⤢</button>}
      </div>
      <textarea
        ref={ref}
        className={`an-ta${big ? " big" : ""}`}
        value={v}
        placeholder={row.kind === "question" ? "What are you asking?" : "Write a note…"}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => change(e.target.value)}
        onBlur={() => { flush(v); onDone(); }}
        onKeyDown={(e) => {
          if (e.key === "Escape") { (e.target as HTMLTextAreaElement).blur(); return; }
          const mod = e.metaKey || e.ctrlKey;
          if (mod && e.key.toLowerCase() === "b") { e.preventDefault(); wrap("**"); return; }
          if (mod && e.key.toLowerCase() === "i") { e.preventDefault(); wrap("*"); return; }
          if (mod && e.key.toLowerCase() === "u") { e.preventDefault(); wrap("__"); return; }
          if (e.key === "Enter" && !e.shiftKey) {
            const el = e.currentTarget; const a = el.selectionStart;
            const ls = v.lastIndexOf("\n", a - 1) + 1; const line = v.slice(ls, a);
            if (/^- /.test(line) && el.selectionEnd === a) {
              e.preventDefault();
              if (line === "- ") { const next = v.slice(0, ls) + v.slice(a); change(next); requestAnimationFrame(() => el.setSelectionRange(ls, ls)); }
              else { const next = v.slice(0, a) + "\n- " + v.slice(a); change(next); requestAnimationFrame(() => el.setSelectionRange(a + 3, a + 3)); }
            }
          }
        }}
      />
    </>
  );
}
