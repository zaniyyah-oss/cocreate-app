import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { AppShell } from "@/components/AppShell";
import { usePageContent } from "@/lib/page-content";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "CoCreate — Building what's been entrusted to you" },
      { name: "description", content: "Essays, teachings, podcasts, and devotionals to help you build what's been entrusted to you — with him, not just for him." },
      { property: "og:title", content: "CoCreate" },
      { property: "og:description", content: "A calm home for essays, teachings, podcasts, clips, and devotional practices." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type ContentPreview = Database["public"]["Views"]["content_items_public"]["Row"];
type ContentType = Database["public"]["Enums"]["content_type"];

const IMG_FALLBACK = (id: string) => `https://picsum.photos/seed/${id}/600/400`;

const routeForType = (t: ContentType) =>
  t === "teaching" ? "/teachings/$id" : t === "podcast" ? "/podcasts/$id" : "/essays/$id";

const STICKY_COLORS = ["limelight", "blush", "amber", "teal"] as const;
type StickyColor = typeof STICKY_COLORS[number];

const CSS = `
.hp-root{--cream:#FBF8ED;--navy:#181A4D;--teal:#0F4A42;--lime:#CAC307;--limelight:#DCE07A;--amber:#FFAE00;--burgundy:#441B07;--blush:#E990A2;--ink:#20201C;--hair:rgba(24,26,77,0.12);padding:26px 20px 90px;max-width:1360px;margin:0 auto;width:100%;font-family:'Poppins',sans-serif;color:var(--ink);}
@media (min-width:900px){.hp-root{padding:34px 44px 90px;}}

.hp-hero h1{font-weight:900;font-size:28px;color:var(--navy);margin:0 0 8px;letter-spacing:-0.01em;line-height:1.1;}
.hp-hero p{font-size:14px;color:var(--ink);opacity:0.65;margin:0 0 24px;max-width:640px;line-height:1.55;}
@media (min-width:900px){.hp-hero h1{font-size:36px;} .hp-hero p{font-size:15px;}}

.hp-widgetrow{display:grid;grid-template-columns:1fr;gap:16px;margin-bottom:32px;}
@media (min-width:900px){.hp-widgetrow{grid-template-columns:1.3fr 1fr;}}

.hp-scripture{background:#fff;border:1px solid var(--hair);border-radius:16px;padding:22px 26px;position:relative;overflow:hidden;}
.hp-scripture::before{content:'';position:absolute;left:0;top:0;bottom:0;width:5px;background:var(--teal);}
.hp-sw-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:12px;}
.hp-sw-badge{font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:var(--teal);}
.hp-sw-shuffle{font-size:11.5px;font-weight:600;color:var(--navy);opacity:0.55;cursor:pointer;background:none;border:none;font-family:inherit;padding:0;}
.hp-sw-shuffle:hover{opacity:1;}
.hp-sw-verse{font-size:18px;font-weight:600;color:var(--navy);line-height:1.4;margin-bottom:6px;}
.hp-sw-ref{font-size:12.5px;color:var(--ink);opacity:0.55;font-weight:600;}

.hp-postit{background:#fff;border:1px solid var(--hair);border-radius:16px;padding:20px 22px;}
.hp-pw-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;}
.hp-pw-title{font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:var(--navy);opacity:0.55;}
.hp-pw-add{font-size:11.5px;font-weight:600;color:var(--navy);background:var(--limelight);border-radius:999px;padding:5px 12px;cursor:pointer;border:none;font-family:inherit;}
.hp-cork{display:flex;gap:10px;flex-wrap:wrap;}
.hp-postit-note{width:100px;height:100px;border-radius:4px;padding:10px;font-size:11.5px;font-weight:600;line-height:1.35;box-shadow:0 3px 8px rgba(24,26,77,0.08);position:relative;cursor:pointer;overflow:hidden;word-wrap:break-word;}
.hp-postit-note.limelight{background:var(--limelight);color:var(--navy);}
.hp-postit-note.blush{background:var(--blush);color:var(--burgundy);}
.hp-postit-note.amber{background:var(--amber);color:var(--navy);}
.hp-postit-note.teal{background:var(--teal);color:var(--cream);}
.hp-postit-note .hp-note-del{position:absolute;top:2px;right:5px;font-size:14px;opacity:0;background:none;border:none;cursor:pointer;color:inherit;font-family:inherit;}
.hp-postit-note:hover .hp-note-del{opacity:0.7;}
.hp-postit-add{width:100px;height:100px;background:transparent;border:1.5px dashed var(--hair);display:flex;align-items:center;justify-content:center;color:var(--navy);opacity:0.4;font-size:22px;cursor:pointer;font-family:inherit;border-radius:4px;}
.hp-note-editor{width:100%;background:#fff;border:1px solid var(--hair);border-radius:8px;padding:10px;margin-top:12px;display:flex;flex-direction:column;gap:8px;}
.hp-note-editor textarea{border:1px solid var(--hair);border-radius:6px;padding:8px;font-family:inherit;font-size:12px;resize:vertical;min-height:60px;}
.hp-note-editor .row{display:flex;gap:6px;align-items:center;justify-content:space-between;}
.hp-note-swatch{width:20px;height:20px;border-radius:4px;border:2px solid transparent;cursor:pointer;}
.hp-note-swatch.on{border-color:var(--navy);}
.hp-note-editor button{background:var(--navy);color:#fff;border:none;padding:6px 12px;font-size:11.5px;font-weight:700;border-radius:99px;cursor:pointer;font-family:inherit;}
.hp-note-signin{font-size:12px;color:var(--ink);opacity:0.55;padding:8px 0;}

.hp-shortrow{display:grid;grid-template-columns:1fr;gap:12px;margin-bottom:34px;}
@media (min-width:640px){.hp-shortrow{grid-template-columns:repeat(3,1fr);gap:16px;}}
.hp-shortcard{border-radius:14px;overflow:hidden;position:relative;aspect-ratio:3/4;display:flex;flex-direction:column;justify-content:flex-end;padding:16px;color:#fff;background-size:cover;background-position:center;background-color:var(--navy);cursor:pointer;text-decoration:none;}
.hp-shortcard::before{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(24,26,77,0.05),rgba(24,26,77,0.88));}
.hp-shortcard .z{position:relative;z-index:2;color:#fff;}
.hp-pill{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;letter-spacing:0.03em;text-transform:uppercase;padding:4px 9px;border-radius:5px;position:absolute;top:12px;left:12px;z-index:2;}
.hp-pill.ad{background:var(--amber);color:var(--navy);}
.hp-pill.clip{background:rgba(255,255,255,0.22);color:#fff;backdrop-filter:blur(6px);}
.hp-shortcard .headline{font-size:15px;font-weight:700;line-height:1.3;margin-bottom:4px;}
.hp-shortcard .sub{font-size:11px;opacity:0.75;font-weight:600;}
.hp-playicon{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.92);display:flex;align-items:center;justify-content:center;margin-bottom:10px;}
.hp-cta{display:inline-block;margin-top:10px;background:var(--limelight);color:var(--navy);font-size:11px;font-weight:700;padding:6px 13px;border-radius:999px;}

.hp-sectionlabel{display:flex;align-items:center;justify-content:space-between;margin:6px 0 14px;}
.hp-sectionlabel .title{font-size:12px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:var(--navy);opacity:0.55;}
.hp-sectionlabel .count{background:rgba(24,26,77,0.08);border-radius:999px;padding:2px 9px;font-size:11px;color:var(--navy);}

.hp-compactgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:40px;}
@media (min-width:640px){.hp-compactgrid{grid-template-columns:repeat(3,1fr);}}
@media (min-width:1024px){.hp-compactgrid{grid-template-columns:repeat(4,1fr);gap:14px;}}
.hp-compactcard{background:#fff;border-radius:12px;overflow:hidden;border:1px solid var(--hair);cursor:pointer;text-decoration:none;color:inherit;display:block;transition:transform .18s ease, box-shadow .18s ease;}
.hp-compactcard:hover{transform:translateY(-2px);box-shadow:0 10px 22px rgba(0,0,0,0.06);}
.hp-compactthumb{height:96px;background-size:cover;background-position:center;position:relative;background-color:var(--limelight);overflow:hidden;}
.hp-compactthumb img{width:100%;height:100%;object-fit:cover;display:block;filter:grayscale(0.15) contrast(1.05);}
.hp-compactthumb::after{content:'';position:absolute;inset:0;mix-blend-mode:multiply;opacity:0.45;pointer-events:none;}
.hp-compactthumb.teaching::after{background:#FFAE00;}
.hp-compactthumb.essay::after,.hp-compactthumb.blog::after{background:#DCE07A;}
.hp-compactthumb.podcast::after{background:#0F4A42;}
.hp-compactthumb.clip::after{background:#CAC307;}
.hp-ctag{position:absolute;top:8px;left:8px;font-size:9px;font-weight:700;letter-spacing:0.03em;text-transform:uppercase;padding:3px 8px;border-radius:4px;color:#fff;}
.hp-ctag.podcast{background:var(--teal);}
.hp-ctag.essay{background:var(--navy);}
.hp-ctag.teaching{background:var(--amber);color:var(--navy);}
.hp-ctag.blog{background:var(--burgundy);}
.hp-ctag.clip{background:var(--lime);color:var(--navy);}
.hp-ctag.promoted{background:var(--amber);color:var(--navy);}
.hp-compactbody{padding:12px 13px;}
.hp-compacttitle{font-size:13px;font-weight:700;color:var(--navy);margin:0 0 3px;line-height:1.3;}
.hp-compactref{font-size:10.5px;color:var(--teal);font-weight:600;}

.hp-campaign{margin-top:10px;}
.hp-campaign-eyebrow{font-size:11.5px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:var(--burgundy);margin-bottom:6px;}
.hp-campaign-title{font-size:24px;font-weight:900;color:var(--navy);margin:0 0 6px;letter-spacing:-0.01em;}
@media (min-width:900px){.hp-campaign-title{font-size:26px;}}

.hp-campaign-explainer{background:#fff;border:1px solid var(--hair);border-radius:12px;padding:16px 20px;margin:0 0 14px;width:100%;box-sizing:border-box;}
.hp-campaign-explainer p{margin:0;font-size:13px;color:var(--ink);opacity:0.7;line-height:1.6;}
.hp-campaign-top{display:block;margin:14px 0 20px;}
.hp-qlabel{font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:var(--burgundy);margin-bottom:6px;display:block;}

.hp-banner{position:relative;border-radius:16px;overflow:hidden;min-height:200px;background:linear-gradient(120deg,var(--navy),var(--teal));display:flex;align-items:center;justify-content:center;background-size:cover;background-position:center;width:100%;box-sizing:border-box;}
.hp-banner.hasimg::before{content:'';position:absolute;inset:0;background:#DCE07A;mix-blend-mode:multiply;opacity:0.4;}
.hp-uploadhint{text-align:center;color:var(--cream);position:relative;z-index:2;}
.hp-uploadhint .icon{width:38px;height:38px;border:2px dashed rgba(251,248,237,0.5);border-radius:10px;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;font-size:18px;}
.hp-uploadhint .label{font-size:12.5px;font-weight:600;opacity:0.85;}
.hp-replacebtn{position:absolute;bottom:14px;right:14px;background:rgba(251,248,237,0.15);border:1px solid rgba(251,248,237,0.4);color:var(--cream);font-size:11px;font-weight:600;padding:6px 13px;border-radius:999px;cursor:pointer;font-family:inherit;z-index:3;}

.hp-writeup{width:100%;margin:18px 0 24px;}
.hp-writeup h3{font-size:15px;font-weight:800;color:var(--navy);margin:0 0 8px;}
.hp-writeup p{font-size:14px;color:var(--ink);opacity:0.78;line-height:1.65;margin:0;}

.hp-cliprow{display:grid;grid-template-columns:1fr;gap:14px;margin:20px 0;}
@media (min-width:640px){.hp-cliprow{grid-template-columns:1fr 1fr;}}
.hp-clipcard{border-radius:14px;overflow:hidden;position:relative;aspect-ratio:16/10;display:flex;flex-direction:column;justify-content:flex-end;padding:20px;color:#fff;background-size:cover;background-position:center;background-color:var(--navy);cursor:pointer;text-decoration:none;}
.hp-clipcard::before{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(24,26,77,0.05),rgba(24,26,77,0.82));}
.hp-clipcard .z{position:relative;z-index:2;color:#fff;}
.hp-pill-mini{position:absolute;top:14px;left:14px;z-index:2;background:var(--amber);color:var(--navy);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;padding:4px 10px;border-radius:5px;}
.hp-pill-mini.intro{background:var(--limelight);}
.hp-clipplay{width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.92);display:flex;align-items:center;justify-content:center;margin-bottom:12px;}
.hp-cliptitle{font-size:17px;font-weight:700;line-height:1.3;margin:0 0 5px;}
.hp-clipmeta{font-size:11.5px;opacity:0.75;font-weight:600;}

.hp-devopromo{background:var(--navy);border-radius:14px;padding:22px 26px;display:flex;justify-content:space-between;align-items:center;gap:20px;margin:20px 0;flex-wrap:wrap;}
.hp-devopromo h4{color:var(--limelight);font-size:17px;font-weight:800;margin:0 0 6px;}
.hp-devopromo p{color:var(--cream);opacity:0.72;font-size:12.5px;margin:0;max-width:460px;line-height:1.5;}
.hp-devopromo .right{display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0;}
.hp-addbtn2{background:var(--limelight);color:var(--navy);font-size:12px;font-weight:700;padding:9px 18px;border-radius:999px;white-space:nowrap;border:none;cursor:pointer;font-family:inherit;text-decoration:none;display:inline-block;}
.hp-seeinside{color:var(--cream);opacity:0.75;font-size:11.5px;font-weight:600;text-decoration:underline;cursor:pointer;background:none;border:none;font-family:inherit;padding:0;}

.hp-collection-grid{display:grid;grid-template-columns:repeat(2,1fr);grid-auto-rows:auto;gap:14px;}
@media (min-width:900px){.hp-collection-grid{grid-template-columns:repeat(4,1fr);grid-auto-rows:130px;}}
.hp-cc{background:#fff;border-radius:12px;overflow:hidden;border:1px solid var(--hair);display:flex;flex-direction:column;position:relative;text-decoration:none;color:inherit;cursor:pointer;}
@media (min-width:900px){
  .hp-cc-lead{grid-column:1 / 3;grid-row:1 / 3;}
  .hp-cc-medium{grid-column:3 / 5;grid-row:1;flex-direction:row;}
  .hp-cc-halfwide{grid-column:span 2;}
}
.hp-cc-lead .hp-cc-thumb{height:60%;min-height:170px;background-size:cover;background-position:center;background-color:var(--limelight);}
.hp-cc-lead .hp-cc-body{padding:16px 18px;flex:1;}
.hp-cc-lead .hp-cc-title{font-size:18px;font-weight:800;color:var(--navy);margin:0 0 6px;line-height:1.25;}
.hp-cc-lead .hp-cc-desc{font-size:12.5px;color:var(--ink);opacity:0.65;line-height:1.4;margin:0;}

.hp-cc-medium .hp-cc-thumb{width:100%;height:120px;background-size:cover;background-position:center;background-color:var(--limelight);flex-shrink:0;}
@media (min-width:900px){.hp-cc-medium .hp-cc-thumb{width:42%;height:auto;}}
.hp-cc-medium .hp-cc-body{padding:13px 15px;flex:1;display:flex;flex-direction:column;}
.hp-cc-medium .hp-cc-title{font-size:13.5px;font-weight:700;color:var(--navy);margin:0 0 4px;line-height:1.3;}
.hp-cc-medium .hp-cc-meta{font-size:10.5px;opacity:0.55;font-weight:600;margin-top:auto;}

.hp-cc-halfwide{flex-direction:row;}
.hp-cc-halfwide .hp-cc-thumb{width:38%;background-size:cover;background-position:center;flex-shrink:0;background-color:var(--limelight);}
.hp-cc-halfwide .hp-cc-body{padding:12px 14px;flex:1;display:flex;flex-direction:column;}
.hp-cc-halfwide .hp-cc-title{font-size:13px;font-weight:700;color:var(--navy);margin:0 0 3px;}
.hp-cc-halfwide .hp-cc-meta{font-size:10px;opacity:0.55;font-weight:600;margin-top:auto;}
.hp-cc-thumb{position:relative;}
.hp-cc-thumb::after{content:'';position:absolute;inset:0;mix-blend-mode:multiply;opacity:0.45;pointer-events:none;}
.hp-cc-thumb.teaching::after{background:#FFAE00;}
.hp-cc-thumb.essay::after,.hp-cc-thumb.blog::after{background:#DCE07A;}
.hp-cc-thumb.podcast::after{background:#0F4A42;}
.hp-cc-thumb.clip::after{background:#CAC307;}

.hp-seeallbtn{display:block;width:fit-content;margin:22px auto 0;background:transparent;border:1.5px solid var(--navy);color:var(--navy);font-size:12.5px;font-weight:700;padding:10px 22px;border-radius:999px;cursor:pointer;text-decoration:none;font-family:inherit;}

.hp-skel{background:#fff;border-radius:12px;height:160px;border:1px solid var(--hair);position:relative;overflow:hidden;}
.hp-skel::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent);animation:hp-shim 1.4s infinite;}
@keyframes hp-shim{0%{transform:translateX(-100%);}100%{transform:translateX(100%);}}
`;

/* ---------------- Scripture Widget ---------------- */
function TodayScripture() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["today-scripture"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("daily_scriptures").select("verse_text, reference");
      if (error) throw error;
      const list = (data ?? []) as { verse_text: string; reference: string }[];
      if (list.length === 0) return null;
      // pick by day-of-year for stable "today" default
      const seed = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
      return list[seed % list.length];
    },
  });
  const [override, setOverride] = useState<{ verse_text: string; reference: string } | null>(null);

  const shuffle = async () => {
    const { data } = await (supabase.from as any)("daily_scriptures").select("verse_text, reference");
    const list = (data ?? []) as { verse_text: string; reference: string }[];
    if (list.length === 0) return;
    const idx = Math.floor(Math.random() * list.length);
    setOverride(list[idx]);
    qc.setQueryData(["today-scripture"], list[idx]);
  };

  const v = override ?? q.data;

  return (
    <div className="hp-scripture">
      <div className="hp-sw-head">
        <span className="hp-sw-badge">Today's scripture</span>
        <button className="hp-sw-shuffle" onClick={shuffle}>↻ New verse</button>
      </div>
      <div className="hp-sw-verse">{v ? `"${v.verse_text}"` : "\u00a0"}</div>
      <div className="hp-sw-ref">{v?.reference ?? ""}</div>
    </div>
  );
}

/* ---------------- Sticky Notes Widget ---------------- */
type StickyNote = { id: string; body: string; color: StickyColor; rotation: number; position: number };

function StickyNotes({ userId }: { userId: string | null }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [color, setColor] = useState<StickyColor>("limelight");

  const q = useQuery({
    queryKey: ["sticky-notes", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("sticky_notes")
        .select("id, body, color, rotation, position")
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as StickyNote[];
    },
  });

  const add = async () => {
    if (!userId || !draft.trim()) return;
    const rotation = Math.floor(Math.random() * 7) - 3;
    await (supabase.from as any)("sticky_notes").insert({
      user_id: userId, body: draft.trim().slice(0, 160), color, rotation, position: (q.data?.length ?? 0),
    });
    setDraft("");
    setEditing(false);
    qc.invalidateQueries({ queryKey: ["sticky-notes", userId] });
  };

  const del = async (id: string) => {
    await (supabase.from as any)("sticky_notes").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["sticky-notes", userId] });
  };

  const notes = q.data ?? [];

  return (
    <div className="hp-postit">
      <div className="hp-pw-head">
        <span className="hp-pw-title">Notes to self</span>
        {userId && <button className="hp-pw-add" onClick={() => setEditing((e) => !e)}>+ New note</button>}
      </div>
      {!userId ? (
        <div className="hp-note-signin">
          <Link to="/auth" style={{ color: "#181A4D", fontWeight: 700 }}>Sign in</Link> to keep private notes here.
        </div>
      ) : (
        <>
          <div className="hp-cork">
            {notes.map((n) => (
              <div key={n.id} className={`hp-postit-note ${n.color}`} style={{ transform: `rotate(${n.rotation}deg)` }}>
                <button className="hp-note-del" onClick={() => del(n.id)} aria-label="Delete note">×</button>
                {n.body}
              </div>
            ))}
            <button className="hp-postit-add" onClick={() => setEditing(true)}>+</button>
          </div>
          {editing && (
            <div className="hp-note-editor">
              <textarea
                autoFocus
                maxLength={160}
                placeholder="A short note to yourself…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <div className="row">
                <div style={{ display: "flex", gap: 6 }}>
                  {STICKY_COLORS.map((c) => (
                    <button
                      key={c}
                      className={`hp-note-swatch ${c === color ? "on" : ""}`}
                      style={{
                        background: c === "limelight" ? "#DCE07A" : c === "blush" ? "#E990A2" : c === "amber" ? "#FFAE00" : "#0F4A42",
                      }}
                      onClick={() => setColor(c)}
                      aria-label={c}
                    />
                  ))}
                </div>
                <button onClick={add}>Save</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- Short-form Row ---------------- */
function ShortFormRow() {
  const q = useQuery({
    queryKey: ["home-short-form"],
    queryFn: async () => {
      const [promoRes, clipRes] = await Promise.all([
        supabase.from("content_items_public").select("*").eq("type", "promoted").order("published_at", { ascending: false }).limit(1),
        supabase.from("content_items_public").select("*").eq("type", "clip").order("published_at", { ascending: false }).limit(2),
      ]);
      return {
        promo: (promoRes.data ?? [])[0] as ContentPreview | undefined,
        clips: (clipRes.data ?? []) as ContentPreview[],
      };
    },
  });
  const navigate = useNavigate();

  if (q.isLoading || !q.data) {
    return (
      <div className="hp-shortrow">
        {[0, 1, 2].map((i) => <div key={i} className="hp-skel" style={{ aspectRatio: "3/4", height: "auto" }} />)}
      </div>
    );
  }

  const { promo, clips } = q.data;
  const items: Array<{ kind: "promo" | "clip"; item: ContentPreview }> = [];
  if (promo) items.push({ kind: "promo", item: promo });
  clips.forEach((c) => items.push({ kind: "clip", item: c }));
  if (items.length === 0) return null;

  const fmtDur = (s: number | null) => {
    if (!s) return "";
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="hp-shortrow">
      {items.slice(0, 3).map(({ kind, item }) => {
        const bg = item.thumbnail_url || IMG_FALLBACK(item.id ?? "x");
        const onClick = () => {
          if (kind === "promo" && item.external_url) { window.open(item.external_url, "_blank"); return; }
          if (item.id) navigate({ to: "/essays/$id", params: { id: item.id } });
        };
        return (
          <div key={item.id ?? `${kind}-x`} className="hp-shortcard" style={{ backgroundImage: `url(${bg})` }} onClick={onClick}>
            <span className={`hp-pill ${kind === "promo" ? "ad" : "clip"}`}>
              {kind === "promo" ? "Promoted" : `↻ Clip · ${fmtDur(item.duration_seconds ?? null)}`}
            </span>
            <div className="z">
              {kind === "clip" && (
                <div className="hp-playicon">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#181A4D"><path d="M8 5v14l11-7z" /></svg>
                </div>
              )}
              <div className="headline">{kind === "clip" ? `"${item.title}"` : item.title}</div>
              <div className="sub">{item.excerpt ?? item.author_name ?? ""}</div>
              {kind === "promo" && <span className="hp-cta">Shop now</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Featured Grid ---------------- */
function FeaturedGrid() {
  const q = useQuery({
    queryKey: ["home-featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_items_public")
        .select("*")
        .in("type", ["teaching", "essay", "podcast", "blog"])
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as ContentPreview[];
    },
  });
  const items = q.data ?? [];

  return (
    <>
      <div className="hp-sectionlabel">
        <span className="title">Featured</span>
        {!q.isLoading && <span className="count">{items.length}</span>}
      </div>
      <div className="hp-compactgrid">
        {q.isLoading
          ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="hp-skel" />)
          : items.map((c) => {
              const t = (c.type ?? "essay") as ContentType;
              const route = routeForType(t);
              return (
                <Link key={c.id ?? ""} to={route as any} params={{ id: c.id! } as any} className="hp-compactcard">
                  <div className={`hp-compactthumb ${t}`}>
                    <img src={c.thumbnail_url || IMG_FALLBACK(c.id ?? "x")} alt={c.title ?? ""} loading="lazy" />
                    <span className={`hp-ctag ${t}`}>{t}</span>
                  </div>
                  <div className="hp-compactbody">
                    <h4 className="hp-compacttitle">{c.title}</h4>
                    {c.scripture_reference && <div className="hp-compactref">{c.scripture_reference}</div>}
                  </div>
                </Link>
              );
            })}
      </div>
    </>
  );
}

/* ---------------- Collection Preview ---------------- */
type CollectionRow = {
  id: string;
  slug: string;
  title: string;
  eyebrow: string | null;
  week_number: number | null;
  banner_url: string | null;
  writeup_title: string | null;
  writeup_body: string | null;
  intro_video_content_id: string | null;
  featured_clip_content_id: string | null;
  devotional_template_id: string | null;
};

function CollectionPreview({ isAdmin }: { isAdmin: boolean }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["home-collection"],
    queryFn: async () => {
      const { data: col } = await (supabase.from as any)("collections")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const collection = col as CollectionRow | null;
      if (!collection) return null;

      const [itemsRes, clipsRes, tplRes] = await Promise.all([
        (supabase.from as any)("collection_items")
          .select("position, layout_slot, content:content_items_public(*)")
          .eq("collection_id", collection.id)
          .order("position", { ascending: true }),
        supabase.from("content_items_public").select("*").in(
          "id",
          [collection.intro_video_content_id, collection.featured_clip_content_id].filter(Boolean) as string[],
        ),
        collection.devotional_template_id
          ? (supabase.from as any)("devotional_templates").select("id, slug, title").eq("id", collection.devotional_template_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const items = (itemsRes.data ?? []) as Array<{ position: number; layout_slot: string; content: ContentPreview | null }>;
      const clips = (clipsRes.data ?? []) as ContentPreview[];
      const intro = clips.find((c) => c.id === collection.intro_video_content_id) ?? null;
      const feat = clips.find((c) => c.id === collection.featured_clip_content_id) ?? null;
      const template = (tplRes as any)?.data ?? null;

      return { collection, items, intro, feat, template };
    },
  });

  const [userId, setUserId] = useState<string | null>(null);
  const [addedLocal, setAddedLocal] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);
  const addedQ = useQuery({
    queryKey: ["home-devo-added", userId, q.data?.template?.id],
    enabled: !!userId && !!q.data?.template?.id,
    queryFn: async () => {
      const { data } = await (supabase.from as any)("saved_items")
        .select("id").eq("user_id", userId!).eq("devotional_template_id", q.data!.template!.id).limit(1);
      return (data ?? []).length > 0;
    },
  });
  const isAdded = addedLocal || !!addedQ.data;
  const addToAbide = async () => {
    const tpl = q.data?.template;
    if (!tpl) return;
    if (!userId) { navigate({ to: "/auth" }); return; }
    await (supabase.from as any)("saved_items").upsert(
      { user_id: userId, devotional_template_id: tpl.id },
      { onConflict: "user_id,devotional_template_id" },
    );
    setAddedLocal(true);
  };

  const replaceBanner = async () => {
    if (!q.data?.collection) return;
    const url = window.prompt("Paste an image URL for the banner:", q.data.collection.banner_url ?? "");
    if (url == null) return;
    await (supabase.from as any)("collections").update({ banner_url: url }).eq("id", q.data.collection.id);
    qc.invalidateQueries({ queryKey: ["home-collection"] });
  };

  if (q.isLoading) return <div className="hp-skel" style={{ height: 240 }} />;
  if (!q.data?.collection) return null;

  const { collection, items, intro, feat } = q.data;
  const lead = items.find((i) => i.layout_slot === "lead")?.content;
  const medium = items.find((i) => i.layout_slot === "medium")?.content;
  const halves = items.filter((i) => i.layout_slot === "half").map((i) => i.content).filter(Boolean) as ContentPreview[];

  const fmtDur = (s: number | null | undefined) => {
    if (!s) return "";
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const goContent = (c: ContentPreview | null | undefined) => {
    if (!c?.id) return;
    navigate({ to: routeForType((c.type ?? "essay") as ContentType) as any, params: { id: c.id } as any });
  };

  return (
    <div className="hp-campaign">
      <div>
        <div className="hp-campaign-eyebrow">{collection.eyebrow ?? "A collection"}</div>
        <h2 className="hp-campaign-title">{collection.title}</h2>
      </div>

      <div className="hp-campaign-top">
        <div className="hp-campaign-explainer">
          <span className="hp-qlabel">What's a collection?</span>
          <p>A handful of pieces released together because they're circling the same question from different angles. There's no order to follow and no badge for finishing it. New pieces keep releasing as the collection goes on — read or watch whichever one meets you where you are.</p>
        </div>
        <div className={`hp-banner${collection.banner_url ? " hasimg" : ""}`} style={collection.banner_url ? { backgroundImage: `url(${collection.banner_url})` } : undefined}>
        {!collection.banner_url && (
          <div className="hp-uploadhint">
            <div className="icon">⬆</div>
            <div className="label">Upload campaign banner image</div>
          </div>
        )}
        {isAdmin && <button className="hp-replacebtn" onClick={replaceBanner}>Replace image</button>}
      </div>
      </div>

      {collection.writeup_body && (
        <div className="hp-writeup">
          {collection.writeup_title && <h3>{collection.writeup_title}</h3>}
          <p>{collection.writeup_body}</p>
        </div>
      )}

      {(intro || feat) && (
        <div className="hp-cliprow">
          {intro && (
            <div className="hp-clipcard" style={{ backgroundImage: `url(${intro.thumbnail_url || IMG_FALLBACK(intro.id ?? "i")})` }} onClick={() => goContent(intro)}>
              <span className="hp-pill-mini intro">Watch · what this collection is</span>
              <div className="z">
                <div className="hp-clipplay"><svg width="14" height="14" viewBox="0 0 24 24" fill="#181A4D"><path d="M8 5v14l11-7z" /></svg></div>
                <div className="hp-cliptitle">{intro.title}</div>
                <div className="hp-clipmeta">{fmtDur(intro.duration_seconds)}{intro.excerpt ? ` · ${intro.excerpt}` : ""}</div>
              </div>
            </div>
          )}
          {feat && (
            <div className="hp-clipcard" style={{ backgroundImage: `url(${feat.thumbnail_url || IMG_FALLBACK(feat.id ?? "f")})` }} onClick={() => goContent(feat)}>
              <span className="hp-pill-mini">Clip · {fmtDur(feat.duration_seconds)}</span>
              <div className="z">
                <div className="hp-clipplay"><svg width="14" height="14" viewBox="0 0 24 24" fill="#181A4D"><path d="M8 5v14l11-7z" /></svg></div>
                <div className="hp-cliptitle">"{feat.title}"</div>
                <div className="hp-clipmeta">{feat.excerpt ?? ""}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {collection.devotional_template_id && q.data.template && (
        <div className="hp-devopromo">
          <div className="left">
            <h4>New devotional layer — {q.data.template.title || collection.title}</h4>
            <p>A guided companion inside Abide. Some days it's scripture and reflection; some days a podcast episode unlocks fresh, timed to where you are in it.</p>
          </div>
          <div className="right">
            <button
              className="hp-addbtn2"
              onClick={addToAbide}
              disabled={isAdded}
              style={isAdded ? { opacity: 0.75, cursor: "default", border: "none", fontFamily: "inherit" } : { border: "none", fontFamily: "inherit", cursor: "pointer" }}
            >
              {isAdded ? "✓ Added to my Abide" : "+ Add to my Abide"}
            </button>
            <Link
              to="/devotionals/$slug/overview"
              params={{ slug: q.data.template.slug || q.data.template.id }}
              className="hp-seeinside"
              style={{ color: "#FBF8ED", textDecoration: "underline" }}
            >
              See what's inside →
            </Link>
          </div>
        </div>
      )}

      {(lead || medium || halves.length > 0) && (
        <div className="hp-collection-grid">
          {lead && (
            <div className="hp-cc hp-cc-lead" onClick={() => goContent(lead)}>
              <div className={`hp-cc-thumb ${(lead.type ?? 'essay')}`} style={{ backgroundImage: `url(${lead.thumbnail_url || IMG_FALLBACK(lead.id ?? "l")})` }} />
              <div className="hp-cc-body">
                <h3 className="hp-cc-title">{lead.title}</h3>
                {lead.excerpt && <p className="hp-cc-desc">{lead.excerpt}</p>}
              </div>
            </div>
          )}
          {medium && (
            <div className="hp-cc hp-cc-medium" onClick={() => goContent(medium)}>
              <div className={`hp-cc-thumb ${(medium.type ?? 'essay')}`} style={{ backgroundImage: `url(${medium.thumbnail_url || IMG_FALLBACK(medium.id ?? "m")})` }} />
              <div className="hp-cc-body">
                <h4 className="hp-cc-title">{medium.title}</h4>
                <div className="hp-cc-meta">{medium.author_name ?? medium.excerpt ?? ""}</div>
              </div>
            </div>
          )}
          {halves.map((h) => (
            <div key={h.id ?? ""} className="hp-cc hp-cc-halfwide" onClick={() => goContent(h)}>
              <div className={`hp-cc-thumb ${(h.type ?? 'essay')}`} style={{ backgroundImage: `url(${h.thumbnail_url || IMG_FALLBACK(h.id ?? "h")})` }} />
              <div className="hp-cc-body">
                <h4 className="hp-cc-title">{h.title}</h4>
                <div className="hp-cc-meta">{h.author_name ?? h.excerpt ?? ""}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Link to="/collections/$slug" params={{ slug: collection.slug }} className="hp-seeallbtn">
        See all pieces from this collection →
      </Link>
    </div>
  );
}

/* ---------------- Page ---------------- */
function HomePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) { setIsAdmin(false); return; }
    (supabase.rpc as any)("has_role", { _user_id: userId, _role: "admin" }).then((res: any) => setIsAdmin(!!res.data));
  }, [userId]);

  return (
    <AppShell current="home">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="hp-root">
        <div className="hp-hero">
          <h1>Building what's been entrusted to you.</h1>
          <p>Essays, teachings, podcasts, and devotionals to help you build what's been entrusted to you — your life, your work, your calling — with him, not just for him.</p>
        </div>

        <div className="hp-widgetrow">
          <TodayScripture />
          <StickyNotes userId={userId} />
        </div>

        <ShortFormRow />
        <FeaturedGrid />
        <CollectionPreview isAdmin={isAdmin} />
      </div>
    </AppShell>
  );
}
