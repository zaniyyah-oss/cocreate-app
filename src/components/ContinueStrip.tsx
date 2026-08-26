import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { planColor } from "@/lib/plan-palette";

const NAVY = "#181A4D";
const BROWN = "#441B07";
const OLIVE = "#CAC307";

const CSS = `
.cs-wrap{background:#fff;border-bottom:1px solid #E7E0D0;padding:16px 0 6px;}
.cs-label{font-family:'Poppins',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#6B6862;padding:0 18px;margin-bottom:10px;}
.cs-scroll{display:flex;gap:10px;overflow-x:auto;padding:0 18px 6px;scrollbar-width:none;}
.cs-scroll::-webkit-scrollbar{display:none;}
.cs-card{flex-shrink:0;width:150px;background:#FBF8ED;border:1px solid #E7E0D0;border-radius:12px;padding:12px;text-align:left;cursor:pointer;font-family:inherit;transition:transform .15s ease, box-shadow .15s ease;}
@media (min-width:900px){
  .cs-card{flex:1 1 150px;width:auto;min-width:150px;max-width:210px;}
}
.cs-card:hover{transform:translateY(-2px);box-shadow:0 8px 18px rgba(0,0,0,0.05);}
.cs-tag{display:inline-flex;align-items:center;gap:5px;font-family:'Poppins',sans-serif;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;margin-bottom:8px;}
.cs-dot{width:7px;height:7px;border-radius:50%;flex:none;}
.cs-tag span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:112px;}
.cs-title{font-family:'Poppins',sans-serif;font-weight:700;font-size:12.5px;line-height:1.3;margin:0 0 4px;color:${NAVY};display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.cs-time{font-family:'Inter',sans-serif;font-size:10.5px;color:#6B6862;}
`;

type Item = {
  key: string;
  label: string;
  color: string;
  title: string;
  time: string;
  at: number;
  go: () => void;
};

function isoLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function relTime(iso: string, prefix?: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = isoLocal(d) === isoLocal(now);
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (sameDay) return prefix ? `${prefix} today` : `Today, ${time}`;
  if (isoLocal(d) === isoLocal(yest)) return prefix ? `${prefix} yesterday` : "Yesterday";
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (days < 7) {
    const wd = d.toLocaleDateString(undefined, { weekday: "long" });
    return prefix ? `${prefix} ${wd}` : wd;
  }
  if (prefix && days < 28) {
    const w = Math.max(1, Math.round(days / 7));
    return `${prefix} ${w} week${w === 1 ? "" : "s"} ago`;
  }
  const dt = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return prefix ? `${prefix} ${dt}` : dt;
}

export function ContinueStrip() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const q = useQuery({
    queryKey: ["continue-strip", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [entries, notes, assignments, plans] = await Promise.all([
        supabase.from("devotional_entries" as any)
          .select("id, entry_title, entry_date, template_id, updated_at")
          .eq("user_id", userId).order("updated_at", { ascending: false }).limit(8),
        supabase.from("workspace_items" as any)
          .select("id, title, body_text, updated_at")
          .eq("user_id", userId).order("updated_at", { ascending: false }).limit(10),
        supabase.from("plan_assignments" as any)
          .select("id, plan_id, start_date, current_day, status, updated_at")
          .eq("user_id", userId).order("updated_at", { ascending: false }).limit(5),
        supabase.from("plans" as any)
          .select("id, name, color, length_days, created_at, updated_at")
          .order("updated_at", { ascending: false }).limit(8),
      ]);
      return {
        entries: (entries.data ?? []) as any[],
        notes: (notes.data ?? []) as any[],
        assignments: (assignments.data ?? []) as any[],
        plans: (plans.data ?? []) as any[],
      };
    },
  });

  if (!userId || !q.data) return null;

  const planById = new Map<string, any>(q.data.plans.map((p) => [p.id, p]));
  const assignedPlanIds = new Set(q.data.assignments.map((a) => a.plan_id));
  const items: Item[] = [];
  const noteItems: Item[] = [];

  for (const e of q.data.entries) {
    items.push({
      key: `entry-${e.id}`,
      label: "Workspace",
      color: NAVY,
      title: (e.entry_title || "").trim() || "Workspace entry",
      time: relTime(e.updated_at),
      at: new Date(e.updated_at).getTime(),
      go: () => {
        if (e.template_id) navigate({ to: "/devotionals/$id", params: { id: e.template_id }, search: { date: e.entry_date } as any });
        else navigate({ to: "/devotionals" });
      },
    });
  }

  for (const n of q.data.notes) {
    const rawTitle = (n.title || "").trim();
    const firstLine = (n.body_text || "").split("\n").map((l: string) => l.trim()).find((l: string) => l.length > 0) ?? "";
    if (!rawTitle && !firstLine) continue;
    const t = rawTitle || firstLine.slice(0, 60);
    noteItems.push({
      key: `note-${n.id}`,
      label: "Note",
      color: BROWN,
      title: t,
      time: relTime(n.updated_at),
      at: new Date(n.updated_at).getTime(),
      go: () => navigate({ to: "/notes", search: { doc: n.id } as any }),
    });
  }

  for (const a of q.data.assignments) {
    const p = planById.get(a.plan_id);
    if (!p) continue;
    const c = planColor(p.color);
    const start = new Date(`${a.start_date}T00:00:00`);
    const dayIdx = Math.max(1, Math.min(p.length_days, a.current_day || 1));
    const dayDate = new Date(start); dayDate.setDate(start.getDate() + dayIdx - 1);
    items.push({
      key: `assign-${a.id}`,
      label: `${p.name} • Day ${dayIdx}`,
      color: c.hex,
      title: p.name,
      time: relTime(a.updated_at, "Started"),
      at: new Date(a.updated_at).getTime(),
      go: () => navigate({ to: "/plans/focus/$date", params: { date: isoLocal(dayDate) } }),
    });
  }

  for (const p of q.data.plans) {
    if (assignedPlanIds.has(p.id)) continue;
    items.push({
      key: `plan-${p.id}`,
      label: "Saved",
      color: OLIVE,
      title: p.name,
      time: relTime(p.updated_at || p.created_at, "Saved"),
      at: new Date(p.updated_at || p.created_at).getTime(),
      go: () => navigate({ to: "/saved" }),
    });
  }

  const MAX = 12;
  const byRecent = (a: Item, b: Item) => b.at - a.at;
  const sortedNotes = [...noteItems].sort(byRecent);
  const reservedNotes = sortedNotes.slice(0, 5);
  const reservedKeys = new Set(reservedNotes.map((n) => n.key));
  const rest = [...items, ...sortedNotes.filter((n) => !reservedKeys.has(n.key))].sort(byRecent);
  const cards = [...reservedNotes, ...rest.slice(0, Math.max(0, MAX - reservedNotes.length))].sort(byRecent);
  if (cards.length === 0) return null;

  return (
    <div className="cs-wrap">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="cs-label">Continue where you left off</div>
      <div className="cs-scroll">
        {cards.map((c) => (
          <button key={c.key} type="button" className="cs-card" onClick={c.go}>
            <span className="cs-tag" style={{ color: c.color }}>
              <span className="cs-dot" style={{ background: c.color }} />
              <span>{c.label}</span>
            </span>
            <h3 className="cs-title">{c.title}</h3>
            <div className="cs-time">{c.time}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
