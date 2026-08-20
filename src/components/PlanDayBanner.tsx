import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { getActivePlanForDate } from "@/lib/plans.functions";
import { planColor } from "@/lib/plan-palette";

/**
 * Devotional banner shown on the Entry view for a given date.
 * Renders nothing when no active assignment covers that date.
 */
export function PlanDayBanner({ userId, dateISO }: { userId: string | null; dateISO: string }) {
  const navigate = useNavigate();
  const fetchActive = useServerFn(getActivePlanForDate);

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

  return (
    <button
      type="button"
      onClick={() => navigate({ to: "/plans/focus/$date", params: { date: dateISO } })}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
        width: "100%", textAlign: "left",
        background: c.hex, color: c.onHex, border: "none",
        borderRadius: 14, padding: "14px 16px", margin: "0 0 16px", cursor: "pointer",
        fontFamily: "'Poppins',sans-serif",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: c.onHex, opacity: 0.85, flex: "none" }} />
        <span>
          <span style={{ display: "block", fontWeight: 700, fontSize: 14 }}>{active.plan.name}</span>
          <span style={{ display: "block", fontSize: 11.5, opacity: 0.8 }}>
            Day {active.day_number} of {active.plan.length_days}
          </span>
        </span>
      </span>
      <span style={{ fontWeight: 700, fontSize: 12.5, whiteSpace: "nowrap" }}>{cta}</span>
    </button>
  );
}
