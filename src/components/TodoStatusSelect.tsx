import { useEffect, useRef, useState } from "react";

export type TodoStatus = "not_started" | "in_progress" | "done";

const OPTIONS: { value: TodoStatus; label: string; swatch: string }[] = [
  { value: "not_started", label: "Not started", swatch: "#181A4D" },
  { value: "in_progress", label: "In progress", swatch: "#FFE9A8" },
  { value: "done", label: "Complete", swatch: "#0F4A42" },
];

const STATUS_BG: Record<TodoStatus, string> = {
  not_started: "rgba(24,26,77,0.06)",
  in_progress: "#FFE9A8",
  done: "#CDEBD8",
};
const STATUS_FG: Record<TodoStatus, string> = {
  not_started: "#181A4D",
  in_progress: "#7a5b00",
  done: "#0F4A42",
};
const STATUS_BORDER: Record<TodoStatus, string> = {
  not_started: "rgba(24,26,77,0.14)",
  in_progress: "rgba(122,91,0,0.25)",
  done: "rgba(15,74,66,0.25)",
};

/**
 * A platform-styled status dropdown (custom popover, not a native <select>),
 * so the control looks and behaves identically on iPad, desktop, and any device.
 */
export function TodoStatusSelect({
  value,
  onChange,
}: {
  value: TodoStatus;
  onChange: (v: TodoStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const active = OPTIONS.find((o) => o.value === value)!;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="de-todo-select-wrap" ref={wrapRef}>
      <button
        type="button"
        className="de-todo-select"
        data-s={value}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="de-todo-select-dot" style={{ background: active.swatch }} />
        {active.label}
        <svg className="de-todo-select-caret" width="9" height="9" viewBox="0 0 9 9" aria-hidden="true">
          <path d="M1.5 3 L4.5 6 L7.5 3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul className="de-todo-select-menu" role="listbox">
          {OPTIONS.map((o) => {
            const sel = o.value === value;
            return (
              <li key={o.value} role="option" aria-selected={sel}>
                <button
                  type="button"
                  className={"de-todo-select-opt" + (sel ? " is-on" : "")}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  <span className="de-todo-select-dot" style={{ background: o.swatch }} />
                  {o.label}
                  {sel && (
                    <svg className="de-todo-select-tick" width="11" height="11" viewBox="0 0 11 11" aria-hidden="true">
                      <path d="M1.5 6 L4.5 9 L9.5 2.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* styles consumed via class names above; component-scoped CSS lives in the route */
export const TodoStatusSelectStyles = `
.de-todo-select-wrap{position:relative;grid-column:1;}
.de-todo-select{display:inline-flex;align-items:center;gap:6px;font-family:'Poppins',sans-serif;font-size:10.5px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;border:1px solid ${STATUS_BORDER.not_started};border-radius:999px;padding:4px 10px;margin-top:1px;cursor:pointer;background:${STATUS_BG.not_started};color:${STATUS_FG.not_started};outline:none;transition:box-shadow .15s ease;}
.de-todo-select:focus-visible{box-shadow:0 0 0 2px rgba(138,150,224,0.45);}
.de-todo-select[data-s="in_progress"]{background:${STATUS_BG.in_progress};color:${STATUS_FG.in_progress};border-color:${STATUS_BORDER.in_progress};}
.de-todo-select[data-s="done"]{background:${STATUS_BG.done};color:${STATUS_FG.done};border-color:${STATUS_BORDER.done};}
.de-todo-select-dot{display:inline-block;width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.de-todo-select-caret{flex-shrink:0;opacity:0.7;}
.de-todo-select-menu{position:absolute;z-index:60;top:calc(100% + 4px);left:0;min-width:148px;margin:0;padding:4px;list-style:none;background:#fff;border:1px solid rgba(24,26,77,0.14);border-radius:10px;box-shadow:0 8px 24px rgba(24,26,77,0.16);overflow:hidden;}
.de-todo-select-opt{display:flex;align-items:center;gap:8px;width:100%;font-family:'Poppins',sans-serif;font-size:11px;font-weight:600;color:#20201c;background:none;border:none;padding:8px 10px;border-radius:7px;cursor:pointer;text-align:left;}
.de-todo-select-opt:hover{background:rgba(24,26,77,0.05);}
.de-todo-select-opt.is-on{background:rgba(138,150,224,0.12);color:#181A4D;}
.de-todo-select-tick{margin-left:auto;color:#0F4A42;}
`;
