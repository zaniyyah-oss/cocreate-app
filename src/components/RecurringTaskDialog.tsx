import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  RECURRENCE_LABEL,
  RECURRING_COLORS,
  WEEKDAY_LABELS,
  isoDate,
  type RecurrenceFrequency,
  type RecurringTask,
} from "@/lib/recurring-tasks";

const LABEL: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#181A4D" };
const FIELD: React.CSSProperties = {
  padding: "10px 12px", border: "1px solid #E4DFCF", borderRadius: 10,
  fontFamily: "inherit", fontSize: 14, width: "100%", boxSizing: "border-box", background: "#fff",
};

export function RecurringTaskDialog({
  open, onOpenChange, userId, task, defaultDate, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string | null;
  task?: RecurringTask | null;
  defaultDate?: string;
  onSaved: () => void;
}) {
  const isEdit = !!task;
  const today = defaultDate ?? isoDate(new Date());

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [color, setColor] = useState("#8A96E0");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("weekly");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [monthDays, setMonthDays] = useState<number[]>([]);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    if (task) {
      setTitle(task.title);
      setNotes(task.notes ?? "");
      setColor(task.color || "#8A96E0");
      setFrequency(task.frequency);
      setWeekdays(task.weekdays ?? []);
      setMonthDays(task.month_days ?? []);
      setStartDate(task.start_date);
      setEndDate(task.end_date ?? "");
      setStartTime((task.start_time ?? "").slice(0, 5));
      setEndTime((task.end_time ?? "").slice(0, 5));
      setIsActive(task.is_active);
    } else {
      const d = new Date(today + "T00:00:00");
      setTitle("");
      setNotes("");
      setColor("#8A96E0");
      setFrequency("weekly");
      setWeekdays([d.getDay()]);
      setMonthDays([d.getDate()]);
      setStartDate(today);
      setEndDate("");
      setStartTime("");
      setEndTime("");
      setIsActive(true);
    }
  }, [open, task, today]);

  const byWeekday = frequency === "weekly" || frequency === "biweekly";

  const toggle = (arr: number[], v: number) =>
    arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v].sort((a, b) => a - b);

  const save = async () => {
    if (!userId) { setErr("Please sign in to save."); return; }
    if (!title.trim()) { setErr("Give this task a name."); return; }
    if (byWeekday && weekdays.length === 0) { setErr("Pick at least one day of the week."); return; }
    if (!byWeekday && monthDays.length === 0) { setErr("Pick at least one day of the month."); return; }
    if (startTime && endTime && endTime <= startTime) { setErr("End time must be after start time."); return; }
    if (endDate && endDate < startDate) { setErr("End date must be after the start date."); return; }

    setSaving(true); setErr(null);
    const payload = {
      title: title.trim(),
      notes: notes.trim() || null,
      color,
      frequency,
      weekdays: byWeekday ? weekdays : [],
      month_days: byWeekday ? [] : monthDays,
      start_date: startDate,
      end_date: endDate || null,
      start_time: startTime || null,
      end_time: endTime || null,
      is_active: isActive,
    };
    const { error } = isEdit && task
      ? await supabase.from("recurring_tasks" as any).update(payload).eq("id", task.id)
      : await supabase.from("recurring_tasks" as any).insert({ user_id: userId, ...payload });
    setSaving(false);
    if (error) { setErr(error.message); return; }
    onSaved();
    onOpenChange(false);
  };

  const remove = async () => {
    if (!task) return;
    if (!confirm("Delete this recurring task and all of its occurrences?")) return;
    setDeleting(true); setErr(null);
    const { error } = await supabase.from("recurring_tasks" as any).delete().eq("id", task.id);
    setDeleting(false);
    if (error) { setErr(error.message); return; }
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[88vh] overflow-y-auto" style={{ fontFamily: "'Poppins',sans-serif" }}>
        <DialogHeader>
          <DialogTitle style={{ color: "#181A4D", fontWeight: 700 }}>
            {isEdit ? "Edit recurring task" : "New recurring task"}
          </DialogTitle>
        </DialogHeader>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, ...LABEL }}>
            Task name
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Call my discipler" style={FIELD} />
          </label>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={LABEL}>Repeats</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {(["weekly", "biweekly", "monthly", "quarterly"] as const).map(f => {
                const active = frequency === f;
                return (
                  <button key={f} type="button" onClick={() => setFrequency(f)}
                    style={{
                      padding: "10px 12px", borderRadius: 10,
                      border: active ? "2px solid #181A4D" : "1px solid #E4DFCF",
                      background: active ? "#181A4D" : "#fff",
                      color: active ? "#DCE07A" : "#181A4D",
                      cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700,
                    }}>
                    {RECURRENCE_LABEL[f]}
                  </button>
                );
              })}
            </div>
          </div>

          {byWeekday ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={LABEL}>On these days</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {WEEKDAY_LABELS.map((lbl, i) => {
                  const active = weekdays.includes(i);
                  return (
                    <button key={i} type="button" onClick={() => setWeekdays(w => toggle(w, i))}
                      style={{
                        minWidth: 46, padding: "8px 6px", borderRadius: 999,
                        border: active ? "2px solid #181A4D" : "1px solid #E4DFCF",
                        background: active ? "#181A4D" : "#fff",
                        color: active ? "#DCE07A" : "#181A4D",
                        cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700,
                      }}>
                      {lbl}
                    </button>
                  );
                })}
              </div>
              {frequency === "biweekly" && (
                <div style={{ fontSize: 11.5, color: "#8a8678" }}>
                  Repeats every other week, counting from the start date's week.
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={LABEL}>On these days of the month</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5 }}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => {
                  const active = monthDays.includes(d);
                  return (
                    <button key={d} type="button" onClick={() => setMonthDays(m => toggle(m, d))}
                      style={{
                        padding: "7px 0", borderRadius: 8,
                        border: active ? "2px solid #181A4D" : "1px solid #E4DFCF",
                        background: active ? "#181A4D" : "#fff",
                        color: active ? "#DCE07A" : "#181A4D",
                        cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700,
                      }}>
                      {d}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 11.5, color: "#8a8678" }}>
                {frequency === "quarterly"
                  ? "Repeats every 3 months from the start month. Days past the end of a short month land on its last day."
                  : "Days past the end of a short month land on its last day."}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, ...LABEL }}>
              Starts
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={FIELD} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, ...LABEL }}>
              Ends <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={FIELD} />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, ...LABEL }}>
              Start time <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={FIELD} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, ...LABEL }}>
              End time <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={FIELD} />
            </label>
          </div>

          <div>
            <div style={{ ...LABEL, marginBottom: 6 }}>Color</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {RECURRING_COLORS.map(sw => {
                const active = color === sw.value;
                return (
                  <button key={sw.value} type="button" aria-label={sw.name} onClick={() => setColor(sw.value)}
                    style={{
                      width: 28, height: 28, borderRadius: 999, background: sw.value, cursor: "pointer",
                      border: active ? "2px solid #181A4D" : "1px solid #E4DFCF",
                      boxShadow: active ? "0 0 0 2px #fff inset" : "none",
                    }} />
                );
              })}
            </div>
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: 6, ...LABEL }}>
            Details <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              style={{ ...FIELD, resize: "vertical" }} />
          </label>

          {isEdit && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, ...LABEL }}>
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
              Active (uncheck to pause without deleting)
            </label>
          )}

          {err && <div style={{ color: "#FF3B30", fontSize: 13 }}>{err}</div>}

          <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
            <div>
              {isEdit && (
                <button type="button" onClick={remove} disabled={deleting || saving}
                  style={{ padding: "10px 16px", borderRadius: 999, border: "1.5px solid #FF3B30", background: "#fff", color: "#FF3B30", cursor: deleting ? "wait" : "pointer", fontFamily: "inherit", fontWeight: 700 }}>
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => onOpenChange(false)}
                style={{ padding: "10px 16px", borderRadius: 999, border: "1px solid #E4DFCF", background: "#fff", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, color: "#181A4D" }}>
                Cancel
              </button>
              <button type="button" onClick={save} disabled={saving || deleting}
                style={{ padding: "10px 18px", borderRadius: 999, border: "none", background: "#181A4D", color: "#fff", cursor: saving ? "wait" : "pointer", fontFamily: "inherit", fontWeight: 700 }}>
                {saving ? "Saving…" : isEdit ? "Save changes" : "Create task"}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
