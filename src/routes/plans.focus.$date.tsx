import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getActivePlanForDate,
  savePlanDayResponse,
  setPlanDayComplete,
  createPlanDayNote,
  listPlanDayNotes,
  savePlanDayContent,
} from "@/lib/plans.functions";
import { planColor } from "@/lib/plan-palette";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/plans/focus/$date")({
  head: () => ({
    meta: [
      { title: "Devotional Focus — CoCreate" },
      { name: "description", content: "Sit with today's devotional day: read, pray, and complete your task." },
      { property: "og:title", content: "Devotional Focus — CoCreate" },
      { property: "og:description", content: "Sit with today's devotional day: read, pray, and complete your task." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlanFocusPage,
});

function formatLong(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric",
  });
}

function PlanFocusPage() {
  const { date } = useParams({ from: "/plans/focus/$date" });
  const navigate = useNavigate();
  const qc = useQueryClient();

  const fetchActive = useServerFn(getActivePlanForDate);
  const saveResponse = useServerFn(savePlanDayResponse);
  const completeDay = useServerFn(setPlanDayComplete);
  const addNote = useServerFn(createPlanDayNote);
  const fetchNotes = useServerFn(listPlanDayNotes);
  const saveDayContent = useServerFn(savePlanDayContent);

  const activeQ = useQuery({
    queryKey: ["plan-active", "focus", date],
    queryFn: () => fetchActive({ data: { date } }),
  });
  const active = activeQ.data ?? null;

  const [readText, setReadText] = useState("");
  const [prayText, setPrayText] = useState("");
  const [taskDone, setTaskDone] = useState(false);
  const [dayRead, setDayRead] = useState("");
  const [dayPray, setDayPray] = useState("");
  const [dayTask, setDayTask] = useState("");
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (!active) return;
    setReadText(active.response?.read_reflection ?? "");
    setPrayText(active.response?.pray_reflection ?? "");
    setTaskDone(!!active.response?.task_done);
    setDayRead(active.day?.read_content ?? "");
    setDayPray(active.day?.pray_prompt ?? "");
    setDayTask(active.day?.task_content ?? "");
  }, [active?.assignment.id, active?.day_number]);

  const completed = active?.day_state === "completed";
  const c = planColor(active?.plan.color);

  const notesQ = useQuery({
    queryKey: ["plan-day-notes", active?.assignment.id, active?.day_number],
    enabled: !!active,
    queryFn: () => fetchNotes({ data: { assignment_id: active!.assignment.id, day_number: active!.day_number } }),
  });

  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");

  const openNote = useMemo(
    () => (notesQ.data ?? []).find((n: any) => n.id === openNoteId) ?? null,
    [notesQ.data, openNoteId],
  );

  useEffect(() => {
    if (!openNote) return;
    setNoteTitle(openNote.title ?? "");
    setNoteBody(openNote.body_text ?? "");
  }, [openNoteId]);

  async function persist(patch: { read_reflection?: string; pray_reflection?: string; task_done?: boolean }) {
    if (!active) return;
    setSaving(true);
    try {
      await saveResponse({
        data: { assignment_id: active.assignment.id, day_number: active.day_number, ...patch },
      });
      qc.invalidateQueries({ queryKey: ["plan-active"] });
    } finally {
      setSaving(false);
    }
  }

  async function persistDayContent(patch: { read_content?: string; pray_prompt?: string; task_content?: string }) {
    if (!active) return;
    setSaving(true);
    try {
      await saveDayContent({ data: { plan_id: active.plan.id, day_number: active.day_number, ...patch } });
      qc.invalidateQueries({ queryKey: ["plan-active"] });
      qc.invalidateQueries({ queryKey: ["plan", active.plan.id] });
    } finally {
      setSaving(false);
    }
  }

  async function markComplete() {
    if (!active) return;
    setCompleting(true);
    try {
      await completeDay({ data: { assignment_id: active.assignment.id, day_number: active.day_number, completed: true } });
      await qc.invalidateQueries({ queryKey: ["plan-active"] });
      await activeQ.refetch();
    } finally {
      setCompleting(false);
    }
  }

  async function handleAddNote() {
    if (!active) return;
    const note: any = await addNote({
      data: { assignment_id: active.assignment.id, day_number: active.day_number },
    });
    await notesQ.refetch();
    setOpenNoteId(note.id);
  }

  async function saveNote() {
    if (!openNoteId) return;
    await supabase
      .from("workspace_items")
      .update({ title: noteTitle, body_text: noteBody } as any)
      .eq("id", openNoteId);
    await notesQ.refetch();
  }

  const box = {
    background: c.tint,
    border: `1.5px solid ${c.hex}`,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  } as const;
  const labelStyle = {
    display: "flex", alignItems: "center", gap: 7,
    fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: 12,
    textTransform: "uppercase" as const, letterSpacing: "0.05em", color: c.hex, marginBottom: 10,
  };
  const icon = (letter: string) => (
    <span style={{
      width: 20, height: 20, borderRadius: 999, background: c.hex, color: c.onHex,
      display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 700,
    }}>{letter}</span>
  );
  const field = {
    width: "100%", border: "1px solid #E4DFCF", borderRadius: 8, padding: "10px 12px",
    fontFamily: "inherit", fontSize: 13.5, background: "#fff", minHeight: 70, resize: "vertical" as const,
  };
  // Guided devotional copy: read-only, shown in full (no inner scrolling).
  const guided = {
    background: "#fff", border: "1px solid #E4DFCF", borderRadius: 8, padding: "12px 14px",
    fontFamily: "inherit", fontSize: 14.5, lineHeight: 1.6, color: "#20201C",
    whiteSpace: "pre-wrap" as const, marginBottom: 12,
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#FBF8ED", overflowY: "auto", zIndex: 60 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 18, background: c.hex, color: c.onHex }}>
        <button type="button" onClick={() => navigate({ to: "/devotionals" })}
          aria-label="Back"
          style={{
            background: "rgba(255,255,255,0.18)", border: "none", borderRadius: 8,
            width: 32, height: 32, color: c.onHex, fontSize: 16, cursor: "pointer", flex: "none",
          }}>←</button>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.8, fontFamily: "'Poppins',sans-serif" }}>
            Devotional Focus
          </div>
          <div style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 800, fontSize: 19 }}>
            {active ? `${active.plan.name} · Day ${active.day_number} of ${active.plan.length_days}` : "…"}
          </div>
        </div>
      </div>

      <div style={{ padding: 18, maxWidth: 760, margin: "0 auto" }}>
        {activeQ.isLoading && <div style={{ color: "#68655C" }}>Loading…</div>}

        {!activeQ.isLoading && !active && (
          <div style={{ color: "#68655C" }}>
            No devotional is scheduled for {formatLong(date)}.
          </div>
        )}

        {active && (
          <>
            <div style={box}>
              <div style={labelStyle}>{icon("R")}Read</div>
              {dayRead.trim() && <div style={guided}>{dayRead}</div>}
              <p style={{ margin: "0 0 8px", fontSize: 13, color: "#68655C" }}>Also want to jot something down?</p>
              <textarea
                style={{ ...field, minHeight: 180 }}
                placeholder="What did you notice? What is God saying?"
                value={readText}
                onChange={(e) => setReadText(e.target.value)}
                onBlur={() => persist({ read_reflection: readText })}
              />
            </div>

            <div style={box}>
              <div style={labelStyle}>{icon("P")}Pray</div>
              {dayPray.trim() && <div style={guided}>{dayPray}</div>}
              <p style={{ margin: "0 0 8px", fontSize: 13, color: "#68655C" }}>Anything else on your heart?</p>
              <textarea
                style={{ ...field, minHeight: 180 }}
                placeholder="Speak plainly to God..."
                value={prayText}
                onChange={(e) => setPrayText(e.target.value)}
                onBlur={() => persist({ pray_reflection: prayText })}
              />
            </div>

            <div style={box}>
              <div style={labelStyle}>{icon("T")}To-do</div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "#fff", borderRadius: 8, padding: "10px 12px" }}>
                <button
                  type="button"
                  aria-label="Toggle task"
                    onClick={() => { const next = !taskDone; setTaskDone(next); persist({ task_done: next }); }}
                  style={{
                    width: 20, height: 20, borderRadius: 6, border: `2px solid ${c.hex}`,
                    background: taskDone ? c.hex : "#fff", flex: "none", cursor: "pointer", marginTop: 1,
                  }}
                />
                <span style={{
                  flex: 1, fontFamily: "inherit", fontSize: 14, color: "#20201C",
                  whiteSpace: "pre-wrap", lineHeight: 1.5,
                  textDecoration: taskDone ? "line-through" : "none",
                }}>
                  {dayTask || "No task for this day"}
                </span>
              </div>
            </div>

            {/* Notes for this day */}
            <div style={{ marginBottom: 16 }}>
              {(notesQ.data ?? []).map((n: any) => (
                <button key={n.id} type="button" onClick={() => setOpenNoteId(n.id === openNoteId ? null : n.id)}
                  style={{
                    display: "block", width: "100%", textAlign: "left", background: "#fff",
                    border: "1px solid #E4DFCF", borderRadius: 10, padding: "12px 14px", marginBottom: 8, cursor: "pointer",
                  }}>
                  <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 12.5, fontWeight: 700, color: "#181A4D" }}>{n.title}</span>
                  <small style={{ display: "block", fontSize: 11, color: "#68655C", marginTop: 2 }}>
                    {(n.body_text ?? "").slice(0, 90) || "Empty note"}
                  </small>
                </button>
              ))}

              {openNote && (
                <div style={{ background: "#fff", border: `1.5px solid ${c.hex}`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
                  <input
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    onBlur={saveNote}
                    style={{ width: "100%", border: "none", outline: "none", fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: 15, color: "#181A4D", marginBottom: 8 }}
                  />
                  <textarea
                    value={noteBody}
                    onChange={(e) => setNoteBody(e.target.value)}
                    onBlur={saveNote}
                    placeholder="Write your note…"
                    style={{ ...field, minHeight: 140, border: "1px solid #E4DFCF" }}
                  />
                </div>
              )}

              <button type="button" onClick={handleAddNote}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
                  background: "#fff", border: "1px dashed #E4DFCF", borderRadius: 10, padding: "12px 14px", cursor: "pointer",
                }}>
                <span style={{ textAlign: "left" }}>
                  <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 12.5, fontWeight: 700, color: "#181A4D" }}>
                    + Add a note for this day
                  </span>
                  <small style={{ display: "block", fontSize: 11, color: "#68655C", marginTop: 2 }}>
                    Tagged “{active.plan.name} · Day {active.day_number}”
                  </small>
                </span>
                <span style={{ color: c.hex, fontWeight: 700 }}>→</span>
              </button>
            </div>

            {completed ? (
              <div style={{
                display: "flex", alignItems: "center", gap: 8, background: "#fff", borderRadius: 10,
                padding: "12px 14px", fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: 13, color: c.hex,
              }}>
                ✓ Completed {formatLong(date)} — you’re reviewing this day
              </div>
            ) : (
              <button type="button" onClick={markComplete} disabled={completing}
                style={{
                  width: "100%", background: c.hex, color: c.onHex, border: "none", borderRadius: 10,
                  padding: 14, fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: 14,
                  cursor: completing ? "wait" : "pointer",
                }}>
                {completing ? "Saving…" : "Mark today complete"}
              </button>
            )}

            <div style={{ height: 24 }} />
            {saving && <div style={{ fontSize: 11, color: "#68655C" }}>Saving…</div>}
          </>
        )}
      </div>
    </div>
  );
}
