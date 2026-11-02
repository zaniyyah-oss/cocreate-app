import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RichTextField } from "@/components/RichTextField";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";

export type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
  due_date?: string | null;
  status?: "not_started" | "in_progress" | "done";
  details?: string | null;
  written_on?: string | null;
  recurring_id?: string | null;
};

const CSS = `
.tdc-list{display:flex;flex-direction:column;gap:2px;margin-top:4px;}
.tdc-row{display:flex;align-items:flex-start;gap:10px;padding:6px 2px;border-radius:8px;}
.tdc-row:hover{background:rgba(24,26,77,0.03);}
.tdc-check{flex-shrink:0;width:18px;height:18px;margin-top:2px;accent-color:#181A4D;cursor:pointer;}
.tdc-text{flex:1;min-width:0;border:none;background:transparent;font-family:'Poppins',sans-serif;font-size:14px;color:#20201C;line-height:1.45;outline:none;padding:0;resize:none;overflow:hidden;}
.tdc-row.done .tdc-text{text-decoration:line-through;color:#8a8678;}
.tdc-rep{flex-shrink:0;color:#8a8678;margin-top:3px;display:inline-flex;}
.tdc-more{flex-shrink:0;background:none;border:none;color:#181A4D;opacity:0.55;cursor:pointer;font-size:16px;line-height:1;padding:2px 6px;border-radius:6px;}
.tdc-more:hover{opacity:1;background:rgba(24,26,77,0.06);}
.tdc-add{display:flex;align-items:center;gap:10px;padding:6px 2px;}
.tdc-add .plus{width:18px;text-align:center;color:#8a8678;font-size:16px;}
.tdc-add input{flex:1;border:none;background:transparent;font-family:'Poppins',sans-serif;font-size:14px;outline:none;color:#20201C;}
.tdc-add input::placeholder{color:#8a8678;}

.tds-ov{position:fixed;inset:0;background:rgba(24,26,77,0.4);z-index:700;}
.tds-panel{position:fixed;left:0;right:0;bottom:0;height:90vh;background:#fff;border-radius:20px 20px 0 0;box-shadow:0 -10px 40px rgba(0,0,0,0.2);display:flex;flex-direction:column;font-family:'Poppins',sans-serif;z-index:701;}
.tds-grab{width:40px;height:5px;border-radius:99px;background:rgba(24,26,77,0.18);margin:10px auto 0;flex-shrink:0;}
@media (min-width:1024px){
  .tds-panel{left:auto;top:0;bottom:0;right:0;width:520px;height:auto;border-radius:0;box-shadow:-10px 0 40px rgba(0,0,0,0.18);}
  .tds-grab{display:none;}
}
.tds-x{position:absolute;top:14px;right:14px;width:34px;height:34px;border-radius:50%;border:none;background:#F1EDDD;color:#181A4D;font-size:15px;cursor:pointer;}
.tds-body{flex:1;overflow-y:auto;padding:22px 22px 28px;display:flex;flex-direction:column;gap:20px;}
.tds-titlerow{display:flex;gap:12px;align-items:flex-start;padding-right:40px;}
.tds-titlerow input[type=checkbox]{width:24px;height:24px;flex-shrink:0;accent-color:#181A4D;margin-top:3px;cursor:pointer;}
.tds-title{flex:1;border:none;outline:none;font-family:inherit;font-size:19px;font-weight:600;color:#181A4D;resize:none;background:transparent;line-height:1.35;}
.tds-title.done{text-decoration:line-through;color:#8a8678;}
.tds-lbl{font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6f6b5e;margin-bottom:8px;}
.tds-chips{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
.tds-chip{border:1px solid rgba(24,26,77,0.18);background:#fff;color:#181A4D;border-radius:999px;padding:7px 13px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;}
.tds-chip.on{background:#181A4D;color:#DCE07A;border-color:#181A4D;}
.tds-chip input{border:none;font-family:inherit;font-size:13px;color:#181A4D;background:transparent;outline:none;}
.tds-row{display:flex;justify-content:space-between;align-items:center;font-size:14px;color:#20201C;padding:10px 0;border-top:1px solid rgba(24,26,77,0.08);}
.tds-row a,.tds-link{color:#181A4D;font-weight:600;font-size:13px;background:none;border:none;cursor:pointer;font-family:inherit;text-decoration:underline;padding:0;}
.tds-del{margin-top:auto;background:none;border:none;color:#D93025;font-family:inherit;font-weight:600;font-size:14px;cursor:pointer;text-align:left;padding:8px 0;}
`;

const RepeatIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Repeats">
    <path d="M17 2l4 4-4 4" /><path d="M3 11V9a3 3 0 0 1 3-3h15" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v2a3 3 0 0 1-3 3H3" />
  </svg>
);

export function addDaysISO(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function AutoText({ value, onChange, className, done, onEnter }: { value: string; onChange: (v: string) => void; className: string; done?: boolean; onEnter?: () => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      className={`${className}${done ? " done" : ""}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && onEnter) { e.preventDefault(); onEnter(); } }}
    />
  );
}

export function TodoChecklist({
  items,
  selectedDate,
  todayISO,
  onUpdate,
  onAdd,
  onRemove,
  onMove,
  onGoToDate,
}: {
  items: ChecklistItem[];
  selectedDate: string;
  todayISO: string;
  onUpdate: (idx: number, patch: Partial<ChecklistItem>) => void;
  onAdd: (text: string) => void;
  onRemove: (idx: number) => void;
  onMove: (idx: number, date: string) => void;
  onGoToDate: (date: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [pickDate, setPickDate] = useState(false);
  const openIdx = items.findIndex((i) => i.id === openId);
  const open = openIdx >= 0 ? items[openIdx] : null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !confirmDel) setOpenId(null); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [!!open, confirmDel]); // eslint-disable-line react-hooks/exhaustive-deps

  const isDone = (it: ChecklistItem) => (it.status ? it.status === "done" : it.done);
  const toggle = (idx: number, checked: boolean) =>
    onUpdate(idx, { done: checked, status: checked ? "done" : "not_started" });

  const commitDraft = () => {
    if (!draft.trim()) return;
    onAdd(draft.trim());
    setDraft("");
  };

  const tomorrow = addDaysISO(todayISO, 1);
  const nextWeek = addDaysISO(todayISO, 7);
  const moveTo = (date: string) => {
    if (openIdx < 0) return;
    setPickDate(false);
    if (date === selectedDate) return;
    onMove(openIdx, date);
    setOpenId(null);
  };
  const written = open?.written_on ?? selectedDate;
  const writtenLabel = new Date(`${written}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="tdc">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="tdc-list">
        {items.map((it, idx) => {
          const done = isDone(it);
          return (
            <div key={it.id} className={`tdc-row${done ? " done" : ""}`}>
              <input type="checkbox" className="tdc-check" checked={done} onChange={(e) => toggle(idx, e.target.checked)} aria-label={done ? "Mark not done" : "Mark done"} />
              <AutoText className="tdc-text" value={it.text} onChange={(v) => onUpdate(idx, { text: v })} />
              {it.recurring_id && <span className="tdc-rep"><RepeatIcon /></span>}
              <button type="button" className="tdc-more" onClick={() => setOpenId(it.id)} aria-label="Task details">⋯</button>
            </div>
          );
        })}
        <div className="tdc-add">
          <span className="plus" aria-hidden="true">+</span>
          <input
            placeholder="Add a to-do"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitDraft(); } }}
            onBlur={commitDraft}
          />
        </div>
      </div>

      {open && typeof document !== "undefined" && createPortal(
        <>
          <style dangerouslySetInnerHTML={{ __html: CSS }} />
          <div className="tds-ov" onClick={() => setOpenId(null)} />
          <div className="tds-panel" role="dialog" aria-label="To-do details">
            <div className="tds-grab" />
            <button type="button" className="tds-x" onClick={() => setOpenId(null)} aria-label="Close">✕</button>
            <div className="tds-body">
              <div className="tds-titlerow">
                <input type="checkbox" checked={isDone(open)} onChange={(e) => toggle(openIdx, e.target.checked)} aria-label="Done" />
                <AutoText className="tds-title" done={isDone(open)} value={open.text} onChange={(v) => onUpdate(openIdx, { text: v })} />
              </div>
              <div>
                <div className="tds-lbl">Details</div>
                <RichTextField
                  className="de-textarea short"
                  placeholder="Notes, next steps, who's involved…"
                  value={open.details ?? ""}
                  onChange={(html) => onUpdate(openIdx, { details: html })}
                />
              </div>
              <div>
                <div className="tds-lbl">Day</div>
                <div className="tds-chips">
                  <button type="button" className={`tds-chip${selectedDate === todayISO ? " on" : ""}`} onClick={() => moveTo(todayISO)}>Today</button>
                  <button type="button" className={`tds-chip${selectedDate === tomorrow ? " on" : ""}`} onClick={() => moveTo(tomorrow)}>Tomorrow</button>
                  <button type="button" className={`tds-chip${selectedDate === nextWeek ? " on" : ""}`} onClick={() => moveTo(nextWeek)}>Next week</button>
                  {pickDate ? (
                    <span className="tds-chip"><input type="date" autoFocus defaultValue={selectedDate} onChange={(e) => e.target.value && moveTo(e.target.value)} /></span>
                  ) : (
                    <button type="button" className={`tds-chip${![todayISO, tomorrow, nextWeek].includes(selectedDate) ? " on" : ""}`} onClick={() => setPickDate(true)}>Pick a date</button>
                  )}
                </div>
              </div>
              <div>
                <div className="tds-row">
                  <span>Repeats</span>
                  <a href="/calendar">{open.recurring_id ? "Edit in Calendar" : "Doesn't repeat · set up in Calendar"}</a>
                </div>
                <div className="tds-row">
                  <span>Written on</span>
                  <button type="button" className="tds-link" onClick={() => { setOpenId(null); onGoToDate(written); }}>{writtenLabel}</button>
                </div>
              </div>
              <button type="button" className="tds-del" onClick={() => setConfirmDel(true)}>Delete to-do</button>
            </div>
          </div>
        </>,
        document.body,
      )}

      <DeleteConfirmModal
        open={confirmDel}
        title="Delete this to-do?"
        message="This to-do and its details will be removed. This can't be undone."
        onCancel={() => setConfirmDel(false)}
        onConfirm={() => { if (openIdx >= 0) onRemove(openIdx); setConfirmDel(false); setOpenId(null); }}
      />
    </div>
  );
}
