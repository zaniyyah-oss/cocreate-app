import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { planColor } from "@/lib/plan-palette";
import { supabase } from "@/integrations/supabase/client";
import { listPlans, startPlanAssignment } from "@/lib/plans.functions";
import type { PlanRow } from "@/lib/plans.schemas";

type SavedTemplate = {
  savedId: string;
  saved_at: string;
  id: string;
  title: string;
  slug: string | null;
  duration_days: number | null;
  accent_color: string | null;
};

const CSS = `
.sd-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:0 0 12px;}
.sd-title{font-family:'Archivo Black','Poppins',sans-serif;font-size:20px;font-weight:900;margin:0;color:#20201C;}
.sd-note{font-size:13px;color:#8a8879;}
.sd-grid{display:grid;grid-template-columns:1fr;gap:8px;margin-bottom:24px;}
.sd-card{
  background:#fff;border:1.5px solid #ECE4CE;border-left-width:8px;border-radius:12px;
  padding:10px 14px;display:flex;align-items:center;gap:12px;transition:border-color .15s ease;
}
.sd-card:hover{border-top-color:#FFAE00;border-right-color:#FFAE00;border-bottom-color:#FFAE00;}
.sd-info{display:flex;flex-direction:column;gap:1px;min-width:0;flex:1;}
.sd-name{font-family:'Archivo Black','Poppins',sans-serif;font-size:15px;font-weight:900;line-height:1.2;margin:0;color:#20201C;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.sd-meta{font-size:11px;color:#8a8879;font-weight:600;}
.sd-actions{display:flex;gap:6px;flex-shrink:0;align-items:center;}
.sd-btn{
  border:1.5px solid #181A4D;background:#181A4D;color:#fff;font-family:inherit;font-size:11px;
  font-weight:800;letter-spacing:.03em;padding:6px 11px;border-radius:999px;cursor:pointer;white-space:nowrap;
}
.sd-btn.ghost{background:#fff;color:#181A4D;}
.sd-btn:hover{background:#0F4A42;border-color:#0F4A42;color:#fff;}
.sd-btn:disabled{opacity:.55;cursor:not-allowed;}
.sd-empty{border:1.5px dashed #ECE4CE;border-radius:14px;padding:18px;color:#8a8879;font-size:14px;margin-bottom:24px;}
.sd-scrim{position:fixed;inset:0;background:rgba(24,26,77,.42);display:flex;align-items:center;justify-content:center;padding:20px;z-index:80;}
.sd-modal{background:#FBF8ED;border-radius:18px;padding:24px;width:100%;max-width:400px;font-family:'Poppins',sans-serif;}
.sd-modal h3{font-family:'Archivo Black','Poppins',sans-serif;font-size:20px;margin:0 0 6px;color:#20201C;}
.sd-modal p{font-size:13px;color:#6b6a60;margin:0 0 16px;line-height:1.5;}
.sd-modal label{font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#8a8879;display:block;margin-bottom:6px;}
.sd-modal input{width:100%;border:1.5px solid #ECE4CE;border-radius:10px;padding:11px 13px;font-family:inherit;font-size:15px;background:#fff;color:#20201C;}
.sd-modal .row{display:flex;gap:8px;justify-content:flex-end;margin-top:18px;}
@media (max-width:640px){
  .sd-card{flex-wrap:wrap;padding:10px 12px;}
  .sd-name{font-size:14px;white-space:normal;}
  .sd-actions{width:100%;margin-top:4px;}
}
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

  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const plans = useQuery({ queryKey: ["plans"], queryFn: () => fetchPlans() });

  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data?.user?.id ?? null);
      setAuthReady(true);
    });
  }, []);

  /** Devotionals saved from CoCreate (saved_items → devotional_templates). */
  const savedTemplates = useQuery({
    queryKey: ["saved-devotional-templates", userId],
    enabled: authReady && !!userId,
    queryFn: async (): Promise<SavedTemplate[]> => {
      const { data, error } = await supabase
        .from("saved_items")
        .select(
          "id, saved_at, devotional_template_id, devotional_templates(id, title, slug, duration_days, accent_color)"
        )
        .eq("user_id", userId!)
        .not("devotional_template_id", "is", null)
        .order("saved_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as any[])
        .filter((r) => r.devotional_templates)
        .map((r) => ({
          savedId: r.id,
          saved_at: r.saved_at,
          id: r.devotional_templates.id,
          title: r.devotional_templates.title,
          slug: r.devotional_templates.slug ?? null,
          duration_days: r.devotional_templates.duration_days ?? null,
          accent_color: r.devotional_templates.accent_color ?? null,
        }));
    },
  });

  async function unsaveTemplate(savedId: string) {
    setBusy(savedId);
    try {
      const { error } = await supabase.from("saved_items").delete().eq("id", savedId);
      if (error) throw error;
      toast.success("Removed from saved.");
      qc.invalidateQueries({ queryKey: ["saved-devotional-templates"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not remove this devotional.");
    } finally {
      setBusy(null);
    }
  }

  const [assignFor, setAssignFor] = useState<PlanRow | null>(null);
  const [span, setSpan] = useState("");
  const [startDate, setStartDate] = useState(todayISO());

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
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      toast.error("Pick a start date.");
      return;
    }
    const n = Number(span);
    if (!Number.isFinite(n) || n < assignFor.length_days) {
      toast.error(`Span at least ${assignFor.length_days} day${assignFor.length_days === 1 ? "" : "s"}.`);
      return;
    }
    setBusy(assignFor.id);
    try {
      await startAssignment({ data: { plan_id: assignFor.id, start_date: startDate } });
      const when = new Date(`${startDate}T00:00:00`).toLocaleDateString(undefined, {
        month: "long", day: "numeric",
      });
      toast.success(`"${assignFor.name}" starts ${startDate === todayISO() ? "today" : `on ${when}`}.`);
      setAssignFor(null);
      navigate({ to: "/devotionals" });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not assign this devotional.");
    } finally {
      setBusy(null);
    }
  }

  const rows = plans.data ?? [];
  const savedRows = savedTemplates.data ?? [];

  return (
    <section>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="sd-head">
        <h2 className="sd-title">{title}</h2>
        <span className="sd-note">{note}</span>
      </div>

      {savedRows.length > 0 && (
        <div className="sd-grid">
          {savedRows.map((t) => {
            const hex = t.accent_color || "#0F4A42";
            return (
              <article key={t.savedId} className="sd-card" style={{ borderLeftColor: hex }}>
                <div className="sd-info">
                  <h3 className="sd-name">{t.title}</h3>
                  <div className="sd-meta">
                    {t.duration_days ? `${t.duration_days}-Day Devotional · Saved` : "Saved from CoCreate"}
                  </div>
                </div>
                <div className="sd-actions">
                  <button
                    type="button"
                    className="sd-btn"
                    style={{ background: hex, borderColor: hex, color: "#fff" }}
                    onClick={() =>
                      navigate({ to: "/devotionals/$slug/overview", params: { slug: t.slug || t.id } })
                    }
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    className="sd-btn ghost"
                    disabled={busy === t.savedId}
                    onClick={() => unsaveTemplate(t.savedId)}
                  >
                    Remove
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {plans.isLoading || savedTemplates.isLoading ? (
        <div className="sd-empty">Loading your devotionals…</div>
      ) : rows.length === 0 ? (
        savedRows.length === 0 ? <div className="sd-empty">{emptyText}</div> : null
      ) : (
        <div className="sd-grid">
          {rows.map((p) => {
            const c = planColor(p.color);
            return (
              <article key={p.id} className="sd-card" style={{ borderLeftColor: c.hex }}>
                <div className="sd-info">
                  <h3 className="sd-name">{p.name}</h3>
                  <div className="sd-meta">{p.length_days}-Day Devotional</div>
                </div>
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
                    onClick={() => { setAssignFor(p); setSpan(String(p.length_days)); setStartDate(todayISO()); }}
                  >
                    Schedule
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
            <h3>Schedule this devotional</h3>
            <p>
              Choose the day “{assignFor.name}” should begin. It has {assignFor.length_days}{" "}
              {assignFor.length_days === 1 ? "day" : "days"} of content, and can start today or any day ahead.
            </p>
            <label htmlFor="sd-start">Start date</label>
            <input
              id="sd-start"
              type="date"
              value={startDate}
              min={todayISO()}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ marginBottom: 14 }}
            />
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
                {busy === assignFor.id ? "Scheduling…" : "Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
