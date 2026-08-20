import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PLAN_PALETTE, PLAN_LENGTHS, planColor } from "@/lib/plan-palette";
import { createPlan } from "@/lib/plans.functions";

export const Route = createFileRoute("/plans/new")({
  validateSearch: (s: Record<string, unknown>) => ({
    length: Number(s.length) > 0 ? Number(s.length) : 3,
  }),
  head: () => ({
    meta: [
      { title: "Build a devotional — CoCreate" },
      { name: "description", content: "Shape a 1, 3, 5 or 10-day devotional with your own Read, Pray and To-do content." },
      { property: "og:title", content: "Build a devotional — CoCreate" },
      { property: "og:description", content: "Shape a 1, 3, 5 or 10-day devotional with your own Read, Pray and To-do content." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlanBuilder,
});

type DayDraft = { read: string; pray: string; tasks: string[] };
const emptyDay = (): DayDraft => ({ read: "", pray: "", tasks: [""] });

function PlanBuilder() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const create = useServerFn(createPlan);

  const [name, setName] = useState("");
  const [color, setColor] = useState<string>("navy");
  const [length, setLength] = useState<number>(search.length);
  const [activeDay, setActiveDay] = useState(1);
  const [days, setDays] = useState<Record<number, DayDraft>>({});
  const [saving, setSaving] = useState(false);

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

  async function save() {
    if (!name.trim()) {
      toast.error("Give your devotional a name first.");
      return;
    }
    setSaving(true);
    try {
      const res = await create({
        data: {
          name: name.trim(),
          color: color as any,
          length_days: length,
          source: "built" as const,
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
      toast.success(`"${res.plan.name}" saved.`);
      navigate({ to: "/read" });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save this devotional.");
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
          .pb-h1{font-family:'Archivo Black','Poppins',sans-serif;font-weight:900;font-size:44px;line-height:1;margin:0 0 24px;}
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
        `}</style>

        <div className="pb-wrap">
          <div className="pb-eyebrow">New devotional</div>
          <h1 className="pb-h1">Shape your days</h1>

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
            disabled={saving}
            style={{ background: c.hex, color: c.onHex }}
            onClick={save}
          >
            {saving ? "Saving…" : "Save devotional"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
