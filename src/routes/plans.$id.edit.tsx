import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PLAN_PALETTE, PLAN_LENGTHS, planColor } from "@/lib/plan-palette";
import { getPlan, updatePlan, deletePlan } from "@/lib/plans.functions";

export const Route = createFileRoute("/plans/$id/edit")({
  head: () => ({
    meta: [
      { title: "Edit devotional — CoCreate" },
      { name: "description", content: "Rename, recolor, reshape and rewrite a devotional you built. Changes apply to the days you're living now." },
      { property: "og:title", content: "Edit devotional — CoCreate" },
      { property: "og:description", content: "Rename, recolor, reshape and rewrite a devotional you built." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: () => (
    <AppShell><div style={{ padding: 32, fontFamily: "'Poppins',sans-serif" }}>We couldn't load this devotional.</div></AppShell>
  ),
  notFoundComponent: () => (
    <AppShell><div style={{ padding: 32, fontFamily: "'Poppins',sans-serif" }}>Devotional not found.</div></AppShell>
  ),
  component: PlanEditor,
});

type DayDraft = { read: string; pray: string; tasks: string[] };
const emptyDay = (): DayDraft => ({ read: "", pray: "", tasks: [""] });

function PlanEditor() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchPlan = useServerFn(getPlan);
  const save = useServerFn(updatePlan);
  const remove = useServerFn(deletePlan);

  const plan = useQuery({ queryKey: ["plan", id], queryFn: () => fetchPlan({ data: { id } }) });

  const [name, setName] = useState("");
  const [color, setColor] = useState<string>("navy");
  const [length, setLength] = useState<number>(3);
  const [activeDay, setActiveDay] = useState(1);
  const [days, setDays] = useState<Record<number, DayDraft>>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded || !plan.data) return;
    const { plan: p, days: d } = plan.data;
    setName(p.name);
    setColor(p.color);
    setLength(p.length_days);
    const map: Record<number, DayDraft> = {};
    for (const row of d) {
      map[row.day_number] = {
        read: row.read_content ?? "",
        pray: row.pray_prompt ?? "",
        task: row.task_content ?? "",
      };
    }
    setDays(map);
    setLoaded(true);
  }, [plan.data, loaded]);

  const c = planColor(color);
  const day = days[activeDay] ?? emptyDay();
  const dayNumbers = useMemo(() => Array.from({ length }, (_, i) => i + 1), [length]);

  function patch(field: "read" | "pray", value: string) {
    setDays((prev) => ({ ...prev, [activeDay]: { ...(prev[activeDay] ?? emptyDay()), [field]: value } }));
  }

  function setTasks(updater: (tasks: string[]) => string[]) {
    setDays((prev) => {
      const cur = prev[activeDay] ?? emptyDay();
      const tasks = updater(cur.tasks.length ? cur.tasks : [""]);
      return { ...prev, [activeDay]: { ...cur, tasks: tasks.length ? tasks : [""] } };
    });
  }

  function chooseLength(n: number) {
    setLength(n);
    if (activeDay > n) setActiveDay(1);
  }

  async function submit() {
    if (!name.trim()) {
      toast.error("Give your devotional a name first.");
      return;
    }
    setSaving(true);
    try {
      await save({
        data: {
          plan_id: id,
          name: name.trim(),
          color: color as any,
          length_days: length,
          days: dayNumbers.map((n) => {
            const d = days[n] ?? emptyDay();
            return {
              day_number: n,
              read_content: d.read.trim() || null,
              pray_prompt: d.pray.trim() || null,
              task_content: d.tasks.map((t) => t.trim()).filter(Boolean).join("\n") || null,
            };
          }),
        },
      });
      await qc.invalidateQueries({ queryKey: ["plans"] });
      await qc.invalidateQueries({ queryKey: ["plan", id] });
      await qc.invalidateQueries({ queryKey: ["active-plan"] });
      toast.success("Devotional updated.");
      navigate({ to: "/read" });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save your changes.");
    } finally {
      setSaving(false);
    }
  }

  async function destroy() {
    if (!confirm("Delete this devotional? Any days assigned from it will be removed.")) return;
    setSaving(true);
    try {
      await remove({ data: { id } });
      await qc.invalidateQueries({ queryKey: ["plans"] });
      toast.success("Devotional deleted.");
      navigate({ to: "/read" });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not delete this devotional.");
    } finally {
      setSaving(false);
    }
  }

  const BOXES: Array<{ key: "read" | "pray"; label: string; icon: string; placeholder: string; rows: number }> = [
    { key: "read", label: "Read", icon: "R", placeholder: "Scripture or passage for this day", rows: 3 },
    { key: "pray", label: "Pray", icon: "P", placeholder: "A prayer prompt for this day", rows: 3 },
  ];

  return (
    <AppShell>
      <div style={{ background: "#FBF8ED", minHeight: "100vh", width: "100%" }}>
        <style>{`
          .pb-wrap{max-width:820px;margin:0 auto;padding:28px 24px 96px;font-family:'Poppins',sans-serif;color:#20201C;}
          .pb-eyebrow{font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#0F4A42;margin-bottom:12px;}
          .pb-h1{font-family:'Archivo Black','Poppins',sans-serif;font-weight:900;font-size:44px;line-height:1;margin:0 0 8px;}
          .pb-sub{font-size:13px;color:#8a8879;margin:0 0 20px;}
          .pb-label{font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#8a8879;display:block;margin:22px 0 8px;}
          .pb-input,.pb-text{width:100%;border:1.5px solid #ECE4CE;border-radius:10px;padding:12px 14px;font-family:inherit;font-size:15px;color:#20201C;background:#fff;}
          .pb-text{resize:vertical;line-height:1.5;}
          .pb-swatches{display:flex;gap:10px;flex-wrap:wrap;}
          .pb-sw{width:34px;height:34px;border-radius:999px;border:2px solid transparent;cursor:pointer;padding:0;}
          .pb-sw[aria-pressed="true"]{box-shadow:0 0 0 2px #FBF8ED,0 0 0 4px #181A4D;}
          .pb-lenrow{display:flex;gap:8px;flex-wrap:wrap;}
          .pb-lenbtn{flex:1;min-width:72px;border:1.5px solid #ECE4CE;background:#fff;border-radius:10px;padding:12px 0;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer;color:#20201C;}
          .pb-tabs{display:flex;gap:8px;overflow-x:auto;margin:26px 0 16px;padding-bottom:4px;}
          .pb-tab{flex-shrink:0;border:1.5px solid #ECE4CE;background:#fff;border-radius:999px;padding:8px 16px;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer;color:#20201C;}
          .pb-box{border-radius:14px;padding:16px;margin-bottom:14px;border:1.5px solid;border-left-width:6px;}
          .pb-boxlabel{display:flex;align-items:center;gap:8px;font-weight:800;font-size:11px;letter-spacing:.12em;text-transform:uppercase;margin-bottom:10px;}
          .pb-boxicon{width:20px;height:20px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;}
          .pb-save{width:100%;border:none;border-radius:12px;padding:16px;font-family:inherit;font-weight:800;font-size:15px;cursor:pointer;margin-top:10px;}
          .pb-save:disabled{opacity:.55;cursor:not-allowed;}
          .pb-delete{width:100%;margin-top:12px;background:transparent;border:1.5px solid #E4D9C4;border-radius:12px;padding:13px;font-family:inherit;font-weight:800;font-size:13px;color:#8a3b25;cursor:pointer;}
          .pb-warn{font-size:12px;color:#8a3b25;margin-top:8px;}
        `}</style>

        <div className="pb-wrap">
          <div className="pb-eyebrow">Edit devotional</div>
          <h1 className="pb-h1">{plan.isLoading ? "Loading…" : name || "Untitled"}</h1>
          <p className="pb-sub">Changes save straight to the live devotional — including the day you're on right now.</p>

          <label className="pb-label" htmlFor="pb-name">Devotional name</label>
          <input
            id="pb-name"
            className="pb-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Steady in the Waiting"
          />

          <span className="pb-label">Attribute a color</span>
          <div className="pb-swatches" role="radiogroup" aria-label="Devotional color">
            {PLAN_PALETTE.map((p) => (
              <button
                key={p.key}
                type="button"
                className="pb-sw"
                aria-label={p.label}
                title={p.label}
                aria-pressed={color === p.key}
                style={{ background: p.hex }}
                onClick={() => setColor(p.key)}
              />
            ))}
          </div>

          <span className="pb-label">Length</span>
          <div className="pb-lenrow">
            {PLAN_LENGTHS.map((n) => (
              <button
                key={n}
                type="button"
                className="pb-lenbtn"
                onClick={() => chooseLength(n)}
                style={length === n ? { background: c.hex, color: c.onHex, borderColor: c.hex } : undefined}
              >
                {n} {n === 1 ? "Day" : "Days"}
              </button>
            ))}
          </div>
          {plan.data && length < plan.data.plan.length_days && (
            <p className="pb-warn">
              Shortening to {length} {length === 1 ? "day" : "days"} removes day {length + 1}
              {plan.data.plan.length_days > length + 1 ? `–${plan.data.plan.length_days}` : ""} and anything written there.
            </p>
          )}

          <div className="pb-tabs" role="tablist" aria-label="Days">
            {dayNumbers.map((n) => (
              <button
                key={n}
                type="button"
                role="tab"
                aria-selected={activeDay === n}
                className="pb-tab"
                onClick={() => setActiveDay(n)}
                style={activeDay === n ? { background: c.hex, color: c.onHex, borderColor: c.hex } : undefined}
              >
                Day {n}
              </button>
            ))}
          </div>

          {BOXES.map((b) => (
            <div key={b.key} className="pb-box" style={{ borderColor: c.hex, background: c.tint }}>
              <div className="pb-boxlabel" style={{ color: c.hex }}>
                <span className="pb-boxicon" style={{ background: c.hex, color: c.onHex }}>{b.icon}</span>
                {b.label}
              </div>
              <textarea
                className="pb-text"
                rows={b.rows}
                value={day[b.key]}
                placeholder={b.placeholder}
                onChange={(e) => patch(b.key, e.target.value)}
              />
            </div>
          ))}

          <div className="pb-box" style={{ borderColor: c.hex, background: c.tint }}>
            <div className="pb-boxlabel" style={{ color: c.hex }}>
              <span className="pb-boxicon" style={{ background: c.hex, color: c.onHex }}>T</span>
              To-do
            </div>
            {(day.tasks.length ? day.tasks : [""]).map((t, i) => (
              <input
                key={i}
                className="pb-input"
                style={{ marginBottom: 8 }}
                value={t}
                placeholder={i === 0 ? "One action to carry into the day" : "Another task"}
                onChange={(e) => setTasks((tasks) => tasks.map((x, j) => (j === i ? e.target.value : x)))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setTasks((tasks) => [...tasks.slice(0, i + 1), "", ...tasks.slice(i + 1)]);
                    requestAnimationFrame(() => {
                      const el = e.currentTarget?.parentElement?.querySelectorAll("input")[i + 1] as HTMLInputElement | undefined;
                      el?.focus();
                    });
                  } else if (e.key === "Backspace" && t === "" && (day.tasks.length > 1)) {
                    e.preventDefault();
                    setTasks((tasks) => tasks.filter((_, j) => j !== i));
                  }
                }}
              />
            ))}
            <button
              type="button"
              className="pb-tab"
              style={{ marginTop: 2 }}
              onClick={() => setTasks((tasks) => [...tasks, ""])}
            >
              + Add task
            </button>
          </div>

          <button
            type="button"
            className="pb-save"
            disabled={saving || plan.isLoading}
            style={{ background: c.hex, color: c.onHex }}
            onClick={submit}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button type="button" className="pb-delete" disabled={saving} onClick={destroy}>
            Delete devotional
          </button>
        </div>
      </div>
    </AppShell>
  );
}
