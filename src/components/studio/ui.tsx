import type { ReactNode, ButtonHTMLAttributes } from "react";
import type { PieceStatus } from "@/lib/studio-checklist";

/** Studio has its own fixed palette — app skins never apply here. */
export const C = { INK: "#181A4D", MUTED: "#5F5D55", LINE: "#E6E3DC", SOFT: "#F6F5F1", SBG: "#FAF9F6", GREEN: "#0F4A42", AMBER: "#8A4B00" };

export const STUDIO_CSS = `
.st-root,.st-root *{box-sizing:border-box;}
.st-root{min-height:100vh;display:flex;background:#fff;color:${C.INK};font-family:'Instrument Sans',sans-serif;-webkit-font-smoothing:antialiased;}
.st-root a{text-decoration:none;color:inherit;}
.st-root button{font-family:inherit;cursor:pointer;}
.st-root button:disabled{cursor:not-allowed;opacity:.5;}
.st-root input,.st-root select,.st-root textarea{font-family:inherit;color:${C.INK};}
.st-side{flex:0 0 236px;padding:20px 14px;border-right:1px solid ${C.LINE};background:${C.SBG};display:flex;flex-direction:column;gap:22px;position:sticky;top:0;height:100vh;}
.st-brand{display:flex;flex-direction:column;gap:2px;padding:0 10px;}
.st-brand b{font-family:'Poppins',sans-serif;font-size:18px;font-weight:900;letter-spacing:-.02em;}
.st-brand span{font-size:11.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:${C.MUTED};}
.st-newbtn{display:flex;align-items:center;gap:8px;min-height:40px;padding:0 12px;border:1px solid ${C.LINE};border-radius:999px;background:#fff;font-size:13.5px;font-weight:600;color:${C.INK};width:100%;}
.st-nav{display:flex;flex-direction:column;gap:2px;}
.st-nav a{display:flex;align-items:center;gap:12px;min-height:42px;padding:0 12px;border-radius:9px;font-size:14.5px;font-weight:500;color:${C.INK};}
.st-nav a svg{color:#6E6B62;}
.st-nav a:hover{background:rgba(255,255,255,.7);}
.st-nav a.active{background:#fff;box-shadow:0 1px 2px rgba(24,26,77,.08);font-weight:600;}
.st-nav a.active svg{color:${C.INK};}
.st-badge{margin-left:auto;min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:${C.INK};color:#fff;font-size:11px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;}
.st-foot{margin-top:auto;display:flex;flex-direction:column;gap:8px;padding:14px 10px 0;border-top:1px solid ${C.LINE};}
.st-foot a{display:inline-flex;align-items:center;gap:8px;min-height:36px;font-size:13.5px;}
.st-main{flex:1;min-width:0;display:flex;flex-direction:column;}
.st-top{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:68px;padding:0 28px;border-bottom:1px solid ${C.LINE};background:#fff;position:sticky;top:0;z-index:20;}
.st-top h1{margin:0;font-family:'Poppins',sans-serif;font-size:22px;font-weight:600;color:${C.INK};}
.st-row{display:flex;align-items:center;gap:12px;}
.st-seg{display:inline-flex;padding:3px;border-radius:999px;background:#F0EEE9;}
.st-seg button{min-height:32px;padding:0 14px;border-radius:999px;border:0;background:transparent;font-size:13px;font-weight:600;color:${C.MUTED};}
.st-seg button.on{background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.08);color:${C.INK};}
.st-btn{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 16px;border-radius:999px;font-size:13.5px;font-weight:600;border:1.5px solid ${C.LINE};background:#fff;color:${C.INK};white-space:nowrap;}
.st-btn.primary{background:${C.INK};border-color:${C.INK};color:#fff;}
.st-btn.sm{min-height:32px;padding:0 12px;font-size:12.5px;}
.st-btn.danger{color:#9B1C1C;}
.st-pill{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border-radius:999px;font-size:12px;font-weight:600;white-space:nowrap;}
.st-pill i{width:6px;height:6px;border-radius:99px;background:currentColor;display:block;}
.st-h2{margin:0;font-family:'Poppins',sans-serif;font-size:17px;font-weight:600;color:${C.INK};}
.st-h3{margin:0 0 12px;font-size:11.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${C.MUTED};}
.st-label{font-size:12px;font-weight:600;color:${C.MUTED};}
.st-help{font-size:12px;color:${C.MUTED};}
.st-input{min-height:40px;padding:0 12px;border:1px solid ${C.LINE};border-radius:9px;font-size:14px;background:#fff;width:100%;}
textarea.st-input{padding:10px 12px;line-height:1.5;resize:vertical;}
.st-input:focus{outline:2px solid ${C.INK};outline-offset:-1px;}
.st-field{display:flex;flex-direction:column;gap:6px;}
.st-chip{display:inline-flex;align-items:center;gap:6px;min-height:34px;padding:0 14px;border-radius:999px;background:${C.SOFT};font-size:13px;font-weight:600;color:${C.INK};border:1px solid transparent;}
.st-chip.add{background:#fff;border:1px dashed #C9C6BE;}
.st-chip button{border:0;background:none;padding:0;color:${C.MUTED};font-size:15px;line-height:1;}
.st-switch{position:relative;width:40px;height:24px;border-radius:99px;border:0;background:#D9D6CE;flex:none;padding:0;}
.st-switch.on{background:${C.INK};}
.st-switch::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:99px;background:#fff;transition:left .15s;}
.st-switch.on::after{left:19px;}
.st-table{width:100%;border-collapse:collapse;font-size:14px;}
.st-table th{text-align:left;padding:10px 12px;font-size:11.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${C.MUTED};border-bottom:1px solid ${C.LINE};}
.st-table td{padding:12px;border-bottom:1px solid ${C.LINE};vertical-align:middle;}
.st-table tr.click{cursor:pointer;}
.st-table tr.click:hover td{background:${C.SBG};}
.st-empty{border:1px dashed #C9C6BE;border-radius:12px;padding:40px 24px;text-align:center;color:${C.MUTED};font-size:14px;background:${C.SBG};}
.st-empty b{display:block;color:${C.INK};font-family:'Poppins',sans-serif;font-size:16px;font-weight:600;margin-bottom:6px;}
.st-pop{position:absolute;z-index:50;background:#fff;border:1px solid ${C.LINE};border-radius:12px;box-shadow:0 16px 40px rgba(24,26,77,.14);padding:8px;}
.st-popitem{display:flex;gap:12px;align-items:center;padding:8px 10px;border-radius:8px;width:100%;border:0;background:none;text-align:left;}
.st-popitem:hover,.st-popitem.sel{background:${C.SOFT};}
.st-popitem .tile{width:34px;height:34px;border:1px solid ${C.LINE};border-radius:8px;display:flex;align-items:center;justify-content:center;flex:none;background:#fff;}
.st-popitem .tt{font-size:13.5px;font-weight:700;color:${C.INK};display:block;}
.st-popitem .dd{font-size:12px;color:${C.MUTED};display:block;}
.st-phone{display:none;}
@media(max-width:720px){.st-root>.st-side,.st-root>.st-main{display:none;}.st-phone{display:flex;flex-direction:column;gap:14px;align-items:flex-start;padding:48px 24px;}}
`;

export const STATUS_STYLE: Record<string, { bg: string; fg: string; border?: string; label: string }> = {
  live: { bg: "#E3EEEA", fg: "#0F4A42", label: "Live" },
  scheduled: { bg: "#E8E9F4", fg: C.INK, label: "Scheduled" },
  draft: { bg: "#F0EEE9", fg: C.MUTED, label: "Draft" },
  planned: { bg: "#fff", fg: C.MUTED, border: C.LINE, label: "Planned" },
  notstarted: { bg: "#fff", fg: C.MUTED, border: C.LINE, label: "Not started" },
};

export function StatusPill({ status, label }: { status: PieceStatus | "planned" | "notstarted"; label?: string }) {
  const s = STATUS_STYLE[status]!;
  return <span className="st-pill" style={{ background: s.bg, color: s.fg, border: s.border ? `1px solid ${s.border}` : undefined }}><i />{label ?? s.label}</span>;
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="st-seg" role="tablist">
      {options.map((o) => <button key={o.value} type="button" role="tab" aria-selected={value === o.value} className={value === o.value ? "on" : ""} onClick={() => onChange(o.value)}>{o.label}</button>)}
    </div>
  );
}

export function Btn({ primary, sm, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean; sm?: boolean }) {
  return <button type="button" {...rest} className={`st-btn${primary ? " primary" : ""}${sm ? " sm" : ""}${className ? ` ${className}` : ""}`} />;
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} className={`st-switch${on ? " on" : ""}`} onClick={() => onChange(!on)} />;
}

export function TopBar({ left, right }: { left: ReactNode; right?: ReactNode }) {
  return <header className="st-top"><div className="st-row" style={{ gap: 16, minWidth: 0 }}>{left}</div><div className="st-row">{right}</div></header>;
}
