import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { WorkspaceEditor } from "./WorkspaceEditor";

export type WorkspaceItem = {
  id: string;
  user_id: string;
  devotional_entry_id: string | null;
  title: string;
  body: any;
  body_text: string;
  tags: string[];
  status: "open" | "closed";
  pinned?: boolean;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;
};

const CSS = `
.ws-root{background:#fff;border:1px solid rgba(24,26,77,0.12);border-radius:14px;padding:20px 22px;margin-top:16px;font-family:'Poppins',sans-serif;position:relative;}
.ws-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:12px;}
.ws-badge{display:inline-block;font-weight:600;font-size:11px;letter-spacing:0.03em;text-transform:uppercase;padding:5px 12px;border-radius:6px;background:#DCE07A;color:#181A4D;margin-bottom:6px;}
.ws-desc{font-size:13px;color:#20201C;opacity:0.6;max-width:460px;margin-top:2px;line-height:1.5;}
.ws-newbtn{background:#181A4D;color:#DCE07A;border:none;border-radius:999px;padding:8px 16px;font-family:'Poppins',sans-serif;font-weight:600;font-size:12px;cursor:pointer;white-space:nowrap;}
.ws-newbtn:hover{background:#0F4A42;color:#DCE07A;}

.ws-notetabs{display:flex;gap:16px;margin:4px 0 14px;border-bottom:1px solid rgba(24,26,77,0.12);flex-wrap:wrap;}
.ws-notetab{background:none;border:none;padding:0 0 9px;font-family:'Poppins',sans-serif;font-size:12.5px;font-weight:600;color:#181A4D;opacity:0.5;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;}
.ws-notetab:hover{opacity:0.85;}
.ws-notetab.active{opacity:1;border-bottom-color:#CAC307;}

.ws-note-body{}
.ws-note-title{width:100%;border:none;background:transparent;font-family:'Poppins',sans-serif;font-weight:600;font-size:14.5px;color:#181A4D;margin-bottom:8px;padding:0;outline:none;}
.ws-note-title::placeholder{color:#181A4D;opacity:0.35;}
.ws-tagrow{display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:6px 22px 8px;margin:0 -22px 0;background:#fff;position:sticky;top:58px;z-index:46;overflow:visible;}
@media (min-width:720px){.ws-tagrow{padding-right:28px;}}
@media (max-width:719px){.ws-tagrow{position:static;top:auto;padding:0 4px 8px;margin:0 0 4px;}}
.ws-root.is-full .ws-tagrow{position:sticky;top:0;padding:8px 20px;margin:0 -20px;z-index:61;}
@media (min-width:720px){.ws-root.is-full .ws-tagrow{margin:0 -48px;padding:10px 48px 8px;}}
.ws-tag{background:rgba(15,74,66,0.08);color:#0F4A42;border-radius:999px;padding:4px 11px;font-size:11px;font-weight:600;display:inline-flex;align-items:center;gap:6px;font-family:'Poppins',sans-serif;position:relative;}
.ws-tag .label{cursor:pointer;user-select:none;}
.ws-tag button{background:none;border:none;color:inherit;font-size:12px;cursor:pointer;padding:0;line-height:1;opacity:0.55;}
.ws-tag button:hover{opacity:1;}
.ws-tag-pop{position:absolute;top:calc(100% + 6px);left:0;background:#fff;border:1px solid rgba(24,26,77,0.15);border-radius:12px;padding:8px;display:grid;grid-template-columns:repeat(5,20px);gap:6px;box-shadow:0 8px 24px rgba(24,26,77,0.15);z-index:80;}
.ws-tag-sw{width:20px;height:20px;border-radius:50%;border:1px solid rgba(24,26,77,0.15);cursor:pointer;padding:0;}
.ws-tag-sw.reset{background:repeating-linear-gradient(45deg,#fff,#fff 3px,#eee 3px,#eee 6px);}
.ws-tag-sw.on{outline:2px solid #181A4D;outline-offset:1px;}
.ws-tag-input{background:transparent;border:1px dashed rgba(24,26,77,0.15);color:#20201C;border-radius:999px;padding:4px 11px;font-size:11px;font-weight:600;font-family:'Poppins',sans-serif;outline:none;width:88px;}
.ws-tag-input:focus{border-color:#181A4D;border-style:solid;color:#181A4D;}
.ws-tag-input::placeholder{color:#20201C;opacity:0.5;}

.ws-editor{border:none;background:transparent;position:relative;scroll-margin-top:110px;}
.ws-toolbar{display:flex;flex-wrap:wrap;gap:4px;padding:8px 20px;border-bottom:1px solid rgba(24,26,77,0.10);background:#fff;position:sticky;top:98px;z-index:45;margin:0 -22px 12px;box-shadow:0 2px 8px rgba(24,26,77,0.04);}
.ws-root.is-full .ws-toolbar{position:sticky;top:40px;background:#fff;padding:10px 0 8px;margin:0 -20px 12px;padding-left:20px;padding-right:20px;border-bottom:1px solid rgba(24,26,77,0.10);box-shadow:0 2px 8px rgba(24,26,77,0.04);z-index:60;}
@media (min-width:720px){
  .ws-root.is-full .ws-toolbar{margin-left:-48px;margin-right:-48px;padding-left:48px;padding-right:48px;}
}
@media (max-width:719px){
  .ws-toolbar{position:static;top:auto;bottom:auto;background:#fff;border-top:none;border-bottom:1px solid rgba(24,26,77,0.10);padding:6px 8px;margin:0 -22px 14px;box-shadow:0 2px 8px rgba(24,26,77,0.04);}
  .ws-root.is-full .ws-toolbar{position:sticky;top:0;bottom:auto;margin:0 -20px 14px;padding:10px 20px 8px;padding-bottom:8px;border-top:none;border-bottom:1px solid rgba(24,26,77,0.10);box-shadow:0 2px 8px rgba(24,26,77,0.04);}
  .ws-editor-content{padding-top:12px;}
}
@media (min-width:720px) and (max-width:1180px), (hover:none), (pointer:coarse){
  .ws-toolbar{position:static;top:auto;background:#fff;padding:8px 20px;margin:0 -22px 16px;border-bottom:1px solid rgba(24,26,77,0.10);box-shadow:0 2px 8px rgba(24,26,77,0.04);}
  .ws-root.is-full .ws-toolbar{position:static;top:auto;margin:0 -48px 16px;padding:10px 48px 8px;border-bottom:1px solid rgba(24,26,77,0.10);box-shadow:0 2px 8px rgba(24,26,77,0.04);}
  .ws-editor-content{padding-top:12px;scroll-margin-top:130px;}
}
.ws-tb-btn{background:transparent;border:none;color:#181A4D;font-family:'Poppins',sans-serif;font-weight:600;font-size:11.5px;padding:5px 9px;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;}
.ws-tb-btn:hover{background:rgba(24,26,77,0.06);text-decoration:underline;text-underline-offset:3px;}
.ws-tb-btn.on{text-decoration:underline;text-underline-offset:3px;}
.ws-tb-btn.on{background:#181A4D;color:#fff;}
.ws-popover{position:absolute;top:calc(100% + 4px);left:0;background:#fff;border:1px solid rgba(24,26,77,0.14);border-radius:10px;padding:8px;box-shadow:0 6px 20px rgba(24,26,77,0.14);display:flex;flex-wrap:wrap;gap:6px;z-index:80;max-width:220px;}
.ws-popover-col{flex-direction:column;flex-wrap:nowrap;min-width:170px;}
.ws-swatch{width:24px;height:24px;border-radius:50%;cursor:pointer;padding:0;display:inline-flex;align-items:center;justify-content:center;font-size:12px;color:#20201C;}
.ws-swatch:hover{transform:scale(1.08);}
.ws-popbtn{background:transparent;border:none;text-align:left;font-family:'Poppins',sans-serif;font-size:12.5px;color:#181A4D;padding:6px 8px;border-radius:6px;cursor:pointer;}
.ws-popbtn:hover{background:rgba(24,26,77,0.06);}
.ws-bubble{display:flex;gap:2px;background:#181A4D;color:#fff;border-radius:8px;padding:4px;box-shadow:0 8px 24px rgba(0,0,0,0.18);}
.ws-bb-btn{background:transparent;border:none;color:#fff;font-family:'Poppins',sans-serif;font-weight:600;font-size:12.5px;padding:6px 9px;border-radius:5px;cursor:pointer;}
.ws-bb-btn:hover{background:rgba(255,255,255,0.14);}
.ws-bb-btn.on{background:#CAC307;color:#181A4D;}
.ws-editor-content{padding:14px 0 4px;min-height:56px;outline:none;font-family:'Poppins',sans-serif;font-size:14px;color:#20201C;line-height:1.55;scroll-margin-top:110px;}
.ws-editor-content p{margin:0 0 8px;}
.ws-editor-content p:last-child{margin-bottom:0;}
.ws-editor-content h2{font-size:17px;font-weight:700;color:#181A4D;margin:12px 0 6px;letter-spacing:-0.005em;}
.ws-editor-content h3{font-size:14.5px;font-weight:700;color:#181A4D;margin:10px 0 5px;}
.ws-editor-content ul{list-style:disc outside;padding-left:18px;margin:0 0 6px;}
.ws-editor-content ol{list-style:decimal outside;padding-left:20px;margin:0 0 6px;}
.ws-editor-content ul ul,.ws-editor-content ol ul,.ws-editor-content ul ol,.ws-editor-content ol ol{padding-left:18px;margin:2px 0 2px;}
.ws-editor-content li{margin-bottom:2px;padding-left:2px;}
.ws-editor-content li::marker{color:#181A4D;}
.ws-editor-content li > p{margin:0;}
.ws-editor-content blockquote{border-left:3px solid #DCE07A;padding:2px 0 2px 12px;margin:8px 0;color:#5c5847;font-style:italic;}
.ws-editor-content mark{padding:0 2px;border-radius:3px;}
.ws-editor-content a.ws-link{color:#181A4D;text-decoration:underline;}
.ws-editor-content img.ws-img{max-width:100%;height:auto;border-radius:8px;margin:8px 0;display:block;}
.ws-editor-content p.is-editor-empty:first-child::before{content:attr(data-placeholder);color:#20201C;opacity:0.35;float:left;height:0;pointer-events:none;}
.ws-editor-content .ws-linkcard{display:flex;gap:12px;border:1px solid rgba(24,26,77,0.1);background:#FBF8ED;border-radius:10px;overflow:hidden;text-decoration:none;color:inherit;margin:8px 0;max-width:520px;}
.ws-editor-content .ws-linkcard:hover{background:#f5efd8;}
.ws-editor-content .ws-linkcard-img{flex:0 0 96px;background-size:cover;background-position:center;background-color:#DCE07A;}
.ws-editor-content .ws-linkcard-body{flex:1;padding:10px 12px;display:flex;flex-direction:column;gap:4px;min-width:0;}
.ws-editor-content .ws-linkcard-domain{font-size:10.5px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#181A4D;}
.ws-editor-content .ws-linkcard-title{font-size:13px;font-weight:700;color:#181A4D;line-height:1.35;}
.ws-editor-content .ws-linkcard-desc{font-size:12px;color:#8a8678;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.ws-editor-content .ws-table{border-collapse:collapse;margin:10px 0;width:100%;table-layout:fixed;overflow:hidden;}
.ws-editor-content .ws-table td,.ws-editor-content .ws-table th{border:1px solid rgba(24,26,77,0.18);padding:6px 8px;vertical-align:top;min-width:60px;position:relative;}
.ws-editor-content .ws-table th{background:#F1EDDD;font-weight:700;color:#181A4D;text-align:left;}
.ws-editor-content .ws-table .selectedCell{background:rgba(202,195,7,0.22);}
.ws-editor-content .ws-table p{margin:0;}
.ws-editor-content .ws-callout{display:flex;gap:10px;background:#FFF4D6;border:1px solid rgba(255,174,0,0.35);border-left:4px solid #FFAE00;border-radius:8px;padding:10px 12px;margin:10px 0;}
.ws-editor-content .ws-callout[data-tone="teal"]{background:#E4F1EE;border-color:rgba(15,74,66,0.25);border-left-color:#0F4A42;}
.ws-editor-content .ws-callout[data-tone="blush"]{background:#FBE3E9;border-color:rgba(233,144,162,0.35);border-left-color:#E990A2;}
.ws-editor-content .ws-callout[data-tone="lime"]{background:#F2F4C7;border-color:rgba(202,195,7,0.4);border-left-color:#CAC307;}
.ws-editor-content .ws-callout-emoji{font-size:18px;line-height:1.4;user-select:none;flex-shrink:0;}
.ws-editor-content .ws-callout-body{flex:1;min-width:0;}
.ws-editor-content .ws-callout-body > *:last-child{margin-bottom:0;}

.ws-note-actions{display:flex;gap:16px;margin-top:12px;align-items:center;}
.ws-linkaction{background:none;border:none;font-family:'Poppins',sans-serif;font-weight:600;font-size:12px;cursor:pointer;padding:0;color:#181A4D;}
.ws-linkaction:hover{text-decoration:underline;}
.ws-linkaction.del{color:#20201C;opacity:0.45;}
.ws-linkaction.del:hover{opacity:0.9;}
.ws-savestatus{font-size:10.5px;color:#8a8678;font-weight:600;margin-left:auto;}

.ws-empty-body{padding:22px 0;color:#8a8678;font-size:13px;text-align:center;}

.ws-library-strip{margin-top:16px;padding-top:14px;border-top:1px dashed rgba(24,26,77,0.12);}
.ws-library-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;gap:12px;}
.ws-library-head span.lbl{font-size:11px;font-weight:600;letter-spacing:0.03em;text-transform:uppercase;color:#20201C;opacity:0.4;}
.ws-library-head a{font-size:12px;color:#181A4D;font-weight:600;text-decoration:none;font-family:'Poppins',sans-serif;}
.ws-library-head a:hover{text-decoration:underline;}
.ws-libgrid{display:flex;gap:20px 24px;flex-wrap:wrap;}
.ws-libitem{font-size:12.5px;color:#181A4D;opacity:0.8;background:none;border:none;padding:0;font-family:'Poppins',sans-serif;cursor:pointer;text-align:left;}
.ws-libitem:hover{opacity:1;text-decoration:underline;}
.ws-libitem b{font-weight:600;opacity:1;}
.ws-libitem .tg{opacity:0.7;font-weight:500;}
.ws-libempty{font-size:12.5px;color:#8a8678;opacity:0.7;}

/* focus mode passthrough */
.ws-root.is-full{position:fixed;inset:0;z-index:400;background:#fff;margin:0;border:none;border-radius:0;overflow-y:auto;padding:64px 20px 80px;}
@media (min-width:720px){
  .ws-root.is-full{padding:72px 48px 80px;}
  .ws-root.is-full > *{max-width:980px;margin-left:auto;margin-right:auto;}
}
@media (min-width:1200px){
  .ws-root.is-full{padding:84px 72px 100px;}
  .ws-root.is-full > *{max-width:1200px;}
}
.ws-focus-btn{background:transparent;border:1px solid rgba(24,26,77,0.15);color:#181A4D;font-family:'Poppins',sans-serif;font-weight:600;font-size:10.5px;letter-spacing:0.05em;text-transform:uppercase;padding:4px 9px;border-radius:99px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;}
.ws-focus-btn:hover{background:#181A4D;color:#fff;border-color:#181A4D;}

/* ---- Pinned & recent-today strip ---- */
.ws-recent{margin:2px 0 16px;}
.ws-recent-head{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px;gap:12px;}
.ws-recent-title{font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#181A4D;display:inline-flex;align-items:center;gap:6px;}
.ws-recent-title .dot{width:6px;height:6px;border-radius:50%;background:#E990A2;display:inline-block;}
.ws-recent-sub{font-size:11.5px;color:#8a8678;}
.ws-recent-scroll{display:flex;gap:10px;overflow-x:auto;padding-bottom:6px;scrollbar-width:thin;}
.ws-recent-scroll::-webkit-scrollbar{height:6px;}
.ws-recent-scroll::-webkit-scrollbar-thumb{background:rgba(24,26,77,0.15);border-radius:4px;}
.ws-rc{flex:0 0 220px;background:#FBF8ED;border:1px solid rgba(24,26,77,0.10);border-radius:12px;padding:11px 12px;cursor:pointer;transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease;text-align:left;font-family:'Poppins',sans-serif;}
.ws-rc:hover{transform:translateY(-2px);box-shadow:0 6px 16px rgba(24,26,77,0.08);border-color:#181A4D;}
.ws-rc.pinned{border-color:#181A4D;}
.ws-rc-top{display:flex;align-items:center;gap:6px;margin-bottom:6px;min-height:20px;}
.ws-rc-tag{font-size:10px;font-weight:700;padding:3px 9px;border-radius:999px;background:#DCE07A;color:#181A4D;white-space:nowrap;}
.ws-rc-flag{font-size:10px;font-weight:600;color:#9A6B00;white-space:nowrap;}
.ws-rc-pin{margin-left:auto;background:none;border:none;cursor:pointer;padding:2px;color:#8a8678;font-size:14px;line-height:1;}
.ws-rc-pin.active{color:#181A4D;}
.ws-rc-title{font-size:13px;font-weight:700;color:#181A4D;margin:0 0 4px;line-height:1.3;}
.ws-rc-snippet{font-size:11.5px;color:#5B5B54;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.ws-rc-status{font-size:10px;color:#8a8678;font-weight:500;margin-top:6px;}
.ws-rc-empty{font-size:12px;color:#8a8678;padding:6px 2px;}

/* ---- Preview overlay ---- */
.ws-ov{position:fixed;inset:0;background:rgba(24,26,77,0.35);display:flex;align-items:flex-start;justify-content:center;padding:60px 20px;z-index:500;}
.ws-ov-panel{background:#fff;border-radius:16px;max-width:560px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.25);font-family:'Poppins',sans-serif;}
.ws-ov-head{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(24,26,77,0.10);gap:8px;flex-wrap:wrap;}
.ws-ov-mode{font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#8a8678;}
.ws-ov-actions{display:flex;gap:8px;}
.ws-ov-btn{background:none;border:1px solid rgba(24,26,77,0.15);color:#20201C;font-family:'Poppins',sans-serif;font-size:12px;font-weight:600;padding:6px 12px;border-radius:999px;cursor:pointer;}
.ws-ov-btn.primary{background:#181A4D;color:#DCE07A;border-color:#181A4D;}
.ws-ov-btn.pin.active{color:#181A4D;border-color:#181A4D;}
.ws-ov-body{padding:18px 22px 24px;}
.ws-ov-body h3{color:#181A4D;font-size:17px;margin:0 0 8px;}
.ws-ov-body .body{font-size:13.5px;line-height:1.6;color:#3A3A34;white-space:pre-wrap;}
.ws-ov-meta{font-size:11px;color:#8a8678;margin-top:14px;padding-top:12px;border-top:1px solid rgba(24,26,77,0.10);}
`;


function toPreview(text: string): string {
  return (text || "").replace(/\s+/g, " ").trim().slice(0, 140);
}

const TAG_PALETTE: { name: string; value: string }[] = [
  { name: "Teal", value: "#B7DDD3" },
  { name: "Sky", value: "#C7D8F5" },
  { name: "Peach", value: "#FFD3B6" },
  { name: "Blush", value: "#F4C2CD" },
  { name: "Yellow", value: "#FDE68A" },
  { name: "Lime", value: "#DCE07A" },
  { name: "Lilac", value: "#D6CDF0" },
  { name: "Mint", value: "#C6EAD8" },
  { name: "Sand", value: "#E8DEC5" },
];

function useTagColors(userId: string, guest: boolean) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["user-tag-colors", userId],
    enabled: !guest && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_tag_colors" as any).select("tag,color").eq("user_id", userId);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const r of (data as any[]) || []) map[r.tag] = r.color;
      return map;
    },
  });
  const [guestMap, setGuestMap] = useState<Record<string, string>>({});
  const colors = guest ? guestMap : (query.data ?? {});

  const setColor = async (tag: string, color: string | null) => {
    if (guest) {
      setGuestMap((m) => {
        const n = { ...m };
        if (color) n[tag] = color; else delete n[tag];
        return n;
      });
      return;
    }
    if (!color) {
      await supabase.from("user_tag_colors" as any).delete().eq("user_id", userId).eq("tag", tag);
    } else {
      await supabase.from("user_tag_colors" as any)
        .upsert({ user_id: userId, tag, color }, { onConflict: "user_id,tag" });
    }
    qc.invalidateQueries({ queryKey: ["user-tag-colors", userId] });
  };
  return { colors, setColor };
}


export function WorkspaceSection({
  userId,
  ensureEntry,
  isFocused,
  onToggleFocus,
  focusItemId,
  guest = false,
  onGuestGate,
  historyEntryId = null,
}: {
  userId: string;
  ensureEntry: () => Promise<string | null>;
  currentEntryId: string | null;
  isFocused?: boolean;
  onToggleFocus?: () => void;
  focusItemId?: string;
  guest?: boolean;
  onGuestGate?: (kind: "type" | "save") => void;
  /** When set, show notes tied to this past devotional entry (all statuses) instead of the live open-notes list. */
  historyEntryId?: string | null;
}) {
  const isHistory = !!historyEntryId;
  const qc = useQueryClient();
  const [guestItems, setGuestItems] = useState<WorkspaceItem[]>([]);
  const itemsQ = useQuery({
    queryKey: ["workspace-items", userId],
    enabled: !guest && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_items" as any)
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as WorkspaceItem[];
    },
  });

  const items = guest ? guestItems : (itemsQ.data ?? []);
  const { colors: parentTagColors } = useTagColors(userId, guest);

  const openNotes = useMemo(
    () => {
      if (isHistory) {
        return items
          .filter((i) => i.devotional_entry_id === historyEntryId)
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      }
      return items
        .filter((i) => i.status === "open")
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    },
    [items, isHistory, historyEntryId]
  );

  const libraryItems = useMemo(
    () =>
      isHistory
        ? []
        : items
            .filter((i) => i.status === "closed")
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
            .slice(0, 3),
    [items, isHistory]
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  // Keep an active tab selected when possible.
  useEffect(() => {
    if (openNotes.length === 0) {
      if (activeId !== null) setActiveId(null);
      return;
    }
    if (!activeId || !openNotes.find((n) => n.id === activeId)) {
      setActiveId(openNotes[0].id);
    }
  }, [openNotes, activeId]);

  const createItem = useMutation({
    mutationFn: async () => {
      if (guest) {
        const now = new Date().toISOString();
        const created: WorkspaceItem = {
          id: `guest-${crypto.randomUUID()}`,
          user_id: "guest",
          devotional_entry_id: null,
          title: "",
          body: {},
          body_text: "",
          tags: [],
          status: "open",
          created_at: now,
          updated_at: now,
        };
        setGuestItems((cur) => [...cur, created]);
        return created;
      }
      const entryId = await ensureEntry();
      if (!entryId) throw new Error("Could not create today's entry");
      const { data, error } = await supabase
        .from("workspace_items" as any)
        .insert({
          user_id: userId,
          devotional_entry_id: entryId,
          title: "",
          body: {},
          body_text: "",
          tags: [],
          status: "open",
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as WorkspaceItem;
    },
    onSuccess: (created) => {
      if (!guest) qc.invalidateQueries({ queryKey: ["workspace-items", userId] });
      if (created?.id) setActiveId(created.id);
    },
  });

  const reopen = useMutation({
    mutationFn: async (id: string) => {
      if (guest) {
        setGuestItems((cur) => cur.map((i) => (i.id === id ? { ...i, status: "open" as const } : i)));
        return;
      }
      const { error } = await supabase.from("workspace_items" as any).update({ status: "open" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_r, id) => {
      if (!guest) qc.invalidateQueries({ queryKey: ["workspace-items", userId] });
      setActiveId(id);
    },
  });

  const togglePin = useMutation({
    mutationFn: async (it: WorkspaceItem) => {
      const next = !it.pinned;
      if (guest) {
        setGuestItems((cur) => cur.map((i) => (i.id === it.id ? { ...i, pinned: next } : i)));
        return next;
      }
      const { error } = await supabase.from("workspace_items" as any).update({ pinned: next }).eq("id", it.id);
      if (error) throw error;
      return next;
    },
    onSuccess: () => {
      if (!guest) qc.invalidateQueries({ queryKey: ["workspace-items", userId] });
    },
  });

  const [previewId, setPreviewId] = useState<string | null>(null);
  const previewItem = items.find((i) => i.id === previewId) ?? null;

  const isToday = (iso: string | null | undefined) => {
    if (!iso) return false;
    const d = new Date(iso);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  };

  const recentItems = useMemo(() => {
    if (isHistory) return [];
    const pinned = items.filter((i) => i.pinned);
    const pinnedIds = new Set(pinned.map((i) => i.id));
    const todayItems = items.filter(
      (i) => !pinnedIds.has(i.id) && (isToday(i.created_at) || (i.status === "closed" && isToday(i.closed_at ?? i.updated_at))),
    );
    const sortDesc = (arr: WorkspaceItem[]) =>
      arr.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    return [...sortDesc(pinned), ...sortDesc(todayItems)];
  }, [items, isHistory]);

  const activeNote = openNotes.find((n) => n.id === activeId) ?? null;


  const lastFocusRef = useRef<string | null>(null);
  useEffect(() => {
    if (!focusItemId) return;
    if (lastFocusRef.current === focusItemId) return;
    const target = items.find((i) => i.id === focusItemId);
    if (!target) return;
    lastFocusRef.current = focusItemId;
    if (target.status === "closed") {
      reopen.mutate(focusItemId);
    } else {
      setActiveId(focusItemId);
    }
    if (typeof window !== "undefined") {
      setTimeout(() => {
        document.querySelector(".ws-root")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  }, [focusItemId, items]); // eslint-disable-line react-hooks/exhaustive-deps


  return (
    <div className={`ws-root ${isFocused ? "is-full" : ""}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="ws-head">
        <div>
          <span className="ws-badge">workspace</span>
          <div className="ws-desc">Where you work things out with him — quotes, links, half-formed thoughts.</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {onToggleFocus && (
            <button
              type="button"
              className="ws-focus-btn"
              onClick={onToggleFocus}
              aria-label={isFocused ? "Exit focus mode" : "Focus this section"}
            >
              {isFocused ? "✕ Exit focus" : "⛶ Focus"}
            </button>
          )}
          {!isHistory && (
            <button className="ws-newbtn" onClick={() => createItem.mutate()} disabled={createItem.isPending}>
              {createItem.isPending ? "Opening…" : "+ New note"}
            </button>
          )}
        </div>
      </div>

      {!isHistory && (
        <div className="ws-recent">
          <div className="ws-recent-head">
            <div className="ws-recent-title"><span className="dot" /> Pinned &amp; recent today</div>
            <div className="ws-recent-sub">Tap to review · won't open in edit mode</div>
          </div>
          <div className="ws-recent-scroll">
            {recentItems.length === 0 ? (
              <div className="ws-rc-empty">Nothing pinned or closed yet today.</div>
            ) : recentItems.map((n) => {
              const isNewToday = isToday(n.created_at);
              const label = n.status === "closed"
                ? `Closed · ${new Date(n.closed_at ?? n.updated_at).toLocaleDateString()}`
                : isNewToday
                  ? "Created today"
                  : `Edited ${new Date(n.updated_at).toLocaleDateString()}`;
              return (
                <div key={n.id} className={`ws-rc ${n.pinned ? "pinned" : ""}`} onClick={() => setPreviewId(n.id)} role="button" tabIndex={0}>
                  <div className="ws-rc-top">
                    {n.tags[0] && (
                      <span
                        className="ws-rc-tag"
                        style={parentTagColors[n.tags[0]] ? { background: parentTagColors[n.tags[0]], color: "#181A4D" } : undefined}
                      >#{n.tags[0]}</span>
                    )}
                    {isNewToday && !n.pinned && <span className="ws-rc-flag">✦ new today</span>}
                    <button
                      className={`ws-rc-pin ${n.pinned ? "active" : ""}`}
                      onClick={(e) => { e.stopPropagation(); togglePin.mutate(n); }}
                      aria-label={n.pinned ? "Unpin" : "Pin"}
                      title={n.pinned ? "Unpin" : "Pin"}
                    >{n.pinned ? "★" : "☆"}</button>
                  </div>
                  <div className="ws-rc-title">{n.title?.trim() || toPreview(n.body_text) || "Untitled"}</div>
                  <div className="ws-rc-snippet">{toPreview(n.body_text) || "—"}</div>
                  <div className="ws-rc-status">{label}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {openNotes.length > 0 && (

        <div className="ws-notetabs" role="tablist">
          {openNotes.map((n) => (
            <button
              key={n.id}
              role="tab"
              aria-selected={n.id === activeId}
              className={`ws-notetab ${n.id === activeId ? "active" : ""}`}
              onClick={() => setActiveId(n.id)}
              title={n.title || "Untitled"}
            >
              {n.title?.trim() || "Untitled"}
            </button>
          ))}
        </div>
      )}

      {itemsQ.isLoading ? (
        <div className="ws-empty-body">Loading…</div>
      ) : !activeNote ? (
        <div className="ws-empty-body">
          {isHistory ? "No notes were created on this day." : "No open notes. Start a new one to begin."}
        </div>
      ) : (
        <NoteBody key={activeNote.id} item={activeNote} userId={userId} guest={guest} onGuestGate={onGuestGate} onTitleChange={() => { /* live tab label */ }} onGuestUpdate={(patch) => setGuestItems((cur) => cur.map((i) => (i.id === activeNote.id ? { ...i, ...patch, updated_at: new Date().toISOString() } : i)))} />
      )}

      {!isHistory && (
        <div className="ws-library-strip">
          <div className="ws-library-head">
            <span className="lbl">from your library</span>
            <Link to="/notes">Open library →</Link>
          </div>
          {libraryItems.length === 0 ? (
            <div className="ws-libempty">Nothing filed away yet. Save a note to start your library.</div>
          ) : (
            <div className="ws-libgrid">
              {libraryItems.map((it) => (
                <button key={it.id} className="ws-libitem" onClick={() => reopen.mutate(it.id)}>
                  <b>{it.title?.trim() || toPreview(it.body_text) || "Untitled"}</b>
                  {it.tags[0] ? <span className="tg"> · #{it.tags[0]}</span> : null}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {previewItem && (
        <div className="ws-ov" onClick={() => setPreviewId(null)}>
          <div className="ws-ov-panel" onClick={(e) => e.stopPropagation()}>
            <div className="ws-ov-head">
              <div className="ws-ov-mode">◷ Viewing · not editing</div>
              <div className="ws-ov-actions">
                <button
                  className={`ws-ov-btn pin ${previewItem.pinned ? "active" : ""}`}
                  onClick={() => togglePin.mutate(previewItem)}
                >{previewItem.pinned ? "★ Pinned" : "☆ Pin"}</button>
                <button
                  className="ws-ov-btn primary"
                  onClick={() => {
                    const id = previewItem.id;
                    setPreviewId(null);
                    if (previewItem.status === "closed") reopen.mutate(id);
                    else setActiveId(id);
                  }}
                >Edit note</button>
                <button className="ws-ov-btn" onClick={() => setPreviewId(null)}>Close</button>
              </div>
            </div>
            <div className="ws-ov-body">
              <h3>{previewItem.title?.trim() || "Untitled"}</h3>
              <div className="body">
                {previewItem.body && Object.keys(previewItem.body).length ? (
                  <WorkspaceEditor
                    key={previewItem.id}
                    userId={previewItem.user_id}
                    initialJSON={previewItem.body}
                    onChange={() => {}}
                    editable={false}
                  />
                ) : (
                  <div style={{ whiteSpace: "pre-wrap" }}>{previewItem.body_text || "—"}</div>
                )}
              </div>
              <div className="ws-ov-meta">
                Created {new Date(previewItem.created_at).toLocaleString()} · last edited {new Date(previewItem.updated_at).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function NoteBody({
  item,
  userId,
  onTitleChange,
  guest = false,
  onGuestGate,
  onGuestUpdate,
}: {
  item: WorkspaceItem;
  userId: string;
  onTitleChange?: (title: string) => void;
  guest?: boolean;
  onGuestGate?: (kind: "type" | "save") => void;
  onGuestUpdate?: (patch: Partial<WorkspaceItem>) => void;
}) {
  const qc = useQueryClient();
  const { colors: tagColors, setColor: setTagColor } = useTagColors(userId, guest);
  const [openColorFor, setOpenColorFor] = useState<string | null>(null);
  const [title, setTitle] = useState(item.title);
  const [tags, setTags] = useState<string[]>(item.tags);
  const [tagDraft, setTagDraft] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  const [hasPendingPatch, setHasPendingPatch] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatchRef = useRef<Record<string, unknown> | null>(null);
  const inFlightRef = useRef(false);
  const accessTokenRef = useRef<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(item.title);
    setTags(item.tags);
  }, [item.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (guest) return;
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) accessTokenRef.current = data.session?.access_token ?? null;
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      accessTokenRef.current = session?.access_token ?? null;
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [guest]);

  // Core save: merges the buffered patch and writes once. Safe to call
  // repeatedly — if a save is already in flight it re-runs after it settles
  // so the newest keystrokes are never dropped.
  const flushSave = async (keepalive = false) => {
    if (guest) return;
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (!pendingPatchRef.current) return;
    if (inFlightRef.current) {
      if (keepalive) {
        const lastChancePatch = pendingPatchRef.current;
        pendingPatchRef.current = null;
        setHasPendingPatch(false);
        sendWorkspaceKeepalive(item.id, lastChancePatch, accessTokenRef.current);
      }
      return;
    }
    const patch = pendingPatchRef.current;
    pendingPatchRef.current = null;
    setHasPendingPatch(false);
    inFlightRef.current = true;
    setSaving(true);
    try {
      if (keepalive) {
        const ok = sendWorkspaceKeepalive(item.id, patch, accessTokenRef.current);
        if (!ok) {
          const { error } = await supabase.from("workspace_items" as any).update(patch).eq("id", item.id);
          if (error) throw error;
        }
      } else {
        const { error } = await supabase.from("workspace_items" as any).update(patch).eq("id", item.id);
        if (error) throw error;
      }
      qc.setQueryData<WorkspaceItem[]>(["workspace-items", userId], (cur) =>
        (cur ?? []).map((workspaceItem) =>
          workspaceItem.id === item.id
            ? ({ ...workspaceItem, ...patch, updated_at: new Date().toISOString() } as WorkspaceItem)
            : workspaceItem,
        ),
      );
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1400);
      // Refresh list quietly so tab titles / library reflect the latest
      // without disturbing the active editor.
      qc.invalidateQueries({ queryKey: ["workspace-items", userId], refetchType: "none" });
    } catch (e) {
      // Put the patch back (merged under any newer edits) so we retry.
      pendingPatchRef.current = { ...(patch as any), ...(pendingPatchRef.current ?? {}) };
      setHasPendingPatch(true);
      console.error("workspace save failed", e);
    } finally {
      inFlightRef.current = false;
      setSaving(false);
      if (pendingPatchRef.current) flushSave();
    }
  };

  const scheduleSave = (patch: Record<string, unknown>) => {
    if (guest) {
      onGuestUpdate?.(patch as Partial<WorkspaceItem>);
      onGuestGate?.("type");
      return;
    }
    pendingPatchRef.current = { ...(pendingPatchRef.current ?? {}), ...patch };
    setHasPendingPatch(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { void flushSave(); }, 600);
  };

  // Flush on blur, tab hide (iOS PWA suspends aggressively), unmount, and
  // navigation. pagehide uses sendBeacon as a last-chance nonblocking write.
  useEffect(() => {
    const flush = () => { void flushSave(); };
    const flushLastChance = () => { void flushSave(true); };
    const onVis = () => { if (document.visibilityState === "hidden") flush(); };
    const onPageHide = () => flushLastChance();
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingPatchRef.current || inFlightRef.current) {
        flushLastChance();
        e.preventDefault();
        e.returnValue = "";
      }
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (timerRef.current) clearTimeout(timerRef.current);
      void flushSave(true);
    };
  }, [item.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const removeItem = useMutation({
    mutationFn: async () => {
      if (guest) return;
      const { error } = await supabase.from("workspace_items" as any).delete().eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => { if (!guest) qc.invalidateQueries({ queryKey: ["workspace-items", userId] }); },
  });

  const close = useMutation({
    mutationFn: async () => {
      if (guest) return;
      const { error } = await supabase.from("workspace_items" as any).update({ status: "closed" }).eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => { if (!guest) qc.invalidateQueries({ queryKey: ["workspace-items", userId] }); },
  });

  const addTag = (t: string) => {
    const clean = t.trim().replace(/^#/, "").toLowerCase();
    if (!clean || tags.includes(clean)) return;
    const next = [...tags, clean];
    setTags(next);
    scheduleSave({ tags: next });
  };
  const removeTag = (t: string) => {
    const next = tags.filter((x) => x !== t);
    setTags(next);
    scheduleSave({ tags: next });
  };

  return (
    <div className="ws-note-body">
      <input
        className="ws-note-title"
        placeholder="Untitled note"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          onTitleChange?.(e.target.value);
          scheduleSave({ title: e.target.value });
        }}
      />

      <div className="ws-tagrow" onClick={(e) => {
        if (!(e.target as HTMLElement).closest(".ws-tag")) setOpenColorFor(null);
      }}>
        {tags.map((t) => {
          const c = tagColors[t];
          const style = c ? { background: c, color: "#181A4D" } : undefined;
          return (
            <span key={t} className="ws-tag" style={style}>
              <span
                className="label"
                onClick={() => setOpenColorFor(openColorFor === t ? null : t)}
                title="Click to pick a color"
              >#{t}</span>
              <button onClick={() => removeTag(t)} aria-label="Remove tag">×</button>
              {openColorFor === t && (
                <div className="ws-tag-pop" onClick={(e) => e.stopPropagation()}>
                  <button
                    className={`ws-tag-sw reset ${!c ? "on" : ""}`}
                    title="No color"
                    onClick={() => { void setTagColor(t, null); setOpenColorFor(null); }}
                  />
                  {TAG_PALETTE.map((p) => (
                    <button
                      key={p.value}
                      className={`ws-tag-sw ${c === p.value ? "on" : ""}`}
                      style={{ background: p.value }}
                      title={p.name}
                      onClick={() => { void setTagColor(t, p.value); setOpenColorFor(null); }}
                    />
                  ))}
                </div>
              )}
            </span>
          );
        })}
        <TagMultiSelect
          userId={userId}
          guest={guest}
          selected={tags}
          colors={tagColors}
          onToggle={(t) => (tags.includes(t) ? removeTag(t) : addTag(t))}
          onCreate={(t) => addTag(t)}
          draft={tagDraft}
          setDraft={setTagDraft}
        />
      </div>

      <WorkspaceEditor
        userId={userId}
        initialJSON={item.body}
        onChange={(json, text) => scheduleSave({ body: json, body_text: text })}
        onBlur={() => { void flushSave(); }}
        ignoreExternalUpdates={hasPendingPatch || saving}
      />

      <div className="ws-note-actions">
        <button className="ws-linkaction" onClick={async () => { if (guest) { onGuestGate?.("save"); return; } await flushSave(); close.mutate(); }}>Save &amp; file away</button>
        <button
          className="ws-linkaction del"
          onClick={() => { if (confirm("Delete this note?")) removeItem.mutate(); }}
        >
          Delete
        </button>
        <span className="ws-savestatus">{saving || hasPendingPatch ? "Saving…" : savedFlash ? "Saved" : ""}</span>
      </div>
    </div>
  );
}

function sendWorkspaceKeepalive(itemId: string, patch: Record<string, unknown>, accessToken: string | null) {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
    if (!supabaseUrl || !supabaseKey || !accessToken) return false;
    const url = `${supabaseUrl}/rest/v1/workspace_items?id=eq.${encodeURIComponent(itemId)}`;
    void fetch(url, {
      method: "PATCH",
      keepalive: true,
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(patch),
    });
    return true;
  } catch {
    return false;
  }
}

function TagMultiSelect({
  userId,
  guest,
  selected,
  colors,
  onToggle,
  onCreate,
  draft,
  setDraft,
}: {
  userId: string;
  guest: boolean;
  selected: string[];
  colors: Record<string, string>;
  onToggle: (t: string) => void;
  onCreate: (t: string) => void;
  draft: string;
  setDraft: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) { setOpen(false); setDraft(""); }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, setDraft]);

  const allQ = useQuery({
    queryKey: ["workspace-all-tags", userId],
    enabled: !guest && !!userId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_items" as any)
        .select("tags")
        .eq("user_id", userId)
        .limit(500);
      if (error) throw error;
      const set = new Set<string>();
      for (const r of (data as any[]) || []) for (const t of (r.tags || [])) set.add(String(t));
      return Array.from(set).sort();
    },
  });

  const options = useMemo(() => {
    const set = new Set<string>([...(allQ.data ?? []), ...Object.keys(colors), ...selected]);
    const q = draft.trim().replace(/^#/, "").toLowerCase();
    const list = Array.from(set).sort();
    return q ? list.filter((t) => t.includes(q)) : list;
  }, [allQ.data, colors, selected, draft]);

  const cleanDraft = draft.trim().replace(/^#/, "").toLowerCase();
  const canCreate = !!cleanDraft && !options.includes(cleanDraft);

  return (
    <div className="ws-tagms" ref={wrapRef} onClick={(e) => e.stopPropagation()}>
      <style>{`
        .ws-tagms{position:relative;display:inline-block;font-family:'Poppins',sans-serif;}
        .ws-tagms-btn{background:transparent;border:1px dashed rgba(24,26,77,0.25);color:#20201C;border-radius:999px;padding:4px 11px;font-size:11px;font-weight:600;font-family:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:5px;}
        .ws-tagms-btn:hover{border-color:#181A4D;border-style:solid;color:#181A4D;}
        .ws-tagms-menu{position:absolute;top:calc(100% + 6px);left:0;z-index:90;background:#fff;border:1px solid rgba(24,26,77,0.15);border-radius:12px;padding:8px;min-width:220px;max-height:280px;overflow:auto;box-shadow:0 8px 24px rgba(24,26,77,0.15);}
        .ws-tagms-menu input{width:100%;border:1px solid rgba(24,26,77,0.15);border-radius:8px;padding:6px 8px;font-size:12px;font-family:inherit;margin-bottom:6px;outline:none;background:#fff;}
        .ws-tagms-menu input:focus{border-color:#181A4D;}
        .ws-tagms-opt{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;padding:7px 9px;border:none;background:transparent;border-radius:8px;cursor:pointer;font-family:inherit;font-size:12px;color:#20201C;text-align:left;}
        .ws-tagms-opt:hover{background:#FBF8ED;}
        .ws-tagms-opt.on{background:rgba(15,74,66,0.08);font-weight:700;color:#0F4A42;}
        .ws-tagms-dot{width:10px;height:10px;border-radius:50%;border:1px solid rgba(24,26,77,0.15);flex-shrink:0;}
        .ws-tagms-create{display:block;width:100%;padding:7px 9px;border:none;border-radius:8px;background:#F2FBF4;color:#0F4A42;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;margin-top:4px;text-align:left;}
        .ws-tagms-empty{padding:8px 9px;font-size:11.5px;color:#8a8879;}
      `}</style>
      <button type="button" className="ws-tagms-btn" onClick={() => setOpen((o) => !o)}>
        + tag <span aria-hidden>▾</span>
      </button>
      {open && (
        <div className="ws-tagms-menu">
          <input
            autoFocus
            placeholder="Search or create a tag…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && cleanDraft) {
                e.preventDefault();
                if (canCreate) onCreate(cleanDraft);
                else if (!selected.includes(cleanDraft)) onToggle(cleanDraft);
                setDraft("");
              }
            }}
          />
          {options.length === 0 && !canCreate && <div className="ws-tagms-empty">No tags yet.</div>}
          {options.map((t) => {
            const on = selected.includes(t);
            return (
              <button
                key={t}
                type="button"
                className={`ws-tagms-opt ${on ? "on" : ""}`}
                onClick={() => onToggle(t)}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span className="ws-tagms-dot" style={colors[t] ? { background: colors[t] } : undefined} />
                  #{t}
                </span>
                {on && <span>✓</span>}
              </button>
            );
          })}
          {canCreate && (
            <button type="button" className="ws-tagms-create" onClick={() => { onCreate(cleanDraft); setDraft(""); }}>
              + Create "{cleanDraft}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
