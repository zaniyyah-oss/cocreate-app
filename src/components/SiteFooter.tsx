import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

type FooterLink = { label: string; to: string; search?: Record<string, unknown> };

/** Content-page footer. Styles live in the home page's `.hp-footer` CSS. */
export function SiteFooter() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const s = q.trim();
    if (!s) return;
    navigate({ to: "/search", search: { q: s } as any });
  };
  const col = (title: string, links: FooterLink[]) => (
    <div>
      <h6>{title}</h6>
      {links.map((l) => (
        <Link key={l.label} to={l.to as any} search={l.search as any}>{l.label}</Link>
      ))}
    </div>
  );

  return (
    <footer className="hp-footer">
      <div className="wrap">
        <form className="hp-footer-search" onSubmit={submit}>
          <input type="text" placeholder="Search CoCreate…" value={q} onChange={(e) => setQ(e.target.value)} />
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        </form>

        <div className="hp-footer-cols hp-footer-cols--4">
          {col("Explore", [
            { label: "Latest", to: "/", search: { feed: 1 } },
            { label: "Devotionals", to: "/explore/devotionals" },
            { label: "Watch", to: "/watch" },
            { label: "Listen", to: "/listen" },
          ])}
          {col("CoCreate", [
            { label: "About", to: "/about" },
            { label: "Our mission", to: "/mission" },
            { label: "Shop", to: "/shop" },
            { label: "Subscribe", to: "/subscribe" },
          ])}
          {col("Get in touch", [
            { label: "Contact us", to: "/contact", search: { reason: "general" } },
            { label: "Press inquiries", to: "/contact", search: { reason: "press" } },
            { label: "Request a topic", to: "/contact", search: { reason: "topic" } },
            { label: "Partner with us", to: "/contact", search: { reason: "partnership" } },
          ])}
          {col("Help", [
            { label: "Help center", to: "/help" },
            { label: "Terms", to: "/terms" },
            { label: "Privacy", to: "/privacy" },
          ])}
        </div>

        <div className="hp-footer-brand-row">
          <div className="hp-brand">
            <div className="badge">C</div>
            <div className="word">CoCreate</div>
          </div>
          <div className="hp-footer-social">
            <span className="lbl">FOLLOW</span>
            <a className="hp-icon-circle" href="#" aria-label="Facebook"><svg viewBox="0 0 24 24"><path d="M13 22v-8h3l1-4h-4V7.5C13 6.4 13.4 6 14.6 6H17V2.1C16.6 2 15.3 2 13.9 2 11 2 9 3.8 9 7.1V10H6v4h3v8h4z" /></svg></a>
            <a className="hp-icon-circle" href="#" aria-label="X"><svg viewBox="0 0 24 24"><path d="M4 4l16 16M20 4L4 20" stroke="#fff" strokeWidth="2" /></svg></a>
            <a className="hp-icon-circle" href="#" aria-label="Instagram"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="#fff" strokeWidth="1.8" /><circle cx="12" cy="12" r="4" fill="none" stroke="#fff" strokeWidth="1.8" /></svg></a>
          </div>
          <div className="hp-app-badges">
            <div className="hp-app-pill">iOS · coming soon</div>
            <div className="hp-app-pill">Android · coming soon</div>
          </div>
        </div>

        <div className="hp-footer-legal">
          <div>© {new Date().getFullYear()} CoCreate. All rights reserved.</div>
          <div className="links">
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/help">Help center</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
