import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Template = Database["public"]["Tables"]["devotional_templates"]["Row"];
type Topic = Database["public"]["Tables"]["topics"]["Row"];

export const Route = createFileRoute("/devotionals/focus/$id")({
  component: FocusPage,
  head: () => ({
    meta: [
      { title: "Focus — CoCreate" },
      { name: "description", content: "Full guidance for this topical devotional today." },
    ],
  }),
});

const TOPIC_COLORS: Record<string, string> = {
  amber: "#F5B301", teal: "#0F4A42", lime: "#DCE07A", "light-green": "#C7E39B",
  coral: "#FF340C", navy: "#181A4D", cream: "#FBF8ED", brown: "#441B07",
};
const topicColor = (k?: string | null) => (k && TOPIC_COLORS[k]) || "#0F4A42";
const hexToRgba = (hex: string, a: number) => {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};

const CSS = `
.fp-root *{box-sizing:border-box;}
.fp-root{min-height:100vh;background:#eee9d9;font-family:'Poppins',sans-serif;color:#20201c;}
.fp-nav{background:#fff;border-bottom:1px solid rgba(20,20,20,0.08);padding:14px 24px;display:flex;align-items:center;justify-content:space-between;gap:12px;position:sticky;top:0;z-index:50;}
.fp-brand{display:flex;align-items:center;gap:10px;text-decoration:none;}
.fp-brand .mark{width:28px;height:28px;background:#DCE07A;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#181A4D;font-weight:900;}
.fp-brand .word{font-weight:900;font-size:19px;color:#181A4D;letter-spacing:-0.02em;}
.fp-back{color:#8a8678;font-weight:700;font-size:12.5px;text-decoration:none;}
.fp-back:hover{color:#181A4D;}
.fp-shell{max-width:1360px;margin:0 auto;padding:28px 36px 120px;}
.fp-chiprow{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:22px;align-items:center;}
.fp-chiprow-label{font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#8a8678;margin-right:4px;}
.fp-chip{border:1px solid rgba(24,26,77,0.15);background:#fff;color:#181A4D;font-family:'Poppins',sans-serif;font-weight:600;font-size:12px;padding:6px 14px;border-radius:999px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px;transition:background .15s ease;}
.fp-chip:hover{background:#FBF8ED;}
.fp-chip.active{background:#181A4D;color:#fff;border-color:#181A4D;}
.fp-chip .dot{width:8px;height:8px;border-radius:99px;background:currentColor;opacity:0.65;}
.fp-headtop{font-size:13px;color:rgba(24,26,77,0.55);margin-bottom:6px;font-weight:600;display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
.fp-headtop .arrow{color:rgba(24,26,77,0.55);}
.fp-title{font-size:32px;font-weight:800;color:#181A4D;letter-spacing:-0.01em;line-height:1.15;margin:2px 0 8px;}
.fp-sub{font-size:14px;color:#20201C;opacity:0.75;margin:0 0 6px;max-width:720px;line-height:1.55;}
.fp-pacing{font-size:12px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#8a8678;margin:0 0 24px;}
.fp-grid{display:grid;grid-template-columns:1fr;gap:14px;}
@media (min-width:900px){ .fp-grid{grid-template-columns:1fr 1fr 1fr;} }
.fp-card{background:#fff;border-radius:14px;padding:22px 24px;border:1px solid rgba(24,26,77,0.12);}
.fp-badge{display:inline-block;font-weight:600;font-size:11px;letter-spacing:0.03em;text-transform:uppercase;padding:5px 12px;border-radius:6px;color:#FBF8ED;margin-bottom:14px;}
.fp-badge.read{background:#0F4A42;} .fp-badge.pray{background:#441B07;} .fp-badge.todo{background:#FFAE00;}
.fp-sublabel{font-size:10.5px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#8a8678;margin:14px 0 6px;}
.fp-scr-ref{font-size:15px;font-weight:700;color:#0F4A42;margin:0 0 4px;}
.fp-body{font-size:13.5px;color:#20201C;line-height:1.55;margin:0;white-space:pre-wrap;}
.fp-list{margin:6px 0 0;padding-left:18px;}
.fp-list li{font-size:13px;color:#20201C;line-height:1.5;margin-bottom:4px;}
.fp-cta{display:inline-block;margin-top:22px;background:#181A4D;color:#fff;font-weight:800;font-size:12.5px;padding:10px 20px;border-radius:22px;text-decoration:none;font-family:'Poppins',sans-serif;}
`;

function FocusPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setUserId(data.session?.user.id ?? null); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    document.body.style.background = "#eee9d9";
    return () => { document.body.style.background = ""; };
  }, []);

  const templateQ = useQuery({
    queryKey: ["focus-template", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("devotional_templates").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Template | null;
    },
  });

  const topicQ = useQuery({
    queryKey: ["focus-topic", templateQ.data?.topic_id],
    enabled: !!templateQ.data?.topic_id,
    queryFn: async () => {
      const { data, error } = await supabase.from("topics").select("*").eq("id", templateQ.data!.topic_id!).maybeSingle();
      if (error) throw error;
      return data as Topic | null;
    },
  });

  // Pacing: earliest of saved_at + first entry_date for this user+template.
  const pacingQ = useQuery({
    queryKey: ["focus-pacing", id, userId],
    enabled: ready && !!userId,
    queryFn: async () => {
      const [{ data: saved }, { data: entries }] = await Promise.all([
        supabase.from("saved_items").select("saved_at").eq("user_id", userId!).eq("devotional_template_id", id).order("saved_at", { ascending: true }).limit(1),
        supabase.from("devotional_entries").select("entry_date").eq("user_id", userId!).eq("template_id", id).order("entry_date", { ascending: true }).limit(1),
      ]);
      const dates: Date[] = [];
      if (saved && saved[0]?.saved_at) dates.push(new Date(saved[0].saved_at as string));
      if (entries && entries[0]?.entry_date) dates.push(new Date((entries[0].entry_date as string) + "T00:00:00"));
      if (dates.length === 0) return { day: 1 };
      const start = new Date(Math.min(...dates.map(d => d.getTime())));
      const today = new Date();
      const ms = today.setHours(0,0,0,0) - start.setHours(0,0,0,0);
      const day = Math.max(1, Math.floor(ms / 86400000) + 1);
      return { day };
    },
  });

  // Sibling active topical devotionals for the chip row.
  const siblingsQ = useQuery({
    queryKey: ["focus-siblings", userId],
    enabled: ready && !!userId,
    queryFn: async () => {
      const [{ data: saved }, { data: entryTpls }] = await Promise.all([
        supabase.from("saved_items").select("devotional_template_id").eq("user_id", userId!).not("devotional_template_id", "is", null),
        supabase.from("devotional_entries").select("template_id").eq("user_id", userId!).not("template_id", "is", null),
      ]);
      const ids = Array.from(new Set([
        ...(saved ?? []).map(r => r.devotional_template_id).filter(Boolean) as string[],
        ...(entryTpls ?? []).map(r => r.template_id).filter(Boolean) as string[],
      ]));
      if (ids.length === 0) return [] as Array<Template & { topic: Topic | null }>;
      const { data: tpls } = await supabase.from("devotional_templates").select("*").in("id", ids).eq("status", "published");
      const nonDefault = (tpls ?? []).filter(x => !x.is_default);
      const topicIds = Array.from(new Set(nonDefault.map(x => x.topic_id).filter(Boolean))) as string[];
      const topicMap: Record<string, Topic> = {};
      if (topicIds.length) {
        const { data: tps } = await supabase.from("topics").select("*").in("id", topicIds);
        (tps ?? []).forEach(tp => { topicMap[tp.id] = tp as Topic; });
      }
      return nonDefault.map(x => ({ ...(x as Template), topic: x.topic_id ? (topicMap[x.topic_id] ?? null) : null }));
    },
  });

  // Default (Abide) template id, for the "All of today" chip target.
  const defaultQ = useQuery({
    queryKey: ["focus-default-template"],
    queryFn: async () => {
      const { data } = await supabase.from("devotional_templates").select("id").eq("is_default", true).eq("status", "published").maybeSingle();
      return (data?.id as string | undefined) ?? null;
    },
  });

  const t = templateQ.data;
  const topic = topicQ.data;
  const color = topicColor(topic?.color_key);
  const day = pacingQ.data?.day ?? 1;
  const pacingLabel = t
    ? (t.duration_days && t.duration_days > 0
        ? `Day ${day} of ${t.duration_days}`
        : `Week ${Math.ceil(day / 7)} of an open season`)
    : "";

  const scriptureItems = (t && Array.isArray((t as any).scripture_items) ? (t as any).scripture_items : []) as Array<{ reference?: string; note?: string }>;
  const prayItems = (t && Array.isArray((t as any).pray_items) ? (t as any).pray_items : []) as string[];
  const todoItems = (t && Array.isArray((t as any).todo_items_pool) ? (t as any).todo_items_pool : []) as string[];

  return (
    <div className="fp-root">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav className="fp-nav">
        <Link to="/" className="fp-brand"><div className="mark">C</div><div className="word">CoCreate</div></Link>
        <Link to="/devotionals" className="fp-back">← Back to Devotionals</Link>
        <div style={{ width: 60 }} />
      </nav>

      <div className="fp-shell">
        {/* Focus-on chip row */}
        <div className="fp-chiprow">
          <span className="fp-chiprow-label">Focus on</span>
          <button
            type="button"
            className="fp-chip"
            onClick={() => {
              if (defaultQ.data) navigate({ to: "/devotionals/$id", params: { id: defaultQ.data } });
              else navigate({ to: "/devotionals" });
            }}
          >
            All of today
          </button>
          {(siblingsQ.data ?? []).map(s => {
            const c = topicColor(s.topic?.color_key);
            const active = s.id === id;
            return (
              <Link
                key={s.id}
                to="/devotionals/focus/$id"
                params={{ id: s.id }}
                className={`fp-chip${active ? " active" : ""}`}
              >
                <span className="dot" style={{ background: c }} />
                {s.topic?.name ?? s.title}
              </Link>
            );
          })}
        </div>

        {templateQ.isLoading ? (
          <div style={{ height: 200, background: "#fff", borderRadius: 14 }} />
        ) : !t ? (
          <div style={{ textAlign: "center", padding: 40 }}>Devotional not found.</div>
        ) : (
          <>
            <div className="fp-headtop">
              <span style={{ color: "#181A4D", fontWeight: 600 }}>Devotionals</span>
              <span className="arrow">→</span>
              <span style={{ color, fontWeight: 700 }}>{topic?.name ?? t.title}</span>
            </div>
            <h1 className="fp-title">{t.title}</h1>
            {t.description && <p className="fp-sub">{t.description}</p>}
            <p className="fp-pacing" style={{ color }}>{pacingLabel}</p>

            <div className="fp-grid">
              {/* READ */}
              <div className="fp-card" style={{ borderTop: `4px solid ${color}` }}>
                <span className="fp-badge read">read</span>
                {t.scripture_focus && (
                  <>
                    <div className="fp-sublabel">Scripture</div>
                    <div className="fp-scr-ref">{t.scripture_focus}</div>
                  </>
                )}
                {t.reflect_prompt && (
                  <>
                    <div className="fp-sublabel">Reflection</div>
                    <p className="fp-body">{t.reflect_prompt}</p>
                  </>
                )}
                {scriptureItems.length > 0 && (
                  <>
                    <div className="fp-sublabel">Supplemental material</div>
                    <ul className="fp-list">
                      {scriptureItems.map((it, i) => (
                        <li key={i}>
                          {it.reference ? <strong>{it.reference}</strong> : null}
                          {it.reference && it.note ? " — " : null}
                          {it.note ?? ""}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              {/* PRAY */}
              <div className="fp-card" style={{ borderTop: `4px solid ${hexToRgba(color, 0.6)}` }}>
                <span className="fp-badge pray">pray</span>
                {t.pray_prompt && <p className="fp-body">{t.pray_prompt}</p>}
                {prayItems.length > 0 && (
                  <>
                    <div className="fp-sublabel">Prayer prompts</div>
                    <ul className="fp-list">
                      {prayItems.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  </>
                )}
              </div>

              {/* TO-DO / ACTION */}
              <div className="fp-card" style={{ borderTop: `4px solid #FFAE00` }}>
                <span className="fp-badge todo">to-do</span>
                {t.apply_prompt && <p className="fp-body">{t.apply_prompt}</p>}
                {todoItems.length > 0 && (
                  <>
                    <div className="fp-sublabel">Action prompts</div>
                    <ul className="fp-list">
                      {todoItems.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  </>
                )}
              </div>
            </div>

            {defaultQ.data && (
              <Link to="/devotionals/$id" params={{ id: defaultQ.data }} className="fp-cta">
                ← Back to today's entry
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}
