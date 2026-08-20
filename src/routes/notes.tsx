import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SAVED_CSS, SignGate, useAuth } from "@/components/saved-shared";
import { supabase } from "@/integrations/supabase/client";
import { WorkspaceEditor } from "@/components/workspace/WorkspaceEditor";

export const Route = createFileRoute("/notes")({
  validateSearch: (s: Record<string, unknown>): { doc?: string } =>
    typeof s.doc === "string" ? { doc: s.doc } : {},

  component: NotesPage,

  head: () => ({
    meta: [
      { title: "Notes — CoCreate" },
      { name: "description", content: "All of your workspace documents in one place — open, edit, and filter by tag." },
      { property: "og:title", content: "Notes — CoCreate" },
      { property: "og:description", content: "Every workspace document you've written, right where you can return to it." },
    ],
  }),
});

type Doc = {
  id: string;
  user_id: string;
  devotional_entry_id: string | null;
  title: string;
  body: any;
  body_text: string;
  tags: string[];
  status: "open" | "closed";
  created_at: string;
  updated_at: string;
};

// Normalize a tag so "Deep-Prayer", "deep prayer", and "DEEP_PRAYER" collapse
// into the same filter bucket. We collapse dashes, underscores, and whitespace
// to a single space, then lowercase.
const normalizeTag = (t: string) =>
  (t ?? "").toString().trim().toLowerCase().replace(/[\s_-]+/g, " ").trim();

const displayTag = (t: string) => {
  const n = normalizeTag(t);
  if (!n) return "";
  return n.replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatShort = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const formatLong = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

// ─── Layout / styles ────────────────────────────────────────────────
const NOTES_CSS = `
.nt-frame{width:100%;height:100%;background:#FBF8ED;display:flex;overflow:hidden;font-family:'Poppins',sans-serif;}
.nt-panel-body .ws-editor-content, .nt-panel-body .ProseMirror{font-family:'Poppins',sans-serif;font-size:13.5px;line-height:1.55;color:#20201C;outline:none;padding:0;}
.nt-panel-body .ws-editor-content p, .nt-panel-body .ProseMirror p{margin:0 0 8px;}
.nt-panel-body .ws-editor-content p:last-child, .nt-panel-body .ProseMirror p:last-child{margin-bottom:0;}
.nt-panel-body .ws-editor-content strong, .nt-panel-body .ProseMirror strong{font-weight:700;color:#181A4D;}
.nt-panel-body .ws-editor-content em, .nt-panel-body .ProseMirror em{font-style:italic;}
.nt-panel-body .ws-editor-content h1, .nt-panel-body .ProseMirror h1{font-size:20px;font-weight:700;color:#181A4D;margin:12px 0 6px;letter-spacing:-0.005em;}
.nt-panel-body .ws-editor-content h2, .nt-panel-body .ProseMirror h2{font-size:17px;font-weight:700;color:#181A4D;margin:12px 0 6px;letter-spacing:-0.005em;}
.nt-panel-body .ws-editor-content h3, .nt-panel-body .ProseMirror h3{font-size:15px;font-weight:700;color:#181A4D;margin:10px 0 5px;}
.nt-panel-body .ws-editor-content ul, .nt-panel-body .ProseMirror ul{list-style:disc outside;padding-left:18px;margin:0 0 6px;}
.nt-panel-body .ws-editor-content ol, .nt-panel-body .ProseMirror ol{list-style:decimal outside;padding-left:20px;margin:0 0 6px;}
.nt-panel-body .ws-editor-content ul ul, .nt-panel-body .ws-editor-content ol ul, .nt-panel-body .ws-editor-content ul ol, .nt-panel-body .ws-editor-content ol ol,
.nt-panel-body .ProseMirror ul ul, .nt-panel-body .ProseMirror ol ul, .nt-panel-body .ProseMirror ul ol, .nt-panel-body .ProseMirror ol ol{padding-left:18px;margin:2px 0;}
.nt-panel-body .ws-editor-content li, .nt-panel-body .ProseMirror li{margin-bottom:2px;padding-left:2px;}
.nt-panel-body .ws-editor-content li::marker, .nt-panel-body .ProseMirror li::marker{color:#181A4D;}
.nt-panel-body .ws-editor-content li > p, .nt-panel-body .ProseMirror li > p{margin:0;}
.nt-panel-body .ws-editor-content blockquote, .nt-panel-body .ProseMirror blockquote{border-left:3px solid #DCE07A;padding:2px 0 2px 12px;margin:8px 0;color:#5c5847;font-style:italic;}
.nt-panel-body .ws-editor-content mark, .nt-panel-body .ProseMirror mark{padding:0 2px;border-radius:3px;}
.nt-panel-body .ws-editor-content a, .nt-panel-body .ws-editor-content a.ws-link, .nt-panel-body .ProseMirror a{color:#181A4D;text-decoration:underline;}
.nt-panel-body .ws-editor-content img, .nt-panel-body .ws-editor-content img.ws-img, .nt-panel-body .ProseMirror img{max-width:100%;height:auto;border-radius:8px;margin:8px 0;display:block;}
.nt-panel-body .ws-editor-content code, .nt-panel-body .ProseMirror code{background:rgba(24,26,77,0.06);border-radius:4px;padding:1px 5px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12.5px;color:#181A4D;}
.nt-panel-body .ws-editor-content pre, .nt-panel-body .ProseMirror pre{background:#181A4D;color:#DCE07A;border-radius:8px;padding:12px 14px;margin:10px 0;overflow-x:auto;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12.5px;line-height:1.55;}
.nt-panel-body .ws-editor-content pre code, .nt-panel-body .ProseMirror pre code{background:transparent;padding:0;color:inherit;}
.nt-panel-body .ws-editor-content hr, .nt-panel-body .ProseMirror hr{border:none;border-top:1px solid rgba(24,26,77,0.14);margin:14px 0;}
.nt-panel-body .ws-editor-content .ws-table, .nt-panel-body .ProseMirror table{border-collapse:collapse;margin:10px 0;width:100%;table-layout:fixed;overflow:hidden;}
.nt-panel-body .ws-editor-content .ws-table td, .nt-panel-body .ws-editor-content .ws-table th,
.nt-panel-body .ProseMirror table td, .nt-panel-body .ProseMirror table th{border:1px solid rgba(24,26,77,0.18);padding:6px 8px;vertical-align:top;min-width:60px;position:relative;}
.nt-panel-body .ws-editor-content .ws-table th, .nt-panel-body .ProseMirror table th{background:#F1EDDD;font-weight:700;color:#181A4D;text-align:left;}
.nt-panel-body .ws-editor-content .ws-callout{display:flex;gap:10px;background:#FFF4D6;border:1px solid rgba(255,174,0,0.35);border-left:4px solid #FFAE00;border-radius:8px;padding:10px 12px;margin:10px 0;}
.nt-panel-body .ws-editor-content .ws-callout[data-tone="teal"]{background:#E4F1EE;border-color:rgba(15,74,66,0.25);border-left-color:#0F4A42;}
.nt-panel-body .ws-editor-content .ws-callout[data-tone="blush"]{background:#FBE3E9;border-color:rgba(233,144,162,0.35);border-left-color:#E990A2;}
.nt-panel-body .ws-editor-content .ws-callout[data-tone="lime"]{background:#F2F4C7;border-color:rgba(202,195,7,0.4);border-left-color:#CAC307;}
.nt-panel-body .ws-editor-content .ws-callout-emoji{font-size:18px;line-height:1.4;user-select:none;flex-shrink:0;}
.nt-panel-body .ws-editor-content .ws-callout-body{flex:1;min-width:0;}
.nt-panel-body .ws-editor-content .ws-callout-body > *:last-child{margin-bottom:0;}
.nt-panel-body .ws-editor-content .ws-linkcard{display:flex;gap:12px;border:1px solid rgba(24,26,77,0.1);background:#FBF8ED;border-radius:10px;overflow:hidden;text-decoration:none;color:inherit;margin:8px 0;max-width:520px;}
.nt-panel-body .ws-editor-content .ws-linkcard-img{flex:0 0 96px;background-size:cover;background-position:center;background-color:#DCE07A;}
.nt-panel-body .ws-editor-content .ws-linkcard-body{flex:1;padding:10px 12px;display:flex;flex-direction:column;gap:4px;min-width:0;}
.nt-panel-body .ws-editor-content .ws-linkcard-domain{font-size:10.5px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#181A4D;}
.nt-panel-body .ws-editor-content .ws-linkcard-title{font-size:13px;font-weight:700;color:#181A4D;line-height:1.35;}
.nt-panel-body .ws-editor-content .ws-linkcard-desc{font-size:12px;color:#8a8678;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
/* ── Page frame ─────────────────────────────────────────────── */
.nt-wrap{width:100%;min-height:100%;background:#FBF8ED;font-family:'Poppins',sans-serif;display:flex;flex-direction:column;padding:40px 44px 28px;overflow:hidden;}
.nt-eyebrow{font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#0F4A42;margin:0 0 8px;}
.nt-h1{font-family:'Archivo Black','Poppins',sans-serif;font-weight:900;font-size:46px;line-height:1;letter-spacing:-.02em;margin:0 0 10px;color:#20201C;}
.nt-desc{color:#6B6862;font-size:15px;line-height:1.55;max-width:640px;margin:0 0 22px;}

/* ── Toolbar ────────────────────────────────────────────────── */
.nt-toolbar{display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap;}
.nt-newbtn{background:#181A4D;color:#DCE07A;border:none;font-family:inherit;font-weight:700;font-size:14px;padding:12px 20px;border-radius:999px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;white-space:nowrap;transition:background .15s ease;}
.nt-newbtn:hover{background:#0F4A42;}
.nt-newbtn:disabled{opacity:.6;cursor:default;}
.nt-select{appearance:none;-webkit-appearance:none;border:1px solid #E7E1CF;background:#fff url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'><path fill='%23181A4D' d='M6 8L0 0h12z'/></svg>") no-repeat right 14px center;background-size:9px 6px;border-radius:999px;padding:11px 34px 11px 16px;font-family:inherit;font-size:13.5px;font-weight:600;color:#20201C;cursor:pointer;}
.nt-select:focus{outline:none;border-color:#181A4D;}
.nt-search{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #E7E1CF;border-radius:999px;padding:10px 16px;flex:1;min-width:190px;max-width:320px;margin-left:auto;}
.nt-search input{border:none;outline:none;background:transparent;font-family:inherit;font-size:14px;width:100%;color:#20201C;}
.nt-search svg{flex-shrink:0;color:#B9B4A3;}

/* ── Tag chips ──────────────────────────────────────────────── */
.nt-sectionlabel{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#8a8678;margin:0 0 10px;}
.nt-chiprow{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:22px;}
.nt-chip{font-family:inherit;font-weight:700;font-size:12.5px;padding:8px 15px;border-radius:999px;cursor:pointer;border:1px solid transparent;background:#fff;color:#20201C;border-color:#E7E1CF;transition:transform .12s ease,box-shadow .12s ease;}
.nt-chip:hover{transform:translateY(-1px);}
.nt-chip.active{box-shadow:0 0 0 2px #181A4D;}
.nt-chip.all{background:#181A4D;color:#DCE07A;border-color:#181A4D;}

/* ── Pinned rail ────────────────────────────────────────────── */
.nt-rail{display:flex;gap:12px;overflow-x:auto;padding-bottom:18px;margin-bottom:6px;border-bottom:1px solid #E7E1CF;}
.nt-railcard{flex:0 0 210px;background:#fff;border:1px solid #E7E1CF;border-radius:14px;padding:14px 16px;cursor:pointer;text-align:left;font-family:inherit;transition:border-color .15s ease;}
.nt-railcard:hover{border-color:#181A4D;}
.nt-railcard.pinned{border-color:#181A4D;}
.nt-railtag{font-size:10px;font-weight:700;padding:3px 9px;border-radius:999px;display:inline-block;margin-bottom:8px;background:rgba(220,224,122,.55);color:#0F4A42;}
.nt-railtitle{font-size:13px;font-weight:700;line-height:1.3;margin-bottom:6px;color:#20201C;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.nt-raildate{font-size:11px;color:#8a8678;}
.nt-railempty{font-size:12.5px;color:#8a8678;padding:8px 0 18px;border-bottom:1px solid #E7E1CF;margin-bottom:6px;}

/* ── Split body ─────────────────────────────────────────────── */
.nt-split{display:flex;gap:24px;flex:1;min-height:0;margin-top:18px;}
.nt-listcol{width:390px;flex-shrink:0;overflow-y:auto;padding-right:6px;display:flex;flex-direction:column;gap:10px;}
.nt-card{background:#fff;border:1px solid #E7E1CF;border-radius:14px;padding:16px 18px;cursor:pointer;border-left:4px solid transparent;text-align:left;font-family:inherit;width:100%;transition:border-color .15s ease;}
.nt-card:hover{border-color:#d8d2bd;}
.nt-card.open{border-left-color:#DCE07A;background:#F3F6DC;border-color:#EAEECB;}
.nt-cardtop{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;}
.nt-doc-tags{display:flex;gap:5px;flex-wrap:wrap;min-width:0;}
.nt-doc-tag{display:inline-block;font-size:10px;font-weight:700;padding:4px 10px;border-radius:999px;background:rgba(220,224,122,0.55);color:#0F4A42;letter-spacing:.02em;}
.nt-doc-date{font-size:11px;color:#8a8678;font-weight:500;flex-shrink:0;}
.nt-doc-title{font-size:15px;font-weight:700;margin:0 0 4px;color:#20201C;}
.nt-doc-preview{font-size:12.5px;color:#6B6862;line-height:1.45;margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.nt-doc-empty{padding:26px 4px;color:#8a8678;font-size:12.5px;line-height:1.55;}

.nt-detailcol{flex:1;min-width:0;overflow-y:auto;}
.nt-detailcard{background:#fff;border:1px solid #E7E1CF;border-radius:18px;min-height:100%;display:flex;flex-direction:column;overflow:hidden;}
.nt-backbtn{display:none;}

/* ── Detail panel ───────────────────────────────────────────── */
.nt-edit-btn{background:#FBF8ED;border:1px solid rgba(24,26,77,0.15);color:#181A4D;border-radius:999px;padding:6px 16px;font-family:'Poppins',sans-serif;font-weight:600;font-size:12px;cursor:pointer;margin-right:4px;}
.nt-edit-btn:hover{background:#DCE07A;border-color:#CAC307;}
.nt-edit-btn.active{background:#181A4D;color:#DCE07A;border-color:#181A4D;}
.nt-panel{flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden;background:#fff;}
.nt-panel-header{padding:22px 30px 14px;display:flex;align-items:flex-start;justify-content:space-between;gap:10px;border-bottom:1px solid #F0EBDC;background:#fff;flex-shrink:0;}
.nt-panel-header-info{min-width:0;flex:1;}
.nt-tag-pill{display:inline-block;font-size:10px;font-weight:700;padding:4px 10px;border-radius:999px;background:#DCE07A;color:#181A4D;margin-bottom:6px;letter-spacing:.02em;}
.nt-p-title{font-weight:800;font-size:20px;color:#20201C;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.nt-p-date{font-size:12px;color:#8a8678;font-weight:500;margin-top:3px;}
.nt-panel-close{background:none;border:none;cursor:pointer;color:#8a8678;font-size:18px;line-height:1;padding:2px 6px;border-radius:6px;flex-shrink:0;}
.nt-panel-close:hover{background:rgba(24,26,77,0.06);color:#181A4D;}
.nt-panel-body{flex:1;overflow-y:auto;padding:24px 30px 30px;}

.nt-panel-title-input{width:100%;border:none;background:transparent;font-family:'Poppins',sans-serif;font-weight:800;font-size:26px;color:#20201C;margin-bottom:8px;padding:0;outline:none;letter-spacing:-0.01em;}
.nt-panel-title-input::placeholder{color:#181A4D;opacity:0.3;}
.nt-panel-tagrow{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;align-items:center;}
.nt-panel-tag{background:rgba(15,74,66,0.08);color:#0F4A42;border-radius:999px;padding:3px 10px;font-size:11px;font-weight:600;display:inline-flex;align-items:center;gap:6px;font-family:'Poppins',sans-serif;}
.nt-panel-tag button{background:none;border:none;color:#0F4A42;font-size:12px;cursor:pointer;padding:0;line-height:1;opacity:0.55;}
.nt-panel-tag button:hover{opacity:1;}
.nt-tag-input{background:transparent;border:1px dashed rgba(24,26,77,0.15);color:#20201C;border-radius:999px;padding:3px 10px;font-size:11px;font-weight:600;font-family:'Poppins',sans-serif;outline:none;width:88px;}
.nt-tag-input:focus{border-color:#181A4D;border-style:solid;color:#181A4D;}

.nt-panel-actions{display:flex;gap:16px;margin-top:18px;align-items:center;padding-top:12px;border-top:1px dashed rgba(24,26,77,0.1);}
.nt-panel-link{background:none;border:none;font-family:'Poppins',sans-serif;font-weight:600;font-size:11.5px;cursor:pointer;padding:0;color:#181A4D;}
.nt-panel-link:hover{text-decoration:underline;}
.nt-panel-link.del{color:#20201C;opacity:0.45;}
.nt-panel-link.del:hover{opacity:0.9;}
.nt-panel-status{font-size:10px;color:#8a8678;font-weight:600;margin-left:auto;}
.nt-panel-empty{flex:1;display:flex;align-items:center;justify-content:center;color:#8a8678;font-size:13px;text-align:center;padding:40px;}

/* ── Mobile: single view at a time ──────────────────────────── */
.nt-mobilebar{display:none;}
@media (max-width:900px){
  .nt-wrap{padding:16px 16px 24px;overflow:visible;}
  .nt-eyebrow,.nt-h1,.nt-desc{display:none;}
  .nt-mobilebar{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}
  .nt-mobilebar .m-title{font-size:26px;font-weight:900;color:#20201C;letter-spacing:-.01em;}
  .nt-mobilebar .m-actions{display:flex;gap:8px;}
  .nt-iconbtn{width:38px;height:38px;border-radius:999px;background:#fff;border:1px solid #E7E1CF;display:flex;align-items:center;justify-content:center;color:#8a8678;cursor:pointer;padding:0;}
  .nt-iconbtn.primary{background:#181A4D;color:#DCE07A;border-color:#181A4D;font-size:20px;font-weight:700;}
  .nt-toolbar{gap:8px;margin-bottom:12px;}
  .nt-toolbar .nt-newbtn{display:none;}
  .nt-select{font-size:12.5px;padding:9px 30px 9px 14px;}
  .nt-search{max-width:none;margin-left:0;width:100%;}
  .nt-search.hidden{display:none;}
  .nt-chiprow{flex-wrap:nowrap;overflow-x:auto;margin-bottom:14px;padding-bottom:4px;}
  .nt-chip{flex-shrink:0;}
  .nt-rail{padding-bottom:14px;}
  .nt-railcard{flex:0 0 160px;padding:12px 14px;}
  .nt-split{display:block;margin-top:14px;}
  .nt-listcol{width:100%;padding-right:0;overflow:visible;}
  .nt-detailcol{display:none;}
  /* Detail takes over the screen */
  .nt-wrap.detail .nt-mobilebar,
  .nt-wrap.detail .nt-toolbar,
  .nt-wrap.detail .nt-sectionlabel,
  .nt-wrap.detail .nt-chiprow,
  .nt-wrap.detail .nt-rail,
  .nt-wrap.detail .nt-railempty,
  .nt-wrap.detail .nt-listcol{display:none;}
  .nt-wrap.detail .nt-detailcol{display:block;}
  .nt-detailcard{border:none;border-radius:14px;}
  .nt-panel-header{padding:14px 16px 12px;}
  .nt-panel-body{padding:16px 16px 26px;}
  .nt-backbtn{display:inline-flex;align-items:center;gap:6px;background:none;border:none;font-family:inherit;font-weight:700;font-size:13px;color:#181A4D;cursor:pointer;padding:6px 0;margin-bottom:6px;}
}

`;

function NotesPage() {
  const { userId, ready } = useAuth();

  if (ready && !userId) {
    return (
      <AppShell current="notes">
        <style dangerouslySetInnerHTML={{ __html: SAVED_CSS }} />
        <div className="sv-shell">
          <h1 className="sv-h1">Notes</h1>
          <p className="sv-sub">Every workspace document you create, in one place.</p>
          <SignGate />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell current="notes">
      <style dangerouslySetInnerHTML={{ __html: SAVED_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: NOTES_CSS }} />
      {userId ? <NotesLibrary userId={userId} /> : null}
    </AppShell>
  );
}

// ─── The library ────────────────────────────────────────────────────

function NotesLibrary({ userId }: { userId: string }) {
  const qc = useQueryClient();

  const docsQ = useQuery({
    queryKey: ["notes-docs-all", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_items" as any)
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Doc[];
    },
  });

  const tagColorsQ = useQuery({
    queryKey: ["user-tag-colors", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_tag_colors" as any)
        .select("tag,color")
        .eq("user_id", userId);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const r of (data as any[]) || []) {
        map[normalizeTag(r.tag)] = r.color;
      }
      return map;
    },
  });
  const tagColors = tagColorsQ.data ?? {};
  const colorFor = (t: string) => tagColors[normalizeTag(t)];

  const docs = docsQ.data ?? [];

  // Build canonical tag options: normalized -> display + count.
  const tagOptions = useMemo(() => {
    const map = new Map<string, { display: string; count: number }>();
    for (const d of docs) {
      for (const t of d.tags ?? []) {
        const n = normalizeTag(t);
        if (!n) continue;
        const existing = map.get(n);
        if (existing) existing.count += 1;
        else map.set(n, { display: displayTag(t), count: 1 });
      }
    }
    return Array.from(map.entries())
      .map(([key, v]) => ({ key, display: v.display, count: v.count }))
      .sort((a, b) => a.display.localeCompare(b.display));
  }, [docs]);

  const [tagFilter, setTagFilter] = useState<string>("");

  const filteredDocs = useMemo(() => {
    if (!tagFilter) return docs;
    return docs.filter((d) => (d.tags ?? []).some((t) => normalizeTag(t) === tagFilter));
  }, [docs, tagFilter]);

  // Layout: 1, 2, or 3 open panels.
  const [layout, setLayout] = useState<1 | 2 | 3>(1);
  // Ordered list of open doc IDs. First = most recently opened. When we need
  // to evict, we drop the last (least recently opened).
  const [openIds, setOpenIds] = useState<string[]>([]);

  // Trim open panels when layout shrinks.
  useEffect(() => {
    setOpenIds((cur) => cur.slice(0, layout));
  }, [layout]);

  // Auto-open the requested doc (deep link) or the newest doc on first load.
  const { doc: docParam } = Route.useSearch();
  const bootstrappedRef = useRef(false);
  useEffect(() => {
    if (bootstrappedRef.current) return;
    if (!docsQ.isSuccess) return;
    if (docs.length === 0) { bootstrappedRef.current = true; return; }
    bootstrappedRef.current = true;
    const target = docParam && docs.some((d) => d.id === docParam) ? docParam : docs[0].id;
    setOpenIds([target]);

  }, [docsQ.isSuccess, docs]);

  const openDoc = (id: string) => {
    setOpenIds((cur) => {
      if (cur[0] === id) return cur;
      const without = cur.filter((x) => x !== id);
      const next = [id, ...without].slice(0, layout);
      return next;
    });
  };

  const closePanel = (id: string) => {
    setOpenIds((cur) => cur.filter((x) => x !== id));
  };

  const createDoc = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("workspace_items" as any)
        .insert({
          user_id: userId,
          devotional_entry_id: null,
          title: "",
          body: {},
          body_text: "",
          tags: [],
          status: "open",
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Doc;
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["notes-docs-all", userId] });
      if (created?.id) openDoc(created.id);
    },
  });

  const openDocs = openIds
    .map((id) => docs.find((d) => d.id === id))
    .filter((d): d is Doc => !!d);

  return (
    <div className="nt-frame">
      <aside className="nt-list-col">
        <div className="nt-list-header">
          <div className="title">Notes</div>
          <div className="nt-filter">
            <label htmlFor="nt-tag-filter">Filter by tag</label>
            <select
              id="nt-tag-filter"
              className="nt-select"
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
            >
              <option value="">All tags ({docs.length})</option>
              {tagOptions.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.display} ({t.count})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="nt-doc-list">
          {docsQ.isLoading ? (
            <div className="nt-doc-empty">Loading…</div>
          ) : filteredDocs.length === 0 ? (
            <div className="nt-doc-empty">
              {docs.length === 0
                ? "No workspace documents yet. Create one on the right to begin."
                : "No documents match this tag."}
            </div>
          ) : (
            filteredDocs.map((d) => {
              const isOpen = openIds.includes(d.id);
              const preview = (d.body_text || "").replace(/\s+/g, " ").trim().slice(0, 120);
              return (
                <button
                  key={d.id}
                  className={`nt-doc-row ${isOpen ? "open" : ""}`}
                  onClick={() => openDoc(d.id)}
                >
                  <div className="nt-doc-top">
                    <span className="nt-doc-title">{d.title?.trim() || "Untitled"}</span>
                    <span className="nt-doc-date">{formatShort(d.updated_at)}</span>
                  </div>
                  {d.tags && d.tags.length > 0 && (
                    <div className="nt-doc-tags">
                      {d.tags.slice(0, 3).map((t, i) => {
                        const c = colorFor(t);
                        return (
                          <span
                            key={`${d.id}-${t}-${i}`}
                            className="nt-doc-tag"
                            style={c ? { background: c, color: "#181A4D" } : undefined}
                          >{displayTag(t)}</span>
                        );
                      })}
                    </div>
                  )}
                  {preview && <div className="nt-doc-preview">{preview}</div>}
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section className="nt-panel-region">
        <div className="nt-layout-toolbar">
          <span className="label">View</span>
          <button
            type="button"
            className={`nt-layout-btn ${layout === 1 ? "active" : ""}`}
            onClick={() => setLayout(1)}
            aria-label="Single panel"
          >
            <span className="col wide" />
          </button>
          <button
            type="button"
            className={`nt-layout-btn ${layout === 2 ? "active" : ""}`}
            onClick={() => setLayout(2)}
            aria-label="Two panels"
          >
            <span className="col" /><span className="col" />
          </button>
          <button
            type="button"
            className={`nt-layout-btn ${layout === 3 ? "active" : ""}`}
            onClick={() => setLayout(3)}
            aria-label="Three panels"
          >
            <span className="col" /><span className="col" /><span className="col" />
          </button>
          <button className="nt-new-btn" onClick={() => createDoc.mutate()} disabled={createDoc.isPending}>
            {createDoc.isPending ? "Creating…" : "+ New document"}
          </button>
        </div>

        <div className="nt-panels">
          {openDocs.length === 0 ? (
            <div className="nt-panel-empty">
              Choose a document from the list to open it here.
            </div>
          ) : (
            openDocs.map((d) => (
              <DocPanel
                key={d.id}
                doc={d}
                userId={userId}
                colorFor={colorFor}
                onClose={() => closePanel(d.id)}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

// ─── Panel: title + tags + editor + save ────────────────────────────

function DocPanel({
  doc,
  userId,
  colorFor,
  onClose,
}: {
  doc: Doc;
  userId: string;
  colorFor: (t: string) => string | undefined;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(doc.title);
  const [tags, setTags] = useState<string[]>(doc.tags ?? []);
  const [tagDraft, setTagDraft] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  const [hasPending, setHasPending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Record<string, unknown> | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    setTitle(doc.title);
    setTags(doc.tags ?? []);
    setEditing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id]);

  const flushSave = async () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (!pendingRef.current) return;
    if (inFlightRef.current) return;
    const patch = pendingRef.current;
    pendingRef.current = null;
    setHasPending(false);
    inFlightRef.current = true;
    setSaving(true);
    try {
      const { error } = await supabase.from("workspace_items" as any).update(patch).eq("id", doc.id);
      if (error) throw error;
      qc.setQueryData<Doc[]>(["notes-docs-all", userId], (cur) =>
        (cur ?? []).map((it) =>
          it.id === doc.id ? ({ ...it, ...patch, updated_at: new Date().toISOString() } as Doc) : it,
        ),
      );
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1400);
      qc.invalidateQueries({ queryKey: ["notes-docs-all", userId], refetchType: "none" });
    } catch (e) {
      pendingRef.current = { ...(patch as any), ...(pendingRef.current ?? {}) };
      setHasPending(true);
      console.error("notes save failed", e);
    } finally {
      inFlightRef.current = false;
      setSaving(false);
      if (pendingRef.current) void flushSave();
    }
  };

  const schedule = (patch: Record<string, unknown>) => {
    pendingRef.current = { ...(pendingRef.current ?? {}), ...patch };
    setHasPending(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { void flushSave(); }, 600);
  };

  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "hidden") void flushSave(); };
    const onHide = () => { void flushSave(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onHide);
      if (timerRef.current) clearTimeout(timerRef.current);
      void flushSave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id]);

  const removeDoc = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("workspace_items" as any).delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes-docs-all", userId] });
      onClose();
    },
  });

  const addTag = (t: string) => {
    const clean = normalizeTag(t);
    if (!clean) return;
    if (tags.map(normalizeTag).includes(clean)) return;
    const next = [...tags, clean];
    setTags(next);
    schedule({ tags: next });
  };
  const removeTag = (t: string) => {
    const next = tags.filter((x) => x !== t);
    setTags(next);
    schedule({ tags: next });
  };

  const primaryTagRaw = tags[0] ?? null;
  const primaryTag = primaryTagRaw ? displayTag(primaryTagRaw) : null;
  const primaryColor = primaryTagRaw ? colorFor(primaryTagRaw) : undefined;

  return (
    <div className="nt-panel">
      <header className="nt-panel-header">
        <div className="nt-panel-header-info">
          {primaryTag && (
            <div className="nt-tag-pill" style={primaryColor ? { background: primaryColor, color: "#181A4D" } : undefined}>{primaryTag}</div>
          )}
          <div className="nt-p-title">{title?.trim() || "Untitled"}</div>
          <div className="nt-p-date">{formatLong(doc.updated_at)}</div>
        </div>
        <button
          type="button"
          className={`nt-edit-btn ${editing ? "active" : ""}`}
          onClick={() => {
            if (editing) void flushSave();
            setEditing((v) => !v);
          }}
        >
          {editing ? "Done" : "Edit"}
        </button>
        <button
          type="button"
          className="nt-panel-close"
          onClick={() => { void flushSave(); onClose(); }}
          aria-label="Close panel"
        >
          ✕
        </button>
      </header>
      <div className="nt-panel-body">
        {editing ? (
          <input
            className="nt-panel-title-input"
            placeholder="Untitled"
            value={title}
            onChange={(e) => { setTitle(e.target.value); schedule({ title: e.target.value }); }}
            onBlur={() => { void flushSave(); }}
          />
        ) : (
          <div className="nt-panel-title-input" style={{ cursor: "default" }}>
            {title?.trim() || "Untitled"}
          </div>
        )}

        <div className="nt-panel-tagrow">
          {tags.map((t) => {
            const c = colorFor(t);
            return (
              <span key={t} className="nt-panel-tag" style={c ? { background: c, color: "#181A4D" } : undefined}>
                #{displayTag(t)}
                {editing && <button onClick={() => removeTag(t)} aria-label="Remove tag" style={c ? { color: "#181A4D" } : undefined}>×</button>}
              </span>
            );
          })}
          {editing && (
            <input
              className="nt-tag-input"
              placeholder="+ tag"
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag(tagDraft);
                  setTagDraft("");
                }
              }}
              onBlur={() => { if (tagDraft.trim()) { addTag(tagDraft); setTagDraft(""); } }}
            />
          )}
        </div>

        <WorkspaceEditor
          userId={userId}
          initialJSON={doc.body}
          onChange={(json, text) => schedule({ body: json, body_text: text })}
          onBlur={() => { void flushSave(); }}
          ignoreExternalUpdates={hasPending || saving}
          editable={editing}
        />

        <div className="nt-panel-actions">
          <button
            className="nt-panel-link del"
            onClick={() => { if (confirm("Delete this document?")) removeDoc.mutate(); }}
          >
            Delete
          </button>
          <span className="nt-panel-status">
            {saving || hasPending ? "Saving…" : savedFlash ? "Saved" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
