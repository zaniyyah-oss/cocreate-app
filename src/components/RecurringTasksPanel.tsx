import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RecurringTaskDialog } from "@/components/RecurringTaskDialog";
import {
  describeRecurrence,
  useRecurringTasks,
  type RecurringTask,
} from "@/lib/recurring-tasks";

export function RecurringTasksPanel({ userId, defaultDate }: { userId: string | null; defaultDate?: string }) {
  const qc = useQueryClient();
  const tasksQ = useRecurringTasks(userId);
  const [addOpen, setAddOpen] = useState(false);
  const [editTask, setEditTask] = useState<RecurringTask | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["recurring-tasks"] });
    qc.invalidateQueries({ queryKey: ["recurring-task-completions"] });
  };

  const tasks = tasksQ.data ?? [];

  return (
    <section className="rt-panel">
      <style dangerouslySetInnerHTML={{ __html: RT_CSS }} />
      <div className="rt-head">
        <div>
          <div className="rt-eyebrow">Recurring</div>
          <h2 className="rt-title">Repeating tasks</h2>
        </div>
        <button type="button" className="rt-add" onClick={() => setAddOpen(true)} disabled={!userId}>
          + New recurring task
        </button>
      </div>

      {!userId ? (
        <div className="rt-empty">Sign in to set up recurring tasks.</div>
      ) : tasks.length === 0 ? (
        <div className="rt-empty">
          <strong>No repeating tasks yet.</strong>
          Set one on specific days of the month, or weekly, every two weeks, monthly, or quarterly.
        </div>
      ) : (
        <div className="rt-list">
          {tasks.map(t => (
            <button key={t.id} type="button" className="rt-card" onClick={() => setEditTask(t)}>
              <span className="rt-stripe" style={{ background: t.color }} />
              <span className="rt-body">
                <span className="rt-name">
                  {t.title}
                  {!t.is_active && <span className="rt-paused">paused</span>}
                </span>
                <span className="rt-meta">
                  {describeRecurrence(t)}
                  {t.start_time ? ` · ${t.start_time.slice(0, 5)}` : ""}
                  {t.end_date ? ` · until ${t.end_date}` : ""}
                </span>
              </span>
              <span className="rt-chev">›</span>
            </button>
          ))}
        </div>
      )}

      <RecurringTaskDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        userId={userId}
        defaultDate={defaultDate}
        onSaved={refresh}
      />
      <RecurringTaskDialog
        open={!!editTask}
        onOpenChange={(v) => { if (!v) setEditTask(null); }}
        userId={userId}
        task={editTask}
        onSaved={refresh}
      />
    </section>
  );
}

const RT_CSS = `
.rt-panel{margin-top:32px;font-family:'Poppins',sans-serif;color:#20201C;}
.rt-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px;}
.rt-eyebrow{font-size:10px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:#0F4A42;}
.rt-title{font-size:20px;font-weight:800;color:#181A4D;margin:2px 0 0;}
.rt-add{border:none;background:#DCE07A;color:#181A4D;font-family:inherit;font-weight:700;font-size:13px;padding:9px 16px;border-radius:999px;cursor:pointer;}
.rt-add:disabled{opacity:0.5;cursor:not-allowed;}
.rt-empty{background:#fff;border:1px solid #E7E0D0;border-radius:16px;padding:18px;font-size:13px;color:#8a8678;}
.rt-empty strong{display:block;color:#181A4D;font-size:14px;font-weight:800;margin-bottom:4px;}
.rt-list{display:grid;grid-template-columns:1fr;gap:10px;}
@media(min-width:760px){.rt-list{grid-template-columns:1fr 1fr;}}
.rt-card{display:flex;align-items:center;gap:12px;background:#fff;border:1px solid #E7E0D0;border-radius:14px;padding:12px 14px;cursor:pointer;font-family:inherit;text-align:left;width:100%;}
.rt-card:hover{border-color:#181A4D;}
.rt-stripe{width:5px;align-self:stretch;border-radius:3px;flex:none;}
.rt-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;}
.rt-name{font-size:14px;font-weight:700;color:#20201C;display:flex;align-items:center;gap:8px;}
.rt-paused{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;color:#8a8678;background:#F2EEE2;border-radius:999px;padding:2px 7px;}
.rt-meta{font-size:12px;color:#8a8678;}
.rt-chev{color:#181A4D;opacity:0.35;font-size:18px;}
`;
