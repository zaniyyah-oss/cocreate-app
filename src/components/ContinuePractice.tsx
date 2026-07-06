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
.cp-card{background:#fff;border:1px solid rgba(20,20,20,0.06);border-top:5px solid #0F4A42;border-radius:16px;padding:22px 24px;margin-bottom:26px;display:flex;flex-direction:column;gap:14px;transition:transform .18s ease, box-shadow .18s ease;}
.cp-card:hover{transform:translateY(-2px);box-shadow:0 14px 30px rgba(0,0,0,0.06);}
.cp-lbl{font-size:10.5px;letter-spacing:0.14em;text-transform:uppercase;color:#0F4A42;font-weight:800;}
.cp-title{font-size:20px;font-weight:800;color:#181A4D;letter-spacing:-0.015em;margin:0;line-height:1.3;}
.cp-meta{font-size:12.5px;color:#8a8678;font-weight:600;display:flex;gap:12px;flex-wrap:wrap;}
.cp-meta .scr{color:#0F4A42;}
.cp-row{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;}
.cp-btn{background:#181A4D;color:#fff;font-weight:800;font-size:12.5px;padding:10px 18px;border-radius:20px;border:none;cursor:pointer;font-family:inherit;text-decoration:none;display:inline-block;}
.cp-btn:hover{background:#0F4A42;}
`;

export function ContinuePractice() {
  const navigate = useNavigate();
  const [today, setToday] = useState<string>(() => localToday());
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Roll over at local midnight
  useEffect(() => {
    const iv = setInterval(() => {
      const t = localToday();
      setToday((prev) => (prev === t ? prev : t));
    }, 60_000);
    return () => clearInterval(iv);
  }, []);

  const q = useQuery({
    queryKey: ["continue-practice", userId, today],
    enabled: !!userId,
    queryFn: async () => {
      // 1. profile default
      const { data: prof } = await supabase
        .from("profiles")
        .select("default_template_id" as any)
        .eq("id", userId!)
        .maybeSingle();
      let templateId: string | null = (prof as any)?.default_template_id ?? null;

      // 2. fallback: earliest published platform template
      if (!templateId) {
        const { data: fb } = await supabase
          .from("devotional_templates")
          .select("id")
          .eq("status", "published")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        templateId = fb?.id ?? null;
      }
      if (!templateId) return null;

      // 3. template detail
      const { data: tpl } = await supabase
        .from("devotional_templates")
        .select("id, title, scripture_focus, topic_id")
        .eq("id", templateId)
        .maybeSingle();
      if (!tpl) return null;

      // 4. today's entry?
      const { data: entry } = await supabase
        .from("devotional_entries")
        .select("id")
        .eq("user_id", userId!)
        .eq("template_id", templateId)
        .eq("entry_date", today)
        .maybeSingle();
      if (entry) return null;

      // 5. topic name (optional)
      let topicName: string | null = null;
      if (tpl.topic_id) {
        const { data: topic } = await supabase
          .from("topics")
          .select("name")
          .eq("id", tpl.topic_id)
          .maybeSingle();
        topicName = topic?.name ?? null;
      }

      return {
        id: tpl.id,
        title: tpl.title,
        scripture: tpl.scripture_focus,
        topic: topicName,
      };
    },
  });

  if (!userId || !q.data) return null;
  const t = q.data;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="cp-card">
        <div className="cp-lbl">Continue your practice</div>
        <h2 className="cp-title">{t.title}</h2>
        <div className="cp-meta">
          {t.topic && <span>{t.topic}</span>}
          {t.scripture && <span className="scr">{t.scripture}</span>}
        </div>
        <div className="cp-row">
          <span style={{ fontSize: 12.5, color: "#8a8678", fontWeight: 600 }}>Today's entry is waiting for you.</span>
          <button
            className="cp-btn"
            onClick={() => navigate({ to: "/devotionals/$id", params: { id: t.id } })}
          >
            Begin today's practice
          </button>
        </div>
      </div>
    </>
  );
}
