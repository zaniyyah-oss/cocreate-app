import { createFileRoute, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { trackEvent } from "@/lib/track";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";
import { ResizableTextarea } from "@/components/ResizableTextarea";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Template = Database["public"]["Tables"]["devotional_templates"]["Row"];
type Entry = Database["public"]["Tables"]["devotional_entries"]["Row"] & {
  where_text?: string | null;
  scripture_reference?: string | null;
  scripture_text?: string | null;
  further_reading_text?: string | null;
  todo_text?: string | null;
  todo_items?: TodoItem[] | null;
  entry_title?: string | null;
  entry_subtitle?: string | null;
};

type Topic = Database["public"]["Tables"]["topics"]["Row"];

type TodoItem = { id: string; text: string; done: boolean; due_date?: string | null };

export const Route = createFileRoute("/devotionals/$id")({
  component: EntryPage,
  validateSearch: (s: Record<string, unknown>) => ({
    date: typeof s.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.date) ? s.date : undefined,
    view: s.view === "week" || s.view === "month" ? (s.view as "week" | "month") : ("today" as const),
    ws: typeof s.ws === "string" ? s.ws : undefined,
  }),

  errorComponent: ({ error }) => (
    <div style={{ minHeight: "100vh", background: "#eee9d9", fontFamily: "Poppins,sans-serif", padding: 80, textAlign: "center" }}>
      <h1 style={{ color: "#181A4D", fontWeight: 900 }}>This devotional didn't load</h1>
      <p style={{ color: "#8a8678" }}>{error.message}</p>
      <Link to="/devotionals" style={{ color: "#181A4D", fontWeight: 700 }}>Back to Devotionals</Link>
    </div>
  ),
  notFoundComponent: () => (
    <div style={{ minHeight: "100vh", background: "#eee9d9", fontFamily: "Poppins,sans-serif", padding: 80, textAlign: "center" }}>
      <h1 style={{ color: "#181A4D", fontWeight: 900 }}>Template not found</h1>
      <Link to="/devotionals" style={{ color: "#181A4D", fontWeight: 700 }}>Back to Devotionals</Link>
    </div>
  ),
  head: () => ({
    meta: [
      { title: "Devotional — CoCreate" },
      { name: "description", content: "Where are you, Read, Pray, To-Do, Workspace." },
    ],
  }),
});


const TOPIC_COLORS: Record<string, string> = {
  amber: "#F5B301", teal: "#0F4A42", lime: "#DCE07A", "light-green": "#C7E39B",
  coral: "#FF340C", navy: "#181A4D", cream: "#FBF8ED", brown: "#441B07",
};
const topicColor = (k?: string | null) => (k && TOPIC_COLORS[k]) || "#0F4A42";
const hexToRgba = (hex: string, alpha: number) => {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const CSS = `
.de-root *{box-sizing:border-box;}
.de-root{min-height:100vh;background:#eee9d9;font-family:'Poppins',sans-serif;color:#20201c;}
.de-nav{background:#fff;border-bottom:1px solid rgba(20,20,20,0.08);padding:14px 24px;display:flex;align-items:center;justify-content:space-between;gap:12px;position:sticky;top:0;z-index:50;}
.de-brand{display:flex;align-items:center;gap:10px;text-decoration:none;}
.de-brand .mark{width:28px;height:28px;background:#DCE07A;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#181A4D;font-weight:900;}
.de-brand .word{font-weight:900;font-size:19px;color:#181A4D;letter-spacing:-0.02em;}
.de-back{color:#8a8678;font-weight:700;font-size:12.5px;text-decoration:none;}
.de-back:hover{color:#181A4D;}
.de-signin{background:#181A4D;color:#fff;font-weight:800;font-size:12.5px;padding:9px 18px;border-radius:20px;text-decoration:none;border:none;cursor:pointer;font-family:'Poppins';}
.de-navmenu{display:none;align-items:center;gap:2px;}
.de-navmenu a{color:#8a8678;text-decoration:none;font-weight:700;font-size:13px;padding:8px 14px;border-radius:20px;transition:background .15s,color .15s;}
.de-navmenu a:hover{color:#181A4D;background:#FBF8ED;}
.de-navmenu a.active{background:#DCE07A;color:#181A4D;}
.de-navright{display:flex;align-items:center;gap:10px;}
@media (min-width:820px){.de-navmenu{display:flex;}}
.de-shell{max-width:1360px;margin:0 auto;padding:28px 36px 120px;}
.de-shell-inner{padding:0;}
.de-headcard{background:transparent;padding:0;margin:0 0 4px;border:none;position:relative;}
.de-headcard-inner{padding:0;}

/* Breadcrumb */
.de-headtop{font-size:13px;color:rgba(24,26,77,0.55);margin-bottom:6px;font-weight:600;display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
.de-headtitle-brand{color:#181A4D;font-weight:600;opacity:1;}
.de-headarrow{color:rgba(24,26,77,0.55);}
.de-headdate{color:rgba(24,26,77,0.55);font-weight:600;}

/* Title / subtitle */
.de-title-input{width:100%;border:none;border-bottom:1.5px dashed rgba(24,26,77,0.12);background:transparent;font-family:'Poppins',sans-serif;font-size:27px;font-weight:700;color:#181A4D;letter-spacing:-0.01em;line-height:1.2;padding:0 0 6px;outline:none;margin:2px 0 8px;}
.de-title-input:focus{border-bottom-color:#181A4D;}
.de-title-input::placeholder{color:#181A4D;opacity:0.35;}
.de-subtitle-input{display:block;width:100%;border:none;border-bottom:1.5px dashed rgba(24,26,77,0.12);background:transparent;font-family:'Poppins',sans-serif;font-size:14px;font-weight:400;color:#20201C;padding:0 0 6px;outline:none;margin:0 0 22px;max-width:640px;opacity:1;}
.de-subtitle-input:focus{border-bottom-color:#181A4D;}
.de-subtitle-input::placeholder{color:#20201C;opacity:0.4;}
.de-headrule{display:none;}
.de-headquote,.de-headref{display:none;}

/* Card + badge */
.de-block{background:#fff;border-radius:14px;padding:20px 22px;margin-bottom:14px;border:1px solid rgba(24,26,77,0.12);min-width:0;max-width:100%;overflow-wrap:anywhere;word-break:break-word;box-sizing:border-box;}
.de-block *{min-width:0;max-width:100%;}
.de-textarea{box-sizing:border-box;max-width:100%;overflow-wrap:anywhere;word-break:break-word;}
.de-shell{min-width:0;}
@media (max-width:899px){
  .de-shell{padding-left:16px;padding-right:16px;overflow-x:hidden;}
  .de-block{padding:16px 14px;}
}
.de-badge{display:inline-block;font-weight:600;font-size:11px;letter-spacing:0.03em;text-transform:uppercase;padding:5px 12px;border-radius:6px;color:#FBF8ED;margin-bottom:12px;font-family:'Poppins',sans-serif;}
.de-badge.where{background:#181A4D;}
.de-badge.read{background:#FFAE00;color:#181A4D;margin-bottom:6px;}
.de-badge.pray{background:#E990A2;color:#181A4D;margin-bottom:6px;}
.de-badge.todo{background:#8A96E0;color:#181A4D;margin-bottom:6px;}

.de-prompt{font-size:14px;line-height:1.5;color:#20201C;opacity:0.7;margin:0 0 10px;font-weight:400;max-width:520px;}
.de-textarea{width:100%;border:none;border-bottom:1px solid rgba(24,26,77,0.12);background:transparent;font-family:'Poppins',sans-serif;font-size:14px;color:#20201C;line-height:1.5;min-height:38px;resize:vertical;outline:none;padding:0 0 9px;transition:border-color .15s ease;}
.de-textarea.tall{min-height:120px;}
.de-textarea.short{min-height:38px;}
@media (max-width:899px){
  .de-textarea{min-height:112px;}
  .de-textarea.short{min-height:96px;}
}

/* Mobile jump nav — color-coded fast-links to each section */
.de-jump{display:none;}
@media (max-width:899px){
  .de-jump{display:flex;gap:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding:10px 2px 12px;margin:0 0 6px;scrollbar-width:none;}
  .de-jump::-webkit-scrollbar{display:none;}
  .de-jump a{flex:0 0 auto;font-family:'Poppins',sans-serif;font-weight:700;font-size:11.5px;letter-spacing:0.03em;text-transform:uppercase;color:#181A4D;text-decoration:none;padding:8px 14px;border-radius:999px;border:1px solid rgba(24,26,77,0.14);background:#fff;display:inline-flex;align-items:center;gap:7px;line-height:1;}
  .de-jump a .dot{width:9px;height:9px;min-width:9px;min-height:9px;border-radius:99px;flex-shrink:0;}
  .de-jump a.read .dot{background:#FFAE00;}
  .de-jump a.read .dot{background:#FFAE00;}
  .de-jump a.pray .dot{background:#E990A2;}
  .de-jump a.todo .dot{background:#8A96E0;}
  .de-jump a.workspace .dot{background:#0F4A42;}
}
.de-anchor{scroll-margin-top:72px;}
.de-textarea:focus{border-bottom-color:#181A4D;}
.de-textarea::placeholder{color:#20201C;opacity:0.35;}
.de-status{margin-top:8px;font-size:11px;color:#8a8678;font-weight:600;text-align:right;min-height:14px;}
.de-status.on{color:#0F4A42;}

/* Read card internal parts (scripture ref + further reading) */
.de-block.read{padding:20px 22px;}
.de-read-head{padding:0;}
.de-read-part{padding:12px 0 0;border-top:none;margin-top:10px;}
.de-read-part:first-of-type{margin-top:0;}
.de-sublabel{font-size:10.5px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#8a8678;margin:0 0 8px;}
.de-scr-ref{width:100%;border:none;border-bottom:1px solid rgba(24,26,77,0.12);background:transparent;font-family:'Poppins',sans-serif;font-size:13px;color:#0F4A42;font-weight:600;outline:none;padding:0 0 8px;margin-bottom:10px;}
.de-scr-ref:focus{border-bottom-color:#0F4A42;}
.de-invite{display:none;}

/* To-do */
.de-todos{margin-top:10px;padding:0;background:transparent;}
.de-todo{display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid rgba(24,26,77,0.08);}
.de-todo:last-of-type{border-bottom:none;}
.de-todo input[type=checkbox]{width:14px;height:14px;accent-color:#0F4A42;cursor:pointer;flex-shrink:0;}
.de-todo input[type=text]{flex:1;border:none;background:transparent;font-family:'Poppins',sans-serif;font-size:13px;color:#20201c;outline:none;padding:2px 0;}
.de-todo input[type=text].done{color:#8a8678;text-decoration:line-through;}
.de-todo-x{background:none;border:none;color:#8a8678;cursor:pointer;font-size:15px;padding:2px 6px;line-height:1;}
.de-todo-x:hover{color:#FF340C;}
.de-todo-date{border:none;background:transparent;font-family:'Poppins',sans-serif;font-size:11px;color:#8A96E0;outline:none;padding:2px 4px;cursor:pointer;flex-shrink:0;width:110px;}
.de-todo-date:hover{color:#181A4D;}
.de-todo-add{background:none;border:1px dashed rgba(15,74,66,0.25);color:#0F4A42;font-family:'Poppins',sans-serif;font-weight:600;font-size:11.5px;letter-spacing:0.03em;padding:7px 12px;border-radius:6px;cursor:pointer;margin-top:8px;width:100%;transition:background .15s ease;}
.de-todo-add:hover{background:rgba(15,74,66,0.06);}

/* Past entries */
.de-past{margin-top:40px;}
.de-past h3{font-size:12px;font-weight:700;color:#8a8678;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 12px;}
.de-past ul{list-style:none;margin:0;padding:0;background:#fff;border-radius:12px;border:1px solid rgba(24,26,77,0.12);overflow:hidden;}
.de-past li{padding:14px 20px;border-bottom:1px solid rgba(24,26,77,0.08);cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:16px;}
.de-past li:last-child{border-bottom:none;}
.de-past li:hover{background:#FBF8ED;}
.de-past li.active{background:#FBF8ED;}
.de-past .d{font-size:13px;font-weight:600;color:#181A4D;}
.de-past .preview{font-size:12px;color:#8a8678;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:60%;}
.de-past .empty{padding:20px;text-align:center;color:#8a8678;font-size:13px;}
.de-skel{height:180px;background:#fff;border-radius:14px;animation:dep 1.4s infinite;}
@keyframes dep{0%,100%{opacity:1}50%{opacity:.55}}
.de-signgate{background:#fff;border:1px solid rgba(24,26,77,0.12);border-left:4px solid #FF340C;border-radius:14px;padding:22px;}
.de-signgate h3{font-size:16px;font-weight:700;color:#181A4D;margin:0 0 6px;}
.de-signgate p{font-size:13.5px;color:#8a8678;margin:0 0 14px;line-height:1.55;}

/* Stack: Read/Pray/To-Do share ONE white card with connected column dividers */
.de-stack{border-radius:14px;overflow:hidden;border:1px solid rgba(24,26,77,0.12);background:#fff;margin-bottom:14px;position:relative;}
@media (min-width:900px){
  .de-stack::before,.de-stack::after{content:'';position:absolute;top:0;bottom:0;width:1px;background:rgba(24,26,77,0.12);z-index:2;pointer-events:none;}
  .de-stack::before{left:33.3333%;}
  .de-stack::after{left:66.6666%;}
}
.de-cols{display:grid;grid-template-columns:1fr;gap:0;}
.de-cols .de-block{margin-bottom:0;border:none;border-radius:0;background:transparent;height:100%;display:flex;flex-direction:column;padding:20px 22px;}
.de-cols .de-block + .de-block{border-top:1px solid rgba(24,26,77,0.12);}
.de-pray-card .de-pray-textarea{flex:1;}
@media (min-width:720px){
  .de-pray-card .de-pray-textarea{min-height:220px;}
}
@media (min-width:900px){
  .de-cols{grid-template-columns:1fr 1fr 1fr;}
  .de-cols .de-block + .de-block{border-top:none;}
  .de-pray-card .de-pray-textarea{height:100%;min-height:0;}
}

/* Topical devotional bands (aligned to same 3-col grid inside .de-stack) */
.de-band{display:grid;grid-template-columns:1fr;border-top:1px solid rgba(24,26,77,0.12);position:relative;}
@media (min-width:900px){ .de-band{grid-template-columns:1fr 1fr 1fr;} }
.de-band-cell{padding:14px 18px;display:flex;align-items:flex-start;gap:9px;cursor:pointer;min-width:0;}
.de-band-cell:hover .de-band-line{opacity:1;}
.de-band-tag{display:inline-flex;align-items:center;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.02em;border-radius:999px;padding:3px 10px;flex-shrink:0;line-height:1.4;color:#20201C;}
.de-band-line{font-size:12.5px;color:#20201C;opacity:0.75;line-height:1.4;min-width:0;}

/* Focus / fullscreen for a section */
.de-block, .ws-root { position: relative; }
.de-focus-btn{background:transparent;border:1px solid rgba(24,26,77,0.15);color:#181A4D;font-family:'Poppins',sans-serif;font-weight:600;font-size:10.5px;letter-spacing:0.05em;text-transform:uppercase;padding:4px 9px;border-radius:99px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;}
.de-focus-btn:hover{background:#181A4D;color:#fff;border-color:#181A4D;}
.de-block-header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px;}
.de-block-header .de-badge{margin-bottom:0;}
.de-block.is-full, .ws-root.is-full{position:fixed;inset:0;z-index:300;margin:0;border-radius:0;overflow-y:auto;padding:14px 16px 24px;background:#fff;border:none;max-width:100vw;display:flex;flex-direction:column;}
@media (min-width:768px){
  .de-block.is-full, .ws-root.is-full{padding:72px 48px 80px;}
  .de-block.is-full > *, .ws-root.is-full > *{max-width:980px;margin-left:auto;margin-right:auto;width:100%;}
}
@media (min-width:1200px){
  .de-block.is-full{padding:84px 72px 100px;}
  .de-block.is-full > *{max-width:1200px;}
  .de-block.is-full.read{padding:80px 64px 100px;}
  .de-block.is-full.read > *{max-width:1200px;}
}
.de-block.is-full .de-textarea{flex:1;min-height:60vh;}
@media (min-width:768px){
  .de-block.is-full .de-textarea{min-height:55vh;}
  .de-block.is-full.read .de-textarea{min-height:38vh;}
}
.de-block.is-full.read .de-read-head,
.de-block.is-full.read .de-read-part{padding-left:0;padding-right:0;}
.de-block.is-full .de-cols{grid-template-columns:1fr;}


/* View switcher */
.de-viewtabs{display:flex;gap:4px;background:#fff;border:1px solid rgba(24,26,77,0.12);border-radius:999px;padding:4px;}
.de-viewtabs button{border:none;background:none;font-family:'Poppins',sans-serif;font-weight:600;font-size:12.5px;color:#181A4D;opacity:0.55;cursor:pointer;padding:7px 15px;border-radius:999px;}
.de-viewtabs button.active{opacity:1;background:#181A4D;color:#DCE07A;}
.de-viewtabs button:hover:not(.active){opacity:0.85;}

/* History table */
.de-hist-header{background:#fff;border:1px solid rgba(24,26,77,0.12);border-radius:12px 12px 0 0;display:grid;grid-template-columns:45px 55px 1fr 220px 100px 250px 50px;padding:11px 18px;font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:0.03em;color:#181A4D;opacity:0.55;font-family:'Poppins',sans-serif;}
.de-hist-row{display:grid;grid-template-columns:45px 55px 1fr 220px 100px 250px 50px;align-items:flex-start;padding:14px 18px;background:#fff;border:1px solid rgba(24,26,77,0.12);border-top:none;font-size:13px;font-family:'Poppins',sans-serif;color:#20201C;gap:8px;cursor:pointer;transition:background .12s;}
.de-hist-row:hover{background:#FBF8ED;}
.de-hist-row:last-child{border-radius:0 0 12px 12px;}
.de-hist-row.empty{opacity:0.55;}
.de-hist-row > div{min-width:0;}
.de-hist-mood{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:8px;flex-shrink:0;vertical-align:middle;margin-top:5px;}
.de-hist-name{font-weight:600;color:#181A4D;overflow-wrap:anywhere;}
.de-hist-subtitle{font-size:11.5px;color:#20201C;opacity:0.7;line-height:1.45;overflow-wrap:anywhere;word-break:break-word;display:block;}
.de-hist-tags{display:flex;gap:6px;flex-wrap:wrap;}
.de-hist-tag{border-radius:999px;padding:3px 10px;font-size:10px;font-weight:600;font-family:'Poppins',sans-serif;}
.de-hist-tag.daily{background:rgba(24,26,77,0.08);color:#181A4D;}
.de-hist-wstag{background:rgba(15,74,66,0.08);color:#0F4A42;border-radius:999px;padding:3px 10px;font-size:10px;font-weight:600;font-family:'Poppins',sans-serif;border:none;cursor:pointer;text-decoration:none;display:inline-block;}
.de-hist-wstag:hover{background:rgba(15,74,66,0.18);}
.de-hist-none{font-size:11.5px;color:#20201C;opacity:0.35;}
.de-hist-open{color:#181A4D;font-size:11.5px;font-weight:600;text-align:right;text-decoration:none;font-family:'Poppins',sans-serif;}
.de-hist-open:hover{text-decoration:underline;}
.de-streaknote{font-size:13px;color:#181A4D;margin:16px 4px 0;font-style:italic;opacity:0.9;font-family:'Poppins',sans-serif;}
@media (max-width: 720px){
  .de-hist-header{display:none;}
  .de-hist-row{
    grid-template-columns: 40px 58px 1fr;
    grid-template-areas:
      "day date entry"
      ".   .    notes"
      ".   .    focus"
      ".   .    wstags"
      ".   .    open";
    row-gap:6px;
    column-gap:8px;
    padding:14px 14px;
    border-radius:12px;
    border-top:1px solid rgba(24,26,77,0.12);
    margin-bottom:10px;
    font-size:13px;
  }
  .de-hist-row:last-child{border-radius:12px;}
  .de-hist-row > div:nth-child(1){grid-area:day;font-weight:600;color:#181A4D;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;padding-top:2px;}
  .de-hist-row > div:nth-child(2){grid-area:date;font-weight:600;color:#181A4D;font-size:12px;padding-top:2px;}
  .de-hist-row > div:nth-child(3){grid-area:entry;}
  .de-hist-row > div:nth-child(4){grid-area:notes;}
  .de-hist-row > div:nth-child(5){grid-area:focus;}
  .de-hist-row > div:nth-child(6){grid-area:wstags;}
  .de-hist-row > div:nth-child(7){grid-area:open;text-align:left !important;margin-top:2px;}
  .de-hist-row > div:empty{display:none;}
}
.app-bottomnav{background:#fff;border-top:1px solid rgba(20,20,20,0.08);display:flex;justify-content:space-around;padding:10px 4px calc(10px + env(safe-area-inset-bottom,0));z-index:50;box-shadow:0 -4px 16px rgba(0,0,0,0.04);}
.app-bottomnav a{display:flex;flex-direction:column;align-items:center;gap:3px;color:#8a8678;text-decoration:none;padding:4px 8px;transition:color .15s;min-width:52px;}
.app-bottomnav a.active{color:#181A4D;}
.app-bottomnav svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}
.app-bottomnav span{font-size:9.5px;font-weight:700;letter-spacing:0.02em;}
@media (min-width:1024px){.app-bottomnav{display:none;}}
`;



function useAuth() {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setUserId(data.session?.user.id ?? null); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);
  return { userId, ready };
}

const todayISO = () => {
  const d = new Date();
  const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

const formatDate = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

// Saveable field types
type SaveField =
  | "where_text"
  | "scripture_reference"
  | "scripture_text"
  | "further_reading_text"
  | "pray_text"
  | "todo_text"
  | "todo_items"
  | "entry_title"
  | "entry_subtitle";


function NavMenu() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items: Array<{ to: string; label: string; match?: string[] }> = [
    { to: "/", label: "Home" },
    { to: "/explore", label: "Explore" },
    { to: "/devotionals", label: "Workspace" },
    { to: "/saved", label: "Library", match: ["/saved", "/notes"] },
    { to: "/profile", label: "Profile" },
  ];
  const isActive = (it: { to: string; match?: string[] }) => {
    if (it.match?.some((p) => pathname === p || pathname.startsWith(p + "/"))) return true;
    if (it.to === "/") return pathname === "/";
    return pathname === it.to || pathname.startsWith(it.to + "/");
  };
  return (
    <div className="de-navmenu">
      {items.map((it) => (
        <Link key={it.to} to={it.to} className={isActive(it) ? "active" : ""}>{it.label}</Link>
      ))}
    </div>
  );
}

function EntryPage() {
  const { id } = Route.useParams();
  const { userId, ready } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [selectedDate, setSelectedDate] = useState<string>(search.date ?? todayISO());
  useEffect(() => { if (search.date) setSelectedDate(search.date); }, [search.date]);

  const [focusSection, setFocusSection] = useState<string | null>(null);
  // Lock body scroll when a section is focused
  useEffect(() => {
    if (focusSection) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [focusSection]);
  // ESC to exit fullscreen
  useEffect(() => {
    if (!focusSection) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFocusSection(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusSection]);

  useEffect(() => {
    document.body.style.background = "#eee9d9";
    return () => { document.body.style.background = ""; };
  }, []);


  const templateQ = useQuery({
    queryKey: ["dev-template", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("devotional_templates").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Template | null;
    },
  });

  const topicQ = useQuery({
    queryKey: ["dev-template-topic", templateQ.data?.topic_id],
    enabled: !!templateQ.data?.topic_id,
    queryFn: async () => {
      const { data, error } = await supabase.from("topics").select("*").eq("id", templateQ.data!.topic_id!).maybeSingle();
      if (error) throw error;
      return data as Topic | null;
    },
  });

  const pastQ = useQuery({
    queryKey: ["dev-entries", id, userId],
    enabled: ready && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("devotional_entries")
        .select("*").eq("user_id", userId!).eq("template_id", id)
        .order("entry_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Entry[];
    },
  });

  // Active topical devotionals attached by this user (saved or with entries),
  // excluding the current default (Abide) template.
  const topicalsQ = useQuery({
    queryKey: ["dev-active-topicals", userId, id],
    enabled: ready && !!userId,
    queryFn: async () => {
      const [{ data: saved }, { data: entryTpls }] = await Promise.all([
        supabase.from("saved_items").select("devotional_template_id").eq("user_id", userId!).not("devotional_template_id", "is", null),
        supabase.from("devotional_entries").select("template_id").eq("user_id", userId!).not("template_id", "is", null),
      ]);
      const ids = Array.from(new Set([
        ...(saved ?? []).map(r => r.devotional_template_id).filter(Boolean) as string[],
        ...(entryTpls ?? []).map(r => r.template_id).filter(Boolean) as string[],
      ])).filter(x => x !== id);
      if (ids.length === 0) return [] as Array<Template & { topic: Topic | null }>;
      const { data: tpls } = await supabase
        .from("devotional_templates")
        .select("*")
        .in("id", ids)
        .eq("status", "published");
      const topicIds = Array.from(new Set((tpls ?? []).map(x => x.topic_id).filter(Boolean))) as string[];
      const topicMap: Record<string, Topic> = {};
      if (topicIds.length) {
        const { data: tps } = await supabase.from("topics").select("*").in("id", topicIds);
        (tps ?? []).forEach(tp => { topicMap[tp.id] = tp as Topic; });
      }
      return (tpls ?? []).map(x => ({ ...(x as Template), topic: x.topic_id ? (topicMap[x.topic_id] ?? null) : null }));
    },
  });

  const currentEntry: Entry | undefined = (pastQ.data ?? []).find((e) => e.entry_date === selectedDate);

  // 5-section state
  const [entryTitle, setEntryTitle] = useState("");
  const [entrySubtitle, setEntrySubtitle] = useState("");
  const [whereText, setWhereText] = useState("");
  const [scriptureRef, setScriptureRef] = useState("");
  const [scriptureText, setScriptureText] = useState("");
  const [furtherReading, setFurtherReading] = useState("");
  const [prayText, setPrayText] = useState("");
  const [todoText, setTodoText] = useState("");
  const [todoItems, setTodoItems] = useState<TodoItem[]>([]);


  const [savingField, setSavingField] = useState<string | null>(null);
  const [savedField, setSavedField] = useState<string | null>(null);
  const hydratedRef = useRef<string>("");
  const entrySaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingEntryPatchRef = useRef<Record<string, unknown> | null>(null);
  const entrySaveInFlightRef = useRef(false);
  const currentEntryIdRef = useRef<string | null>(null);

  useEffect(() => {
    currentEntryIdRef.current = currentEntry?.id ?? null;
  }, [currentEntry?.id]);

  // Rehydrate texts when switching date or when entries load. Legacy reflect/apply
  // fields are surfaced into the new Where/To-Do sections if the new ones are empty.
  // For topical/temporary devotionals (non-default) with no existing entry for the day,
  // pre-fill Read/Pray/To-Do from the template's configured content.
  useEffect(() => {
    if (pendingEntryPatchRef.current || entrySaveInFlightRef.current) return;
    const key = `${selectedDate}:${currentEntry?.id ?? "new"}:${templateQ.data?.id ?? ""}:${(pastQ.data ?? []).length}`;
    if (hydratedRef.current === key) return;
    hydratedRef.current = key;
    const e = currentEntry;
    const t = templateQ.data;

    // Compute prefill values for a brand-new entry on a non-default template.
    let prefillScrRef = "";
    let prefillScrText = "";
    let prefillPray = "";
    let prefillTodo = "";
    if (!e && t && !(t as any).is_default) {
      const scr = Array.isArray((t as any).scripture_items) ? (t as any).scripture_items as Array<{ reference?: string; note?: string }> : [];
      const pray = Array.isArray((t as any).pray_items) ? (t as any).pray_items as string[] : [];
      const todo = Array.isArray((t as any).todo_items_pool) ? (t as any).todo_items_pool as string[] : [];
      const mode = (t as any).fill_mode === "sequence" ? "sequence" : "pool";
      const pastCount = (pastQ.data ?? []).length; // 0-based day index for today
      const pick = <T,>(arr: T[]): T | undefined => {
        if (arr.length === 0) return undefined;
        if (mode === "sequence") return arr[Math.min(pastCount, arr.length - 1)];
        return arr[pastCount % arr.length];
      };
      const s = pick(scr);
      if (s) { prefillScrRef = s.reference ?? ""; prefillScrText = s.note ?? ""; }
      prefillPray = pick(pray) ?? "";
      prefillTodo = pick(todo) ?? "";
    }

    setEntryTitle(e?.entry_title ?? "");
    setEntrySubtitle(e?.entry_subtitle ?? "");
    setWhereText(e?.where_text ?? e?.reflect_text ?? "");
    setScriptureRef(e?.scripture_reference ?? prefillScrRef);
    setScriptureText(e?.scripture_text ?? prefillScrText);
    setFurtherReading(e?.further_reading_text ?? "");
    setPrayText(e?.pray_text ?? prefillPray);
    setTodoText(e?.todo_text ?? e?.apply_text ?? prefillTodo);
    const items = Array.isArray(e?.todo_items) ? (e!.todo_items as TodoItem[]) : [];
    setTodoItems(items);
  }, [selectedDate, currentEntry?.id, templateQ.data?.id, (pastQ.data ?? []).length]); // eslint-disable-line react-hooks/exhaustive-deps



  const applyEntryPatchToCache = (entryId: string | null, patch: Record<string, unknown>, insertedEntry?: Entry) => {
    if (!userId) return;
    qc.setQueryData<Entry[]>(["dev-entries", id, userId], (cur) => {
      const existing = cur ?? [];
      const now = new Date().toISOString();
      if (insertedEntry && !existing.some((entry) => entry.id === insertedEntry.id)) {
        return [{ ...insertedEntry, ...patch } as Entry, ...existing];
      }
      if (entryId && existing.some((entry) => entry.id === entryId)) {
        return existing.map((entry) => entry.id === entryId ? ({ ...entry, ...patch, updated_at: now } as Entry) : entry);
      }
      const match = existing.find((entry) => entry.entry_date === selectedDate && entry.template_id === id);
      if (match) {
        return existing.map((entry) => entry.id === match.id ? ({ ...entry, ...patch, updated_at: now } as Entry) : entry);
      }
      return existing;
    });
  };

  const flushEntrySave = async () => {
    if (!userId) return;
    if (entrySaveTimerRef.current) { clearTimeout(entrySaveTimerRef.current); entrySaveTimerRef.current = null; }
    if (!pendingEntryPatchRef.current) return;
    if (entrySaveInFlightRef.current) return;
    const patch = pendingEntryPatchRef.current;
    pendingEntryPatchRef.current = null;
    entrySaveInFlightRef.current = true;
    try {
      const entryId = currentEntryIdRef.current;
      if (entryId) {
        const { error } = await supabase.from("devotional_entries").update(patch as any).eq("id", entryId);
        if (error) throw error;
        applyEntryPatchToCache(entryId, patch);
      } else {
        const { data, error } = await supabase.from("devotional_entries").insert({
          user_id: userId, template_id: id, entry_date: selectedDate, ...patch,
        } as any).select("*").single();
        if (error) throw error;
        currentEntryIdRef.current = data.id;
        trackEvent("devotional_entry_created", { template_id: id });
        applyEntryPatchToCache(data.id, patch, data as Entry);
      }
      const key = Object.keys(patch)[0];
      setSavingField(null);
      setSavedField(key);
      setTimeout(() => setSavedField((s) => (s === key ? null : s)), 1400);
      qc.invalidateQueries({ queryKey: ["dev-entries", id, userId], refetchType: "none" });
    } catch (e) {
      pendingEntryPatchRef.current = { ...(patch as any), ...(pendingEntryPatchRef.current ?? {}) };
      console.error("devotional entry save failed", e);
    } finally {
      entrySaveInFlightRef.current = false;
      if (pendingEntryPatchRef.current) void flushEntrySave();
    }
  };

  // Ensure a devotional_entries row exists for today; return its id.
  // Used by the Workspace section, which needs an entry to attach items to.
  const ensureEntry = async (): Promise<string | null> => {
    if (!userId) return null;
    if (currentEntryIdRef.current) return currentEntryIdRef.current;
    if (currentEntry?.id) return currentEntry.id;
    const { data, error } = await supabase
      .from("devotional_entries")
      .insert({ user_id: userId, template_id: id, entry_date: selectedDate } as any)
      .select("id")
      .single();
    if (error) {
      // If a row was created concurrently, refetch and use whichever exists
      await qc.invalidateQueries({ queryKey: ["dev-entries", id, userId] });
      const { data: existing } = await supabase
        .from("devotional_entries")
        .select("id")
        .eq("user_id", userId)
        .eq("template_id", id)
        .eq("entry_date", selectedDate)
        .maybeSingle();
      return existing?.id ?? null;
    }
    trackEvent("devotional_entry_created", { template_id: id });
    qc.invalidateQueries({ queryKey: ["dev-entries", id, userId] });
    return data.id;
  };

  const scheduleSave = (field: SaveField, value: unknown) => {
    if (!ready) return;
    if (!userId) { guestNote("type"); return; }
    setSavingField(field);
    pendingEntryPatchRef.current = { ...(pendingEntryPatchRef.current ?? {}), [field]: value };
    if (entrySaveTimerRef.current) clearTimeout(entrySaveTimerRef.current);
    entrySaveTimerRef.current = setTimeout(() => { void flushEntrySave(); }, 600);
  };

  useEffect(() => {
    if (!userId) return;
    const flush = () => { void flushEntrySave(); };
    const onVis = () => { if (document.visibilityState === "hidden") flush(); };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingEntryPatchRef.current || entrySaveInFlightRef.current) {
        flush();
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVis);
      flush();
    };
  }, [userId, id, selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Todo item helpers
  const addTodoItem = () => {
    const next = [...todoItems, { id: crypto.randomUUID(), text: "", done: false }];
    setTodoItems(next);
    scheduleSave("todo_items", next);
  };
  const updateTodoItem = (idx: number, patch: Partial<TodoItem>) => {
    const next = todoItems.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    setTodoItems(next);
    scheduleSave("todo_items", next);
  };
  const removeTodoItem = (idx: number) => {
    const next = todoItems.filter((_, i) => i !== idx);
    setTodoItems(next);
    scheduleSave("todo_items", next);
  };

  // Guest preview mode: unauthenticated visitors see the full workspace and can
  // interact locally (typing, todos, focus mode). Nothing is written to Supabase.
  const isGuest = ready && !userId;
  const [guestTyped, setGuestTyped] = useState(false);
  const [guestGate, setGuestGate] = useState<null | "type" | "save">(null);
  const guestNote = (kind: "type" | "save") => {
    if (!isGuest) return;
    if (kind === "type") {
      if (!guestTyped) setGuestTyped(true);
      setGuestGate((g) => g ?? "type");
    } else {
      setGuestGate("save");
    }
  };
  // Warn guests before losing typed content on refresh / navigation.
  useEffect(() => {
    if (!isGuest || !guestTyped) return;
    const onBefore = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBefore);
    return () => window.removeEventListener("beforeunload", onBefore);
  }, [isGuest, guestTyped]);



  const t = templateQ.data;
  const topic = topicQ.data;
  const color = topicColor(topic?.color_key);
  const statusText = (field: string) =>
    savingField === field ? "Saving…" : savedField === field ? "Saved" : "";
  const statusRow = (field: string) => (
    <div className={`de-status ${savedField === field ? "on" : ""}`}>{statusText(field)}</div>
  );
  const focusBtn = (key: string) => (
    <button
      type="button"
      className="de-focus-btn"
      onClick={() => setFocusSection((cur) => (cur === key ? null : key))}
      aria-label={focusSection === key ? "Exit focus mode" : "Focus this section"}
    >
      {focusSection === key ? "✕ Exit focus" : "⛶ Focus"}
    </button>
  );


  return (
    <div className="de-root">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav className="de-nav">
        <Link to="/" className="de-brand"><div className="mark">C</div><div className="word">CoCreate</div></Link>
        <NavMenu />
        <div className="de-navright">{isGuest && <Link to="/auth" className="de-signin">Sign in</Link>}</div>

      </nav>

      <div className="de-shell">
        {templateQ.isLoading ? (
          <div className="de-shell-inner"><div className="de-skel" /></div>
        ) : !t ? (
          <div className="de-shell-inner" style={{ textAlign: "center", padding: 40 }}>Template not found.</div>
        ) : (
          <>
            {search.view === "today" && selectedDate !== todayISO() && (
              <div
                style={{
                  background: "#FFAE00",
                  color: "#181A4D",
                  fontFamily: "'Poppins',sans-serif",
                  fontWeight: 700,
                  fontSize: 13,
                  padding: "12px 18px",
                  borderRadius: 10,
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <span>
                  ⏳ You're viewing a past day — {formatDate(selectedDate)}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayISO())}
                  style={{
                    background: "#181A4D",
                    color: "#fff",
                    border: "none",
                    borderRadius: 999,
                    padding: "6px 14px",
                    fontFamily: "'Poppins',sans-serif",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Jump to today
                </button>
              </div>
            )}
            {/* View switcher */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 18 }}>
              <div className="de-viewtabs">
                {(["today", "week", "month"] as const).map((v) => (
                  <button
                    key={v}
                    className={search.view === v ? "active" : ""}
                    onClick={() =>
                      navigate({
                        to: "/devotionals/$id",
                        params: { id },
                        search: (prev: any) => ({ ...prev, view: v === "today" ? undefined : v }),
                      })
                    }
                  >
                    {v === "today" ? "Today" : v === "week" ? "This week" : "Month"}
                  </button>
                ))}
              </div>
            </div>

            {search.view === "month" ? (
              <MonthCalendarView templateId={id} userId={userId} />
            ) : search.view === "week" ? (
              <WeekListView templateId={id} userId={userId} />
            ) : (
              <>
            {/* Focus-on chip row */}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 18 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a8678", marginRight: 4 }}>Focus on</span>
              <button
                type="button"
                onClick={() => setFocusSection(null)}
                style={{ border: "1px solid #181A4D", background: "#181A4D", color: "#fff", fontFamily: "'Poppins',sans-serif", fontWeight: 600, fontSize: 12, padding: "6px 14px", borderRadius: 999, cursor: "pointer" }}
              >
                All of today
              </button>
              {(topicalsQ.data ?? []).map(tp => {
                const c = topicColor(tp.topic?.color_key);
                return (
                  <Link
                    key={tp.id}
                    to="/devotionals/focus/$id"
                    params={{ id: tp.id }}
                    style={{ border: "1px solid rgba(24,26,77,0.15)", background: "#fff", color: "#181A4D", fontFamily: "'Poppins',sans-serif", fontWeight: 600, fontSize: 12, padding: "6px 14px", borderRadius: 999, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: 99, background: c }} />
                    {tp.topic?.name ?? tp.title}
                  </Link>
                );
              })}
            </div>

            <div className="de-headcard">
              <div className="de-headcard-inner">
                <div className="de-headtop">
                  <span className="de-headtitle-brand">{t.title}</span>
                  <span className="de-headarrow">→</span>
                  <span className="de-headdate">{formatDate(selectedDate)}</span>
                </div>
                <input
                  className="de-title-input"
                  placeholder="Name today's entry..."
                  value={entryTitle}
                  onChange={(e) => { setEntryTitle(e.target.value); scheduleSave("entry_title", e.target.value); }}
                />
                <input
                  className="de-subtitle-input"
                  placeholder="A line about why this entry matters..."
                  value={entrySubtitle}
                  onChange={(e) => { setEntrySubtitle(e.target.value); scheduleSave("entry_subtitle", e.target.value); }}
                />
              </div>
            </div>

            <TodayEventsBanner userId={userId} dateISO={selectedDate} />

            <div className="de-shell-inner">
              {/* Mobile-only quick jump to each section */}
              <nav className="de-jump" aria-label="Jump to section">
                <a href="#sec-read" className="read"><span className="dot" />Read</a>
                <a href="#sec-pray" className="pray"><span className="dot" />Pray</a>
                <a href="#sec-todo" className="todo"><span className="dot" />To-do</a>
                <a href="#sec-workspace" className="workspace"><span className="dot" />Workspace</a>
              </nav>

              {/* 1. Where Are You */}
              <div id="sec-where" className={`de-block de-anchor ${focusSection === "where" ? "is-full" : ""}`}>
                <div className="de-block-header">
                  <span className="de-badge where">where are you</span>
                  {focusBtn("where")}
                </div>
                <ResizableTextarea
                  storageKey="where"
                  className="de-textarea"
                  placeholder="Share what you're thinking and feeling with the Lord — let's just start here."
                  value={whereText}
                  onChange={(e) => { setWhereText(e.target.value); scheduleSave("where_text", e.target.value); }}
                />
                {statusRow("where_text")}
              </div>


              {/* 2/3/4 stacked triad — one connected white card */}
              <div className="de-stack">
                <div className="de-cols">
                  {/* Read */}
                  <div id="sec-read" className={`de-block de-anchor read ${focusSection === "read" ? "is-full" : ""}`}>
                    <div className="de-block-header">
                      <span className="de-badge read">read</span>
                      {focusBtn("read")}
                    </div>
                    <div className="de-read-part">
                      <input
                        className="de-scr-ref"
                        placeholder="What scripture are you reading today?"
                        value={scriptureRef}
                        onChange={(e) => { setScriptureRef(e.target.value); scheduleSave("scripture_reference", e.target.value); }}
                      />
                      <ResizableTextarea
                        storageKey="scripture"
                        className="de-textarea"
                        placeholder="What did you notice? What is God saying?"
                        value={scriptureText}
                        onChange={(e) => { setScriptureText(e.target.value); scheduleSave("scripture_text", e.target.value); }}
                      />
                      {statusRow("scripture_text")}
                    </div>
                    <div className="de-read-part">
                      <ResizableTextarea
                        storageKey="further"
                        className="de-textarea short"
                        placeholder="What supplemental material will you be reviewing today?"
                        value={furtherReading}
                        onChange={(e) => { setFurtherReading(e.target.value); scheduleSave("further_reading_text", e.target.value); }}
                      />
                      {statusRow("further_reading_text")}
                    </div>
                  </div>

                  {/* Pray */}
                  <div id="sec-pray" className={`de-block de-anchor de-pray-card ${focusSection === "pray" ? "is-full" : ""}`}>
                    <div className="de-block-header">
                      <span className="de-badge pray">pray</span>
                      {focusBtn("pray")}
                    </div>
                    
                    <ResizableTextarea
                      storageKey="pray"
                      className="de-textarea de-pray-textarea"
                      placeholder="Speak plainly to God…"
                      value={prayText}
                      onChange={(e) => { setPrayText(e.target.value); scheduleSave("pray_text", e.target.value); }}
                    />
                    {statusRow("pray_text")}
                  </div>

                  {/* To-Do */}
                  <div id="sec-todo" className={`de-block de-anchor ${focusSection === "todo" ? "is-full" : ""}`}>
                    <div className="de-block-header">
                      <span className="de-badge todo">to-do</span>
                      {focusBtn("todo")}
                    </div>
                    
                    <ResizableTextarea
                      storageKey="todo"
                      className="de-textarea short"
                      placeholder="What is God asking you to do today?"
                      value={todoText}
                      onChange={(e) => { setTodoText(e.target.value); scheduleSave("todo_text", e.target.value); }}
                    />
                    {statusRow("todo_text")}

                    <div className="de-todos">
                      {todoItems.map((it, idx) => (
                        <div key={it.id} className="de-todo">
                          <input
                            type="checkbox"
                            checked={it.done}
                            onChange={(e) => updateTodoItem(idx, { done: e.target.checked })}
                          />
                          <input
                            type="text"
                            className={it.done ? "done" : ""}
                            placeholder="A small, specific step"
                            value={it.text}
                            onChange={(e) => updateTodoItem(idx, { text: e.target.value })}
                          />
                          <input
                            type="date"
                            className="de-todo-date"
                            value={it.due_date ?? ""}
                            onChange={(e) => updateTodoItem(idx, { due_date: e.target.value || null })}
                            title="Due date (optional)"
                          />
                          <button type="button" className="de-todo-x" onClick={() => removeTodoItem(idx)} aria-label="Remove">×</button>
                        </div>
                      ))}
                      <button type="button" className="de-todo-add" onClick={addTodoItem}>+ Add a step</button>
                    </div>
                  </div>
                </div>

                {/* Topical devotional bands — aligned to the same 3-col grid */}
                {(topicalsQ.data ?? []).map((tp) => {
                  const c = topicColor(tp.topic?.color_key);
                  const tint = hexToRgba(c, 0.15);
                  const tagBg = hexToRgba(c, 0.35);
                  const tagName = tp.topic?.name ?? tp.title;
                  const readTeaser = tp.scripture_focus || tp.title;
                  const prayTeaser = tp.pray_prompt || "Pray with this in view.";
                  const todoTeaser = tp.apply_prompt || "Carry this into today.";
                  const go = () => navigate({ to: "/devotionals/focus/$id", params: { id: tp.id } });
                  return (
                    <div key={tp.id} className="de-band" style={{ background: tint }}>
                      <div className="de-band-cell" onClick={go}>
                        <span className="de-band-tag" style={{ background: tagBg }}>{tagName}</span>
                        <span className="de-band-line">{readTeaser} <span style={{ opacity: 0.6 }}>Full guidance →</span></span>
                      </div>
                      <div className="de-band-cell" onClick={go}>
                        <span className="de-band-line">{prayTeaser} <span style={{ opacity: 0.6 }}>Full guidance →</span></span>
                      </div>
                      <div className="de-band-cell" onClick={go}>
                        <span className="de-band-line">{todoTeaser} <span style={{ opacity: 0.6 }}>Full guidance →</span></span>
                      </div>
                    </div>
                  );
                })}
              </div>


              {/* 5. Workspace */}
              <div id="sec-workspace" className="de-anchor">
                <WorkspaceSection
                  userId={userId ?? ""}
                  ensureEntry={ensureEntry}
                  currentEntryId={currentEntry?.id ?? null}
                  isFocused={focusSection === "workspace"}
                  onToggleFocus={() => setFocusSection((cur) => (cur === "workspace" ? null : "workspace"))}
                  focusItemId={search.ws}
                  guest={isGuest}
                  onGuestGate={guestNote}
                  historyEntryId={selectedDate !== todayISO() ? (currentEntry?.id ?? null) : null}
                />
              </div>

            </div>
            </>
            )}

          </>

        )}
      </div>

      <MobileBottomNav />

      {/* keep navigate reference to avoid unused warning */}
      <span style={{ display: "none" }} aria-hidden onClick={() => navigate({ to: "/devotionals" })} />

      {/* Guest preview: soft banner (first type) + hard modal (save/comment) */}
      {isGuest && guestTyped && guestGate !== "save" && (
        <div style={{
          position: "fixed", left: "50%", transform: "translateX(-50%)",
          bottom: 88, zIndex: 500, background: "#181A4D", color: "#DCE07A",
          borderRadius: 999, padding: "10px 18px", boxShadow: "0 10px 30px rgba(24,26,77,0.25)",
          fontFamily: "'Poppins',sans-serif", fontWeight: 600, fontSize: 12.5,
          display: "flex", alignItems: "center", gap: 12, maxWidth: "calc(100vw - 32px)",
        }}>
          <span>Sign in to save this as you go.</span>
          <Link to="/auth" style={{ background: "#DCE07A", color: "#181A4D", padding: "6px 14px", borderRadius: 999, textDecoration: "none", fontWeight: 700 }}>Sign in</Link>
          <button aria-label="Dismiss" onClick={() => setGuestGate(null)} style={{ background: "transparent", border: "none", color: "#DCE07A", cursor: "pointer", fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
        </div>
      )}
      {isGuest && guestGate === "save" && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setGuestGate(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 600, background: "rgba(24,26,77,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 16, padding: "28px 26px",
              maxWidth: 400, width: "100%", fontFamily: "'Poppins',sans-serif",
              boxShadow: "0 20px 60px rgba(24,26,77,0.35)", textAlign: "center",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a8678", marginBottom: 8 }}>Preview mode</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "#181A4D", margin: "0 0 10px" }}>Create an account to save your notes</h3>
            <p style={{ fontSize: 13.5, color: "#5c5847", lineHeight: 1.55, margin: "0 0 20px" }}>
              You're previewing the workspace — anything you've typed lives only on this device and will be lost when you refresh.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <Link to="/auth" className="de-signin" style={{ padding: "10px 22px" }}>Create account</Link>
              <button onClick={() => setGuestGate(null)} style={{ background: "transparent", border: "1px solid rgba(24,26,77,0.2)", color: "#181A4D", padding: "10px 22px", borderRadius: 20, fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>Keep previewing</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// History view (This week / Month) — read-only table of daily entries in range
// ============================================================================

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0=Sun..6=Sat
  const diff = (day + 6) % 7; // days since Monday
  x.setDate(x.getDate() - diff);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function HistoryView({ userId, templateId, range }: { userId: string; templateId: string; range: "week" | "month" }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let days: Date[] = [];
  if (range === "week") {
    const start = startOfWeekMonday(today);
    days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  } else {
    const y = today.getFullYear(), m = today.getMonth();
    const last = new Date(y, m + 1, 0).getDate();
    days = Array.from({ length: last }, (_, i) => new Date(y, m, i + 1));
  }
  const startISO = isoDate(days[0]);
  const endISO = isoDate(days[days.length - 1]);

  const histQ = useQuery({
    queryKey: ["dev-history", userId, range, startISO, endISO],
    queryFn: async () => {
      const [entriesRes, wsRes] = await Promise.all([
        supabase.from("devotional_entries").select("*").eq("user_id", userId)
          .gte("entry_date", startISO).lte("entry_date", endISO),
        supabase.from("workspace_items" as any).select("id,tags,created_at,devotional_entry_id")
          .eq("user_id", userId)
          .gte("created_at", startISO + "T00:00:00")
          .lte("created_at", endISO + "T23:59:59"),
      ]);
      if (entriesRes.error) throw entriesRes.error;
      const entries = (entriesRes.data ?? []) as Entry[];
      const ws = (wsRes.data ?? []) as unknown as Array<{ id: string; tags: string[]; created_at: string; devotional_entry_id: string | null }>;

      const tplIds = Array.from(new Set(entries.map(e => e.template_id).filter(Boolean))) as string[];
      let templates: Template[] = [];
      const topicMap: Record<string, Topic> = {};
      if (tplIds.length) {
        const { data: tpls } = await supabase.from("devotional_templates").select("*").in("id", tplIds);
        templates = (tpls ?? []) as Template[];
        const topicIds = Array.from(new Set(templates.map(t => t.topic_id).filter(Boolean))) as string[];
        if (topicIds.length) {
          const { data: tps } = await supabase.from("topics").select("*").in("id", topicIds);
          (tps ?? []).forEach(tp => { topicMap[tp.id] = tp as Topic; });
        }
      }
      const tplMap: Record<string, Template> = {};
      templates.forEach(t => { tplMap[t.id] = t; });

      return { entries, ws, tplMap, topicMap };
    },
  });

  const data = histQ.data;
  // Aggregate per day.
  const perDay = days.map(d => {
    const iso = isoDate(d);
    const dayEntries = (data?.entries ?? []).filter(e => e.entry_date === iso);
    const dayWs = (data?.ws ?? []).filter(w => (w.created_at ?? "").slice(0, 10) === iso);
    const wsItems = dayWs.map(w => ({ id: w.id, tags: (w.tags ?? []) as string[] }));
    // Pick a representative entry for title: prefer default (Abide) template, else first.
    let representative: Entry | undefined;
    if (data) {
      representative = dayEntries.find(e => e.template_id && data.tplMap[e.template_id]?.is_default) ?? dayEntries[0];
    } else representative = dayEntries[0];
    // Focus tags: one per unique template on that day.
    const focusTags = dayEntries
      .filter(e => !!e.template_id)
      .map(e => {
        const tpl = data?.tplMap[e.template_id as string];
        if (!tpl) return null;
        const topic = tpl.topic_id ? data?.topicMap[tpl.topic_id] ?? null : null;
        const isDaily = !!tpl.is_default;
        const color = topic ? topicColor(topic.color_key) : "#181A4D";
        const name = isDaily ? "daily" : (topic?.name ?? tpl.title);
        return { key: tpl.id, name, isDaily, color };
      })
      .filter(Boolean) as Array<{ key: string; name: string; isDaily: boolean; color: string }>;
    // Dedupe by tpl id
    const seen = new Set<string>();
    const uniqueFocus = focusTags.filter(f => (seen.has(f.key) ? false : (seen.add(f.key), true)));
    // Mood dot: amber if there's any written content, lime if entry exists but empty, none otherwise.
    const hasText = dayEntries.some(e =>
      [e.where_text, e.reflect_text, e.scripture_text, e.pray_text, e.todo_text, e.apply_text, e.entry_title, e.entry_subtitle].some(v => (v ?? "").toString().trim().length > 0)
    );
    const mood = dayEntries.length === 0 ? null : hasText ? "#FFAE00" : "#DCE07A";
    const title = representative?.entry_title?.trim()
      || (representative && (representative.where_text ?? representative.reflect_text ?? "").toString().trim().slice(0, 80))
      || (dayEntries.length ? "Untitled entry" : "");
    const subtitle = representative?.entry_subtitle?.trim() ?? "";
    return { date: d, iso, dayEntries, wsItems, uniqueFocus, mood, title, subtitle };
  });

  const written = perDay.filter(p => p.dayEntries.length > 0).length;
  const isFuture = (d: Date) => d.getTime() > today.getTime();
  const rangeLabel = range === "week" ? "this week" : "this month";
  const summary = `${written} of ${perDay.filter(p => !isFuture(p.date)).length} days ${rangeLabel}. Not a score — a mirror.`;

  const weekday = (d: Date) => d.toLocaleDateString(undefined, { weekday: "short" });
  const monthday = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  const navigate = useNavigate();
  const titleText = range === "week" ? "Covered This Week" : "Covered This Month";
  const subtitleText = range === "week"
    ? "An overview of what you've covered, worked on, and worked through with the Lord over the course of this week."
    : "An overview of what came up continually over the month. Use this recap to help plan a few of your studies and workspaces.";

  return (
    <div>
      <div className="de-headtop" style={{ marginBottom: 6 }}>
        <span className="de-headtitle-brand">Abide</span>
        <span className="de-headarrow">→</span>
        <span className="de-headdate">{range === "week" ? "This week" : "Month"}</span>
      </div>
      <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 27, fontWeight: 700, color: "#181A4D", letterSpacing: "-0.01em", margin: "2px 0 6px" }}>
        {titleText}
      </div>
      <p style={{ fontFamily: "'Poppins',sans-serif", fontSize: 14, color: "#20201C", opacity: 0.65, margin: "0 0 22px", maxWidth: 640 }}>
        {subtitleText}
      </p>

      {histQ.isLoading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#8a8678" }}>Loading…</div>
      ) : (
        <>
          <div className="de-hist-header">
            <div>Day</div><div>Date</div><div>Entry</div><div>Notes</div><div>Focus</div><div>Workspace tags</div><div />
          </div>
          {perDay.map(p => {
            const hasEntry = p.dayEntries.length > 0;
            const future = isFuture(p.date);
            const openRow = () => {
              if (future) return;
              navigate({ to: "/devotionals/$id", params: { id: templateId }, search: { date: p.iso } as any });
            };
            const flatWsTags = p.wsItems.flatMap(w => w.tags.map(t => ({ itemId: w.id, tag: t })));
            return (
              <div
                key={p.iso}
                className={`de-hist-row ${hasEntry ? "" : "empty"}`}
                onClick={openRow}
                role="button"
                tabIndex={future ? -1 : 0}
                onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !future) { e.preventDefault(); openRow(); } }}
                style={future ? { cursor: "default" } : undefined}
              >
                <div>{weekday(p.date)}</div>
                <div>{monthday(p.date)}</div>
                <div>
                  {hasEntry ? (
                    <>
                      <span className="de-hist-mood" style={{ background: p.mood ?? "transparent" }} />
                      <span className="de-hist-name">{p.title || "Untitled entry"}</span>
                    </>
                  ) : (
                    <>
                      <span className="de-hist-mood" style={{ background: "transparent", border: "1px solid rgba(24,26,77,0.12)" }} />
                      <span style={{ color: "#8a8678" }}>— no entry —</span>
                    </>
                  )}
                </div>
                <div>
                  {hasEntry && p.subtitle ? (
                    <span className="de-hist-subtitle">{p.subtitle}</span>
                  ) : (
                    <span className="de-hist-none">—</span>
                  )}
                </div>
                <div className="de-hist-tags">
                  {p.uniqueFocus.length === 0 ? null : p.uniqueFocus.map(f => (
                    f.isDaily ? (
                      <span key={f.key} className="de-hist-tag daily">daily</span>
                    ) : (
                      <span
                        key={f.key}
                        className="de-hist-tag"
                        style={{ background: hexToRgba(f.color, 0.18), color: f.color }}
                      >
                        {f.name}
                      </span>
                    )
                  ))}
                </div>
                <div className="de-hist-tags">
                  {flatWsTags.length === 0 ? (
                    <span className="de-hist-none">none</span>
                  ) : (
                    flatWsTags.map((w, i) => (
                      <Link
                        key={`${w.itemId}-${w.tag}-${i}`}
                        to="/devotionals/$id"
                        params={{ id: templateId }}
                        search={{ date: p.iso, ws: w.itemId } as any}
                        className="de-hist-wstag"
                        onClick={(e) => e.stopPropagation()}
                      >
                        #{w.tag}
                      </Link>
                    ))
                  )}
                </div>
                <div style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                  {future ? (
                    <span className="de-hist-none">—</span>
                  ) : (
                    <Link
                      to="/devotionals/$id"
                      params={{ id: templateId }}
                      search={{ date: p.iso } as any}
                      className="de-hist-open"
                    >
                      {hasEntry ? "open →" : "start →"}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
          <p className="de-streaknote">{summary}</p>
        </>
      )}
    </div>
  );
}


// ============================================================================
// Month calendar view — 7-column grid, static/sample data (wired up later)
// ============================================================================

const MONTH_CAL_CSS = `
.mcal-wrap{font-family:'Poppins',sans-serif;color:#20201C;}
.mcal-nav{display:flex;align-items:center;gap:14px;margin:2px 0 16px;}
.mcal-nav .title{font-family:'Poppins',sans-serif;font-size:24px;font-weight:700;color:#181A4D;letter-spacing:-0.01em;}
.mcal-nav button{width:30px;height:30px;border-radius:50%;border:1px solid #E4DFCF;background:#fff;color:#181A4D;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:inherit;}
.mcal-nav button:hover{border-color:#181A4D;}
.mcal-legend{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;}
.mcal-legend > span{display:inline-flex;align-items:center;gap:6px;font-family:'Poppins',sans-serif;font-size:12px;font-weight:600;color:#181A4D;background:#fff;border:1px solid #E4DFCF;border-radius:999px;padding:6px 12px;}
.mcal-legend .dot{width:8px;height:8px;min-width:8px;min-height:8px;border-radius:50%;display:inline-block;flex-shrink:0;}
.mcal-add-btn{white-space:nowrap;min-width:max-content;flex-shrink:0;}
.mcal-dow{display:grid;grid-template-columns:repeat(7,1fr);margin-bottom:6px;}
.mcal-dow div{text-align:center;font-family:'Poppins',sans-serif;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:#68655C;font-weight:600;}
.mcal-weeks{display:grid;gap:6px;}
.mcal-week{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;}
.mcal-cell{background:#fff;border:1px solid #E4DFCF;border-radius:14px;min-height:96px;padding:10px;position:relative;cursor:pointer;display:flex;flex-direction:column;gap:6px;transition:.15s;font-family:'Poppins',sans-serif;text-align:left;}
.mcal-cell:hover{border-color:#181A4D;}
.mcal-cell.other{opacity:0.35;}
.mcal-cell.today{box-shadow:inset 0 0 0 2px #181A4D;}
.mcal-cell.devo{border-left:4px solid #DCE07A;}
.mcal-cell.topical{border-right:4px solid #0F4A42;}
.mcal-num{font-family:'Poppins',sans-serif;font-size:13.5px;font-weight:700;color:#20201C;}
.mcal-cell.other .mcal-num{color:#68655C;}
.mcal-dots{display:flex;gap:4px;flex-wrap:wrap;}
.mcal-dots .d{width:8px;height:8px;min-width:8px;min-height:8px;border-radius:50%;flex-shrink:0;}
.mcal-note{font-family:'Poppins',sans-serif;font-size:11.5px;color:#68655C;line-height:1.3;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}
@media(max-width:640px){
  .mcal-cell{min-height:64px;padding:6px;border-radius:10px;gap:4px;}
  .mcal-num{font-size:12px;}
  .mcal-note{display:none;}
  .mcal-nav .title{font-size:20px;}
}
`;

// Shared hook: returns Set of ISO dates (YYYY-MM-DD) in [startISO, endISO]
// where the user has ANY content across the 5 devotional sections
// (Where Are You, Read, Pray, To-Do, Workspace) for any template.
function useDevoContentDates(userId: string | null, startISO: string, endISO: string) {
  return useQuery({
    queryKey: ["devo-content-dates", userId, startISO, endISO],
    enabled: !!userId,
    queryFn: async () => {
      const [entriesRes, wsRes] = await Promise.all([
        supabase.from("devotional_entries")
          .select("entry_date, where_text, reflect_text, scripture_text, pray_text, todo_text")
          .eq("user_id", userId!)
          .gte("entry_date", startISO).lte("entry_date", endISO),
        supabase.from("workspace_items" as any)
          .select("created_at, devotional_entry_id, title, content")
          .eq("user_id", userId!)
          .gte("created_at", startISO + "T00:00:00")
          .lte("created_at", endISO + "T23:59:59"),
      ]);
      const dates = new Set<string>();
      const nonEmpty = (v: unknown) => typeof v === "string" && v.trim().length > 0;
      for (const e of (entriesRes.data ?? []) as any[]) {
        const where = nonEmpty(e.where_text) || nonEmpty(e.reflect_text);
        if (where || nonEmpty(e.scripture_text) || nonEmpty(e.pray_text) || nonEmpty(e.todo_text)) {
          dates.add(e.entry_date);
        }
      }
      for (const w of (wsRes.data ?? []) as any[]) {
        if (nonEmpty(w.title) || nonEmpty(w.content)) {
          dates.add((w.created_at ?? "").slice(0, 10));
        }
      }
      dates.delete("");
      return dates;
    },
  });
}

// Returns Map of ISO date -> topic name for any entry whose template has a topic.
function useTopicalDates(userId: string | null, startISO: string, endISO: string) {
  return useQuery({
    queryKey: ["topical-dates", userId, startISO, endISO],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("devotional_entries")
        .select("entry_date, devotional_templates!inner(topic_id, topics(name))")
        .eq("user_id", userId!)
        .gte("entry_date", startISO).lte("entry_date", endISO)
        .not("devotional_templates.topic_id", "is", null);
      const map = new Map<string, string>();
      for (const row of (data ?? []) as any[]) {
        const name = row.devotional_templates?.topics?.name;
        if (name && row.entry_date) map.set(row.entry_date, name);
      }
      return map;
    },
  });
}

// ============================================================================
// User events (Prayer meeting, Bible study, Mentor meeting, Other)
// ============================================================================

type UserEventType = "prayer_meeting" | "bible_study" | "mentor_meeting" | "other";
type UserEvent = {
  id: string;
  event_date: string;
  event_type: UserEventType;
  title: string | null;
  color: string;
  notes: string | null;
};

const EVENT_TYPE_META: Record<Exclude<UserEventType, "other">, { label: string; color: string }> = {
  prayer_meeting: { label: "Prayer meeting", color: "#E990A2" },
  bible_study: { label: "Bible study", color: "#FFAE00" },
  mentor_meeting: { label: "Mentor meeting", color: "#8A96E0" },
};

const OTHER_COLOR_SWATCHES: { name: string; value: string }[] = [
  { name: "Navy", value: "#181A4D" },
  { name: "Teal", value: "#0F4A42" },
  { name: "Amber", value: "#FFAE00" },
  { name: "Periwinkle", value: "#8A96E0" },
  { name: "Blush", value: "#E990A2" },
  { name: "Limelight", value: "#DCE07A" },
  { name: "Apple red", value: "#FF3B30" },
  { name: "Neon yellow", value: "#EEFF00" },
  { name: "Gray", value: "#9B9B93" },
];
const OTHER_DEFAULT_COLOR = "#9B9B93";

function eventDisplayLabel(ev: UserEvent): string {
  if (ev.event_type === "other") return ev.title?.trim() || "Event";
  return EVENT_TYPE_META[ev.event_type].label;
}

// Light background colors that need navy text (and rectangular tile) on Week/Month.
const LIGHT_EVENT_BGS = new Set(["#DCE07A", "#EEFF00", "#CAC307", "#FBF8ED"].map(s => s.toUpperCase()));
function isLightEventBg(hex: string): boolean {
  return LIGHT_EVENT_BGS.has((hex || "").toUpperCase());
}

// Returns Map of ISO date -> count of to-do items due on that date (across all entries).
function useTodoDueDates(userId: string | null, startISO: string, endISO: string) {
  return useQuery({
    queryKey: ["todo-due-dates", userId, startISO, endISO],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devotional_entries")
        .select("todo_items")
        .eq("user_id", userId!)
        .not("todo_items", "is", null);
      if (error) throw error;
      const map = new Map<string, number>();
      for (const row of (data ?? []) as any[]) {
        const items = Array.isArray(row.todo_items) ? row.todo_items : [];
        for (const it of items) {
          const d = typeof it?.due_date === "string" ? it.due_date : null;
          if (!d || d < startISO || d > endISO) continue;
          map.set(d, (map.get(d) ?? 0) + 1);
        }
      }
      return map;
    },
  });
}

function useUserEvents(userId: string | null, startISO: string, endISO: string) {
  return useQuery({
    queryKey: ["user-events", userId, startISO, endISO],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_events" as any)
        .select("id,event_date,event_type,title,color,notes")
        .eq("user_id", userId!)
        .gte("event_date", startISO)
        .lte("event_date", endISO)
        .order("event_date", { ascending: true });
      if (error) throw error;
      const map = new Map<string, UserEvent[]>();
      for (const row of (data ?? []) as unknown as UserEvent[]) {
        const arr = map.get(row.event_date) ?? [];
        arr.push(row);
        map.set(row.event_date, arr);
      }
      return map;
    },
  });
}

function AddEventDialog({
  open, onOpenChange, userId, defaultDate, event, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string | null;
  defaultDate: string;
  event?: UserEvent | null;
  onSaved: () => void;
}) {
  const isEdit = !!event;
  const [date, setDate] = useState(defaultDate);
  const [type, setType] = useState<UserEventType>("prayer_meeting");
  const [title, setTitle] = useState("");
  const [color, setColor] = useState<string>(OTHER_DEFAULT_COLOR);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (event) {
      setDate(event.event_date);
      setType(event.event_type);
      setTitle(event.title ?? "");
      setColor(event.color || OTHER_DEFAULT_COLOR);
      setNotes(event.notes ?? "");
    } else {
      setDate(defaultDate);
      setType("prayer_meeting");
      setTitle("");
      setColor(OTHER_DEFAULT_COLOR);
      setNotes("");
    }
    setErr(null);
  }, [open, defaultDate, event]);

  const isOther = type === "other";
  const resolvedColor = isOther ? color : EVENT_TYPE_META[type].color;

  const save = async () => {
    if (!userId) { setErr("Please sign in to save events."); return; }
    if (isOther && !title.trim()) { setErr("Add a name for this event."); return; }
    setSaving(true); setErr(null);
    const payload = {
      event_date: date,
      event_type: type,
      title: isOther ? title.trim() : null,
      color: resolvedColor,
      notes: notes.trim() || null,
    };
    let error;
    if (isEdit && event) {
      ({ error } = await supabase.from("user_events" as any).update(payload).eq("id", event.id));
    } else {
      ({ error } = await supabase.from("user_events" as any).insert({ user_id: userId, ...payload }));
    }
    setSaving(false);
    if (error) { setErr(error.message); return; }
    onSaved();
    onOpenChange(false);
  };

  const remove = async () => {
    if (!event) return;
    if (!confirm("Delete this event?")) return;
    setDeleting(true); setErr(null);
    const { error } = await supabase.from("user_events" as any).delete().eq("id", event.id);
    setDeleting(false);
    if (error) { setErr(error.message); return; }
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]" style={{ fontFamily: "'Poppins',sans-serif" }}>
        <DialogHeader>
          <DialogTitle style={{ color: "#181A4D", fontWeight: 700 }}>{isEdit ? "Edit event" : "Add new event"}</DialogTitle>
        </DialogHeader>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 600, color: "#181A4D" }}>
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              style={{ padding: "10px 12px", border: "1px solid #E4DFCF", borderRadius: 10, fontFamily: "inherit", fontSize: 14 }} />
          </label>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#181A4D" }}>Event type</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {([
                ["prayer_meeting", "Prayer meeting", "#E990A2"],
                ["bible_study", "Bible study", "#FFAE00"],
                ["mentor_meeting", "Mentor meeting", "#8A96E0"],
                ["other", "Other", "#9B9B93"],
              ] as const).map(([val, label, sw]) => {
                const active = type === val;
                return (
                  <button key={val} type="button" onClick={() => setType(val)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "10px 12px", borderRadius: 10,
                      border: active ? `2px solid #181A4D` : "1px solid #E4DFCF",
                      background: "#fff", cursor: "pointer",
                      fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: "#181A4D",
                      textAlign: "left",
                    }}>
                    <span style={{ width: 12, height: 12, borderRadius: 999, background: sw, flex: "none" }} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {isOther && (
            <>
              <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 600, color: "#181A4D" }}>
                Name
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Concert, Retreat"
                  style={{ padding: "10px 12px", border: "1px solid #E4DFCF", borderRadius: 10, fontFamily: "inherit", fontSize: 14 }} />
              </label>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#181A4D", marginBottom: 6 }}>Color</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {OTHER_COLOR_SWATCHES.map(sw => {
                    const active = color === sw.value;
                    return (
                      <button key={sw.value} type="button" aria-label={sw.name}
                        onClick={() => setColor(sw.value)}
                        style={{
                          width: 28, height: 28, borderRadius: 999,
                          background: sw.value, cursor: "pointer",
                          border: active ? "2px solid #181A4D" : "1px solid #E4DFCF",
                          boxShadow: active ? "0 0 0 2px #fff inset" : "none",
                        }} />
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 600, color: "#181A4D" }}>
            Details <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              rows={3}
              style={{ padding: "10px 12px", border: "1px solid #E4DFCF", borderRadius: 10, fontFamily: "inherit", fontSize: 14, resize: "vertical" }} />
          </label>

          {err && <div style={{ color: "#FF3B30", fontSize: 13 }}>{err}</div>}

          <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
            <div>
              {isEdit && (
                <button type="button" onClick={remove} disabled={deleting || saving}
                  style={{ padding: "10px 16px", borderRadius: 999, border: "1.5px solid #FF3B30", background: "#fff", color: "#FF3B30", cursor: deleting ? "wait" : "pointer", fontFamily: "inherit", fontWeight: 700 }}>
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => onOpenChange(false)}
                style={{ padding: "10px 16px", borderRadius: 999, border: "1px solid #E4DFCF", background: "#fff", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, color: "#181A4D" }}>
                Cancel
              </button>
              <button type="button" onClick={save} disabled={saving || deleting}
                style={{ padding: "10px 18px", borderRadius: 999, border: "none", background: "#181A4D", color: "#fff", cursor: saving ? "wait" : "pointer", fontFamily: "inherit", fontWeight: 700 }}>
                {saving ? "Saving…" : isEdit ? "Save changes" : "Add event"}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Today events banner — soft-tinted chips (Today's visual language)
// ============================================================================


function TodayEventsBanner({ userId, dateISO }: { userId: string | null; dateISO: string }) {
  const qc = useQueryClient();
  const eventsQ = useUserEvents(userId, dateISO, dateISO);
  const events = eventsQ.data?.get(dateISO) ?? [];
  const [addOpen, setAddOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<UserEvent | null>(null);
  const onSaved = () => qc.invalidateQueries({ queryKey: ["user-events"] });

  if (!userId) return null;
  if (events.length === 0) {
    // Still show a compact "+ Add" affordance so users can add from Today.
    return (
      <>
        <div style={{ margin: "0 0 18px" }}>
          <button type="button" onClick={() => setAddOpen(true)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 999, background: "#fff",
              border: "1.5px dashed #E4DFCF", color: "#68655C",
              fontFamily: "'Poppins',sans-serif", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
            }}>
            + Add event today
          </button>
        </div>
        <AddEventDialog open={addOpen} onOpenChange={setAddOpen} userId={userId} defaultDate={dateISO} onSaved={onSaved} />
      </>
    );
  }

  return (
    <div style={{ margin: "0 0 20px" }}>
      <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#68655C", marginBottom: 8 }}>
        {events.length} thing{events.length === 1 ? "" : "s"} today
      </div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2, scrollbarWidth: "none" }}>
        {events.map(ev => (
          <button key={ev.id} type="button" onClick={() => setEditEvent(ev)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "7px 14px", borderRadius: 999,
              background: hexToRgba(ev.color, 0.2),
              border: `2px solid ${ev.color}`,
              color: "#181A4D",
              fontFamily: "'Poppins',sans-serif", fontSize: 12.5, fontWeight: 700,
              whiteSpace: "nowrap", flex: "none", cursor: "pointer",
            }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: ev.color, flex: "none" }} />
            {eventDisplayLabel(ev)}
          </button>
        ))}
        <button type="button" onClick={() => setAddOpen(true)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 14px", borderRadius: 999, background: "#fff",
            border: "1.5px dashed #E4DFCF", color: "#68655C",
            fontFamily: "'Poppins',sans-serif", fontSize: 12.5, fontWeight: 700,
            flex: "none", cursor: "pointer",
          }}>
          + Add
        </button>
      </div>
      <AddEventDialog open={addOpen} onOpenChange={setAddOpen} userId={userId} defaultDate={dateISO} onSaved={onSaved} />
      <AddEventDialog open={!!editEvent} onOpenChange={(v) => { if (!v) setEditEvent(null); }} userId={userId}
        defaultDate={editEvent?.event_date ?? dateISO} event={editEvent} onSaved={onSaved} />
    </div>
  );
}

// ============================================================================
// Plan-this-day dialog — writes Read/Pray/To-Do straight into that day's
// devotional_entries row (creating the row if needed). Used by future-day
// "+ Plan" on This Week.
// ============================================================================

function PlanDayDialog({
  open, onOpenChange, userId, templateId, defaultDate, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string | null;
  templateId: string;
  defaultDate: string;
  onSaved: () => void;
}) {
  const [scriptureRef, setScriptureRef] = useState("");
  const [scriptureText, setScriptureText] = useState("");
  const [prayText, setPrayText] = useState("");
  const [todoText, setTodoText] = useState("");
  const [items, setItems] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !userId) return;
    let alive = true;
    setLoading(true); setErr(null);
    (async () => {
      const { data, error } = await supabase
        .from("devotional_entries")
        .select("scripture_reference, scripture_text, pray_text, todo_text, todo_items")
        .eq("user_id", userId).eq("template_id", templateId).eq("entry_date", defaultDate)
        .maybeSingle();
      if (!alive) return;
      if (error) setErr(error.message);
      const e = data as any;
      setScriptureRef(e?.scripture_reference ?? "");
      setScriptureText(e?.scripture_text ?? "");
      setPrayText(e?.pray_text ?? "");
      setTodoText(e?.todo_text ?? "");
      setItems(Array.isArray(e?.todo_items) ? (e.todo_items as TodoItem[]) : []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [open, userId, templateId, defaultDate]);

  const addItem = () =>
    setItems((cur) => [...cur, { id: crypto.randomUUID(), text: "", done: false, due_date: defaultDate }]);
  const updateItem = (idx: number, patch: Partial<TodoItem>) =>
    setItems((cur) => cur.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const removeItem = (idx: number) =>
    setItems((cur) => cur.filter((_, i) => i !== idx));

  const save = async () => {
    if (!userId) { setErr("Please sign in to plan this day."); return; }
    setSaving(true); setErr(null);
    const cleaned = items.filter((it) => it.text.trim().length > 0)
      .map((it) => ({ ...it, due_date: it.due_date ?? defaultDate }));
    const patch = {
      scripture_reference: scriptureRef,
      scripture_text: scriptureText,
      pray_text: prayText,
      todo_text: todoText,
      todo_items: cleaned,
    };
    const { data: existing } = await supabase
      .from("devotional_entries").select("id")
      .eq("user_id", userId).eq("template_id", templateId).eq("entry_date", defaultDate)
      .maybeSingle();
    const res = existing?.id
      ? await supabase.from("devotional_entries").update(patch as any).eq("id", existing.id)
      : await supabase.from("devotional_entries").insert({
          user_id: userId, template_id: templateId, entry_date: defaultDate, ...patch,
        } as any);
    setSaving(false);
    if (res.error) { setErr(res.error.message); return; }
    onSaved();
    onOpenChange(false);
  };

  const dateLabel = new Date(defaultDate + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const fieldLabel: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#181A4D" };
  const input: React.CSSProperties = { padding: "10px 12px", border: "1px solid #E4DFCF", borderRadius: 10, fontFamily: "inherit", fontSize: 14, width: "100%" };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]" style={{ fontFamily: "'Poppins',sans-serif", maxHeight: "90vh", overflowY: "auto" }}>
        <DialogHeader>
          <DialogTitle style={{ color: "#181A4D", fontWeight: 700 }}>Plan this day</DialogTitle>
          <div style={{ fontSize: 13, color: "#68655C", marginTop: 2 }}>{dateLabel}</div>
        </DialogHeader>
        {loading ? (
          <div style={{ padding: 20, color: "#68655C", fontSize: 14 }}>Loading…</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={fieldLabel}>Read</div>
              <input type="text" placeholder="What scripture will you read?"
                value={scriptureRef} onChange={(e) => setScriptureRef(e.target.value)} style={input} />
              <textarea rows={3} placeholder="What do you want to notice? Any prompts?"
                value={scriptureText} onChange={(e) => setScriptureText(e.target.value)}
                style={{ ...input, resize: "vertical" }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={fieldLabel}>Pray</div>
              <textarea rows={4} placeholder="What do you want to bring to God on this day?"
                value={prayText} onChange={(e) => setPrayText(e.target.value)}
                style={{ ...input, resize: "vertical" }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={fieldLabel}>To-Do</div>
              <textarea rows={3} placeholder="What are you being called to do on this day?"
                value={todoText} onChange={(e) => setTodoText(e.target.value)}
                style={{ ...input, resize: "vertical" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                {items.map((it, idx) => (
                  <div key={it.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input type="checkbox" checked={it.done}
                      onChange={(e) => updateItem(idx, { done: e.target.checked })} />
                    <input type="text" placeholder="A small, specific step"
                      value={it.text} onChange={(e) => updateItem(idx, { text: e.target.value })}
                      style={{ ...input, flex: 1 }} />
                    <button type="button" onClick={() => removeItem(idx)} aria-label="Remove"
                      style={{ border: "none", background: "transparent", color: "#8a8678", fontSize: 20, cursor: "pointer", padding: "0 6px" }}>×</button>
                  </div>
                ))}
                <button type="button" onClick={addItem}
                  style={{ alignSelf: "flex-start", background: "transparent", border: "1px dashed #8A96E0", color: "#8A96E0", padding: "6px 12px", borderRadius: 999, fontFamily: "inherit", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                  + Add a check-off step
                </button>
              </div>
            </div>

            {err && <div style={{ color: "#FF3B30", fontSize: 13 }}>{err}</div>}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
              <button type="button" onClick={() => onOpenChange(false)}
                style={{ padding: "10px 16px", borderRadius: 999, border: "1px solid #E4DFCF", background: "#fff", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, color: "#181A4D" }}>
                Cancel
              </button>
              <button type="button" onClick={save} disabled={saving}
                style={{ padding: "10px 18px", borderRadius: 999, border: "none", background: "#181A4D", color: "#fff", cursor: saving ? "wait" : "pointer", fontFamily: "inherit", fontWeight: 700 }}>
                {saving ? "Saving…" : "Save plan"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// New-to-do dialog — adds a single check-off to-do to a chosen date's entry.
// Item is appended to that day's todo_items with due_date=that day, so it
// surfaces at the top of that day's To-Do section like any planned-ahead item.
// ============================================================================

function NewTodoDialog({
  open, onOpenChange, userId, templateId, defaultDate, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string | null;
  templateId: string;
  defaultDate: string;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(defaultDate);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setDate(defaultDate); setText(""); setErr(null); }
  }, [open, defaultDate]);

  const save = async () => {
    if (!userId) { setErr("Please sign in to add a to-do."); return; }
    if (!text.trim()) { setErr("Add what you want to do."); return; }
    setSaving(true); setErr(null);
    const { data: existing } = await supabase
      .from("devotional_entries").select("id, todo_items")
      .eq("user_id", userId).eq("template_id", templateId).eq("entry_date", date)
      .maybeSingle();
    const newItem: TodoItem = { id: crypto.randomUUID(), text: text.trim(), done: false, due_date: date };
    let res;
    if (existing?.id) {
      const cur = Array.isArray((existing as any).todo_items) ? ((existing as any).todo_items as TodoItem[]) : [];
      res = await supabase.from("devotional_entries").update({ todo_items: [...cur, newItem] } as any).eq("id", existing.id);
    } else {
      res = await supabase.from("devotional_entries").insert({
        user_id: userId, template_id: templateId, entry_date: date, todo_items: [newItem],
      } as any);
    }
    setSaving(false);
    if (res.error) { setErr(res.error.message); return; }
    onSaved();
    onOpenChange(false);
  };

  const input: React.CSSProperties = { padding: "10px 12px", border: "1px solid #E4DFCF", borderRadius: 10, fontFamily: "inherit", fontSize: 14 };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]" style={{ fontFamily: "'Poppins',sans-serif" }}>
        <DialogHeader>
          <DialogTitle style={{ color: "#181A4D", fontWeight: 700 }}>New to-do</DialogTitle>
        </DialogHeader>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 600, color: "#181A4D" }}>
            What are you going to do?
            <input type="text" value={text} onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Text mom, Reach out to Sarah" style={input} autoFocus />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 600, color: "#181A4D" }}>
            Due date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={input} />
          </label>
          {err && <div style={{ color: "#FF3B30", fontSize: 13 }}>{err}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" onClick={() => onOpenChange(false)}
              style={{ padding: "10px 16px", borderRadius: 999, border: "1px solid #E4DFCF", background: "#fff", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, color: "#181A4D" }}>
              Cancel
            </button>
            <button type="button" onClick={save} disabled={saving}
              style={{ padding: "10px 18px", borderRadius: 999, border: "none", background: "#181A4D", color: "#fff", cursor: saving ? "wait" : "pointer", fontFamily: "inherit", fontWeight: 700 }}>
              {saving ? "Saving…" : "Add to-do"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Static sample data — topical + notes still sample; devo tag now live.
const SAMPLE_TOPICAL_DAYS = new Set([21,22,23,24,25,29,30,31]);
const SAMPLE_NOTES: Record<number, string> = {
  3: "Rooted — Day 3",
  9: "Still Waters — Day 9",
  15: "Held — Day 15",
  22: "Marriage — Day 2",
  29: "Motherhood — Day 1",
};

export function MonthCalendarView({ templateId, userId }: { templateId: string; userId: string | null }) {
  const navigate = useNavigate();
  const todayD = new Date(); todayD.setHours(0, 0, 0, 0);
  const [cursor, setCursor] = useState<{ y: number; m: number }>(() => ({ y: todayD.getFullYear(), m: todayD.getMonth() }));

  const first = new Date(cursor.y, cursor.m, 1);
  const startDow = first.getDay(); // 0=Sun..6=Sat, mockup uses Sun-start
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const prevMonthDays = new Date(cursor.y, cursor.m, 0).getDate();

  // Build 6 weeks x 7 = 42 cells.
  type Cell = { date: Date; iso: string; inMonth: boolean; dayNum: number };
  const cells: Cell[] = [];
  for (let i = 0; i < 42; i++) {
    const offset = i - startDow;
    const date = new Date(cursor.y, cursor.m, 1 + offset);
    cells.push({
      date,
      iso: isoDate(date),
      inMonth: date.getMonth() === cursor.m,
      dayNum: date.getDate(),
    });
  }
  const weeks: Cell[][] = [];
  for (let w = 0; w < 6; w++) weeks.push(cells.slice(w * 7, w * 7 + 7));
  // Trim trailing all-other-month week if unused.
  while (weeks.length > 4 && weeks[weeks.length - 1].every(c => !c.inMonth)) weeks.pop();

  const rangeStartISO = cells[0].iso;
  const rangeEndISO = cells[cells.length - 1].iso;
  const devoDatesQ = useDevoContentDates(userId, rangeStartISO, rangeEndISO);
  const devoDates = devoDatesQ.data ?? new Set<string>();
  const topicalQ = useTopicalDates(userId, rangeStartISO, rangeEndISO);
  const topicalMap = topicalQ.data ?? new Map<string, string>();
  const eventsQ = useUserEvents(userId, rangeStartISO, rangeEndISO);
  const eventsMap = eventsQ.data ?? new Map<string, UserEvent[]>();
  const todoDueQ = useTodoDueDates(userId, rangeStartISO, rangeEndISO);
  const todoDueMap = todoDueQ.data ?? new Map<string, number>();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [addDate, setAddDate] = useState<string>(isoDate(todayD));
  const [editEvent, setEditEvent] = useState<UserEvent | null>(null);
  const [todoOpen, setTodoOpen] = useState(false);
  const [todoDate, setTodoDate] = useState<string>(isoDate(todayD));

  const monthTitle = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const dowLabels = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  void prevMonthDays; // reserved

  const isToday = (d: Date) =>
    d.getFullYear() === todayD.getFullYear() && d.getMonth() === todayD.getMonth() && d.getDate() === todayD.getDate();

  const openDay = (c: Cell) => {
    if (c.date.getTime() > todayD.getTime()) return;
    navigate({ to: "/devotionals/$id", params: { id: templateId }, search: { date: c.iso } as any });
  };

  return (
    <div className="mcal-wrap">
      <style dangerouslySetInnerHTML={{ __html: MONTH_CAL_CSS }} />

      <div className="de-headtop" style={{ marginBottom: 6 }}>
        <span className="de-headtitle-brand">Abide</span>
        <span className="de-headarrow">→</span>
        <span className="de-headdate">Month</span>
      </div>
      <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 27, fontWeight: 700, color: "#181A4D", letterSpacing: "-0.01em", margin: "2px 0 6px" }}>
        Covered This Month
      </div>
      <p style={{ fontFamily: "'Poppins',sans-serif", fontSize: 14, color: "#20201C", opacity: 0.65, margin: "0 0 18px", maxWidth: 640 }}>
        An overview of what came up continually over the month. Use this recap to help plan a few of your studies and workspaces.
      </p>

      <div className="mcal-nav" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button aria-label="Previous month" onClick={() => setCursor(c => ({ y: c.m === 0 ? c.y - 1 : c.y, m: (c.m + 11) % 12 }))}>‹</button>
          <div className="title">{monthTitle}</div>
          <button aria-label="Next month" onClick={() => setCursor(c => ({ y: c.m === 11 ? c.y + 1 : c.y, m: (c.m + 1) % 12 }))}>›</button>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button type="button" className="mcal-add-btn" onClick={() => { setTodoDate(isoDate(todayD)); setTodoOpen(true); }}
            style={{ width: "auto", padding: "6px 14px", borderRadius: 999, border: "1px solid #181A4D", background: "#fff", color: "#181A4D", fontFamily: "'Poppins',sans-serif", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", minWidth: "max-content", flexShrink: 0 }}>
            + New To-Do
          </button>
          <button type="button" className="mcal-add-btn" onClick={() => { setAddDate(isoDate(todayD)); setAddOpen(true); }}
            style={{ width: "auto", padding: "6px 14px", borderRadius: 999, border: "1px solid #181A4D", background: "#181A4D", color: "#fff", fontFamily: "'Poppins',sans-serif", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", minWidth: "max-content", flexShrink: 0 }}>
            + New Event
          </button>
        </div>
      </div>

      <div className="mcal-legend">
        <span><span className="dot" style={{ background: "#DCE07A" }} /> Daily devotional</span>
        <span><span className="dot" style={{ background: "#0F4A42" }} /> Topical devotional</span>
      </div>

      <div className="mcal-dow">{dowLabels.map(d => <div key={d}>{d}</div>)}</div>

      <div className="mcal-weeks">
        {weeks.map((week, wi) => (
          <div key={wi} className="mcal-week">
            {week.map(c => {
              // Devo + topical tags are live; note preview still sample.
              const isCurrentRealMonth = c.date.getFullYear() === todayD.getFullYear() && c.date.getMonth() === todayD.getMonth();
              const hasDevo = devoDates.has(c.iso);
              const topicalName = topicalMap.get(c.iso);
              const hasTopical = !!topicalName;
              const note = topicalName ?? (c.inMonth && isCurrentRealMonth ? SAMPLE_NOTES[c.dayNum] : undefined);
              const cls = [
                "mcal-cell",
                c.inMonth ? "" : "other",
                isToday(c.date) ? "today" : "",
                hasDevo ? "devo" : "",
                hasTopical ? "topical" : "",
              ].filter(Boolean).join(" ");
              return (
                <button
                  type="button"
                  key={c.iso}
                  className={cls}
                  onClick={() => openDay(c)}
                >
                  <div className="mcal-num">{c.dayNum}</div>
                  {(hasDevo || hasTopical) && (
                    <div className="mcal-dots">
                      {hasDevo && <span className="d" style={{ background: "#DCE07A" }} />}
                      {hasTopical && <span className="d" style={{ background: "#0F4A42" }} />}
                    </div>
                  )}
                  {note && <div className="mcal-note">{note}</div>}
                  {(eventsMap.get(c.iso) ?? []).length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 4, alignItems: "flex-start" }}>
                      {(eventsMap.get(c.iso) ?? []).slice(0, 3).map(ev => {
                        const light = isLightEventBg(ev.color);
                        const fg = light ? "#181A4D" : "#fff";
                        return (
                        <span key={ev.id} title={eventDisplayLabel(ev)} role="button" tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); setEditEvent(ev); }}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setEditEvent(ev); } }}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 4, maxWidth: "100%", overflow: "hidden", whiteSpace: "nowrap",
                            padding: "2px 8px", borderRadius: light ? 6 : 999, background: ev.color,
                            color: fg, fontFamily: "'Poppins',sans-serif", fontSize: 10, fontWeight: 700,
                            cursor: "pointer",
                          }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: fg, flexShrink: 0, display: "inline-block" }} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{eventDisplayLabel(ev)}</span>
                        </span>
                        );
                      })}
                    </div>
                  )}
                  {(todoDueMap.get(c.iso) ?? 0) > 0 && (
                    <div style={{ marginTop: 4 }}>
                      <span title={`${todoDueMap.get(c.iso)} to-do${todoDueMap.get(c.iso)! > 1 ? "s" : ""} due — tap to open`}
                        style={{
                          display: "inline-block", padding: "2px 8px", borderRadius: 999,
                          background: "#8A96E0", color: "#fff",
                          fontFamily: "'Poppins',sans-serif", fontSize: 10, fontWeight: 700,
                        }}>
                        {todoDueMap.get(c.iso)} to-do{todoDueMap.get(c.iso)! > 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <AddEventDialog open={addOpen} onOpenChange={setAddOpen} userId={userId} defaultDate={addDate}
        onSaved={() => qc.invalidateQueries({ queryKey: ["user-events"] })} />
      <AddEventDialog open={!!editEvent} onOpenChange={(v) => { if (!v) setEditEvent(null); }} userId={userId}
        defaultDate={editEvent?.event_date ?? isoDate(todayD)} event={editEvent}
        onSaved={() => qc.invalidateQueries({ queryKey: ["user-events"] })} />
      <NewTodoDialog open={todoOpen} onOpenChange={setTodoOpen} userId={userId} templateId={templateId} defaultDate={todoDate}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["todo-due-dates"] });
          qc.invalidateQueries({ queryKey: ["dev-entries"] });
          qc.invalidateQueries({ queryKey: ["devo-content-dates"] });
        }} />
    </div>
  );
}

// ============================================================================
// Week list view — one row per day, static/sample data (wired up later)
// ============================================================================

const WEEK_LIST_CSS = `
.wlist-wrap{font-family:'Poppins',sans-serif;color:#20201C;}
.wlist-nav{display:flex;align-items:center;gap:14px;margin:2px 0 16px;}
.wlist-nav .title{font-family:'Poppins',sans-serif;font-size:24px;font-weight:700;color:#181A4D;letter-spacing:-0.01em;}
.wlist-nav button{width:30px;height:30px;border-radius:50%;border:1px solid #E4DFCF;background:#fff;color:#181A4D;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:inherit;}
.wlist-nav button:hover{border-color:#181A4D;}
.wlist-legend{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;}
.wlist-legend > span{display:inline-flex;align-items:center;gap:6px;font-family:'Poppins',sans-serif;font-size:12px;font-weight:600;color:#181A4D;background:#fff;border:1px solid #E4DFCF;border-radius:999px;padding:6px 12px;}
.wlist-legend .dot{width:8px;height:8px;min-width:8px;min-height:8px;border-radius:50%;display:inline-block;flex-shrink:0;}
.wlist-add-btn{white-space:nowrap;min-width:max-content;flex-shrink:0;}
.wlist{display:flex;flex-direction:column;gap:10px;}
.wl-day{background:#fff;border:1px solid #E4DFCF;border-radius:16px;padding:16px 18px;display:grid;grid-template-columns:64px 1fr auto;gap:14px;align-items:start;font-family:'Poppins',sans-serif;}
.wl-day.today{box-shadow:inset 0 0 0 2px #181A4D;}
.wl-day.devo{border-left:4px solid #DCE07A;}
.wl-day.topical{border-right:4px solid #0F4A42;}
.wl-date{text-align:center;}
.wl-date .dow{font-family:'Poppins',sans-serif;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:#68655C;font-weight:700;}
.wl-date .num{font-family:'Poppins',sans-serif;font-size:24px;font-weight:700;color:#181A4D;}
.wl-body{display:flex;flex-direction:column;gap:9px;min-width:0;}
.wl-tags{display:flex;gap:6px;flex-wrap:wrap;}
.wl-tag{font-family:'Poppins',sans-serif;font-size:11px;font-weight:700;padding:5px 11px;border-radius:8px;display:inline-flex;align-items:center;gap:5px;line-height:1.4;}
.wl-tag .tdot{width:6px;height:6px;min-width:6px;min-height:6px;border-radius:50%;flex-shrink:0;}
.wl-tag.devo{background:#DCE07A;color:#181A4D;}
.wl-tag.topical{background:#0F4A42;color:#fff;}
.wl-tag.empty{background:rgba(32,32,28,0.05);color:#a8a396;font-weight:600;}
.wl-note{width:100%;border:1px dashed #E4DFCF;border-radius:10px;padding:9px 11px;font-family:'Poppins',sans-serif;font-size:14px;color:#20201C;background:transparent;min-height:34px;}
.wl-note::placeholder{color:#a8a396;}
.wl-actions{display:flex;flex-direction:column;gap:6px;align-items:flex-end;}
.wl-link{font-family:'Poppins',sans-serif;font-size:11.5px;font-weight:600;color:#181A4D;background:none;border:none;cursor:pointer;padding:0;text-decoration:underline;text-underline-offset:2px;}
.wl-chip{font-family:'Poppins',sans-serif;font-size:11px;color:#68655C;border:1px solid #E4DFCF;background:#fff;border-radius:999px;padding:4px 10px;cursor:pointer;}
@media(max-width:520px){
  .wl-day{grid-template-columns:48px 1fr;padding:14px;}
  .wl-actions{grid-column:1/-1;flex-direction:row;justify-content:flex-end;align-items:center;}
  .wlist-nav .title{font-size:18px;}
  .wlist-nav{gap:10px;}
  .wlist-nav > div:first-child{gap:10px;}
}
`;

// Static sample data — topical + notes still sample; devo tag now live.
const SAMPLE_WEEK_TOPICAL: Record<number, string> = {
  21: "Marriage", 22: "Marriage", 23: "Marriage", 24: "Marriage", 25: "Marriage",
  29: "Motherhood", 30: "Motherhood", 31: "Motherhood",
};
const SAMPLE_WEEK_NOTES: Record<number, string> = {
  3: "Ask Maya about the retreat dates.",
  16: "Slow morning — no calls before 9.",
};

function startOfWeekSunday(d: Date): Date {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

export function WeekListView({ templateId, userId }: { templateId: string; userId: string | null }) {
  const navigate = useNavigate();
  const todayD = new Date(); todayD.setHours(0, 0, 0, 0);
  const [anchor, setAnchor] = useState<Date>(() => startOfWeekSunday(todayD));

  const days: Date[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(anchor); d.setDate(anchor.getDate() + i); return d;
  });
  const endD = days[6];

  const devoDatesQ = useDevoContentDates(userId, isoDate(anchor), isoDate(endD));
  const devoDates = devoDatesQ.data ?? new Set<string>();
  const topicalQ = useTopicalDates(userId, isoDate(anchor), isoDate(endD));
  const topicalMap = topicalQ.data ?? new Map<string, string>();
  const eventsQ = useUserEvents(userId, isoDate(anchor), isoDate(endD));
  const eventsMap = eventsQ.data ?? new Map<string, UserEvent[]>();
  const todoDueQ = useTodoDueDates(userId, isoDate(anchor), isoDate(endD));
  const todoDueMap = todoDueQ.data ?? new Map<string, number>();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [addDate, setAddDate] = useState<string>(isoDate(todayD));
  const [editEvent, setEditEvent] = useState<UserEvent | null>(null);
  const [todoOpen, setTodoOpen] = useState(false);
  const [todoDate, setTodoDate] = useState<string>(isoDate(todayD));
  const [planOpen, setPlanOpen] = useState(false);
  const [planDate, setPlanDate] = useState<string>(isoDate(todayD));

  const monthShort = (d: Date) => d.toLocaleDateString(undefined, { month: "short" });
  const rangeTitle =
    anchor.getMonth() === endD.getMonth()
      ? `${monthShort(anchor)} ${anchor.getDate()} – ${endD.getDate()}`
      : `${monthShort(anchor)} ${anchor.getDate()} – ${monthShort(endD)} ${endD.getDate()}`;

  const dowLabels = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  const isToday = (d: Date) =>
    d.getFullYear() === todayD.getFullYear() && d.getMonth() === todayD.getMonth() && d.getDate() === todayD.getDate();

  const openDay = (d: Date) => {
    if (d.getTime() > todayD.getTime()) return;
    navigate({ to: "/devotionals/$id", params: { id: templateId }, search: { date: isoDate(d) } as any });
  };

  const shiftWeek = (delta: number) => {
    const n = new Date(anchor); n.setDate(anchor.getDate() + delta * 7);
    setAnchor(n);
  };

  return (
    <div className="wlist-wrap">
      <style dangerouslySetInnerHTML={{ __html: WEEK_LIST_CSS }} />

      <div className="de-headtop" style={{ marginBottom: 6 }}>
        <span className="de-headtitle-brand">Abide</span>
        <span className="de-headarrow">→</span>
        <span className="de-headdate">This week</span>
      </div>
      <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 27, fontWeight: 700, color: "#181A4D", letterSpacing: "-0.01em", margin: "2px 0 6px" }}>
        Covered This Week
      </div>
      <p style={{ fontFamily: "'Poppins',sans-serif", fontSize: 14, color: "#20201C", opacity: 0.65, margin: "0 0 18px", maxWidth: 640 }}>
        An overview of what you've covered, worked on, and worked through with the Lord over the course of this week.
      </p>

      <div className="wlist-nav" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button aria-label="Previous week" onClick={() => shiftWeek(-1)}>‹</button>
          <div className="title">{rangeTitle}</div>
          <button aria-label="Next week" onClick={() => shiftWeek(1)}>›</button>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button type="button" className="wlist-add-btn" onClick={() => { setTodoDate(isoDate(todayD)); setTodoOpen(true); }}
            style={{ width: "auto", padding: "6px 14px", borderRadius: 999, border: "1px solid #181A4D", background: "#fff", color: "#181A4D", fontFamily: "'Poppins',sans-serif", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", minWidth: "max-content", flexShrink: 0 }}>
            + New To-Do
          </button>
          <button type="button" className="wlist-add-btn" onClick={() => { setAddDate(isoDate(todayD)); setAddOpen(true); }}
            style={{ width: "auto", padding: "6px 14px", borderRadius: 999, border: "1px solid #181A4D", background: "#181A4D", color: "#fff", fontFamily: "'Poppins',sans-serif", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", minWidth: "max-content", flexShrink: 0 }}>
            + New Event
          </button>
        </div>
      </div>

      <div className="wlist-legend">
        <span><span className="dot" style={{ background: "#DCE07A" }} /> Daily devotional</span>
        <span><span className="dot" style={{ background: "#0F4A42" }} /> Topical devotional</span>
      </div>

      <div className="wlist">
        {days.map(d => {
          const isCurrentRealMonth =
            d.getFullYear() === todayD.getFullYear() && d.getMonth() === todayD.getMonth();
          const dayNum = d.getDate();
          const hasDevo = devoDates.has(isoDate(d));
          const topicalName = topicalMap.get(isoDate(d));
          const note = isCurrentRealMonth ? SAMPLE_WEEK_NOTES[dayNum] : undefined;
          const isPast = d.getTime() < todayD.getTime();
          const today = isToday(d);
          const cls = [
            "wl-day",
            today ? "today" : "",
            hasDevo ? "devo" : "",
            topicalName ? "topical" : "",
          ].filter(Boolean).join(" ");

          return (
            <div key={isoDate(d)} className={cls}>
              <div className="wl-date">
                <div className="dow">{dowLabels[d.getDay()]}</div>
                <div className="num">{dayNum}</div>
              </div>
              <div className="wl-body">
                <div className="wl-tags">
                  {hasDevo ? (
                    <span className="wl-tag devo"><span className="tdot" style={{ background: "#181A4D" }} />Devotional</span>
                  ) : isPast ? (
                    <span className="wl-tag empty">— not entered</span>
                  ) : null}
                  {topicalName && (
                    <span className="wl-tag topical"><span className="tdot" style={{ background: "#fff" }} />{topicalName}</span>
                  )}
                  {(eventsMap.get(isoDate(d)) ?? []).map(ev => {
                    const light = isLightEventBg(ev.color);
                    const fg = light ? "#181A4D" : "#fff";
                    return (
                    <button key={ev.id} type="button" onClick={() => setEditEvent(ev)}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "4px 10px", borderRadius: light ? 6 : 999, background: ev.color,
                        color: fg, fontFamily: "'Poppins',sans-serif", fontSize: 12, fontWeight: 700,
                        border: "none", cursor: "pointer",
                      }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: fg, flexShrink: 0, display: "inline-block" }} />
                      {eventDisplayLabel(ev)}
                    </button>
                    );
                  })}
                  {(todoDueMap.get(isoDate(d)) ?? 0) > 0 && (
                    <button type="button" onClick={() => openDay(d)}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "4px 10px", borderRadius: 999, background: "#8A96E0",
                        color: "#fff", fontFamily: "'Poppins',sans-serif", fontSize: 12, fontWeight: 700,
                        border: "none", cursor: "pointer",
                      }}
                      title="Open to see these to-dos">
                      {todoDueMap.get(isoDate(d))} to-do{todoDueMap.get(isoDate(d))! > 1 ? "s" : ""} due
                    </button>
                  )}
                </div>
                <textarea
                  className="wl-note"
                  defaultValue={note ?? ""}
                  placeholder={isPast ? "No note added" : "Add a note for this day…"}
                  rows={1}
                />
              </div>
              <div className="wl-actions">
                {hasDevo ? (
                  <button type="button" className="wl-link" onClick={() => openDay(d)}>View workspace</button>
                ) : d.getTime() > todayD.getTime() ? (
                  <button type="button" className="wl-chip"
                    onClick={() => { setPlanDate(isoDate(d)); setPlanOpen(true); }}>
                    + Plan
                  </button>
                ) : (
                  <button type="button" className="wl-chip" onClick={() => openDay(d)}>+ plan</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <AddEventDialog open={addOpen} onOpenChange={setAddOpen} userId={userId} defaultDate={addDate}
        onSaved={() => qc.invalidateQueries({ queryKey: ["user-events"] })} />
      <AddEventDialog open={!!editEvent} onOpenChange={(v) => { if (!v) setEditEvent(null); }} userId={userId}
        defaultDate={editEvent?.event_date ?? isoDate(todayD)} event={editEvent}
        onSaved={() => qc.invalidateQueries({ queryKey: ["user-events"] })} />
      <NewTodoDialog open={todoOpen} onOpenChange={setTodoOpen} userId={userId} templateId={templateId} defaultDate={todoDate}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["todo-due-dates"] });
          qc.invalidateQueries({ queryKey: ["dev-entries"] });
          qc.invalidateQueries({ queryKey: ["devo-content-dates"] });
        }} />
      <PlanDayDialog open={planOpen} onOpenChange={setPlanOpen} userId={userId} templateId={templateId} defaultDate={planDate}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["todo-due-dates"] });
          qc.invalidateQueries({ queryKey: ["dev-entries"] });
          qc.invalidateQueries({ queryKey: ["devo-content-dates"] });
          qc.invalidateQueries({ queryKey: ["topical-dates"] });
        }} />
    </div>
  );
}
