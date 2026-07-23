import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { MonthCalendarView, WeekListView } from "./devotionals.$id";

export const Route = createFileRoute("/calendar")({
  component: CalendarPage,
  head: () => ({
    meta: [
      { title: "Calendar — CoCreate" },
      { name: "description", content: "See your devotionals, events, and to-dos at a glance — day, week, or month." },
      { property: "og:title", content: "Calendar — CoCreate" },
      { property: "og:description", content: "Day, week, and month views of your Abide practice, events, and tasks." },
    ],
  }),
});

type ViewMode = "today" | "week" | "month";

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function CalendarPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("today");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const defaultQ = useQuery({
    queryKey: ["platform-default-template-id"],
    queryFn: async () => {
      const { data } = await supabase
        .from("devotional_templates")
        .select("id")
        .eq("is_default" as any, true)
        .eq("status", "published")
        .maybeSingle();
      return data?.id ?? null;
    },
  });

  const templateId = defaultQ.data ?? null;

  return (
    <AppShell current="calendar">
      <style dangerouslySetInnerHTML={{ __html: CAL_CSS }} />
      <div className="cal-wrap">
        <div className="cal-toggle-row">
          <div className="cal-toggle">
            {(["today", "week", "month"] as const).map(v => (
              <button
                key={v}
                type="button"
                className={view === v ? "active" : ""}
                onClick={() => setView(v)}
              >
                {v === "today" ? "Daily" : v === "week" ? "Weekly" : "Monthly"}
              </button>
            ))}
          </div>
        </div>

        {view === "today" ? (
          <CalendarDayView userId={userId} templateId={templateId} />
        ) : view === "week" ? (
          templateId ? (
            <WeekListView templateId={templateId} userId={userId} />
          ) : (
            <div style={{ minHeight: "40vh" }} />
          )
        ) : templateId ? (
          <MonthCalendarView templateId={templateId} userId={userId} />
        ) : (
          <div style={{ minHeight: "40vh" }} />
        )}
      </div>
    </AppShell>
  );
}

// ============================================================================
// Day view
// ============================================================================

type EventRow = {
  id: string;
  event_date: string;
  event_type: "prayer_meeting" | "bible_study" | "mentor_meeting" | "other";
  title: string | null;
  color: string;
  notes: string | null;
};

const EVENT_LABEL: Record<EventRow["event_type"], string> = {
  prayer_meeting: "Prayer meeting",
  bible_study: "Bible study",
  mentor_meeting: "Mentor meeting",
  other: "Event",
};

const LIGHT_BG = new Set(["#DCE07A", "#EEFF00", "#CAC307", "#FBF8ED"]);

function hexToRgba(hex: string, alpha: number) {
  const h = (hex || "").replace("#", "");
  const n = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const r = parseInt(n.slice(0, 2), 16) || 0;
  const g = parseInt(n.slice(2, 4), 16) || 0;
  const b = parseInt(n.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
}

function CalendarDayView({ userId, templateId }: { userId: string | null; templateId: string | null }) {
  const [selected, setSelected] = useState<Date>(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const selectedISO = isoDate(selected);

  // 7-day strip centered on selected date (Sun..Sat of selected's week)
  const weekDays = useMemo(() => {
    const start = new Date(selected);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [selected]);

  const weekStartISO = isoDate(weekDays[0]);
  const weekEndISO = isoDate(weekDays[6]);

  const eventsQ = useQuery({
    queryKey: ["cal-day-events", userId, weekStartISO, weekEndISO],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_events" as any)
        .select("id,event_date,event_type,title,color,notes")
        .eq("user_id", userId!)
        .gte("event_date", weekStartISO)
        .lte("event_date", weekEndISO);
      if (error) throw error;
      const map = new Map<string, EventRow[]>();
      for (const row of (data ?? []) as unknown as EventRow[]) {
        const arr = map.get(row.event_date) ?? [];
        arr.push(row);
        map.set(row.event_date, arr);
      }
      return map;
    },
  });

  const dayEvents = eventsQ.data?.get(selectedISO) ?? [];

  // Mini-month for sidebar
  const [cursor, setCursor] = useState(() => ({ y: selected.getFullYear(), m: selected.getMonth() }));
  useEffect(() => { setCursor({ y: selected.getFullYear(), m: selected.getMonth() }); }, [selectedISO]);

  const first = new Date(cursor.y, cursor.m, 1);
  const startDow = first.getDay();
  const monthCells: { date: Date; iso: string; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const offset = i - startDow;
    const d = new Date(cursor.y, cursor.m, 1 + offset);
    monthCells.push({ date: d, iso: isoDate(d), inMonth: d.getMonth() === cursor.m });
  }
  while (monthCells.length > 35 && monthCells.slice(-7).every(c => !c.inMonth)) monthCells.length -= 7;

  const monthEventsQ = useQuery({
    queryKey: ["cal-day-month-events", userId, cursor.y, cursor.m],
    enabled: !!userId,
    queryFn: async () => {
      const s = isoDate(monthCells[0].date);
      const e = isoDate(monthCells[monthCells.length - 1].date);
      const { data, error } = await supabase
        .from("user_events" as any)
        .select("event_date")
        .eq("user_id", userId!)
        .gte("event_date", s)
        .lte("event_date", e);
      if (error) throw error;
      const set = new Set<string>();
      for (const r of (data ?? []) as any[]) set.add(r.event_date);
      return set;
    },
  });
  const monthDots = monthEventsQ.data ?? new Set<string>();

  const dayName = selected.toLocaleDateString(undefined, { weekday: "long" });
  const dateLine = selected.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  const monthTitle = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const isToday = (d: Date) => isoDate(d) === isoDate(new Date());

  return (
    <div className="cald-layout">
      {/* Sidebar (desktop only) */}
      <aside className="cald-side">
        <div className="cald-mini">
          <div className="cald-mini-head">
            <span>{monthTitle}</span>
            <span className="arrows">
              <button type="button" aria-label="Previous month" onClick={() => setCursor(c => ({ y: c.m === 0 ? c.y - 1 : c.y, m: (c.m + 11) % 12 }))}>‹</button>
              <button type="button" aria-label="Next month" onClick={() => setCursor(c => ({ y: c.m === 11 ? c.y + 1 : c.y, m: (c.m + 1) % 12 }))}>›</button>
            </span>
          </div>
          <div className="cald-mini-grid">
            {["S","M","T","W","T","F","S"].map((d, i) => <div key={i} className="dow">{d}</div>)}
            {monthCells.map(c => {
              const selectedCell = c.iso === selectedISO;
              const hasDot = monthDots.has(c.iso);
              const cls = ["day", c.inMonth ? "" : "muted", selectedCell ? "selected" : "", hasDot ? "has-dot" : ""].filter(Boolean).join(" ");
              return (
                <button key={c.iso} type="button" className={cls} onClick={() => setSelected(c.date)}>
                  {c.date.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        <div className="cald-legend">
          <div className="cald-legend-title">Event key</div>
          <div className="cald-legend-item"><span className="sw" style={{ background: "#E990A2" }} />Prayer</div>
          <div className="cald-legend-item"><span className="sw" style={{ background: "#FFAE00" }} />Bible study</div>
          <div className="cald-legend-item"><span className="sw" style={{ background: "#8A96E0" }} />Mentor meeting</div>
          <div className="cald-legend-item"><span className="sw" style={{ background: "#DCE07A" }} />Daily devotional</div>
          <div className="cald-legend-item"><span className="sw" style={{ background: "#0F4A42" }} />Topical devotional</div>
        </div>
      </aside>

      {/* Main day column */}
      <section className="cald-main">
        <div className="cald-head">
          <div>
            <div className="cald-dayname">{dayName}</div>
            <div className="cald-daydate">{dateLine}</div>
          </div>
        </div>
        <div className="cald-sub">Set aside time, then come back to the workspace to be present in it.</div>

        {/* Mobile-only date strip */}
        <div className="cald-strip">
          {weekDays.map(d => {
            const iso = isoDate(d);
            const sel = iso === selectedISO;
            const has = (eventsQ.data?.get(iso) ?? []).length > 0;
            return (
              <button key={iso} type="button" className={"cald-pill" + (sel ? " selected" : "") + (has ? " has-events" : "")} onClick={() => setSelected(d)}>
                <div className="dow">{d.toLocaleDateString(undefined, { weekday: "short" })}</div>
                <div className="num">{d.getDate()}</div>
                <div className="dot" />
              </button>
            );
          })}
        </div>

        {templateId && (
          <Link
            to="/devotionals/$id"
            params={{ id: templateId }}
            search={{ date: selectedISO } as any}
            className="cald-devbanner"
          >
            <div className="icon-box">✦</div>
            <div className="body">
              <div className="eyebrow">Today's Word · Default Devotional</div>
              <div className="title">Open the day's workspace</div>
            </div>
            <div className="chevron">›</div>
          </Link>
        )}

        <div className="cald-timeline">
          {!userId && (
            <div className="cald-empty">Sign in to see your scheduled events on this day.</div>
          )}
          {userId && eventsQ.isLoading && (
            <div className="cald-empty">Loading events…</div>
          )}
          {userId && !eventsQ.isLoading && dayEvents.length === 0 && (
            <div className="cald-empty">
              <strong>No events scheduled.</strong>
              <div>Add events from the Month view — they'll appear here on the day they're planned.</div>
            </div>
          )}
          {dayEvents.map(ev => {
            const light = LIGHT_BG.has((ev.color || "").toUpperCase());
            const tint = light ? hexToRgba(ev.color, 0.28) : hexToRgba(ev.color, 0.16);
            const label = ev.event_type === "other" ? (ev.title?.trim() || "Event") : EVENT_LABEL[ev.event_type];
            return (
              <div key={ev.id} className="cald-event" style={{ background: tint, borderColor: ev.color }}>
                <div className="swatch-bar" style={{ background: ev.color }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="ev-title">{label}</div>
                  {ev.notes && <div className="ev-notes">{ev.notes}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

const CAL_CSS = `
.cal-wrap{max-width:1200px;margin:0 auto;padding:24px 20px 80px;font-family:'Poppins',sans-serif;color:#20201C;}
.cal-toggle-row{display:flex;justify-content:flex-start;margin-bottom:20px;}
.cal-toggle{display:inline-flex;background:#fff;border-radius:20px;padding:4px;gap:2px;border:1px solid rgba(24,26,77,0.08);}
.cal-toggle button{border:none;background:transparent;font-family:'Poppins',sans-serif;font-weight:600;font-size:13px;padding:8px 18px;border-radius:16px;color:#9a968a;cursor:pointer;}
.cal-toggle button.active{background:#181A4D;color:#DCE07A;}

/* Day view */
.cald-layout{display:grid;grid-template-columns:1fr;gap:0;}
.cald-side{display:none;}
.cald-main{min-width:0;}
.cald-head{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:4px;}
.cald-dayname{font-weight:900;font-size:26px;color:#181A4D;letter-spacing:-0.3px;}
.cald-daydate{font-size:13px;color:#181A4D;opacity:0.55;font-weight:500;}
.cald-sub{font-size:13px;color:#8a8678;margin:6px 0 18px;}

.cald-strip{display:flex;justify-content:space-between;gap:4px;margin:2px 0 14px;}
.cald-pill{flex:1;background:transparent;border:none;text-align:center;padding:8px 0 10px;border-radius:14px;cursor:pointer;font-family:'Poppins',sans-serif;}
.cald-pill .dow{font-size:10px;font-weight:600;color:#181A4D;opacity:0.5;text-transform:uppercase;letter-spacing:0.5px;}
.cald-pill .num{font-size:15px;font-weight:700;color:#181A4D;margin-top:4px;}
.cald-pill .dot{width:4px;height:4px;border-radius:50%;background:#0F4A42;margin:4px auto 0;opacity:0;}
.cald-pill.has-events .dot{opacity:1;}
.cald-pill.selected{background:#181A4D;}
.cald-pill.selected .dow,.cald-pill.selected .num{color:#DCE07A;opacity:1;}
.cald-pill.selected .dot{background:#DCE07A;}

.cald-devbanner{display:flex;align-items:center;gap:12px;background:#fff;border:1.5px solid #DCE07A;border-radius:16px;padding:14px 16px;margin:0 0 16px;text-decoration:none;color:inherit;cursor:pointer;}
.cald-devbanner .icon-box{width:38px;height:38px;border-radius:10px;background:#DCE07A;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:17px;color:#181A4D;}
.cald-devbanner .body{flex:1;min-width:0;}
.cald-devbanner .eyebrow{font-size:10px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:#0F4A42;margin-bottom:2px;}
.cald-devbanner .title{font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:500;font-size:17px;color:#20201C;}
.cald-devbanner .chevron{color:#181A4D;opacity:0.35;font-size:16px;}

.cald-timeline{background:#fff;border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:10px;}
.cald-event{display:flex;align-items:stretch;gap:12px;border-radius:12px;border:1.5px solid transparent;padding:10px 14px;}
.cald-event .swatch-bar{width:4px;border-radius:3px;flex-shrink:0;}
.cald-event .ev-title{font-size:14px;font-weight:700;color:#20201C;}
.cald-event .ev-notes{font-size:12px;color:#20201C;opacity:0.65;margin-top:2px;overflow-wrap:anywhere;}
.cald-empty{padding:22px 8px;text-align:center;color:#8a8678;font-size:13px;}
.cald-empty strong{display:block;color:#181A4D;font-size:14px;font-weight:800;margin-bottom:4px;}

/* Desktop */
@media (min-width:820px){
  .cald-layout{grid-template-columns:260px 1fr;gap:36px;}
  .cald-side{display:block;padding-right:0;border-right:1px solid rgba(24,26,77,0.08);padding-right:32px;}
  .cald-strip{display:none;}
  .cald-dayname{font-size:28px;}
  .cald-daydate{font-size:14px;}
  .cald-mini{background:#fff;border-radius:16px;padding:16px;margin-bottom:20px;}
  .cald-mini-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;font-size:13px;font-weight:700;color:#181A4D;}
  .cald-mini-head .arrows{display:flex;gap:6px;}
  .cald-mini-head .arrows button{width:22px;height:22px;border-radius:50%;border:none;background:transparent;color:#181A4D;cursor:pointer;font-family:inherit;font-size:14px;opacity:0.55;}
  .cald-mini-head .arrows button:hover{opacity:1;background:rgba(24,26,77,0.06);}
  .cald-mini-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;text-align:center;}
  .cald-mini-grid .dow{font-size:9px;font-weight:700;color:#181A4D;opacity:0.4;padding-bottom:4px;}
  .cald-mini-grid .day{font-size:11.5px;font-weight:600;color:#181A4D;padding:5px 0;border-radius:8px;cursor:pointer;position:relative;background:transparent;border:none;font-family:inherit;}
  .cald-mini-grid .day.muted{opacity:0.25;}
  .cald-mini-grid .day.selected{background:#181A4D;color:#DCE07A;}
  .cald-mini-grid .day.has-dot::after{content:'';position:absolute;bottom:1px;left:50%;transform:translateX(-50%);width:3px;height:3px;border-radius:50%;background:#0F4A42;}
  .cald-mini-grid .day.selected.has-dot::after{background:#DCE07A;}
  .cald-legend{background:#fff;border-radius:16px;padding:16px;}
  .cald-legend-title{font-size:10px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:#181A4D;opacity:0.5;margin-bottom:10px;}
  .cald-legend-item{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;color:#20201C;padding:5px 0;}
  .cald-legend-item .sw{width:10px;height:10px;border-radius:3px;flex-shrink:0;}
}
`;
