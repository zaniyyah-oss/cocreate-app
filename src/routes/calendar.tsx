import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { CalendarDayView } from "@/components/CalendarDayView";
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
