import { useEffect, useMemo, useState } from "react";

type Reminder = { id: string; time: string; days: number[]; label?: string; message?: string };
type Config = { enabled: boolean; items: Reminder[] };

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_LONG = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DEFAULT_MESSAGE = "A quiet moment is waiting for you.";
const DEFAULT: Config = {
  enabled: false,
  items: [{ id: "r1", time: "07:00", days: [1, 2, 3, 4, 5], label: "Morning devotional", message: DEFAULT_MESSAGE }],
};

const LS_KEY = (uid: string) => `cocreate:reminders:${uid}`;

function load(uid: string): Config {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(LS_KEY(uid));
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch { return DEFAULT; }
}
function save(uid: string, c: Config) {
  try { window.localStorage.setItem(LS_KEY(uid), JSON.stringify(c)); } catch { /* ignore */ }
}

const CSS = `
.dr-card{background:#fff;border-radius:16px;border:1px solid rgba(20,20,20,0.06);overflow:hidden;}
.dr-head{padding:18px 22px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center;border-bottom:1px solid rgba(20,20,20,0.05);}
.dr-head .k{font-size:14px;font-weight:700;color:#181A4D;margin-bottom:3px;}
.dr-head .d{font-size:12.5px;color:#8a8678;font-weight:500;line-height:1.5;}
.dr-toggle{width:44px;height:24px;background:rgba(20,20,20,0.15);border-radius:99px;position:relative;cursor:pointer;transition:background .18s ease;border:none;padding:0;flex-shrink:0;}
.dr-toggle::after{content:"";position:absolute;top:2px;left:2px;width:20px;height:20px;background:#fff;border-radius:50%;transition:left .18s ease;box-shadow:0 2px 6px rgba(0,0,0,0.15);}
.dr-toggle.on{background:#0F4A42;}
.dr-toggle.on::after{left:22px;}
.dr-body{padding:18px 22px;display:flex;flex-direction:column;gap:14px;}
.dr-perm{background:#FBF8ED;border:1px solid rgba(20,20,20,0.08);border-radius:10px;padding:12px 14px;font-size:12.5px;color:#181A4D;display:flex;justify-content:space-between;align-items:center;gap:12px;font-weight:600;}
.dr-perm button{background:#181A4D;color:#fff;border:none;border-radius:16px;padding:7px 14px;font-family:'Poppins';font-weight:800;font-size:11.5px;cursor:pointer;}
.dr-item{border:1px solid rgba(20,20,20,0.08);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:12px;}
.dr-item-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.dr-time{font-family:'Poppins';font-size:14px;font-weight:700;color:#181A4D;border:1.5px solid rgba(20,20,20,0.12);border-radius:10px;padding:8px 10px;background:#fff;}
.dr-label{flex:1;min-width:150px;font-family:'Poppins';font-size:13px;color:#181A4D;border:1.5px solid rgba(20,20,20,0.12);border-radius:10px;padding:8px 12px;background:#fff;}
.dr-msg{width:100%;box-sizing:border-box;font-family:'Poppins';font-size:13px;color:#181A4D;border:1.5px solid rgba(20,20,20,0.12);border-radius:10px;padding:10px 12px;background:#fff;resize:vertical;min-height:60px;line-height:1.45;}
.dr-field-label{font-family:'Poppins';font-weight:700;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#8a8678;margin-bottom:4px;display:block;}
.dr-days{display:flex;gap:6px;flex-wrap:wrap;}
.dr-day{width:32px;height:32px;border-radius:50%;border:1.5px solid rgba(20,20,20,0.12);background:#fff;color:#8a8678;font-family:'Poppins';font-weight:800;font-size:11.5px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;}
.dr-day.on{background:#0F4A42;color:#fff;border-color:#0F4A42;}
.dr-remove{background:transparent;border:none;color:#FF340C;font-family:'Poppins';font-weight:700;font-size:12px;cursor:pointer;padding:4px 8px;}
.dr-add{background:#181A4D;border:none;border-radius:12px;padding:12px 18px;color:#fff;font-family:'Poppins';font-weight:800;font-size:12.5px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;align-self:flex-start;}
.dr-add:hover{background:#0F4A42;}
.dr-add.block{align-self:stretch;background:transparent;color:#181A4D;border:1.5px dashed rgba(20,20,20,0.20);}
.dr-add.block:hover{border-color:#181A4D;background:#FBF8ED;}
.dr-note{font-size:11.5px;color:#8a8678;font-style:italic;line-height:1.5;}
.dr-empty{padding:18px;border:1.5px dashed rgba(20,20,20,0.15);border-radius:12px;background:#FBF8ED;color:#181A4D;font-size:13px;text-align:center;}
`;

function uid() { return Math.random().toString(36).slice(2, 9); }

function nextOccurrence(time: string, days: number[]): Date | null {
  if (!days.length) return null;
  const [h, m] = time.split(":").map(Number);
  const now = new Date();
  for (let i = 0; i < 8; i++) {
    const d = new Date(now); d.setDate(now.getDate() + i); d.setHours(h, m, 0, 0);
    if (days.includes(d.getDay()) && d.getTime() > now.getTime()) return d;
  }
  return null;
}

function humanNext(d: Date | null): string {
  if (!d) return "No days selected";
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const t = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (isToday) return `Next: today at ${t}`;
  if (isTomorrow) return `Next: tomorrow at ${t}`;
  return `Next: ${DAY_LONG[d.getDay()]} at ${t}`;
}

export function DevotionalReminders({ userId }: { userId: string }) {
  const [cfg, setCfg] = useState<Config>(DEFAULT);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => { setCfg(load(userId)); }, [userId]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) { setPermission("unsupported"); return; }
    setPermission(Notification.permission);
  }, []);

  // Schedule browser notifications while the tab is open.
  useEffect(() => {
    if (!cfg.enabled || permission !== "granted") return;
    const timers: number[] = [];
    for (const item of cfg.items) {
      const next = nextOccurrence(item.time, item.days);
      if (!next) continue;
      const delay = next.getTime() - Date.now();
      if (delay < 0 || delay > 24 * 60 * 60 * 1000) continue;
      const id = window.setTimeout(() => {
        try {
          new Notification(item.label || "Time for your devotional", {
            body: (item.message && item.message.trim()) || DEFAULT_MESSAGE,
            tag: `devotional-${item.id}`,
          });
        } catch { /* ignore */ }
      }, delay);
      timers.push(id);
    }
    return () => { for (const t of timers) window.clearTimeout(t); };
  }, [cfg, permission]);

  const update = (next: Config) => { setCfg(next); save(userId, next); };
  const setItem = (id: string, patch: Partial<Reminder>) =>
    update({ ...cfg, items: cfg.items.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const toggleDay = (id: string, day: number) => {
    const r = cfg.items.find((x) => x.id === id); if (!r) return;
    const days = r.days.includes(day) ? r.days.filter((d) => d !== day) : [...r.days, day].sort();
    setItem(id, { days });
  };
  const addReminder = () => {
    const next: Config = {
      ...cfg,
      enabled: cfg.enabled || cfg.items.length === 0 ? true : cfg.enabled,
      items: [...cfg.items, { id: uid(), time: "20:00", days: [0,1,2,3,4,5,6], label: "Evening devotional", message: DEFAULT_MESSAGE }],
    };
    update(next);
  };
  const removeReminder = (id: string) => update({ ...cfg, items: cfg.items.filter((r) => r.id !== id) });

  const requestPerm = async () => {
    if (!("Notification" in window)) return;
    const p = await Notification.requestPermission();
    setPermission(p);
  };

  const sorted = useMemo(() => [...cfg.items].sort((a, b) => a.time.localeCompare(b.time)), [cfg.items]);

  return (
    <div className="dr-card">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="dr-head">
        <div>
          <div className="k">Devotional reminders</div>
          <div className="d">A gentle nudge to sit with your devotional. Set the times, days, and the words you want to hear.</div>
        </div>
        <button
          className={`dr-toggle ${cfg.enabled ? "on" : ""}`}
          aria-pressed={cfg.enabled}
          onClick={() => update({ ...cfg, enabled: !cfg.enabled })}
        />
      </div>

      <div className="dr-body">
        {cfg.enabled && permission === "default" && (
          <div className="dr-perm">
            <span>Allow notifications so reminders can reach you.</span>
            <button onClick={requestPerm}>Enable</button>
          </div>
        )}
        {cfg.enabled && permission === "denied" && (
          <div className="dr-perm" style={{ borderLeft: "3px solid #FF340C" }}>
            <span>Notifications are blocked. Enable them in your browser settings to receive reminders.</span>
          </div>
        )}
        {cfg.enabled && permission === "unsupported" && (
          <div className="dr-perm">
            <span>This browser doesn't support notifications. Reminders will still be saved.</span>
          </div>
        )}

        {sorted.length === 0 && (
          <div className="dr-empty">No reminders yet. Add one to shape your daily rhythm.</div>
        )}

        {sorted.map((r) => {
          const next = nextOccurrence(r.time, r.days);
          return (
            <div key={r.id} className="dr-item">
              <div className="dr-item-row">
                <input
                  type="time"
                  className="dr-time"
                  value={r.time}
                  onChange={(e) => setItem(r.id, { time: e.target.value })}
                />
                <input
                  type="text"
                  className="dr-label"
                  placeholder="Title (e.g. Morning devotional)"
                  value={r.label ?? ""}
                  onChange={(e) => setItem(r.id, { label: e.target.value })}
                />
                <button className="dr-remove" onClick={() => removeReminder(r.id)}>Remove</button>
              </div>
              <div>
                <label className="dr-field-label" htmlFor={`msg-${r.id}`}>Reminder message</label>
                <textarea
                  id={`msg-${r.id}`}
                  className="dr-msg"
                  placeholder={DEFAULT_MESSAGE}
                  value={r.message ?? ""}
                  onChange={(e) => setItem(r.id, { message: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="dr-days">
                {DAYS.map((d, i) => (
                  <button
                    key={i}
                    className={`dr-day ${r.days.includes(i) ? "on" : ""}`}
                    onClick={() => toggleDay(r.id, i)}
                    aria-label={DAY_LONG[i]}
                    aria-pressed={r.days.includes(i)}
                  >{d}</button>
                ))}
              </div>
              <div className="dr-note">{humanNext(next)}</div>
            </div>
          );
        })}

        <button
          className={`dr-add ${sorted.length === 0 ? "block" : ""}`}
          onClick={addReminder}
        >
          + Add reminder
        </button>

        {cfg.enabled && (
          <div className="dr-note">
            Reminders fire while CoCreate is open in a browser tab. For alerts when the app is closed, install CoCreate to your home screen.
          </div>
        )}
      </div>
    </div>
  );
}
