import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Template = Database["public"]["Tables"]["devotional_templates"]["Row"];
type Entry = Database["public"]["Tables"]["devotional_entries"]["Row"];
type Topic = Database["public"]["Tables"]["topics"]["Row"];

export const Route = createFileRoute("/devotionals/$id")({
  component: EntryPage,
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
      { name: "description", content: "Reflect, pray, apply." },
    ],
  }),
});

const TOPIC_COLORS: Record<string, string> = {
  amber: "#F5B301", teal: "#0F4A42", lime: "#DCE07A", "light-green": "#C7E39B",
  coral: "#FF340C", navy: "#181A4D", cream: "#FBF8ED", brown: "#441B07",
};
const topicColor = (k?: string | null) => (k && TOPIC_COLORS[k]) || "#0F4A42";

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
.de-shell{max-width:720px;margin:0 auto;padding:44px 28px 120px;}
.de-headcard{background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,0.05);margin-bottom:44px;}
.de-headaccent{height:6px;width:100%;}
.de-headbody{padding:32px 34px 34px;}
.de-topic{font-size:10.5px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:14px;}
.de-title{font-size:32px;font-weight:900;letter-spacing:-0.03em;color:#181A4D;line-height:1.15;margin:0 0 18px;}
.de-scr{font-size:14px;font-weight:700;color:#0F4A42;padding-top:16px;border-top:1px solid rgba(20,20,20,0.06);}
.de-date{font-size:11px;font-weight:800;color:#8a8678;letter-spacing:0.14em;text-transform:uppercase;text-align:center;margin-bottom:18px;}
.de-block{background:#fff;border-radius:16px;padding:28px 30px;margin-bottom:22px;border:1px solid rgba(20,20,20,0.05);}
.de-label{display:flex;align-items:center;gap:10px;margin-bottom:14px;}
.de-label .dot{width:8px;height:8px;border-radius:50%;}
.de-label .name{font-size:11px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#181A4D;}
.de-prompt{font-size:15px;line-height:1.65;color:#20201c;margin:0 0 18px;font-weight:500;letter-spacing:-0.005em;}
.de-textarea{width:100%;border:none;background:#FBF8ED;border-radius:12px;padding:16px 18px;font-family:'Poppins';font-size:14.5px;color:#20201c;line-height:1.65;min-height:130px;resize:vertical;outline:none;transition:background .2s ease;}
.de-textarea:focus{background:#f5efd8;}
.de-status{margin-top:10px;font-size:11px;color:#8a8678;font-weight:600;text-align:right;min-height:16px;}
.de-status.on{color:#0F4A42;}
.de-past{margin-top:56px;}
.de-past h3{font-size:13px;font-weight:800;color:#8a8678;letter-spacing:0.14em;text-transform:uppercase;margin:0 0 18px;}
.de-past ul{list-style:none;margin:0;padding:0;background:#fff;border-radius:14px;border:1px solid rgba(20,20,20,0.06);overflow:hidden;}
.de-past li{padding:16px 22px;border-bottom:1px solid rgba(20,20,20,0.05);cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:16px;}
.de-past li:last-child{border-bottom:none;}
.de-past li:hover{background:#FBF8ED;}
.de-past li.active{background:#FBF8ED;}
.de-past .d{font-size:13.5px;font-weight:700;color:#181A4D;}
.de-past .preview{font-size:12px;color:#8a8678;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:60%;}
.de-past .empty{padding:22px;text-align:center;color:#8a8678;font-size:13px;}
.de-skel{height:200px;background:#fff;border-radius:16px;animation:dep 1.4s infinite;}
@keyframes dep{0%,100%{opacity:1}50%{opacity:.55}}
.de-signgate{background:#fff;border:1px solid rgba(20,20,20,0.08);border-left:4px solid #FF340C;border-radius:14px;padding:22px;}
.de-signgate h3{font-size:16px;font-weight:800;color:#181A4D;margin:0 0 6px;}
.de-signgate p{font-size:13.5px;color:#8a8678;margin:0 0 14px;line-height:1.55;}
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

function EntryPage() {
  const { id } = Route.useParams();
  const { userId, ready } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());

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

  const currentEntry: Entry | undefined = (pastQ.data ?? []).find((e) => e.entry_date === selectedDate);

  const [reflect, setReflect] = useState("");
  const [pray, setPray] = useState("");
  const [apply, setApply] = useState("");
  const [savingField, setSavingField] = useState<string | null>(null);
  const [savedField, setSavedField] = useState<string | null>(null);
  const hydratedRef = useRef<string>("");

  // Rehydrate texts when switching date or when entries load
  useEffect(() => {
    const key = `${selectedDate}:${currentEntry?.id ?? "new"}`;
    if (hydratedRef.current === key) return;
    hydratedRef.current = key;
    setReflect(currentEntry?.reflect_text ?? "");
    setPray(currentEntry?.pray_text ?? "");
    setApply(currentEntry?.apply_text ?? "");
  }, [selectedDate, currentEntry?.id, currentEntry?.reflect_text, currentEntry?.pray_text, currentEntry?.apply_text]);

  const upsert = useMutation({
    mutationFn: async (patch: Partial<Pick<Entry, "reflect_text" | "pray_text" | "apply_text">>) => {
      if (!userId) return;
      if (currentEntry?.id) {
        const { error } = await supabase.from("devotional_entries").update(patch).eq("id", currentEntry.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("devotional_entries").insert({
          user_id: userId, template_id: id, entry_date: selectedDate,
          reflect_text: patch.reflect_text ?? null, pray_text: patch.pray_text ?? null, apply_text: patch.apply_text ?? null,
        });
        if (error) throw error;
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

  // Debounced save per field
  const debouncers = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});
  const scheduleSave = (field: "reflect_text" | "pray_text" | "apply_text", value: string) => {
    if (!userId || !ready) return;
    setSavingField(field);
    if (debouncers.current[field]) clearTimeout(debouncers.current[field]!);
    debouncers.current[field] = setTimeout(() => { upsert.mutate({ [field]: value }); }, 800);
  };

  if (ready && !userId) {
    return (
      <div className="de-root">
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <nav className="de-nav">
          <Link to="/" className="de-brand"><div className="mark">C</div><div className="word">CoCreate</div></Link>
          <Link to="/devotionals" className="de-back">← Back</Link>
          <Link to="/auth" className="de-signin">Sign in</Link>
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

  return (
    <div className="de-root">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav className="de-nav">
        <Link to="/" className="de-brand"><div className="mark">C</div><div className="word">CoCreate</div></Link>
        <Link to="/devotionals" className="de-back">← Back to Devotionals</Link>
        <div style={{ width: 60 }} />
      </nav>

      <div className="de-shell">
        {templateQ.isLoading ? (
          <div className="de-skel" />
        ) : !t ? (
          <div style={{ textAlign: "center", padding: 40 }}>Template not found.</div>
        ) : (
          <>
            <div className="de-headcard">
              <div className="de-headaccent" style={{ background: color }} />
              <div className="de-headbody">
                {topic && <Link to="/topics/$slug" params={{ slug: topic.slug }} className="de-topic" style={{ color, textDecoration: "none" }}>{topic.name} →</Link>}
                <h1 className="de-title">{t.title}</h1>
                {t.scripture_focus && <div className="de-scr">Scripture focus · {t.scripture_focus}</div>}
              </div>
            </div>

            <div className="de-date">{formatDate(selectedDate)}{selectedDate === todayISO() ? " · Today" : ""}</div>

            <div className="de-block">
              <div className="de-label"><span className="dot" style={{ background: color }} /><span className="name">Reflect</span></div>
              <p className="de-prompt">{t.reflect_prompt || "What is God bringing to mind as you sit with this passage?"}</p>
              <textarea className="de-textarea" placeholder="Take your time…"
                value={reflect} onChange={(e) => { setReflect(e.target.value); scheduleSave("reflect_text", e.target.value); }} />
              <div className={`de-status ${savedField === "reflect_text" ? "on" : ""}`}>{statusText("reflect_text")}</div>
            </div>

            <div className="de-block">
              <div className="de-label"><span className="dot" style={{ background: color }} /><span className="name">Pray</span></div>
              <p className="de-prompt">{t.pray_prompt || "Write a prayer in response — honest, unrushed."}</p>
              <textarea className="de-textarea" placeholder="Speak plainly to God…"
                value={pray} onChange={(e) => { setPray(e.target.value); scheduleSave("pray_text", e.target.value); }} />
              <div className={`de-status ${savedField === "pray_text" ? "on" : ""}`}>{statusText("pray_text")}</div>
            </div>

            <div className="de-block">
              <div className="de-label"><span className="dot" style={{ background: color }} /><span className="name">Apply</span></div>
              <p className="de-prompt">{t.apply_prompt || "What is one small way you'll live this out today?"}</p>
              <textarea className="de-textarea" placeholder="One small step is enough."
                value={apply} onChange={(e) => { setApply(e.target.value); scheduleSave("apply_text", e.target.value); }} />
              <div className={`de-status ${savedField === "apply_text" ? "on" : ""}`}>{statusText("apply_text")}</div>
            </div>

            <div className="de-past">
              <h3>Past entries</h3>
              {(pastQ.data ?? []).length === 0 ? (
                <ul><li className="empty" style={{ cursor: "default", justifyContent: "center" }}>No past entries yet. Today is a good day to start.</li></ul>
              ) : (
                <ul>
                  {(pastQ.data ?? []).map((e) => {
                    const preview = [e.reflect_text, e.pray_text, e.apply_text].filter(Boolean).join(" · ").slice(0, 90);
                    return (
                      <li key={e.id} className={e.entry_date === selectedDate ? "active" : ""} onClick={() => setSelectedDate(e.entry_date)}>
                        <span className="d">{formatDate(e.entry_date)}{e.entry_date === todayISO() ? " · Today" : ""}</span>
                        <span className="preview">{preview || "—"}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </div>

      {/* keep navigate reference to avoid unused warning */}
      <span style={{ display: "none" }} aria-hidden onClick={() => navigate({ to: "/devotionals" })} />
    </div>
  );
}
