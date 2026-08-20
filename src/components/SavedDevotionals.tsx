import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { planColor } from "@/lib/plan-palette";
import { listPlans, startPlanAssignment } from "@/lib/plans.functions";
import type { PlanRow } from "@/lib/plans.schemas";

const CSS = `
.sd-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:0 0 14px;}
.sd-title{font-family:'Archivo Black','Poppins',sans-serif;font-size:20px;font-weight:900;margin:0;color:#20201C;}
.sd-note{font-size:13px;color:#8a8879;}
.sd-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-bottom:34px;}
@media (max-width:900px){.sd-grid{grid-template-columns:1fr;gap:12px;margin-bottom:20px;}}
@media (max-width:640px){
  .sd-head{margin:0 0 12px;}
  .sd-title{font-size:17px;}
  .sd-card{padding:14px 16px;gap:8px;}
  .sd-name{font-size:16px;}
  .sd-actions{gap:6px;}
  .sd-btn{padding:7px 12px;font-size:11px;}
}
.sd-card{
  background:#fff;border:1.5px solid #ECE4CE;border-left-width:10px;border-radius:16px;
  padding:20px 22px;display:flex;flex-direction:column;gap:12px;transition:border-color .15s ease;
}
.sd-card:hover{border-top-color:#FFAE00;border-right-color:#FFAE00;border-bottom-color:#FFAE00;}
.sd-name{font-family:'Archivo Black','Poppins',sans-serif;font-size:20px;font-weight:900;line-height:1.15;margin:0;color:#20201C;}
.sd-meta{font-size:13px;color:#8a8879;font-weight:600;}
.sd-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:2px;}
.sd-btn{
  border:1.5px solid #181A4D;background:#181A4D;color:#fff;font-family:inherit;font-size:12px;
  font-weight:800;letter-spacing:.04em;padding:8px 15px;border-radius:999px;cursor:pointer;
}
.sd-btn.ghost{background:#fff;color:#181A4D;}
.sd-btn:hover{background:#0F4A42;border-color:#0F4A42;color:#fff;}
.sd-btn:disabled{opacity:.55;cursor:not-allowed;}
.sd-empty{border:1.5px dashed #ECE4CE;border-radius:16px;padding:22px;color:#8a8879;font-size:14px;margin-bottom:34px;}
.sd-scrim{position:fixed;inset:0;background:rgba(24,26,77,.42);display:flex;align-items:center;justify-content:center;padding:20px;z-index:80;}
.sd-modal{background:#FBF8ED;border-radius:18px;padding:24px;width:100%;max-width:400px;font-family:'Poppins',sans-serif;}
.sd-modal h3{font-family:'Archivo Black','Poppins',sans-serif;font-size:20px;margin:0 0 6px;color:#20201C;}
.sd-modal p{font-size:13px;color:#6b6a60;margin:0 0 16px;line-height:1.5;}
.sd-modal label{font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#8a8879;display:block;margin-bottom:6px;}
.sd-modal input{width:100%;border:1.5px solid #ECE4CE;border-radius:10px;padding:11px 13px;font-family:inherit;font-size:15px;background:#fff;color:#20201C;}
.sd-modal .row{display:flex;gap:8px;justify-content:flex-end;margin-top:18px;}
`;

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function SavedDevotionalsSection({
  title = "Saved devotionals",
  note = "Devotionals you built or saved",
  emptyText = "Nothing here yet. Build a devotional from the Read page and it will show up here.",
}: {
  title?: string;
  note?: string;
  emptyText?: string;
} = {}) {
  const navigate = useNavigate();
  const fetchPlans = useServerFn(listPlans);
  const startAssignment = useServerFn(startPlanAssignment);

  const plans = useQuery({ queryKey: ["plans"], queryFn: () => fetchPlans() });
  const [busy, setBusy] = useState<string | null>(null);
  const [assignFor, setAssignFor] = useState<PlanRow | null>(null);
  const [span, setSpan] = useState("");

  async function start(plan: PlanRow) {
    setBusy(plan.id);
    try {
      await startAssignment({ data: { plan_id: plan.id, start_date: todayISO() } });
      toast.success(`"${plan.name}" starts today.`);
      navigate({ to: "/devotionals" });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start this devotional.");
    } finally {
      setBusy(null);
    }
  }

  async function confirmAssign() {
    if (!assignFor) return;
    const n = Number(span);
    if (!Number.isFinite(n) || n < assignFor.length_days) {
      toast.error(`Span at least ${assignFor.length_days} day${assignFor.length_days === 1 ? "" : "s"}.`);
      return;
    }
    setBusy(assignFor.id);
    try {
      await startAssignment({ data: { plan_id: assignFor.id, start_date: todayISO() } });
      toast.success(`"${assignFor.name}" assigned across the next ${n} days.`);
      setAssignFor(null);
      navigate({ to: "/devotionals" });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not assign this devotional.");
    } finally {
      setBusy(null);
    }
  }

  const rows = plans.data ?? [];

  return (
    <section>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="sd-head">
        <h2 className="sd-title">{title}</h2>
        <span className="sd-note">{note}</span>
      </div>

      {plans.isLoading ? (
        <div className="sd-empty">Loading your devotionals…</div>
      ) : rows.length === 0 ? (
        <div className="sd-empty">{emptyText}</div>
      ) : (
        <div className="sd-grid">
          {rows.map((p) => {
            const c = planColor(p.color);
            return (
              <article key={p.id} className="sd-card" style={{ borderLeftColor: c.hex }}>
                <h3 className="sd-name">{p.name}</h3>
                <div className="sd-meta">{p.length_days}-Day Devotional</div>
                <div className="sd-actions">
                  <button
                    type="button"
                    className="sd-btn"
                    disabled={busy === p.id}
                    onClick={() => start(p)}
                    style={{ background: c.hex, borderColor: c.hex, color: c.onHex }}
                  >
                    Start today
                  </button>
                  <button
                    type="button"
                    className="sd-btn ghost"
                    disabled={busy === p.id}
                    onClick={() => { setAssignFor(p); setSpan(String(p.length_days)); }}
                  >
                    Assign days
                  </button>
                  <button
                    type="button"
                    className="sd-btn ghost"
                    onClick={() => navigate({ to: "/plans/$id/edit", params: { id: p.id } })}
                  >
                    Edit
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {assignFor && (
        <div className="sd-scrim" role="dialog" aria-modal="true" onClick={() => setAssignFor(null)}>
          <div className="sd-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Assign days</h3>
            <p>
              How many upcoming days should “{assignFor.name}” span? It has {assignFor.length_days}{" "}
              {assignFor.length_days === 1 ? "day" : "days"} of content, starting today.
            </p>
            <label htmlFor="sd-span">Days to span</label>
            <input
              id="sd-span"
              type="number"
              min={assignFor.length_days}
              value={span}
              onChange={(e) => setSpan(e.target.value)}
            />
            <div className="row">
              <button type="button" className="sd-btn ghost" onClick={() => setAssignFor(null)}>Cancel</button>
              <button type="button" className="sd-btn" disabled={busy === assignFor.id} onClick={confirmAssign}>
                {busy === assignFor.id ? "Assigning…" : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
