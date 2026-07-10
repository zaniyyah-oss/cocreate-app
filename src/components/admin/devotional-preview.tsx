import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Template = Database["public"]["Tables"]["devotional_templates"]["Row"];

type ScriptureItem = { reference?: string; note?: string };

/**
 * Read-only preview of a devotional day, rendered to match the live
 * workspace Read/Pray/To-Do layout (see src/routes/devotionals.focus.$id.tsx).
 * Uses the current form state (unsaved edits included) plus persisted
 * devotional_days overrides for each day.
 */
export function DevotionalPreviewModal({
  template,
  formState,
  onClose,
}: {
  template: Template;
  formState: {
    title: string;
    description: string;
    scripture_focus: string;
    reflect_prompt: string;
    pray_prompt: string;
    apply_prompt: string;
    fill_mode: "pool" | "sequence";
    duration_days: string;
    scripture_items: Array<{ reference: string; note: string }>;
    pray_items: string[];
    todo_items_pool: string[];
  };
  onClose: () => void;
}) {
  const duration = Math.max(1, parseInt(formState.duration_days, 10) || 1);
  const [day, setDay] = useState(1);

  // Trap escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const daysQ = useQuery({
    queryKey: ["preview-days", template.id],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("devotional_days")
        .select("*")
        .eq("template_id", template.id);
      if (error) throw error;
      return (data ?? []) as Array<{
        day_number: number; is_override: boolean;
        focus_preview: string | null; reflect_prompt: string | null;
        pray_prompt: string | null; apply_prompt: string | null;
        scripture_reference: string | null; scripture_note: string | null;
      }>;
    },
  });

  const byDay = useMemo(() => {
    const m = new Map<number, NonNullable<typeof daysQ.data>[number]>();
    for (const r of daysQ.data ?? []) m.set(r.day_number, r);
    return m;
  }, [daysQ.data]);

  // Resolve everything shown for a given day (override wins, else fall
  // back to the sequence content on the template).
  const resolved = useMemo(() => {
    const mode = formState.fill_mode;
    const idx = mode === "sequence"
      ? Math.min(day - 1, formState.scripture_items.length - 1)
      : (day - 1) % Math.max(1, formState.scripture_items.length || 1);
    const scr: ScriptureItem | undefined = formState.scripture_items[idx];
    const prayItem = formState.pray_items.length
      ? formState.pray_items[mode === "sequence"
          ? Math.min(day - 1, formState.pray_items.length - 1)
          : (day - 1) % formState.pray_items.length]
      : "";
    const todoItem = formState.todo_items_pool.length
      ? formState.todo_items_pool[mode === "sequence"
          ? Math.min(day - 1, formState.todo_items_pool.length - 1)
          : (day - 1) % formState.todo_items_pool.length]
      : "";

    const override = byDay.get(day);
    const overridden = !!(override && override.is_override);

    return {
      overridden,
      focus_preview: override?.focus_preview ?? "",
      scripture_reference: override?.scripture_reference ?? scr?.reference ?? "",
      scripture_note: override?.scripture_note ?? scr?.note ?? "",
      reflect_prompt: override?.reflect_prompt ?? formState.reflect_prompt ?? "",
      pray_prompt: override?.pray_prompt ?? formState.pray_prompt ?? "",
      apply_prompt: override?.apply_prompt ?? formState.apply_prompt ?? "",
      prayItem,
      todoItem,
    };
  }, [day, byDay, formState]);

  const pacingLabel = `Day ${day} of ${duration}`;

  return (
    <div className="modal-back" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <style dangerouslySetInnerHTML={{ __html: DP_CSS }} />
      <div className="dp-box">
        <div className="dp-head">
          <div>
            <div className="dp-eyebrow">Preview · read only</div>
            <div className="dp-title">{formState.title || template.title}</div>
          </div>
          <button type="button" className="dp-close" onClick={onClose} aria-label="Close preview">×</button>
        </div>

        <div className="dp-selectrow">
          <div className="dp-daynav">
            <button type="button" onClick={() => setDay((d) => Math.max(1, d - 1))} disabled={day <= 1} aria-label="Previous day">‹</button>
            <select value={day} onChange={(e) => setDay(parseInt(e.target.value, 10))}>
              {Array.from({ length: duration }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>Day {n}</option>
              ))}
            </select>
            <button type="button" onClick={() => setDay((d) => Math.min(duration, d + 1))} disabled={day >= duration} aria-label="Next day">›</button>
          </div>
          <span className={`dp-chip${resolved.overridden ? " on" : ""}`}>
            {resolved.overridden ? "Overridden" : "Default"}
          </span>
        </div>

        <div className="dp-scroll">
          <div className="fp-root">
            <style dangerouslySetInnerHTML={{ __html: FP_CSS }} />
            <div style={{ padding: "18px 4px 8px" }}>
              {formState.description && <p className="fp-sub">{formState.description}</p>}
              <p className="fp-pacing">{pacingLabel}</p>
              {resolved.focus_preview && (
                <p className="fp-focus">{resolved.focus_preview}</p>
              )}

              <div className="fp-grid">
                {/* READ */}
                <div className="fp-card" style={{ borderTop: `4px solid #0F4A42` }}>
                  <span className="fp-badge read">read</span>
                  {(resolved.scripture_reference || formState.scripture_focus) && (
                    <>
                      <div className="fp-sublabel">Scripture</div>
                      <div className="fp-scr-ref">{resolved.scripture_reference || formState.scripture_focus}</div>
                    </>
                  )}
                  {resolved.scripture_note && (
                    <p className="fp-body" style={{ marginTop: 8 }}>{resolved.scripture_note}</p>
                  )}
                  {resolved.reflect_prompt && (
                    <>
                      <div className="fp-sublabel">Reflection</div>
                      <p className="fp-body">{resolved.reflect_prompt}</p>
                    </>
                  )}
                  <div className="fp-response-label">Your response</div>
                  <div className="fp-textarea-preview">What did you notice? What is God saying?</div>
                </div>

                {/* PRAY */}
                <div className="fp-card" style={{ borderTop: `4px solid #E990A2` }}>
                  <span className="fp-badge pray">pray</span>
                  {resolved.pray_prompt && <p className="fp-body">{resolved.pray_prompt}</p>}
                  {resolved.prayItem && (
                    <>
                      <div className="fp-sublabel">Prayer prompt</div>
                      <p className="fp-body">{resolved.prayItem}</p>
                    </>
                  )}
                  <div className="fp-response-label">Your response</div>
                  <div className="fp-textarea-preview">Speak plainly to God…</div>
                </div>

                {/* TO-DO */}
                <div className="fp-card" style={{ borderTop: `4px solid #FFAE00` }}>
                  <span className="fp-badge todo">to-do</span>
                  {resolved.apply_prompt && <p className="fp-body">{resolved.apply_prompt}</p>}
                  {resolved.todoItem && (
                    <>
                      <div className="fp-sublabel">Action prompt</div>
                      <p className="fp-body">{resolved.todoItem}</p>
                    </>
                  )}
                  <div className="fp-response-label">Your response</div>
                  <div className="fp-textarea-preview">What is God asking you to do today?</div>
                </div>
              </div>

              {daysQ.isLoading && (
                <div style={{ marginTop: 14, fontSize: 12, color: "#8a8678" }}>Loading overrides…</div>
              )}
            </div>
          </div>
        </div>

        <div className="dp-foot">
          <span style={{ fontSize: 11.5, color: "#8a8678" }}>
            Preview reflects unsaved form edits plus any saved day overrides. Read-only — nothing here writes to the database.
          </span>
          <button type="button" className="ad-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

const DP_CSS = `
.dp-box{background:#eee9d9;border-radius:14px;width:100%;max-width:1180px;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;}
.dp-head{background:#fff;border-bottom:1px solid rgba(20,20,20,0.08);padding:16px 22px;display:flex;align-items:center;justify-content:space-between;gap:12px;}
.dp-eyebrow{font-size:10.5px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#8a8678;}
.dp-title{font-size:18px;font-weight:900;color:#181A4D;letter-spacing:-0.01em;margin-top:2px;}
.dp-close{background:transparent;border:none;font-size:26px;line-height:1;color:#8a8678;cursor:pointer;padding:4px 10px;border-radius:8px;font-family:Poppins;}
.dp-close:hover{background:#FBF8ED;color:#181A4D;}
.dp-selectrow{background:#fff;padding:10px 22px 14px;border-bottom:1px solid rgba(20,20,20,0.08);display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
.dp-daynav{display:flex;align-items:center;gap:6px;}
.dp-daynav button{background:#fff;border:1px solid rgba(20,20,20,0.14);border-radius:8px;width:32px;height:32px;font-size:16px;color:#181A4D;cursor:pointer;font-family:Poppins;font-weight:700;}
.dp-daynav button:disabled{opacity:0.35;cursor:default;}
.dp-daynav select{padding:7px 12px;border:1px solid rgba(20,20,20,0.14);border-radius:8px;font-family:Poppins;font-size:13px;background:#fff;color:#181A4D;font-weight:700;}
.dp-chip{font-size:10.5px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;padding:4px 10px;border-radius:99px;background:rgba(20,20,20,0.06);color:#8a8678;}
.dp-chip.on{background:#DCE07A;color:#181A4D;}
.dp-scroll{flex:1;overflow-y:auto;padding:18px 22px;background:#eee9d9;}
.dp-foot{background:#fff;border-top:1px solid rgba(20,20,20,0.08);padding:12px 22px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}
`;

// Slimmed-down copy of the focus page CSS so the preview matches the live layout.
const FP_CSS = `
.fp-root, .fp-root *{box-sizing:border-box;font-family:'Poppins',sans-serif;}
.fp-sub{font-size:14px;color:#20201C;opacity:0.75;margin:0 0 6px;line-height:1.55;}
.fp-pacing{font-size:12px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#8a8678;margin:0 0 10px;}
.fp-focus{font-size:14.5px;color:#181A4D;font-style:italic;margin:0 0 18px;line-height:1.5;}
.fp-grid{display:grid;grid-template-columns:1fr;gap:14px;}
@media (min-width:900px){.fp-grid{grid-template-columns:1fr 1fr 1fr;}}
.fp-card{background:#fff;border-radius:14px;padding:22px 24px;border:1px solid rgba(24,26,77,0.12);}
.fp-badge{display:inline-block;font-weight:600;font-size:11px;letter-spacing:0.03em;text-transform:uppercase;padding:5px 12px;border-radius:6px;margin-bottom:10px;color:#181A4D;}
.fp-badge.read{background:#FFAE00;} .fp-badge.pray{background:#E990A2;} .fp-badge.todo{background:#8A96E0;}
.fp-sublabel{font-size:10.5px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#8a8678;margin:14px 0 6px;}
.fp-scr-ref{font-size:15px;font-weight:700;color:#0F4A42;margin:0 0 4px;}
.fp-body{font-size:13.5px;color:#20201C;line-height:1.55;margin:0;white-space:pre-wrap;}
.fp-response-label{font-size:10.5px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#181A4D;margin:18px 0 6px;opacity:0.7;}
.fp-textarea-preview{border-bottom:1px dashed rgba(24,26,77,0.2);padding:6px 0 24px;color:#20201C;opacity:0.35;font-size:14px;font-style:italic;}
`;
