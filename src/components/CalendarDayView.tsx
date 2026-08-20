import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AddEventDialog, type UserEvent } from "@/routes/devotionals.$id";
import { RecurringTaskDialog } from "@/components/RecurringTaskDialog";
import {
  occursOn,
  toggleRecurringCompletion,
  useRecurringCompletions,
  useRecurringTasks,
  type RecurringTask,
} from "@/lib/recurring-tasks";

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

const EVENT_LABEL: Record<string, string> = {
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

// Continuous hourly grid: 12 AM through 11 PM (full 24-hour day)
const START_HOUR = 0;
const END_HOUR = 24;
const HOUR_HEIGHT = 56; // px per hour
const HOUR_SLOTS: { hour: number; label: string }[] = Array.from(
  { length: END_HOUR - START_HOUR },
  (_, i) => {
    const h = START_HOUR + i;
    const ampm = h >= 12 ? "PM" : "AM";
    const hh = ((h + 11) % 12) + 1;
    return { hour: h, label: `${hh} ${ampm}` };
  }
);

function toMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

type PositionedEvent = UserEvent & { _top: number; _height: number; _col: number; _cols: number };

function layoutTimedEvents(events: UserEvent[]): PositionedEvent[] {
  const startMin = START_HOUR * 60;
  const endMin = END_HOUR * 60;
  const items = events
    .filter(e => !!e.start_time)
    .map(e => {
      const s = toMin(e.start_time!.slice(0, 5));
      const rawEnd = e.end_time ? toMin(e.end_time.slice(0, 5)) : s + 60;
      const end = Math.max(rawEnd, s + 20);
      return { ev: e, s, end };
    })
    .filter(x => x.end > startMin && x.s < endMin)
    .sort((a, b) => a.s - b.s || a.end - b.end);

  const positioned: PositionedEvent[] = [];
  let cluster: typeof items = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    if (!cluster.length) return;
    const cols: number[] = [];
    const assigned: { item: typeof cluster[number]; col: number }[] = [];
    for (const it of cluster) {
      let col = cols.findIndex(endM => endM <= it.s);
      if (col === -1) { col = cols.length; cols.push(it.end); }
      else cols[col] = it.end;
      assigned.push({ item: it, col });
    }
    const totalCols = cols.length;
    for (const { item, col } of assigned) {
      const clampedS = Math.max(item.s, startMin);
      const clampedE = Math.min(item.end, endMin);
      positioned.push({
        ...item.ev,
        _top: ((clampedS - startMin) / 60) * HOUR_HEIGHT,
        _height: Math.max(28, ((clampedE - clampedS) / 60) * HOUR_HEIGHT),
        _col: col,
        _cols: totalCols,
      });
    }
    cluster = [];
    clusterEnd = -Infinity;
  };

  for (const it of items) {
    if (it.s >= clusterEnd) flush();
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it.end);
  }
  flush();
  return positioned;
}

type Props = {
  userId: string | null;
  initialDate?: string;
  defaultTemplateId?: string | null;
  showTopTabs?: boolean;
  onDateChange?: (iso: string) => void;
};

export function CalendarDayView({ userId, initialDate, defaultTemplateId, onDateChange }: Props) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Date>(() => {
    if (initialDate) return new Date(initialDate + "T00:00:00");
    const d = new Date(); d.setHours(0,0,0,0); return d;
  });
  useEffect(() => {
    if (initialDate) setSelected(new Date(initialDate + "T00:00:00"));
  }, [initialDate]);
  const selectedISO = isoDate(selected);

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const pickDate = (d: Date) => {
    setSelected(d);
    onDateChange?.(isoDate(d));
  };


  const [addOpen, setAddOpen] = useState(false);
  const [addItemType, setAddItemType] = useState<"event" | "focus">("event");
  const [editEvent, setEditEvent] = useState<UserEvent | null>(null);
  const [recurAddOpen, setRecurAddOpen] = useState(false);
  const [recurEdit, setRecurEdit] = useState<RecurringTask | null>(null);

  const openAdd = (kind: "event" | "focus") => { setAddItemType(kind); setAddOpen(true); };
  const onSaved = () => qc.invalidateQueries({ queryKey: ["cal-day"] });
  const onRecurSaved = () => {
    qc.invalidateQueries({ queryKey: ["recurring-tasks"] });
    qc.invalidateQueries({ queryKey: ["recurring-task-completions"] });
  };


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

  const itemsQ = useQuery({
    queryKey: ["cal-day", "week", userId, weekStartISO, weekEndISO],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_events" as any)
        .select("id,event_date,event_type,title,color,notes,item_type,start_time,end_time")
        .eq("user_id", userId!)
        .gte("event_date", weekStartISO)
        .lte("event_date", weekEndISO);
      if (error) throw error;
      const map = new Map<string, UserEvent[]>();
      for (const row of (data ?? []) as unknown as UserEvent[]) {
        const arr = map.get(row.event_date) ?? [];
        arr.push(row);
        map.set(row.event_date, arr);
      }
      for (const arr of map.values()) {
        arr.sort((a, b) => (a.start_time ?? "zz").localeCompare(b.start_time ?? "zz"));
      }
      return map;
    },
  });
  const dayItems = itemsQ.data?.get(selectedISO) ?? [];

  const recurQ = useRecurringTasks(userId);
  const recurDone = useRecurringCompletions(userId, weekStartISO, weekEndISO);
  const recurToday = useMemo(
    () => (recurQ.data ?? []).filter(t => occursOn(t, selected)),
    [recurQ.data, selectedISO],
  );
  const toggleRecur = async (t: RecurringTask, done: boolean) => {
    if (!userId) return;
    await toggleRecurringCompletion(userId, t.id, selectedISO, done);
    qc.invalidateQueries({ queryKey: ["recurring-task-completions"] });
  };


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

  const monthDotsQ = useQuery({
    queryKey: ["cal-day", "month-dots", userId, cursor.y, cursor.m],
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
  const monthDots = monthDotsQ.data ?? new Set<string>();

  const dayName = selected.toLocaleDateString(undefined, { weekday: "long" });
  const dateLine = selected.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  const monthTitle = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const clickHour = (hour: number) => {
    if (!userId) return;
    openAdd("event");
    void hour;
  };

  return (
    <div className="cald-layout">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <aside className="cald-side">
        <button
          type="button"
          className="cald-addbtn"
          onClick={() => openAdd("event")}
        >
          + Add event
        </button>
        <button
          type="button"
          className="cald-addbtn cald-addbtn-focus"
          onClick={() => openAdd("focus")}
        >
          + Add focus item
        </button>
        <button
          type="button"
          className="cald-addbtn cald-addbtn-focus"
          onClick={() => setRecurAddOpen(true)}
          disabled={!userId}
        >
          + Recurring task
        </button>


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
              const isSel = c.iso === selectedISO;
              const hasDot = monthDots.has(c.iso);
              const cls = ["day", c.inMonth ? "" : "muted", isSel ? "selected" : "", hasDot ? "has-dot" : ""].filter(Boolean).join(" ");
              return (
                <button key={c.iso} type="button" className={cls} onClick={() => pickDate(c.date)}>
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

      <section className="cald-main">
        <div className="cald-head">
          <div>
            <div className="cald-dayname">{dayName}</div>
            <div className="cald-daydate">{dateLine}</div>
          </div>
          <button
            type="button"
            className="cald-addbtn cald-addbtn-mobile"
            onClick={() => openAdd("event")}
          >
            + Add
          </button>
        </div>
        <div className="cald-sub">Set aside time, then come back to the workspace to be present in it.</div>

        <div className="cald-strip">
          {weekDays.map(d => {
            const iso = isoDate(d);
            const sel = iso === selectedISO;
            const has = (itemsQ.data?.get(iso) ?? []).length > 0;
            return (
              <button key={iso} type="button" className={"cald-pill" + (sel ? " selected" : "") + (has ? " has-events" : "")} onClick={() => pickDate(d)}>
                <div className="dow">{d.toLocaleDateString(undefined, { weekday: "short" })}</div>
                <div className="num">{d.getDate()}</div>
                <div className="dot" />
              </button>
            );
          })}
        </div>

        {defaultTemplateId && (
          <Link
            to="/devotionals/$id"
            params={{ id: defaultTemplateId }}
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

        {userId && (() => {
          const fmtTime = (t: string) => {
            const [h, m] = t.split(":").map(Number);
            const ampm = h >= 12 ? "PM" : "AM";
            const hh = ((h + 11) % 12) + 1;
            return m ? `${hh}:${String(m).padStart(2, "0")} ${ampm}` : `${hh} ${ampm}`;
          };
          const positioned = layoutTimedEvents(dayItems);
          const untimed = dayItems.filter(e => !e.start_time);

          const renderBlock = (ev: PositionedEvent) => {
            const light = LIGHT_BG.has((ev.color || "").toUpperCase());
            const tint = light ? hexToRgba(ev.color, 0.35) : hexToRgba(ev.color, 0.2);
            const label = ev.event_type === "other" ? (ev.title?.trim() || (ev.item_type === "focus" ? "Focus" : "Event")) : EVENT_LABEL[ev.event_type];
            const timeLabel = ev.end_time
              ? `${fmtTime(ev.start_time!.slice(0,5))} – ${fmtTime(ev.end_time.slice(0,5))}`
              : fmtTime(ev.start_time!.slice(0,5));
            const widthPct = 100 / ev._cols;
            const leftPct = ev._col * widthPct;
            return (
              <button
                key={ev.id}
                type="button"
                onClick={(e) => { e.stopPropagation(); setEditEvent(ev); }}
                className="cald-block"
                style={{
                  top: ev._top,
                  height: ev._height,
                  left: `calc(${leftPct}% + 2px)`,
                  width: `calc(${widthPct}% - 4px)`,
                  background: tint,
                  borderColor: ev.color,
                }}
              >
                <div className="swatch-bar" style={{ background: ev.color }} />
                <div className="cald-block-body">
                  <div className="ev-title">
                    {label}
                    {ev.item_type === "focus" && <span className="ev-tag">focus</span>}
                  </div>
                  <div className="ev-time">{timeLabel}</div>
                  {ev.notes && ev._height >= 60 && <div className="ev-notes">{ev.notes}</div>}
                </div>
              </button>
            );
          };

          const renderUntimed = (ev: UserEvent) => {
            const light = LIGHT_BG.has((ev.color || "").toUpperCase());
            const tint = light ? hexToRgba(ev.color, 0.28) : hexToRgba(ev.color, 0.16);
            const label = ev.event_type === "other" ? (ev.title?.trim() || (ev.item_type === "focus" ? "Focus" : "Event")) : EVENT_LABEL[ev.event_type];
            return (
              <button
                key={ev.id}
                type="button"
                onClick={(e) => { e.stopPropagation(); setEditEvent(ev); }}
                className="cald-event"
                style={{ background: tint, borderColor: ev.color }}
              >
                <div className="swatch-bar" style={{ background: ev.color }} />
                <div style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
                  <div className="ev-title">
                    {label}
                    {ev.item_type === "focus" && <span className="ev-tag">focus</span>}
                  </div>
                  {ev.notes && <div className="ev-notes">{ev.notes}</div>}
                </div>
              </button>
            );
          };

          const isToday = selectedISO === isoDate(new Date());
          const nowMin = now ? now.getHours() * 60 + now.getMinutes() : 0;
          const startMin = START_HOUR * 60;
          const endMin = END_HOUR * 60;
          const showCurrentLine = isToday && now && nowMin >= startMin && nowMin <= endMin;
          const currentTop = ((nowMin - startMin) / 60) * HOUR_HEIGHT + 6;
          const currentLabel = now
            ? now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
            : "";


          return (
            <>
              <div className="cald-timeline" style={{ height: HOUR_SLOTS.length * HOUR_HEIGHT }}>
                {HOUR_SLOTS.map(slot => (
                  <div
                    key={slot.hour}
                    className="cald-hour"
                    style={{ height: HOUR_HEIGHT }}
                    onClick={() => clickHour(slot.hour)}
                  >
                    <div className="cald-hour-label">{slot.label}</div>
                    <div className="cald-hour-track" />
                  </div>
                ))}
                <div className="cald-blocks" style={{ height: HOUR_SLOTS.length * HOUR_HEIGHT }}>
                  {positioned.map(renderBlock)}
                </div>
                {showCurrentLine && (
                  <div className="cald-current-line" style={{ top: currentTop }}>
                    <span className="cald-current-label">{currentLabel}</span>
                  </div>
                )}
              </div>


              {untimed.length > 0 && (
                <div className="cald-untimed">
                  <div className="cald-items-label">Anytime today</div>
                  {untimed.map(renderUntimed)}
                </div>
              )}

              {!itemsQ.isLoading && dayItems.length === 0 && (
                <div className="cald-empty">
                  <strong>Nothing scheduled.</strong>
                  <div>Tap a time slot or the Add button to add an event or focus item.</div>
                </div>
              )}
            </>
          );
        })()}
        {!userId && (
          <div className="cald-timeline" style={{ padding: 22 }}>
            <div className="cald-empty">Sign in to see and add events on this day.</div>
          </div>
        )}
      </section>

      <AddEventDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        userId={userId}
        defaultDate={selectedISO}
        defaultItemType={addItemType}
        onSaved={onSaved}
      />
      <AddEventDialog
        open={!!editEvent}
        onOpenChange={(v) => { if (!v) setEditEvent(null); }}
        userId={userId}
        defaultDate={editEvent?.event_date ?? selectedISO}
        event={editEvent}
        onSaved={onSaved}
      />
    </div>
  );
}

const CSS = `
.cald-layout{display:grid;grid-template-columns:1fr;gap:0;font-family:'Poppins',sans-serif;color:#20201C;}
.cald-side{display:none;}
.cald-main{min-width:0;}
.cald-head{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:4px;gap:12px;}
.cald-dayname{font-weight:900;font-size:26px;color:#181A4D;letter-spacing:-0.3px;}
.cald-daydate{font-size:13px;color:#181A4D;opacity:0.55;font-weight:500;}
.cald-sub{font-size:13px;color:#8a8678;margin:6px 0 18px;}

.cald-addbtn{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;background:#181A4D;border:none;border-radius:14px;padding:12px 0;font-family:'Poppins',sans-serif;font-weight:700;font-size:13.5px;color:#DCE07A;cursor:pointer;margin-bottom:10px;}
.cald-addbtn-focus{background:#fff;color:#181A4D;border:1.5px solid #181A4D;}
.cald-addbtn-mobile{display:inline-flex;width:auto;padding:8px 14px;margin:0;border-radius:999px;font-size:12.5px;}
@media (min-width:820px){.cald-addbtn-mobile{display:none;}}

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

.cald-timeline{background:#fff;border-radius:18px;padding:6px 0;position:relative;overflow:hidden;}
.cald-hour{display:flex;border-top:1px solid rgba(24,26,77,0.06);cursor:pointer;box-sizing:border-box;}
.cald-hour:first-child{border-top:none;}
.cald-hour:hover{background:rgba(24,26,77,0.03);}
.cald-hour-label{width:70px;flex-shrink:0;font-size:11.5px;font-weight:600;color:#181A4D;opacity:0.35;padding:4px 0 0 20px;}
.cald-hour-track{flex:1;}
.cald-blocks{position:absolute;top:6px;left:70px;right:8px;pointer-events:none;}
.cald-block{position:absolute;pointer-events:auto;display:flex;gap:8px;border-radius:10px;border:1.5px solid transparent;padding:6px 10px;background:transparent;font-family:inherit;cursor:pointer;text-align:left;overflow:hidden;box-sizing:border-box;}
.cald-block .swatch-bar{width:3px;border-radius:2px;flex-shrink:0;}
.cald-block-body{min-width:0;flex:1;overflow:hidden;}
.cald-block .ev-title{font-size:12.5px;font-weight:700;color:#20201C;display:flex;align-items:center;gap:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cald-block .ev-tag{font-size:9px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;background:#181A4D;color:#DCE07A;padding:1px 6px;border-radius:999px;}
.cald-block .ev-time{font-size:10.5px;font-weight:600;color:#181A4D;opacity:0.75;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cald-block .ev-notes{font-size:11px;color:#20201C;opacity:0.65;margin-top:2px;overflow:hidden;}
.cald-current-line{position:absolute;left:70px;right:8px;height:0;border-top:1.5px solid #E94560;pointer-events:none;z-index:10;}
.cald-current-line::before{content:'';position:absolute;left:-6px;top:-3.5px;width:7px;height:7px;border-radius:50%;background:#E94560;}
.cald-current-label{position:absolute;left:-54px;top:-10px;font-size:9.5px;font-weight:700;color:#E94560;background:#fff;padding:1px 5px;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,0.08);max-width:48px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}
.cald-untimed{background:#fff;border-radius:16px;padding:12px 16px 14px;display:flex;flex-direction:column;gap:8px;margin-top:12px;}
.cald-items-label{font-size:10px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:#181A4D;opacity:0.5;}
.cald-items-label{font-size:10px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:#181A4D;opacity:0.5;}
.cald-event{width:100%;display:flex;align-items:stretch;gap:12px;border-radius:12px;border:1.5px solid transparent;padding:10px 14px;background:transparent;font-family:inherit;cursor:pointer;}
.cald-event .swatch-bar{width:4px;border-radius:3px;flex-shrink:0;}
.cald-event .ev-title{font-size:14px;font-weight:700;color:#20201C;display:flex;align-items:center;gap:8px;}
.cald-event .ev-tag{font-size:9.5px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;background:#181A4D;color:#DCE07A;padding:2px 7px;border-radius:999px;}
.cald-event .ev-time{font-size:11.5px;font-weight:600;color:#181A4D;opacity:0.75;margin-top:2px;}
.cald-event .ev-notes{font-size:12px;color:#20201C;opacity:0.65;margin-top:2px;overflow-wrap:anywhere;}
.cald-empty{padding:22px 8px;text-align:center;color:#8a8678;font-size:13px;}
.cald-empty strong{display:block;color:#181A4D;font-size:14px;font-weight:800;margin-bottom:4px;}

@media (min-width:820px){
  .cald-layout{grid-template-columns:260px 1fr;gap:36px;}
  .cald-side{display:block;padding-right:32px;border-right:1px solid rgba(24,26,77,0.08);}
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
