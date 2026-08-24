/**
 * One source of truth for how a workspace note *looks* — used by every surface
 * that renders `WorkspaceEditor`:
 *
 *  - the workspace page (Read/Pray/To-Do → workspace notes, incl. focus mode)
 *  - the Notes page detail panel
 *  - the Read page full-screen study view
 *
 * `WorkspaceEditor` injects this once into <head>, so any new surface picks up
 * the identical typography, toolbar, tables, callouts, and link cards without
 * copying rules around. Page-level <style> blocks can still layer layout
 * tweaks on top (they render later in the document).
 */
export const WORKSPACE_EDITOR_CSS = `
.ws-editor{border:none;background:transparent;position:relative;scroll-margin-top:110px;}
.ws-toolbar{display:flex;flex-wrap:wrap;gap:4px;padding:8px 0;border-bottom:1px solid rgba(24,26,77,0.10);background:#fff;margin:0 0 12px;}
.ws-tb-btn{background:transparent;border:none;color:#181A4D;font-family:'Poppins',sans-serif;font-weight:600;font-size:11.5px;padding:5px 9px;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;}
.ws-tb-btn:hover{background:rgba(24,26,77,0.06);text-decoration:underline;text-underline-offset:3px;}
.ws-tb-btn.on{background:#181A4D;color:#fff;text-decoration:underline;text-underline-offset:3px;}
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
.ws-editor-content strong{font-weight:700;color:#181A4D;}
.ws-editor-content em{font-style:italic;}
.ws-editor-content h1{font-size:20px;font-weight:700;color:#181A4D;margin:14px 0 6px;letter-spacing:-0.005em;}
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
.ws-editor-content a,.ws-editor-content a.ws-link{color:#181A4D;text-decoration:underline;}
.ws-editor-content img,.ws-editor-content img.ws-img{max-width:100%;height:auto;border-radius:8px;margin:8px 0;display:block;}
.ws-editor-content code{background:rgba(24,26,77,0.06);border-radius:4px;padding:1px 5px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12.5px;color:#181A4D;}
.ws-editor-content pre{background:#181A4D;color:#DCE07A;border-radius:8px;padding:12px 14px;margin:10px 0;overflow-x:auto;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12.5px;line-height:1.55;}
.ws-editor-content pre code{background:transparent;padding:0;color:inherit;}
.ws-editor-content p.is-editor-empty:first-child::before{content:attr(data-placeholder);color:#20201C;opacity:0.35;float:left;height:0;pointer-events:none;}
.ws-editor-content .ws-linkcard{display:flex;gap:12px;border:1px solid rgba(24,26,77,0.1);background:#FBF8ED;border-radius:10px;overflow:hidden;text-decoration:none;color:inherit;margin:8px 0;max-width:520px;}
.ws-editor-content .ws-linkcard:hover{background:#f5efd8;}
.ws-editor-content .ws-linkcard-img{flex:0 0 96px;background-size:cover;background-position:center;background-color:#DCE07A;}
.ws-editor-content .ws-linkcard-body{flex:1;padding:10px 12px;display:flex;flex-direction:column;gap:4px;min-width:0;}
.ws-editor-content .ws-linkcard-domain{font-size:10.5px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#181A4D;}
.ws-editor-content .ws-linkcard-title{font-size:13px;font-weight:700;color:#181A4D;line-height:1.35;}
.ws-editor-content .ws-linkcard-desc{font-size:12px;color:#8a8678;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.ws-editor-content table,.ws-editor-content .ws-table{border-collapse:collapse;margin:10px 0;width:100%;table-layout:fixed;overflow:hidden;}
.ws-editor-content table td,.ws-editor-content table th{border:1px solid rgba(24,26,77,0.28);padding:6px 8px;vertical-align:top;min-width:60px;position:relative;}
.ws-editor-content table th{background:#F1EDDD;font-weight:700;color:#181A4D;text-align:left;}
.ws-editor-content table .selectedCell{background:rgba(202,195,7,0.22);}
.ws-editor-content table p{margin:0;}
.ws-editor-content hr{border:none;border-top:1px solid rgba(24,26,77,0.25);margin:14px 0;}
.ws-editor-content hr.ProseMirror-selectednode{border-top-color:#181A4D;}
.ws-editor-content .ws-callout{display:flex;gap:10px;background:#FFF4D6;border:1px solid rgba(255,174,0,0.35);border-left:4px solid #FFAE00;border-radius:8px;padding:10px 12px;margin:10px 0;}
.ws-editor-content .ws-callout[data-tone="teal"]{background:#E4F1EE;border-color:rgba(15,74,66,0.25);border-left-color:#0F4A42;}
.ws-editor-content .ws-callout[data-tone="blush"]{background:#FBE3E9;border-color:rgba(233,144,162,0.35);border-left-color:#E990A2;}
.ws-editor-content .ws-callout[data-tone="lime"]{background:#F2F4C7;border-color:rgba(202,195,7,0.4);border-left-color:#CAC307;}
.ws-editor-content .ws-callout-emoji{font-size:18px;line-height:1.4;user-select:none;flex-shrink:0;}
.ws-editor-content .ws-callout-body{flex:1;min-width:0;}
.ws-editor-content .ws-callout-body > *:last-child{margin-bottom:0;}

/* ── Document mode ────────────────────────────────────────────────────
   The reading/writing surface used whenever a note gets the whole screen:
   workspace focus mode, the Notes page panel, and the Read page study view.
   Same rhythm everywhere, just roomier than the 3-column workspace card. */
.ws-doc .ws-editor-content,
.ws-root.is-full .ws-editor-content{font-size:16px;line-height:1.75;padding-top:18px;}
.ws-doc .ws-editor-content p,
.ws-root.is-full .ws-editor-content p{margin:0 0 12px;}
.ws-doc .ws-editor-content h1,
.ws-root.is-full .ws-editor-content h1{font-size:27px;margin:24px 0 10px;}
.ws-doc .ws-editor-content h2,
.ws-root.is-full .ws-editor-content h2{font-size:22px;margin:22px 0 9px;}
.ws-doc .ws-editor-content h3,
.ws-root.is-full .ws-editor-content h3{font-size:18px;margin:18px 0 8px;}
.ws-doc .ws-editor-content ul,.ws-doc .ws-editor-content ol,
.ws-root.is-full .ws-editor-content ul,.ws-root.is-full .ws-editor-content ol{margin:0 0 12px;padding-left:24px;}
.ws-doc .ws-editor-content li,
.ws-root.is-full .ws-editor-content li{margin-bottom:5px;}
.ws-doc .ws-editor-content blockquote,
.ws-root.is-full .ws-editor-content blockquote{margin:14px 0;padding-left:16px;}
.ws-doc .ws-editor-content table th,
.ws-root.is-full .ws-editor-content table th{padding:10px 12px;}
.ws-doc .ws-editor-content table td,
.ws-root.is-full .ws-editor-content table td{padding:10px 12px;}
.ws-doc .ws-toolbar{position:sticky;top:0;z-index:40;padding:10px 0 8px;box-shadow:0 2px 8px rgba(24,26,77,0.04);}
`;
