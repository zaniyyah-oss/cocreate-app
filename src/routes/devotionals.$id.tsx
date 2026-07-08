import { createFileRoute, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { trackEvent } from "@/lib/track";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";
import { ResizableTextarea } from "@/components/ResizableTextarea";
import { MobileBottomNav } from "@/components/MobileBottomNav";

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

type TodoItem = { id: string; text: string; done: boolean };

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
.de-block{background:#fff;border-radius:14px;padding:20px 22px;margin-bottom:14px;border:1px solid rgba(24,26,77,0.12);}
.de-badge{display:inline-block;font-weight:600;font-size:11px;letter-spacing:0.03em;text-transform:uppercase;padding:5px 12px;border-radius:6px;color:#FBF8ED;margin-bottom:12px;font-family:'Poppins',sans-serif;}
.de-badge.where{background:#181A4D;}
.de-badge.read{background:#FFAE00;color:#181A4D;margin-bottom:6px;}
.de-badge.pray{background:#E990A2;color:#181A4D;margin-bottom:6px;}
.de-badge.todo{background:#8A96E0;color:#181A4D;margin-bottom:6px;}

.de-prompt{font-size:14px;line-height:1.5;color:#20201C;opacity:0.7;margin:0 0 10px;font-weight:400;max-width:520px;}
.de-textarea{width:100%;border:none;border-bottom:1px solid rgba(24,26,77,0.12);background:transparent;font-family:'Poppins',sans-serif;font-size:14px;color:#20201C;line-height:1.5;min-height:38px;resize:vertical;outline:none;padding:0 0 9px;transition:border-color .15s ease;}
.de-textarea.tall{min-height:120px;}
.de-textarea.short{min-height:38px;}
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
@media (min-width:900px){
  .de-cols{grid-template-columns:1fr 1fr 1fr;}
  .de-cols .de-block + .de-block{border-top:none;}
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
.de-block.is-full, .ws-root.is-full{position:fixed;inset:0;z-index:300;margin:0;border-radius:0;overflow-y:auto;padding:64px 20px 60px;background:#fff;border:none;max-width:100vw;}
@media (min-width:768px){
  .de-block.is-full, .ws-root.is-full{padding:72px 48px 80px;}
  .de-block.is-full > *, .ws-root.is-full > *{max-width:820px;margin-left:auto;margin-right:auto;}
}
.de-block.is-full .de-textarea{min-height:55vh;}
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

  // Rehydrate texts when switching date or when entries load. Legacy reflect/apply
  // fields are surfaced into the new Where/To-Do sections if the new ones are empty.
  // For topical/temporary devotionals (non-default) with no existing entry for the day,
  // pre-fill Read/Pray/To-Do from the template's configured content.
  useEffect(() => {
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



  const upsert = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      if (!userId) return;
      if (currentEntry?.id) {
        const { error } = await supabase.from("devotional_entries").update(patch as any).eq("id", currentEntry.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("devotional_entries").insert({
          user_id: userId, template_id: id, entry_date: selectedDate, ...patch,
        } as any);
        if (error) throw error;
        trackEvent("devotional_entry_created", { template_id: id });
      }
    },
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ["dev-entries", id, userId] });
      const key = Object.keys(vars)[0];
      setSavingField(null);
      setSavedField(key);
      setTimeout(() => setSavedField((s) => (s === key ? null : s)), 1400);
    },
  });

  // Ensure a devotional_entries row exists for today; return its id.
  // Used by the Workspace section, which needs an entry to attach items to.
  const ensureEntry = async (): Promise<string | null> => {
    if (!userId) return null;
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

  const debouncers = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});
  const scheduleSave = (field: SaveField, value: unknown) => {
    if (!userId || !ready) return;
    setSavingField(field);
    if (debouncers.current[field]) clearTimeout(debouncers.current[field]!);
    debouncers.current[field] = setTimeout(() => { upsert.mutate({ [field]: value }); }, 800);
  };

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

  if (ready && !userId) {
    return (
      <div className="de-root">
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <nav className="de-nav">
          <Link to="/" className="de-brand"><div className="mark">C</div><div className="word">CoCreate</div></Link>
          <NavMenu />
          <div className="de-navright">
            <Link to="/auth" className="de-signin">Sign in</Link>
          </div>
        </nav>
        <div className="de-shell">
          <div className="de-signgate">
            <h3>Sign in to open this devotional</h3>
            <p>Your reflections stay private and save automatically as you write.</p>
            <Link to="/auth" className="de-signin">Sign in</Link>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="de-navright" />

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

            {search.view !== "today" ? (
              userId ? (
                <HistoryView userId={userId} templateId={id} range={search.view} />
              ) : (
                <div style={{ textAlign: "center", padding: 40, color: "#8a8678" }}>Sign in to view your history.</div>
              )
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




            <div className="de-shell-inner">
              {/* 1. Where Are You */}
              <div className={`de-block ${focusSection === "where" ? "is-full" : ""}`}>
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
                  <div className={`de-block read ${focusSection === "read" ? "is-full" : ""}`}>
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
                  <div className={`de-block ${focusSection === "pray" ? "is-full" : ""}`}>
                    <div className="de-block-header">
                      <span className="de-badge pray">pray</span>
                      {focusBtn("pray")}
                    </div>
                    
                    <ResizableTextarea
                      storageKey="pray"
                      className="de-textarea"
                      placeholder="Speak plainly to God…"
                      value={prayText}
                      onChange={(e) => { setPrayText(e.target.value); scheduleSave("pray_text", e.target.value); }}
                    />
                    {statusRow("pray_text")}
                  </div>

                  {/* To-Do */}
                  <div className={`de-block ${focusSection === "todo" ? "is-full" : ""}`}>
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
              {userId && (
                <WorkspaceSection
                  userId={userId}
                  ensureEntry={ensureEntry}
                  currentEntryId={currentEntry?.id ?? null}
                  isFocused={focusSection === "workspace"}
                  onToggleFocus={() => setFocusSection((cur) => (cur === "workspace" ? null : "workspace"))}
                  focusItemId={search.ws}
                />
              )}

            </div>
            </>
            )}

          </>

        )}
      </div>

      {/* keep navigate reference to avoid unused warning */}
      <span style={{ display: "none" }} aria-hidden onClick={() => navigate({ to: "/devotionals" })} />
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

