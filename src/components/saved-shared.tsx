import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { NotificationBell } from "@/components/NotificationBell";

type PreviewRow = Database["public"]["Views"]["content_items_public"]["Row"];
type Pin = Database["public"]["Tables"]["pinned_quotes"]["Row"];
type Note = Database["public"]["Tables"]["notes"]["Row"];
type Saved = Database["public"]["Tables"]["saved_items"]["Row"];
type Template = Database["public"]["Tables"]["devotional_templates"]["Row"];

export const SAVED_CSS = `
.sv-root *{box-sizing:border-box;}
.sv-root{min-height:100vh;background:#eee9d9;font-family:'Poppins',sans-serif;color:#20201c;}
.sv-nav{background:#fff;border-bottom:1px solid rgba(20,20,20,0.08);padding:14px 24px;display:flex;align-items:center;justify-content:space-between;gap:12px;position:sticky;top:0;z-index:50;}
.sv-brand{display:flex;align-items:center;gap:10px;text-decoration:none;}
.sv-brand .mark{width:28px;height:28px;background:#DCE07A;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#181A4D;font-weight:900;}
.sv-brand .word{font-weight:900;font-size:19px;color:#181A4D;letter-spacing:-0.02em;}
.sv-navlinks{display:flex;gap:22px;}
.sv-navlink{color:#8a8678;font-weight:700;font-size:13px;text-decoration:none;}
.sv-navlink.active{color:#181A4D;}
.sv-signin{background:#181A4D;color:#fff;font-weight:800;font-size:12.5px;padding:9px 18px;border-radius:20px;text-decoration:none;border:none;cursor:pointer;font-family:'Poppins';}
.sv-shell{max-width:1080px;margin:0 auto;padding:44px 28px 100px;}
.sv-h1{font-size:38px;font-weight:900;letter-spacing:-0.03em;color:#181A4D;margin:0 0 8px;line-height:1.1;}
.sv-sub{font-size:15px;color:#8a8678;margin:0 0 32px;max-width:520px;line-height:1.6;}

/* Mobile segmented tabs */
.sv-tabs{display:none;background:#fff;border-radius:99px;padding:5px;margin-bottom:26px;border:1px solid rgba(20,20,20,0.06);}
.sv-tabs button{flex:1;background:transparent;border:none;font-family:'Poppins';font-weight:700;font-size:13px;color:#8a8678;padding:10px 14px;border-radius:99px;cursor:pointer;}
.sv-tabs button.on{background:#181A4D;color:#fff;}

.sv-section{margin-bottom:56px;}
.sv-section h2{font-size:13px;font-weight:800;color:#8a8678;letter-spacing:0.14em;text-transform:uppercase;margin:0 0 18px;display:flex;align-items:center;gap:10px;}
.sv-section h2 .count{background:#FBF8ED;color:#181A4D;font-size:11px;padding:2px 9px;border-radius:99px;letter-spacing:0;}

.sv-quotes{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;}
.sv-quote{background:#fff;border-radius:14px;border:1px solid rgba(20,20,20,0.06);border-left:5px solid #441B07;padding:20px 22px;cursor:pointer;transition:transform .18s ease, box-shadow .18s ease;}
.sv-quote:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(0,0,0,0.06);}
.sv-quote blockquote{margin:0 0 14px;font-size:15px;line-height:1.55;color:#181A4D;font-weight:600;letter-spacing:-0.005em;}
.sv-quote .src{font-size:11px;color:#8a8678;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;}

.sv-notes{display:flex;flex-direction:column;gap:14px;}
.sv-note{background:#fff;border-radius:14px;border:1px solid rgba(20,20,20,0.06);padding:18px 22px;cursor:pointer;transition:background .18s ease;}
.sv-note:hover{background:#FBF8ED;}
.sv-note .top{display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap;}
.sv-note .kind{font-size:9.5px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;padding:3px 10px;border-radius:12px;}
.sv-note .ctx{font-size:12px;font-weight:700;color:#181A4D;}
.sv-note .when{font-size:11px;color:#8a8678;font-weight:600;margin-left:auto;}
.sv-note p{margin:0;font-size:14px;color:#20201c;line-height:1.6;white-space:pre-wrap;overflow:hidden;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;}

.sv-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:18px;}
.sv-card{background:#fff;border-radius:14px;overflow:hidden;cursor:pointer;transition:transform .18s ease, box-shadow .18s ease;border:1px solid rgba(20,20,20,0.06);text-decoration:none;color:inherit;display:flex;flex-direction:column;}
.sv-card:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgba(0,0,0,0.08);}
.sv-thumb{width:100%;aspect-ratio:16/10;background:#DCE07A;position:relative;overflow:hidden;}
.sv-thumb img{width:100%;height:100%;object-fit:cover;}
.sv-thumb .rt{position:absolute;top:10px;left:10px;font-size:9.5px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;padding:4px 10px;border-radius:12px;}
.sv-cbody{padding:14px 16px 16px;}
.sv-cbody h3{font-size:14.5px;font-weight:800;color:#181A4D;letter-spacing:-0.01em;margin:0 0 6px;line-height:1.35;}
.sv-cbody .a{font-size:11.5px;color:#8a8678;font-weight:600;}

.sv-empty{background:#fff;border:1.5px dashed rgba(20,20,20,0.12);border-radius:14px;padding:32px 24px;text-align:center;color:#8a8678;font-size:13.5px;line-height:1.6;}
.sv-empty strong{display:block;color:#181A4D;font-weight:800;font-size:15px;margin-bottom:4px;}

.sv-signgate{background:#fff;border:1px solid rgba(20,20,20,0.08);border-left:4px solid #FF340C;border-radius:14px;padding:22px;max-width:520px;}
.sv-signgate h3{font-size:16px;font-weight:800;color:#181A4D;margin:0 0 6px;}
.sv-signgate p{font-size:13.5px;color:#8a8678;margin:0 0 14px;line-height:1.55;}

@media (max-width:720px){
  .sv-tabs{display:flex;}
  .sv-h1{font-size:28px;}
}
`;

const TYPE_META: Record<string, { label: string; bg: string; fg: string }> = {
  teaching: { label: "Teaching", bg: "#F5B301", fg: "#20201c" },
  essay:    { label: "Essay",    bg: "#C7E39B", fg: "#20201c" },
  podcast:  { label: "Podcast",  bg: "#0F4A42", fg: "#FBF8ED" },
  blog:     { label: "Blog",     bg: "#DCE07A", fg: "#181A4D" },
  devotional: { label: "Devotional", bg: "#DCE07A", fg: "#181A4D" },
};

const routeFor = (type: string | null | undefined) =>
  type === "teaching" ? "/teachings/$id" : type === "podcast" ? "/podcasts/$id" : "/essays/$id";

export function useAuth() {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setUserId(data.session?.user.id ?? null); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);
  return { userId, ready };
}

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export function SavedNav({ current }: { current: "saved" | "notes" }) {
  return (
    <nav className="sv-nav">
      <Link to="/" className="sv-brand"><div className="mark">C</div><div className="word">CoCreate</div></Link>
      <div className="sv-navlinks">
        <Link to="/" className="sv-navlink">Home</Link>
        <Link to="/explore" className="sv-navlink">Explore</Link>
        <Link to="/devotionals" className="sv-navlink">Devotionals</Link>
        <Link to="/saved" className={`sv-navlink ${current === "saved" ? "active" : ""}`}>Saved</Link>
        <Link to="/notes" className={`sv-navlink ${current === "notes" ? "active" : ""}`}>Notes</Link>
      </div>
      <div style={{ width: 60 }} />
    </nav>
  );
}

export function SignGate() {
  return (
    <div className="sv-signgate">
      <h3>Sign in to see what you've saved</h3>
      <p>Your pinned quotes, notes, and saved content stay private to your account.</p>
      <Link to="/auth" className="sv-signin">Sign in</Link>
    </div>
  );
}

// ─── Queries reused by /saved and /notes ─────────────────────────────

export function usePinnedQuotes(userId: string | null, ready: boolean) {
  return useQuery({
    queryKey: ["pinned-all", userId],
    enabled: ready && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("pinned_quotes").select("*").eq("user_id", userId!).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Pin[];
    },
  });
}

export function useNotes(userId: string | null, ready: boolean) {
  return useQuery({
    queryKey: ["notes-all", userId],
    enabled: ready && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("notes").select("*").eq("user_id", userId!).order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Note[];
    },
  });
}

export function useSavedItems(userId: string | null, ready: boolean) {
  return useQuery({
    queryKey: ["saved-all", userId],
    enabled: ready && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("saved_items").select("*").eq("user_id", userId!).order("saved_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Saved[];
    },
  });
}

export function useContentLookup(ids: string[]) {
  const key = ids.slice().sort().join(",");
  return useQuery({
    queryKey: ["content-lookup", key],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("content_items_public").select("*").in("id", ids);
      if (error) throw error;
      const m: Record<string, PreviewRow> = {};
      (data ?? []).forEach((r) => { if (r.id) m[r.id] = r as PreviewRow; });
      return m;
    },
  });
}

export function useTemplateLookup(ids: string[]) {
  const key = ids.slice().sort().join(",");
  return useQuery({
    queryKey: ["template-lookup", key],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("devotional_templates").select("*").in("id", ids);
      if (error) throw error;
      const m: Record<string, Template> = {};
      (data ?? []).forEach((r) => { m[r.id] = r as Template; });
      return m;
    },
  });
}

// ─── Section components ─────────────────────────────────────────────

export function QuotesSection({ pins, contentMap, onOpen }: { pins: Pin[]; contentMap: Record<string, PreviewRow>; onOpen: (c: PreviewRow) => void }) {
  return (
    <div className="sv-section">
      <h2>Pinned quotes <span className="count">{pins.length}</span></h2>
      {pins.length === 0 ? (
        <div className="sv-empty"><strong>Nothing pinned yet</strong>Highlight a line in any essay and tap "Pin as quote" to keep it here.</div>
      ) : (
        <div className="sv-quotes">
          {pins.map((p) => {
            const c = contentMap[p.content_item_id];
            return (
              <div key={p.id} className="sv-quote" onClick={() => c && onOpen(c)}>
                <blockquote>"{p.quote_text}"</blockquote>
                <div className="src">{c?.title ?? "Essay"}{c?.author_name ? ` · ${c.author_name}` : ""}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function NotesSection({ notes, contentMap, templateMap, onOpenContent, onOpenTemplate }: {
  notes: Note[];
  contentMap: Record<string, PreviewRow>;
  templateMap: Record<string, Template>;
  onOpenContent: (c: PreviewRow) => void;
  onOpenTemplate: (t: Template) => void;
}) {
  return (
    <div className="sv-section">
      <h2>Your notes <span className="count">{notes.length}</span></h2>
      {notes.length === 0 ? (
        <div className="sv-empty"><strong>No notes yet</strong>Add a note on any essay, teaching, podcast, or devotional and it will show up here.</div>
      ) : (
        <div className="sv-notes">
          {notes.map((n) => {
            const c = n.content_item_id ? contentMap[n.content_item_id] : undefined;
            const t = !c && n.content_item_id ? templateMap[n.content_item_id] : undefined;
            const kind = c?.type ?? (t ? "devotional" : "essay");
            const meta = TYPE_META[kind] ?? TYPE_META.essay;
            const ctx = c?.title ?? t?.title ?? "Standalone note";
            return (
              <div key={n.id} className="sv-note" onClick={() => { if (c) onOpenContent(c); else if (t) onOpenTemplate(t); }}>
                <div className="top">
                  <span className="kind" style={{ background: meta.bg, color: meta.fg }}>{meta.label}</span>
                  <span className="ctx">{ctx}</span>
                  <span className="when">{formatWhen(n.updated_at)}</span>
                </div>
                <p>{n.body}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SavedContentSection({ saved, contentMap, templateMap, onOpenContent, onOpenTemplate }: {
  saved: Saved[];
  contentMap: Record<string, PreviewRow>;
  templateMap: Record<string, Template>;
  onOpenContent: (c: PreviewRow) => void;
  onOpenTemplate: (t: Template) => void;
}) {
  return (
    <div className="sv-section">
      <h2>Saved content <span className="count">{saved.length}</span></h2>
      {saved.length === 0 ? (
        <div className="sv-empty"><strong>Nothing saved yet</strong>Tap Save on anything you'd like to return to. It will land here.</div>
      ) : (
        <div className="sv-cards">
          {saved.map((s) => {
            const c = s.content_item_id ? contentMap[s.content_item_id] : undefined;
            const t = s.devotional_template_id ? templateMap[s.devotional_template_id] : undefined;
            if (c) {
              const meta = TYPE_META[c.type ?? "essay"] ?? TYPE_META.essay;
              return (
                <div key={s.id} className="sv-card" onClick={() => onOpenContent(c)}>
                  <div className="sv-thumb">
                    {c.thumbnail_url && <img src={c.thumbnail_url} alt={c.title ?? ""} />}
                    <span className="rt" style={{ background: meta.bg, color: meta.fg }}>{meta.label}</span>
                  </div>
                  <div className="sv-cbody">
                    <h3>{c.title}</h3>
                    <div className="a">{c.author_name ?? "CoCreate"}</div>
                  </div>
                </div>
              );
            }
            if (t) {
              const meta = TYPE_META.devotional;
              return (
                <div key={s.id} className="sv-card" onClick={() => onOpenTemplate(t)}>
                  <div className="sv-thumb" style={{ background: "#0F4A42", display: "flex", alignItems: "center", justifyContent: "center", color: "#FBF8ED", fontWeight: 900, letterSpacing: "-0.02em", fontSize: 22, padding: 20, textAlign: "center" }}>
                    {t.title}
                    <span className="rt" style={{ background: meta.bg, color: meta.fg }}>{meta.label}</span>
                  </div>
                  <div className="sv-cbody">
                    <h3>{t.title}</h3>
                    <div className="a">Devotional practice</div>
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
}

// Small helper for pages that use these sections
export function useSavedData(userId: string | null, ready: boolean) {
  const pins = usePinnedQuotes(userId, ready);
  const notes = useNotes(userId, ready);
  const saved = useSavedItems(userId, ready);

  const contentIds = useMemo(() => {
    const s = new Set<string>();
    (pins.data ?? []).forEach((p) => s.add(p.content_item_id));
    (notes.data ?? []).forEach((n) => { if (n.content_item_id) s.add(n.content_item_id); });
    (saved.data ?? []).forEach((r) => { if (r.content_item_id) s.add(r.content_item_id); });
    return Array.from(s);
  }, [pins.data, notes.data, saved.data]);

  const templateIds = useMemo(() => {
    const s = new Set<string>();
    (saved.data ?? []).forEach((r) => { if (r.devotional_template_id) s.add(r.devotional_template_id); });
    // notes with a content_item_id that isn't a content row may actually reference a template — try both
    return Array.from(s);
  }, [saved.data]);

  const contentMap = useContentLookup(contentIds);
  const templateMap = useTemplateLookup(templateIds);

  return { pins, notes, saved, contentMap: contentMap.data ?? {}, templateMap: templateMap.data ?? {} };
}

export function openContent(navigate: ReturnType<typeof useNavigate>, c: PreviewRow) {
  if (!c.id) return;
  navigate({ to: routeFor(c.type), params: { id: c.id } });
}

export function openTemplate(navigate: ReturnType<typeof useNavigate>, t: Template) {
  navigate({ to: "/devotionals/$id", params: { id: t.id } });
}
