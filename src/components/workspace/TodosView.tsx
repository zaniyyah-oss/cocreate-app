import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { resolveDayEntry, updateEntryTodos } from "@/lib/day-entry";
import {
  ChecklistRow, TaskDetailsInline, TaskDetailsSheet, isChecklistDone, addDaysISO,
  type ChecklistItem,
} from "@/components/workspace/TodoChecklist";

type Row = { entryId: string; templateId: string; day: string; item: ChecklistItem };
type EntryRow = { id: string; template_id: string; entry_date: string; todo_items: ChecklistItem[] | null };

const localISO = (d = new Date()) => {
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const dayLabel = (iso: string, today: string) =>
  iso === today ? "Today" : new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

const CSS = `
.td-filters{display:flex;gap:8px;margin:2px 0 18px;}
.td-group{margin-bottom:20px;}
.td-ghead{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:11.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#6f6b5e;padding:0 2px 6px;border-bottom:1px solid #E7E1CF;margin-bottom:4px;}
.td-ghead.overdue{color:#9A3412;}
.td-ghead.today{color:#181A4D;}
.td-go{background:none;border:none;font-family:inherit;font-size:12px;font-weight:600;color:#181A4D;cursor:pointer;letter-spacing:0;text-transform:none;padding:0;white-space:nowrap;}
.td-go:hover{text-decoration:underline;}
.td-donebox{border:1.5px dashed rgba(24,26,77,0.2);border-radius:14px;margin-top:8px;}
.td-donebtn{width:100%;display:flex;justify-content:space-between;align-items:center;background:none;border:none;font-family:inherit;font-size:13px;font-weight:700;color:#181A4D;cursor:pointer;padding:12px 14px;}
.td-donebody{padding:0 12px 10px;}
.td-empty{padding:26px 4px;color:#8a8678;font-size:13px;line-height:1.55;}
.td-add{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #E7E1CF;border-radius:12px;padding:10px 14px;margin-bottom:18px;}
.td-add .plus{color:#8a8678;font-size:16px;}
.td-add input{flex:1;border:none;outline:none;background:transparent;font-family:'Poppins',sans-serif;font-size:14px;color:#20201C;}
`;

export type TodosViewHandle = { focusAdd: () => void };

export const TodosView = forwardRef<TodosViewHandle, {
  userId: string;
  search: string;
  /** The page's right-hand column on desktop; details are portaled into it. */
  detailTarget: HTMLElement | null;
}>(function TodosView({ userId, search, detailTarget }, ref) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const today = localISO();
  const key = ["notes-todos", userId];
  const [filter, setFilter] = useState<"open" | "done">("open");
  const [doneOpen, setDoneOpen] = useState(false);
  const [selId, setSelId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const addRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => ({ focusAdd: () => { addRef.current?.scrollIntoView({ block: "center" }); addRef.current?.focus(); } }));

  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 901px)");
    const on = () => setWide(mq.matches);
    on(); mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const defaultTplQ = useQuery({
    queryKey: ["platform-default-template-id"],
    queryFn: async () => {
      const { data } = await supabase.from("devotional_templates").select("id")
        .eq("is_default" as any, true).eq("status", "published").maybeSingle();
      return (data?.id as string | undefined) ?? null;
    },
  });

  const q = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("devotional_entries")
        .select("id, template_id, entry_date, todo_items")
        .eq("user_id", userId).not("todo_items", "is", null);
      if (error) throw error;
      return (data ?? []) as unknown as EntryRow[];
    },
  });

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    for (const e of q.data ?? []) {
      for (const it of Array.isArray(e.todo_items) ? e.todo_items : []) {
        if (!it || !(it.text ?? "").trim()) continue;
        out.push({ entryId: e.id, templateId: e.template_id, day: e.entry_date, item: it });
      }
    }
    return out;
  }, [q.data]);

  const needle = search.trim().toLowerCase();
  const matches = (r: Row) => !needle || r.item.text.toLowerCase().includes(needle);
  const open = rows.filter((r) => !isChecklistDone(r.item) && matches(r));
  const done = rows.filter((r) => isChecklistDone(r.item) && matches(r));
  const weekStart = addDaysISO(today, -6);
  const doneThisWeek = done.filter((r) => r.day >= weekStart && r.day <= today);

  const group = (list: Row[], asc: boolean) => {
    const m = new Map<string, Row[]>();
    for (const r of list) m.set(r.day, [...(m.get(r.day) ?? []), r]);
    return [...m.entries()].sort((a, b) => (asc ? a[0].localeCompare(b[0]) : b[0].localeCompare(a[0])));
  };

  // ── writes: optimistic cache update + serialized write to the entry ──
  const patchCache = (fn: (rows: EntryRow[]) => EntryRow[]) =>
    qc.setQueryData<EntryRow[]>(key, (cur) => fn(cur ?? []));
  const invalidateDays = () => qc.invalidateQueries({ queryKey: ["dev-entries"] });

  const update = (r: Row, patch: Partial<ChecklistItem>) => {
    const apply = (items: ChecklistItem[]) => items.map((i) => (i.id === r.item.id ? { ...i, ...patch } : i));
    patchCache((es) => es.map((e) => (e.id === r.entryId ? { ...e, todo_items: apply(e.todo_items ?? []) } : e)));
    updateEntryTodos<ChecklistItem>(r.entryId, apply).then(invalidateDays, (err) => console.error("to-do save failed", err));
  };
  const remove = (r: Row) => {
    const apply = (items: ChecklistItem[]) => items.filter((i) => i.id !== r.item.id);
    patchCache((es) => es.map((e) => (e.id === r.entryId ? { ...e, todo_items: apply(e.todo_items ?? []) } : e)));
    if (selId === r.item.id) setSelId(null);
    updateEntryTodos<ChecklistItem>(r.entryId, apply).then(invalidateDays, (err) => console.error("to-do delete failed", err));
  };
  const move = async (r: Row, date: string) => {
    const targetId = await resolveDayEntry(userId, r.templateId, date);
    if (!targetId) return;
    const moved: ChecklistItem = { ...r.item, due_date: date, written_on: r.item.written_on ?? r.day };
    await updateEntryTodos<ChecklistItem>(targetId, (items) => [...items.filter((i) => i.id !== moved.id), moved]);
    await updateEntryTodos<ChecklistItem>(r.entryId, (items) => items.filter((i) => i.id !== r.item.id));
    await q.refetch();
    invalidateDays();
  };
  const addToday = async (text: string) => {
    const tpl = defaultTplQ.data;
    if (!tpl) return;
    const entryId = await resolveDayEntry(userId, tpl, today);
    if (!entryId) return;
    const item: ChecklistItem = { id: crypto.randomUUID(), text, done: false, status: "not_started", due_date: today, written_on: today };
    patchCache((es) => es.some((e) => e.id === entryId)
      ? es.map((e) => (e.id === entryId ? { ...e, todo_items: [...(e.todo_items ?? []), item] } : e))
      : [...es, { id: entryId, template_id: tpl, entry_date: today, todo_items: [item] }]);
    await updateEntryTodos<ChecklistItem>(entryId, (items) => [...items, item]).catch((e) => console.error(e));
    invalidateDays();
  };
  const commitDraft = () => { const t = draft.trim(); if (!t) return; setDraft(""); void addToday(t); };

  const goToDay = (templateId: string, date: string) =>
    navigate({ to: "/devotionals/$id", params: { id: templateId }, search: { date } as any });

  const sel = rows.find((r) => r.item.id === selId) ?? null;
  const detailProps = sel ? {
    item: sel.item, day: sel.day, todayISO: today,
    onClose: () => setSelId(null),
    onUpdate: (p: Partial<ChecklistItem>) => update(sel, p),
    onMove: (d: string) => { void move(sel, d); },
    onRemove: () => remove(sel),
    onGoToDate: (d: string) => goToDay(sel.templateId, d),
  } : null;

  const renderGroups = (groups: [string, Row[]][]) => groups.map(([day, list]) => (
    <div className="td-group" key={day}>
      <div className={`td-ghead${day < today ? " overdue" : ""}${day === today ? " today" : ""}`}>
        <span>{dayLabel(day, today)}</span>
        <button type="button" className="td-go" onClick={() => goToDay(list[0].templateId, day)}>Go to day →</button>
      </div>
      {list.map((r) => (
        <ChecklistRow
          key={`${r.entryId}-${r.item.id}`}
          item={r.item}
          readOnlyText
          selected={wide && selId === r.item.id}
          onUpdate={(p) => update(r, p)}
          onMore={() => setSelId(r.item.id)}
        />
      ))}
    </div>
  ));

  return (
    <div className="td-wrap">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="td-filters">
        <button type="button" className={`nt-chip${filter === "open" ? " active" : ""}`} onClick={() => setFilter("open")}>Open ({open.length})</button>
        <button type="button" className={`nt-chip${filter === "done" ? " active" : ""}`} onClick={() => setFilter("done")}>Done</button>
      </div>

      {filter === "open" && (
        <div className="td-add">
          <span className="plus" aria-hidden>+</span>
          <input
            ref={addRef}
            placeholder="Add a to-do for today"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitDraft(); } }}
            onBlur={commitDraft}
          />
        </div>
      )}

      {q.isLoading ? <div className="td-empty">Loading…</div> : filter === "open" ? (
        <>
          {open.length === 0
            ? <div className="td-empty">{needle ? "No open to-dos match your search." : "Nothing open. Every to-do you write on a day shows up here."}</div>
            : renderGroups(group(open, true))}
          {doneThisWeek.length > 0 && (
            <div className="td-donebox">
              <button type="button" className="td-donebtn" onClick={() => setDoneOpen((v) => !v)} aria-expanded={doneOpen}>
                <span>Done this week · {doneThisWeek.length}</span><span aria-hidden>{doneOpen ? "▴" : "▾"}</span>
              </button>
              {doneOpen && <div className="td-donebody">{renderGroups(group(doneThisWeek, false))}</div>}
            </div>
          )}
        </>
      ) : (
        done.length === 0
          ? <div className="td-empty">{needle ? "No done to-dos match your search." : "No finished to-dos yet."}</div>
          : renderGroups(group(done, false))
      )}

      {!wide && detailProps && <TaskDetailsSheet key={sel!.item.id} {...detailProps} />}
      {wide && detailTarget && createPortal(
        detailProps
          ? <TaskDetailsInline key={sel!.item.id} {...detailProps} />
          : <div className="nt-panel-empty">Tap ⋯ on a to-do to see its details here.</div>,
        detailTarget,
      )}
    </div>
  );
});
