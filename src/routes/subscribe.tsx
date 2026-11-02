import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const OPTIONS = [
  { value: "monthly_letter", label: "The monthly letter", desc: "One thoughtful letter from us each month." },
  { value: "new_releases", label: "New releases", desc: "New essays, teachings and episodes as they land." },
  { value: "devotionals", label: "Devotionals", desc: "When a new devotional is ready to start." },
  { value: "abide_seasons", label: "New Abide seasons", desc: "Each new season of the Abide planner." },
  { value: "paper_crew", label: "The paper crew", desc: "First looks at the paper Abide and pre-orders." },
  { value: "app_updates", label: "App updates", desc: "New things in the CoCreate workspace." },
] as const;
const VALID = OPTIONS.map((o) => o.value) as readonly string[];

export const Route = createFileRoute("/subscribe")({
  validateSearch: (s: Record<string, unknown>): { topics?: string } =>
    typeof s.topics === "string" ? { topics: s.topics } : {},
  component: SubscribePage,
  head: () => ({
    meta: [
      { title: "Subscribe — CoCreate" },
      { name: "description", content: "Essays, teachings and practices for how you actually live, sent when there's something worth your time." },
      { property: "og:title", content: "Stay close to what CoCreate is building" },
      { property: "og:description", content: "Pick everything, or just what you came for. No more than one email a week." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const schema = z.object({
  first_name: z.string().trim().max(120),
  email: z.string().trim().email("Please use a valid email").max(255),
});

const CSS = `
.sb-page{min-height:100vh;background:#FBF8ED;font-family:'Poppins',sans-serif;color:#181A4D;}
.sb-head{display:flex;align-items:center;justify-content:space-between;max-width:1080px;margin:0 auto;padding:18px 24px;}
.sb-brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:#181A4D;}
.sb-brand .mark{width:32px;height:32px;border-radius:9px;background:#181A4D;color:#CAC307;display:flex;align-items:center;justify-content:center;font-family:'Archivo Black','Poppins',sans-serif;}
.sb-brand .word{font-family:'Archivo Black','Poppins',sans-serif;font-size:18px;}
.sb-signin{font-weight:700;font-size:13.5px;color:#181A4D;text-decoration:none;}
.sb{max-width:1080px;margin:0 auto;padding:32px 24px 96px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);box-sizing:border-box;gap:48px;align-items:start;}
.sb h1{font-family:'Archivo Black','Poppins',sans-serif;font-weight:900;letter-spacing:-.02em;font-size:44px;line-height:1.08;margin:0 0 16px;}
.sb-lead{font-size:15.5px;color:#6f6b5e;line-height:1.6;margin:0 0 22px;}
.sb-rs{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:10px;font-size:14px;}
.sb-rs li{display:flex;gap:10px;}.sb-rs li:before{content:"✓";color:#0F4A42;font-weight:900;}
.sb-card{box-sizing:border-box;min-width:0;background:#fff;border:1px solid rgba(24,26,77,.08);border-radius:18px;padding:26px;display:flex;flex-direction:column;gap:16px;}
.sb-card label.f{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:700;}
.sb-card input[type=text],.sb-card input[type=email]{border:1.5px solid #ECE4CE;border-radius:10px;padding:11px 13px;font-family:inherit;font-size:15px;background:#FBF8ED;color:#20201C;outline:none;}
.sb-card input:focus{border-color:#181A4D;}
.sb-opt{display:flex;gap:10px;align-items:flex-start;border:1.5px solid #ECE4CE;border-radius:12px;padding:12px;cursor:pointer;}
.sb-opt.on{border-color:#181A4D;background:#F3F6DC;}
.sb-opt input{margin-top:3px;accent-color:#181A4D;}
.sb-opt b{display:block;font-size:13.5px;}.sb-opt span{font-size:12px;color:#6f6b5e;}
.sb-or{font-size:11.5px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#8a8678;}
.sb-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.sb-btn{background:#181A4D;color:#fff;border:none;border-radius:999px;padding:13px 26px;font-family:inherit;font-weight:800;font-size:14px;cursor:pointer;align-self:flex-start;}
.sb-btn:disabled{opacity:.6;}
.sb-err{font-size:12px;color:#9A3412;font-weight:600;}
.sb-done{border-left:4px solid #CAC307;}
.sb-done h2{margin:0;font-size:22px;}.sb-done p{margin:0;color:#6f6b5e;font-size:14px;}
@media(max-width:860px){.sb{grid-template-columns:minmax(0,1fr);gap:28px;padding-top:12px;}.sb h1{font-size:34px;}.sb-grid{grid-template-columns:1fr;}}
`;

function SubscribePage() {
  const { topics } = Route.useSearch();
  const initial = (topics ?? "").split(",").map((t) => t.trim()).filter((t) => VALID.includes(t));
  const [picked, setPicked] = useState<string[]>(initial);
  const [everything, setEverything] = useState(initial.length === 0);
  const [form, setForm] = useState({ first_name: "", email: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const toggle = (v: string) => {
    const next = picked.includes(v) ? picked.filter((x) => x !== v) : [...picked, v];
    setPicked(next);
    setEverything(next.length === 0 ? everything : false);
  };
  const toggleEverything = () => {
    if (everything) { setEverything(false); return; }
    setEverything(true); setPicked([]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    const errs: Record<string, string> = {};
    if (!parsed.success) parsed.error.issues.forEach((i) => { errs[String(i.path[0])] = i.message; });
    if (!everything && picked.length === 0) errs.tags = "Pick at least one thing to receive.";
    setErrors(errs);
    if (!parsed.success || errs.tags) return;
    setBusy(true);
    const { error } = await (supabase.rpc as any)("subscribe_email", {
      _email: parsed.data.email, _first_name: parsed.data.first_name || null,
      _tags: everything ? ["everything"] : picked, _season: null, _source: "subscribe_page",
    });
    setBusy(false);
    if (error) { setErrors({ form: "That didn't go through. Please try again." }); return; }
    setDone(true);
  };

  return (
    <div className="sb-page">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <header className="sb-head">
        <Link to="/" search={{ feed: 1 } as any} className="sb-brand"><div className="mark">C</div><div className="word">CoCreate</div></Link>
        <Link to="/auth" className="sb-signin">Sign in</Link>
      </header>
      <main className="sb">
        <div>
          <h1>Stay close to what we're building.</h1>
          <p className="sb-lead">Essays, teachings and practices for how you actually live, sent when there's something worth your time. Pick everything, or just what you came for.</p>
          <ul className="sb-rs">
            <li>No more than one email a week unless you ask for more.</li>
            <li>Change what you get or unsubscribe anytime.</li>
            <li>We never share your email.</li>
          </ul>
        </div>
        {done ? (
          <div className="sb-card sb-done">
            <h2>You're in. Watch your inbox.</h2>
            <p>We'll only write when there's something worth your time.</p>
            <Link to="/" search={{ feed: 1 } as any} style={{ fontWeight: 700, color: "#0F4A42", fontSize: 13 }}>← Back to CoCreate</Link>
          </div>
        ) : (
          <form className="sb-card" onSubmit={submit} noValidate>
            <label className="f">First name
              <input type="text" value={form.first_name} maxLength={120} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            </label>
            <label className="f">Email
              <input type="email" value={form.email} maxLength={255} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              {errors.email && <span className="sb-err">{errors.email}</span>}
            </label>
            <label className={`sb-opt${everything ? " on" : ""}`}>
              <input type="checkbox" checked={everything} onChange={toggleEverything} />
              <div><b>Everything CoCreate</b><span>All of it, never more than once a week.</span></div>
            </label>
            <div className="sb-or">Or choose what you want</div>
            <div className="sb-grid">
              {OPTIONS.map((o) => (
                <label key={o.value} className={`sb-opt${picked.includes(o.value) ? " on" : ""}`}>
                  <input type="checkbox" checked={picked.includes(o.value)} onChange={() => toggle(o.value)} />
                  <div><b>{o.label}</b><span>{o.desc}</span></div>
                </label>
              ))}
            </div>
            {errors.tags && <span className="sb-err">{errors.tags}</span>}
            {errors.form && <span className="sb-err">{errors.form}</span>}
            <button className="sb-btn" type="submit" disabled={busy}>{busy ? "Subscribing…" : "Subscribe"}</button>
          </form>
        )}
      </main>
    </div>
  );
}
