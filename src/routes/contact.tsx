import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

const REASONS = [
  { value: "general", label: "General question" },
  { value: "press", label: "Press inquiry" },
  { value: "topic", label: "Request a topic" },
  { value: "partnership", label: "Partnership" },
] as const;
type Reason = (typeof REASONS)[number]["value"];

export const Route = createFileRoute("/contact")({
  validateSearch: (s: Record<string, unknown>): { reason?: Reason } =>
    REASONS.some((r) => r.value === s.reason) ? { reason: s.reason as Reason } : {},
  component: ContactPage,
  head: () => ({
    meta: [
      { title: "Contact us — CoCreate" },
      { name: "description", content: "Send CoCreate a question, a press inquiry, a topic request or a partnership idea." },
      { property: "og:title", content: "Contact CoCreate" },
      { property: "og:description", content: "Questions, press, topic requests and partnerships — we'd love to hear from you." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const schema = z.object({
  name: z.string().trim().min(1, "Please add your name").max(120),
  email: z.string().trim().email("Please use a valid email").max(255),
  reason: z.enum(["general", "press", "topic", "partnership"]),
  message: z.string().trim().min(1, "Please write a message").max(4000),
});

const CSS = `
.ct{max-width:640px;margin:0 auto;padding:56px 24px 120px;font-family:'Poppins',sans-serif;}
.ct-eyebrow{font-size:11.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#8a8678;margin-bottom:10px;}
.ct h1{font-weight:900;letter-spacing:-.02em;font-family:'Archivo Black','Poppins',sans-serif;font-size:40px;color:#181A4D;margin:0 0 8px;}
.ct-sub{font-size:15px;color:#6f6b5e;margin:0 0 28px;}
.ct-card{background:#fff;border:1px solid rgba(24,26,77,0.08);border-radius:16px;padding:24px;display:flex;flex-direction:column;gap:16px;}
.ct label{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:700;color:#181A4D;}
.ct input,.ct select,.ct textarea{border:1.5px solid #ECE4CE;border-radius:10px;padding:11px 13px;font-family:inherit;font-size:15px;background:#FBF8ED;color:#20201C;outline:none;}
.ct input:focus,.ct select:focus,.ct textarea:focus{border-color:#181A4D;}
.ct textarea{min-height:150px;resize:vertical;}
.ct-err{font-size:12px;color:#9A3412;font-weight:600;}
.ct-btn{align-self:flex-start;background:#181A4D;color:#fff;border:none;border-radius:999px;padding:12px 24px;font-family:inherit;font-weight:800;font-size:13.5px;cursor:pointer;}
.ct-btn:disabled{opacity:.6;}
.ct-done{background:#fff;border-radius:16px;padding:28px;border-left:4px solid #CAC307;}
.ct-done h2{margin:0 0 6px;color:#181A4D;font-size:20px;}
.ct-done p{margin:0 0 14px;color:#6f6b5e;font-size:14px;}
`;

function ContactPage() {
  const search = Route.useSearch();
  const [form, setForm] = useState({ name: "", email: "", reason: (search.reason ?? "general") as Reason, message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFailed(null);
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { errs[String(i.path[0])] = i.message; });
      setErrors(errs);
      return;
    }
    setErrors({});
    setBusy(true);
    const { data: s } = await supabase.auth.getSession();
    const { error } = await (supabase.from as any)("contact_messages").insert({ ...parsed.data, user_id: s.session?.user.id ?? null });
    setBusy(false);
    if (error) { setFailed("Your message didn't send. Please try again."); return; }
    setSent(true);
  };

  return (
    <AppShell current="explore" hideSideWhenSignedOut>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="ct">
        <div className="ct-eyebrow">Get in touch</div>
        <h1>Contact us</h1>
        <p className="ct-sub">Questions, press, a topic you'd like us to cover, or an idea for working together.</p>
        {sent ? (
          <div className="ct-done">
            <h2>Thanks — your message is in.</h2>
            <p>We read every message that comes through here.</p>
            <Link to="/" search={{ feed: 1 } as any} style={{ fontWeight: 700, color: "#0F4A42", fontSize: 13 }}>← Back to Explore</Link>
          </div>
        ) : (
          <form className="ct-card" onSubmit={submit} noValidate>
            <label>Name
              <input value={form.name} maxLength={120} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              {errors.name && <span className="ct-err">{errors.name}</span>}
            </label>
            <label>Email
              <input type="email" value={form.email} maxLength={255} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              {errors.email && <span className="ct-err">{errors.email}</span>}
            </label>
            <label>Reason
              <select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value as Reason })}>
                {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </label>
            <label>Message
              <textarea value={form.message} maxLength={4000} onChange={(e) => setForm({ ...form, message: e.target.value })} />
              {errors.message && <span className="ct-err">{errors.message}</span>}
            </label>
            {failed && <span className="ct-err">{failed}</span>}
            <button className="ct-btn" type="submit" disabled={busy}>{busy ? "Sending…" : "Send message"}</button>
          </form>
        )}
      </div>
    </AppShell>
  );
}
