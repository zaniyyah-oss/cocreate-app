import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { trackEvent } from "@/lib/track";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";

type Template = Database["public"]["Tables"]["devotional_templates"]["Row"];
type Entry = Database["public"]["Tables"]["devotional_entries"]["Row"] & {
  where_text?: string | null;
  scripture_reference?: string | null;
  scripture_text?: string | null;
  further_reading_text?: string | null;
  todo_text?: string | null;
  todo_items?: TodoItem[] | null;
};
type Topic = Database["public"]["Tables"]["topics"]["Row"];

type TodoItem = { id: string; text: string; done: boolean };

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
      { name: "description", content: "Where are you, Read, Pray, To-Do, Workspace." },
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
.de-headcard{background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,0.05);margin-bottom:32px;}
.de-headaccent{height:6px;width:100%;}
.de-headbody{padding:32px 34px 34px;}
.de-topic{font-size:10.5px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:14px;}
.de-title{font-size:32px;font-weight:900;letter-spacing:-0.03em;color:#181A4D;line-height:1.15;margin:0 0 18px;}
.de-scr{font-size:14px;font-weight:700;color:#0F4A42;padding-top:16px;border-top:1px solid rgba(20,20,20,0.06);}
.de-date{font-size:11px;font-weight:800;color:#8a8678;letter-spacing:0.14em;text-transform:uppercase;text-align:center;margin-bottom:22px;}

.de-block{background:#fff;border-radius:16px;padding:28px 30px;margin-bottom:22px;border:1px solid rgba(20,20,20,0.05);}
.de-block.read{padding:0;overflow:hidden;}
.de-read-head{padding:26px 30px 4px;}
.de-read-part{padding:14px 30px 24px;border-top:1px solid rgba(20,20,20,0.05);}
.de-read-part:first-of-type{border-top:none;}
.de-sublabel{font-size:10.5px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#0F4A42;margin:0 0 10px;}
.de-scr-ref{width:100%;border:none;background:#FBF8ED;border-radius:10px;padding:11px 14px;font-family:'Poppins';font-size:13.5px;color:#0F4A42;font-weight:700;outline:none;margin-bottom:12px;}
.de-scr-ref:focus{background:#f5efd8;}
.de-invite{font-size:13px;color:#8a8678;font-style:italic;line-height:1.6;margin:0 0 14px;}

.de-label{display:flex;align-items:center;gap:10px;margin-bottom:12px;}
.de-label .dot{width:8px;height:8px;border-radius:50%;}
.de-label .name{font-size:11px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#181A4D;}
.de-label .num{font-size:10px;font-weight:800;color:#8a8678;letter-spacing:0.12em;}
.de-prompt{font-size:15px;line-height:1.65;color:#20201c;margin:0 0 18px;font-weight:500;letter-spacing:-0.005em;}
.de-textarea{width:100%;border:none;background:#FBF8ED;border-radius:12px;padding:16px 18px;font-family:'Poppins';font-size:14.5px;color:#20201c;line-height:1.65;min-height:120px;resize:vertical;outline:none;transition:background .2s ease;}
.de-textarea.tall{min-height:180px;}
.de-textarea.short{min-height:90px;}
.de-textarea:focus{background:#f5efd8;}
.de-status{margin-top:10px;font-size:11px;color:#8a8678;font-weight:600;text-align:right;min-height:16px;}
.de-status.on{color:#0F4A42;}

.de-todos{margin-top:16px;background:#FBF8ED;border-radius:12px;padding:12px 14px;}
.de-todo{display:flex;align-items:center;gap:10px;padding:8px 4px;border-bottom:1px solid rgba(20,20,20,0.05);}
.de-todo:last-of-type{border-bottom:none;}
.de-todo input[type=checkbox]{width:16px;height:16px;accent-color:#0F4A42;cursor:pointer;flex-shrink:0;}
.de-todo input[type=text]{flex:1;border:none;background:transparent;font-family:'Poppins';font-size:13.5px;color:#20201c;outline:none;padding:4px 0;}
.de-todo input[type=text].done{color:#8a8678;text-decoration:line-through;}
.de-todo-x{background:none;border:none;color:#8a8678;cursor:pointer;font-size:16px;padding:2px 6px;line-height:1;}
.de-todo-x:hover{color:#FF340C;}
.de-todo-add{background:none;border:1px dashed rgba(15,74,66,0.3);color:#0F4A42;font-family:'Poppins';font-weight:700;font-size:12px;letter-spacing:0.04em;padding:9px 14px;border-radius:8px;cursor:pointer;margin-top:10px;width:100%;transition:background .15s ease;}
.de-todo-add:hover{background:rgba(15,74,66,0.06);}

.de-workspace{background:#fff;border:1px dashed rgba(20,20,20,0.15);border-radius:16px;padding:24px 28px;margin-bottom:22px;}
.de-workspace .name{font-size:11px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#181A4D;margin-bottom:8px;}
.de-workspace p{font-size:13.5px;color:#8a8678;line-height:1.6;margin:0 0 14px;}
.de-workspace .row{display:flex;gap:10px;flex-wrap:wrap;}
.de-ws-btn{background:#181A4D;color:#fff;font-family:'Poppins';font-weight:700;font-size:12.5px;padding:9px 16px;border-radius:20px;text-decoration:none;border:none;cursor:pointer;}
.de-ws-btn.ghost{background:transparent;color:#181A4D;border:1px solid rgba(24,26,77,0.25);}
.de-ws-btn:hover{background:#0F4A42;color:#fff;border-color:#0F4A42;}

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

// Saveable field types
type SaveField =
  | "where_text"
  | "scripture_reference"
  | "scripture_text"
  | "further_reading_text"
  | "pray_text"
  | "todo_text"
  | "todo_items";

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

  // 5-section state
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
  useEffect(() => {
    const key = `${selectedDate}:${currentEntry?.id ?? "new"}`;
    if (hydratedRef.current === key) return;
    hydratedRef.current = key;
    const e = currentEntry;
    setWhereText(e?.where_text ?? e?.reflect_text ?? "");
    setScriptureRef(e?.scripture_reference ?? "");
    setScriptureText(e?.scripture_text ?? "");
    setFurtherReading(e?.further_reading_text ?? "");
    setPrayText(e?.pray_text ?? "");
    setTodoText(e?.todo_text ?? e?.apply_text ?? "");
    const items = Array.isArray(e?.todo_items) ? (e!.todo_items as TodoItem[]) : [];
    setTodoItems(items);
  }, [selectedDate, currentEntry?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const statusRow = (field: string) => (
    <div className={`de-status ${savedField === field ? "on" : ""}`}>{statusText(field)}</div>
  );

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

            {/* 1. Where Are You */}
            <div className="de-block">
              <div className="de-label">
                <span className="dot" style={{ background: color }} />
                <span className="name">Where are you</span>
                <span className="num">· 01</span>
              </div>
              <p className="de-prompt">Before God, honestly: where are you right now? Tired, anxious, distracted, hopeful, numb? Name it plainly.</p>
              <textarea
                className="de-textarea short"
                placeholder="God, I come to you today feeling…"
                value={whereText}
                onChange={(e) => { setWhereText(e.target.value); scheduleSave("where_text", e.target.value); }}
              />
              {statusRow("where_text")}
            </div>

            {/* 2. Read */}
            <div className="de-block read">
              <div className="de-read-head">
                <div className="de-label">
                  <span className="dot" style={{ background: color }} />
                  <span className="name">Read</span>
                  <span className="num">· 02</span>
                </div>
                <p className="de-invite">
                  Don't rush past this. Open your Bible, read slowly — preferably out loud — and let a
                  passage stay with you before you write anything. A few unhurried minutes here will
                  reshape the rest of your day more than any note you take.
                </p>
              </div>

              <div className="de-read-part">
                <div className="de-sublabel">Scripture</div>
                <input
                  className="de-scr-ref"
                  placeholder="Passage — e.g. John 15:1–8"
                  value={scriptureRef}
                  onChange={(e) => { setScriptureRef(e.target.value); scheduleSave("scripture_reference", e.target.value); }}
                />
                <textarea
                  className="de-textarea"
                  placeholder="What did you notice? What lines stopped you? What is God saying through this passage?"
                  value={scriptureText}
                  onChange={(e) => { setScriptureText(e.target.value); scheduleSave("scripture_text", e.target.value); }}
                />
                {statusRow("scripture_text")}
              </div>

              <div className="de-read-part">
                <div className="de-sublabel">Further reading</div>
                <textarea
                  className="de-textarea short"
                  placeholder="Any books, studies, or teachings you're working through — with notes from today's reading, if any."
                  value={furtherReading}
                  onChange={(e) => { setFurtherReading(e.target.value); scheduleSave("further_reading_text", e.target.value); }}
                />
                {statusRow("further_reading_text")}
              </div>
            </div>

            {/* 3. Pray */}
            <div className="de-block">
              <div className="de-label">
                <span className="dot" style={{ background: color }} />
                <span className="name">Pray</span>
                <span className="num">· 03</span>
              </div>
              <p className="de-prompt">{t.pray_prompt || "What do you need to bring to God today? Invite Him into it. Who are you interceding for?"}</p>
              <textarea
                className="de-textarea"
                placeholder="Speak plainly to God…"
                value={prayText}
                onChange={(e) => { setPrayText(e.target.value); scheduleSave("pray_text", e.target.value); }}
              />
              {statusRow("pray_text")}
            </div>

            {/* 4. To-Do */}
            <div className="de-block">
              <div className="de-label">
                <span className="dot" style={{ background: color }} />
                <span className="name">To-Do</span>
                <span className="num">· 04</span>
              </div>
              <p className="de-prompt">{t.apply_prompt || "What does obedience look like today, concretely? Not intentions — the small, specific next step."}</p>
              <textarea
                className="de-textarea short"
                placeholder="What is God asking of me today?"
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

            {/* 5. Workspace */}
            <div className="de-workspace">
              <div className="de-label">
                <span className="dot" style={{ background: color }} />
                <span className="name">Workspace</span>
                <span className="num">· 05</span>
              </div>
              <p>Continue this practice in your workspace — pinned quotes, notes, and everything you've saved that touches on today's reflection.</p>
              <div className="row">
                <Link to="/notes" className="de-ws-btn">Open notes</Link>
                <Link to="/saved" className="de-ws-btn ghost">Saved &amp; pinned</Link>
              </div>
            </div>

            <div className="de-past">
              <h3>Past entries</h3>
              {(pastQ.data ?? []).length === 0 ? (
                <ul><li className="empty" style={{ cursor: "default", justifyContent: "center" }}>No past entries yet. Today is a good day to start.</li></ul>
              ) : (
                <ul>
                  {(pastQ.data ?? []).map((e) => {
                    const preview = [e.where_text ?? e.reflect_text, e.scripture_text, e.pray_text, e.todo_text ?? e.apply_text].filter(Boolean).join(" · ").slice(0, 90);
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
