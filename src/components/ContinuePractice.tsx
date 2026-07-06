import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

// Local YYYY-MM-DD (user's timezone)
function localToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const CSS = `
.cp-wrap{display:flex;flex-direction:column;gap:14px;margin-bottom:26px;}
.cp-card{background:#fff;border:1px solid rgba(20,20,20,0.06);border-top:5px solid #0F4A42;border-radius:16px;padding:22px 24px;display:flex;flex-direction:column;gap:14px;transition:transform .18s ease, box-shadow .18s ease;}
.cp-card:hover{transform:translateY(-2px);box-shadow:0 14px 30px rgba(0,0,0,0.06);}
.cp-lbl{font-size:10.5px;letter-spacing:0.14em;text-transform:uppercase;color:#0F4A42;font-weight:800;display:flex;align-items:center;gap:8px;}
.cp-pill{background:#FBF8ED;color:#0F4A42;font-size:9.5px;font-weight:800;letter-spacing:0.1em;padding:2px 8px;border-radius:99px;}
.cp-title{font-size:20px;font-weight:800;color:#181A4D;letter-spacing:-0.015em;margin:0;line-height:1.3;}
.cp-meta{font-size:12.5px;color:#8a8678;font-weight:600;display:flex;gap:12px;flex-wrap:wrap;}
.cp-meta .scr{color:#0F4A42;}
.cp-row{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;}
.cp-btn{background:#181A4D;color:#fff;font-weight:800;font-size:12.5px;padding:10px 18px;border-radius:20px;border:none;cursor:pointer;font-family:inherit;text-decoration:none;display:inline-block;}
.cp-btn:hover{background:#0F4A42;}

.cp-sec{background:#fff;border:1px solid rgba(20,20,20,0.06);border-left:3px solid #DCE07A;border-radius:12px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}
.cp-sec .info{display:flex;flex-direction:column;gap:2px;min-width:0;}
.cp-sec .k{font-size:9.5px;letter-spacing:0.14em;text-transform:uppercase;color:#8a8678;font-weight:800;}
.cp-sec .t{font-size:14px;font-weight:800;color:#181A4D;letter-spacing:-0.01em;line-height:1.3;margin:0;overflow:hidden;text-overflow:ellipsis;}
.cp-sec-btn{background:transparent;color:#181A4D;font-weight:700;font-size:11.5px;padding:7px 14px;border-radius:99px;border:1px solid rgba(24,26,77,0.2);cursor:pointer;font-family:inherit;text-decoration:none;white-space:nowrap;}
.cp-sec-btn:hover{background:#181A4D;color:#fff;border-color:#181A4D;}
`;

type Tpl = { id: string; title: string; scripture_focus: string | null; topic_id: string | null; topicName?: string | null };

export function ContinuePractice() {
  const navigate = useNavigate();
  const [today, setToday] = useState<string>(() => localToday());
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      const t = localToday();
      setToday((prev) => (prev === t ? prev : t));
    }, 60_000);
    return () => clearInterval(iv);
  }, []);

  const q = useQuery({
    queryKey: ["continue-practice-v2", userId, today],
    enabled: !!userId,
    queryFn: async () => {
      // 1. Platform default template
      const { data: def } = await supabase
        .from("devotional_templates")
        .select("id, title, scripture_focus, topic_id")
        .eq("is_default" as any, true)
        .eq("status", "published")
        .maybeSingle();

      // 2. User's other templates: saved + templates they've written entries for
      const [{ data: saved }, { data: entries }] = await Promise.all([
        supabase
          .from("saved_items")
          .select("devotional_template_id")
          .eq("user_id", userId!)
          .not("devotional_template_id", "is", null),
        supabase
          .from("devotional_entries")
          .select("template_id")
          .eq("user_id", userId!)
          .not("template_id", "is", null),
      ]);
      const otherIds = new Set<string>();
      (saved ?? []).forEach((r) => r.devotional_template_id && otherIds.add(r.devotional_template_id));
      (entries ?? []).forEach((r) => r.template_id && otherIds.add(r.template_id));
      if (def?.id) otherIds.delete(def.id);

      let others: Tpl[] = [];
      if (otherIds.size > 0) {
        const { data: otherTpls } = await supabase
          .from("devotional_templates")
          .select("id, title, scripture_focus, topic_id")
          .in("id", Array.from(otherIds))
          .eq("status", "published");
        others = (otherTpls ?? []) as Tpl[];
      }

      // 3. Today's entries for every candidate template
      const allIds = [def?.id, ...others.map((o) => o.id)].filter(Boolean) as string[];
      let doneToday = new Set<string>();
      if (allIds.length > 0) {
        const { data: todayEntries } = await supabase
          .from("devotional_entries")
          .select("template_id")
          .eq("user_id", userId!)
          .eq("entry_date", today)
          .in("template_id", allIds);
        (todayEntries ?? []).forEach((r) => r.template_id && doneToday.add(r.template_id));
      }

      // 4. Topic names for whatever we'll render
      const topicIds = Array.from(new Set(
        [def, ...others].filter(Boolean).map((t) => t!.topic_id).filter(Boolean) as string[]
      ));
      let topicMap: Record<string, string> = {};
      if (topicIds.length > 0) {
        const { data: topics } = await supabase.from("topics").select("id,name").in("id", topicIds);
        (topics ?? []).forEach((t) => { topicMap[t.id] = t.name; });
      }

      const withTopic = (t: Tpl | null | undefined): Tpl | null =>
        t ? { ...t, topicName: t.topic_id ? topicMap[t.topic_id] ?? null : null } : null;

      return {
        primary: def && !doneToday.has(def.id) ? withTopic(def as Tpl) : null,
        secondary: others.filter((o) => !doneToday.has(o.id)).map((o) => withTopic(o)!) as Tpl[],
      };
    },
  });

  if (!userId || !q.data) return null;
  const { primary, secondary } = q.data;
  if (!primary && secondary.length === 0) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="cp-wrap">
        {primary && (
          <div className="cp-card">
            <div className="cp-lbl">
              Continue your practice
              <span className="cp-pill">Default</span>
            </div>
            <h2 className="cp-title">{primary.title}</h2>
            <div className="cp-meta">
              {primary.topicName && <span>{primary.topicName}</span>}
              {primary.scripture_focus && <span className="scr">{primary.scripture_focus}</span>}
            </div>
            <div className="cp-row">
              <span style={{ fontSize: 12.5, color: "#8a8678", fontWeight: 600 }}>Today's entry is waiting for you.</span>
              <button
                className="cp-btn"
                onClick={() => navigate({ to: "/devotionals/$id", params: { id: primary.id } })}
              >
                Begin today's practice
              </button>
            </div>
          </div>
        )}

        {secondary.map((s) => (
          <div key={s.id} className="cp-sec">
            <div className="info">
              <div className="k">Also today · {s.topicName ?? "Topical"}</div>
              <p className="t">{s.title}</p>
            </div>
            <button
              className="cp-sec-btn"
              onClick={() => navigate({ to: "/devotionals/$id", params: { id: s.id } })}
            >
              Open
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
