import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SeriesRow } from "@/lib/content-home";

/** Shared content-site header + info bar (home, shop, other public content pages). */
const I = {
  search: (s = 19) => <svg className="ico" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>,
  arrow: (s = 15, c = "currentColor") => <svg className="ico" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
  menu: (s = 22) => <svg className="ico" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>,
};

const NAV = [
  { label: "Read", to: "/explore" },
  { label: "Watch", to: "/watch" },
  { label: "Listen", to: "/listen" },
  { label: "Devotionals", to: "/explore/devotionals" },
  { label: "Shop", to: "/shop" },
] as const;


export function Logo({ tile = true, size = 19 }: { tile?: boolean; size?: number }) {
  return (
    <Link to="/" search={{ feed: 1 }} aria-label="CoCreate home" className="ch-logo">
      {tile && <span className="tile">C</span>}
      <span className="word" style={{ fontSize: size }}>CoCreate</span>
    </Link>
  );
}

export function Header({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setDesktop(mq.matches);
    on(); mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <header className="ch-head">
      <div className="wrap bar">
        <Logo tile={!(signedIn && desktop)} />
        <nav aria-label="Content" className="ch-nav">
          {NAV.map((n) => <Link key={n.to} to={n.to}>{n.label}</Link>)}
        </nav>
        <div className="ch-actions" ref={ref}>
          {!signedIn && <Link to="/subscribe" className="ch-sub" style={{ order: 3 }}>Subscribe</Link>}
          <Link to="/search" aria-label="Search" className="ch-iconbtn" style={{ order: 1 }}>{I.search()}</Link>
          {!signedIn && <Link to="/auth" className="ch-signin" style={{ order: 2 }}>Sign in</Link>}
          <button type="button" className="ch-iconbtn ch-menu" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} style={{ order: 4 }}>{I.menu()}</button>
          {open && (
            <div className="ch-menu-panel" role="menu">
              {!signedIn && <Link to="/auth" role="menuitem">Sign in</Link>}
              <Link to="/about" role="menuitem">About</Link>
              <Link to="/mission" role="menuitem">Mission</Link>
              <Link to="/contact" role="menuitem">Contact</Link>
            </div>
          )}
        </div>
      </div>
      <nav aria-label="Content" className="ch-nav2">
        {NAV.map((n) => <Link key={n.to} to={n.to}>{n.label}</Link>)}
      </nav>
    </header>
  );
}

export function InfoBar({ currentSeries, now }: { currentSeries?: SeriesRow | null; /** simulated "now" for staged previews */ now?: string }) {
  const [today, setToday] = useState("");
  useEffect(() => { setToday((now ? new Date(now) : new Date()).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })); }, [now]);
  const s = currentSeries;
  return (
    <div className="ch-info">
      <div className="wrap">
        <span>{today}</span>
        {s && (
          <Link to="/series/$slug" params={{ slug: s.slug }} className="series">
            This month: {s.title}{I.arrow(14)}
          </Link>
        )}
        <span>New releases every month</span>
      </div>
    </div>
  );
}

/** Current-month series for pages that don't load full home data. */
export function useCurrentSeries() {
  return useQuery({
    queryKey: ["current-series"],
    staleTime: 60_000,
    queryFn: async (): Promise<SeriesRow | null> => {
      const d = new Date();
      const first = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      const { data } = await supabase.from("collections").select("id, slug, title, series_month, summary, banner_url, cover_image_url, hero_focal_desktop, hero_focal_mobile").gte("series_month", first).order("series_month").limit(1);
      const s = (data ?? [])[0] as SeriesRow | undefined;
      return s && s.series_month?.slice(0, 7) === first.slice(0, 7) ? s : null;
    },
  });
}

export function Footer() {
  return (
    <footer className="wrap ch-foot">
      <Logo size={17} />
      <nav aria-label="Footer">
        <Link to="/about">About</Link>
        <Link to="/mission">Mission</Link>
        <Link to="/shop">Shop</Link>
        <Link to="/contact">Contact</Link>
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
      </nav>
      <span style={{ fontSize: 12.5, color: "var(--cs-muted)" }}>© {new Date().getFullYear()} CoCreate</span>
    </footer>
  );
}
