import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { cancelPlanAssignment, getActivePlanForDate } from "@/lib/plans.functions";
import { planColor } from "@/lib/plan-palette";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";

/**
 * Devotional banner shown for a given date. Renders nothing when no active
 * assignment covers that date. The quiet × removes the scheduled devotional
 * from the calendar after a branded confirm.
 */
export function PlanDayBanner({ userId, dateISO }: { userId: string | null; dateISO: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchActive = useServerFn(getActivePlanForDate);
  const cancelAssignment = useServerFn(cancelPlanAssignment);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const q = useQuery({
    queryKey: ["plan-active", userId, dateISO],
    enabled: !!userId,
    queryFn: () => fetchActive({ data: { date: dateISO } }),
  });

  const active = q.data;
  if (!userId || !active) return null;

  const c = planColor(active.plan.color);
  const cta =
    active.day_state === "completed" ? "Review →"
    : active.day_state === "in_progress" ? "Return →"
    : "Start now →";

  async function remove() {
    if (!active) return;
    setBusy(true);
    try {
      await cancelAssignment({ data: { assignment_id: active.assignment.id } });
      toast.success("Removed from your calendar.");
      setConfirming(false);
      qc.invalidateQueries({ queryKey: ["plan-active"] });
      qc.invalidateQueries({ queryKey: ["plan-assignments"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not remove this devotional.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: c.hex, color: c.onHex,
          borderRadius: 14, padding: "14px 16px", margin: "0 0 16px",
          fontFamily: "'Poppins',sans-serif",
        }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/plans/focus/$date", params: { date: dateISO } })}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
            flex: 1, minWidth: 0, textAlign: "left",
            background: "transparent", color: "inherit", border: "none", padding: 0,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: c.onHex, opacity: 0.85, flex: "none" }} />
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontWeight: 700, fontSize: 14 }}>{active.plan.name}</span>
              <span style={{ display: "block", fontSize: 11.5, opacity: 0.8 }}>
                Day {active.day_number} of {active.plan.length_days}
              </span>
            </span>
          </span>
          <span style={{ fontWeight: 700, fontSize: 12.5, whiteSpace: "nowrap" }}>{cta}</span>
        </button>

        <button
          type="button"
          aria-label="Remove this devotional from your calendar"
          title="Remove from calendar"
          onClick={() => setConfirming(true)}
          style={{
            background: "transparent", border: "none", color: c.onHex, opacity: 0.7,
            cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "2px 4px", flex: "none",
            fontFamily: "inherit",
          }}
        >
          ×
        </button>
      </div>

      <DeleteConfirmModal
        open={confirming}
        title="Remove this devotional?"
        itemName={active.plan.name}
        message="This takes it off your calendar and clears the reflections saved inside it. The devotional itself stays in your library."
        confirmLabel="Remove"
        busy={busy}
        onCancel={() => { if (!busy) setConfirming(false); }}
        onConfirm={remove}
      />
    </>
  );
}
