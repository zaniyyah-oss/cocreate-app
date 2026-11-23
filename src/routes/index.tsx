import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { HOME_CSS } from "@/components/content/home-css";
import { useUpNext, saveForLater, useInvalidateUpNext } from "@/lib/up-next";
import { todayISO } from "@/lib/active-devotional";
import {
  useHomeData, photoOf, shortDate, TYPE_LABEL, TYPE_DOT,
  type Piece, type DevoRow, type NewCard, type HomeData,
} from "@/lib/content-home";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { feed?: number } =>
    search.feed ? { feed: 1 } : {},
  component: HomePage,
  head: () => ({
    meta: [
      { title: "CoCreate — New teachings, articles, podcasts and devotionals every month" },
      { name: "description", content: "Watch, read and listen to each month's CoCreate series, then live it out with a devotional in your own workspace." },
      { property: "og:title", content: "CoCreate — New releases every month" },
      { property: "og:description", content: "Teachings, articles, podcasts and devotionals released in monthly series." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

/* ---------- small helpers ---------- */

/** Bracketed placeholders only show in development/preview, never on the live site. */
function useIsPreview() {
  const [p, setP] = useState(false);
  useEffect(() => {
    const h = window.location.hostname;
    setP(import.meta.env.DEV || /id-preview|lovableproject|localhost|127\.0\.0\.1/.test(h));
  }, []);
  return p;
}
function Ph({ show, children }: { show: boolean; children: ReactNode }) {
  return show ? <span className="ph">{children}</span> : null;
}

const I = {
  search: (s = 19) => <svg className="ico" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>,
  arrow: (s = 15, c = "currentColor") => <svg className="ico" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
  play: (s = 16, c = "currentColor") => <svg className="ico" width={s} height={s} viewBox="0 0 24 24"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" fill={c} /></svg>,
  bookmark: (s = 16) => <svg className="ico" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round"><path d="M6 3h12v18l-6-4-6 4V3z" /></svg>,
  menu: (s = 22) => <svg className="ico" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>,
};

const focal = (d?: string | null, m?: string | null) =>
  ({ ["--fd" as any]: d || "center", ["--fm" as any]: m || d || "center" }) as CSSProperties;

function Img({ src, alt, fd, fm }: { src: string | null; alt: string; fd?: string | null; fm?: string | null }) {
  if (!src) return null;
  return <img src={src} alt={alt} loading="lazy" style={focal(fd, fm)} />;
}

function Photo({ p, ratio, alt }: { p: { hero_url?: string | null; cover_image_url?: string | null; thumbnail_url?: string | null; hero_focal_desktop?: string | null; hero_focal_mobile?: string | null }; ratio: string; alt: string }) {
  return (
    <div style={{ borderRadius: 6, overflow: "hidden" }}>
      <div className="cs-photo" style={{ aspectRatio: ratio }}>
        <Img src={photoOf(p)} alt={alt} fd={p.hero_focal_desktop} fm={p.hero_focal_mobile} />
      </div>
    </div>
  );
}

function PieceLink({ p, className, style, children }: { p: Piece; className?: string; style?: CSSProperties; children: ReactNode }) {
  const id = p.id ?? "";
  if (p.type === "teaching" || p.type === "clip") return <Link to="/teachings/$id" params={{ id }} className={className} style={style}>{children}</Link>;
  if (p.type === "podcast") return <Link to="/podcasts/$id" params={{ id }} className={className} style={style}>{children}</Link>;
  return <Link to="/essays/$id" params={{ id }} className={className} style={style}>{children}</Link>;
}

function DevoLink({ d, className, style, children }: { d: DevoRow; className?: string; style?: CSSProperties; children: ReactNode }) {
  if (d.slug) return <Link to="/devotionals/$slug/overview" params={{ slug: d.slug }} className={className} style={style}>{children}</Link>;
  return <Link to="/explore/devotionals" className={className} style={style}>{children}</Link>;
}

function useSaveForLater(userId: string | null) {
  const navigate = useNavigate();
  const invalidate = useInvalidateUpNext();
  return async (contentId: string | null | undefined) => {
    if (!contentId) return;
    if (!userId) { navigate({ to: "/auth" }); return; }
    try { await saveForLater(userId, contentId); invalidate(); toast.success("Saved for later"); }
    catch { toast.error("Couldn't save that. Please try again."); }
  };
}

const NAV = [
  { label: "Read", to: "/explore" },
  { label: "Watch", to: "/watch" },
  { label: "Listen", to: "/listen" },
  { label: "Devotionals", to: "/explore/devotionals" },
  { label: "Shop", to: "/shop" },
] as const;

/* ---------- page ---------- */

function HomePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const { feed } = Route.useSearch();
  const navigate = useNavigate();
  // Signed-in users land on the daily workspace unless they explicitly opened Explore.
  const [redirecting, setRedirecting] = useState(!feed);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const id = data.session?.user.id ?? null;
      setUserId(id);
      if (id && !feed) navigate({ to: "/devotionals", replace: true });
      else setRedirecting(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const preview = useIsPreview();
  const home = useHomeData();
  const signedIn = !!userId;

  if (redirecting) return null;
  const d = home.data;

  return (
    <AppShell current="explore" hideSide={!signedIn} hideTopbar>
      <style dangerouslySetInnerHTML={{ __html: HOME_CSS }} />
      <div className="content-site ch">
        <Header signedIn={signedIn} />
        <InfoBar d={d} />
        {d && (
          <>
            <Hero d={d} preview={preview} userId={userId} />
            {signedIn && userId && <PickUp userId={userId} copy={d.copy} preview={preview} />}
            <NewAndSchedule d={d} preview={preview} userId={userId} />
            <Devotionals d={d} preview={preview} />
            <Watch d={d} />
            <Columns d={d} />
            <Newsletter copy={d.copy} preview={preview} />
          </>
        )}
        <Footer />
      </div>
    </AppShell>
  );
}

function Logo({ tile = true, size = 19 }: { tile?: boolean; size?: number }) {
  return (
    <Link to="/" search={{ feed: 1 }} aria-label="CoCreate home" className="ch-logo">
      {tile && <span className="tile">C</span>}
      <span className="word" style={{ fontSize: size }}>CoCreate</span>
    </Link>
  );
}

function Header({ signedIn }: { signedIn: boolean }) {
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

function InfoBar({ d }: { d: HomeData | undefined }) {
  const [today, setToday] = useState("");
  useEffect(() => { setToday(new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })); }, []);
  const s = d?.currentSeries;
  return (
    <div className="ch-info">
      <div className="wrap">
        <span>{today}</span>
        {s && (
          <Link to="/collections/$slug" params={{ slug: s.slug }} className="series">
            This month: {s.title}{I.arrow(14)}
          </Link>
        )}
        <span>New releases every month</span>
      </div>
    </div>
  );
}

function Hero({ d, preview, userId }: { d: HomeData; preview: boolean; userId: string | null }) {
  const h = d.hero;
  const save = useSaveForLater(userId);
  if (!h) {
    if (!preview) return null;
    return (
      <section className="wrap ch-hero-sec" style={{ paddingTop: 32 }}>
        <div className="ch-hero empty"><div className="txt"><h1 className="ph">[Featured release]</h1><p className="ph">[Mark a published piece as featured to fill this space.]</p></div></div>
      </section>
    );
  }
  const photo = photoOf(h);
  const kicker = h.kicker || [`New ${(TYPE_LABEL[h.type ?? ""] ?? "release").toLowerCase()}`, d.heroSeries?.title].filter(Boolean).join(" · ");
  const line = h.summary || h.excerpt;
  const isWatch = h.type === "teaching" || h.type === "clip";
  return (
    <section className="wrap ch-hero-sec" style={{ paddingTop: 32 }}>
      <div className={`ch-hero${photo ? "" : " empty"}`}>
        <Img src={photo} alt={h.title ?? ""} fd={h.hero_focal_desktop} fm={h.hero_focal_mobile} />
        {photo && <div className="shade" />}
        <div className="txt">
          {kicker && <span className="ch-pill">{kicker}</span>}
          <h1>{h.title}</h1>
          {line ? <p>{line}</p> : <Ph show={preview}><p>[One line about this piece, in your words.]</p></Ph>}
          <div className="ch-btns">
            <PieceLink p={h} className="ch-btn-w">{isWatch ? <>{I.play(16, "var(--cs-ink)")}Watch now</> : h.type === "podcast" ? <>{I.play(16, "var(--cs-ink)")}Listen now</> : <>Read now</>}</PieceLink>
            <button type="button" className="ch-btn-o" onClick={() => save(h.id)}>{I.bookmark(16)}Save for later</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function PickUp({ userId, copy, preview }: { userId: string; copy: Record<string, string>; preview: boolean }) {
  const upNext = useUpNext(userId);
  const today = todayISO();
  const todos = useQuery({
    queryKey: ["home-today-todos", userId, today],
    queryFn: async () => {
      const { data } = await supabase.from("devotional_entries").select("todo_items").eq("user_id", userId).eq("entry_date", today);
      let open = 0;
      for (const r of data ?? []) for (const t of (Array.isArray(r.todo_items) ? r.todo_items : []) as any[]) if (t && !t.done && !t.completed) open++;
      return open;
    },
  });
  const study = useQuery({
    queryKey: ["home-recent-study", userId],
    queryFn: async () => {
      const { data } = await (supabase.from("workspace_items") as any)
        .select("id, title, updated_at, folder_id, study_folders(name)").eq("user_id", userId).eq("kind", "study")
        .order("updated_at", { ascending: false }).limit(1);
      return (data?.[0] ?? null) as { id: string; title: string | null; updated_at: string; study_folders?: { name: string | null } | null } | null;
    },
  });
  const saved = (upNext.data ?? []).filter((r) => !r.finished_at);
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const sub = copy["workspace_card_subline"];
  const s = study.data;
  return (
    <section className="wrap ch-sec" style={{ paddingTop: 40 }}>
      <div className="ch-h2row"><h2 className="ch-h2"><span className="ch-dot" style={{ background: "var(--cs-lime)" }} />Pick up where you left off</h2></div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        <Link to="/devotionals" className="ch-pick">
          <span className="ch-kick w">Today’s workspace</span>
          <span className="t">{dateLabel}</span>
          <span className="s">{todos.data ? `${todos.data} to-do${todos.data === 1 ? "" : "s"} open · ` : ""}{sub || <Ph show={preview}>[Workspace card line]</Ph>}</span>
          <span className="ch-cta" style={{ marginTop: 6 }}>Open today’s workspace{I.arrow(15)}</span>
        </Link>
        {s ? (
          <Link to="/read" search={{ open: s.id }} className="ch-pick">
            <span className="ch-kick w">Study{s.study_folders?.name ? ` · ${s.study_folders.name}` : ""}</span>
            <span className="t">{s.title || "Untitled study"}</span>
            <span className="s">Edited {relTime(s.updated_at)}</span>
            <span className="ch-cta" style={{ marginTop: 6 }}>Continue the study{I.arrow(15)}</span>
          </Link>
        ) : (
          <Link to="/read" className="ch-pick">
            <span className="ch-kick w">Study</span>
            <span className="t">Start a study</span>
            <span className="s">Your studies will show up here.</span>
            <span className="ch-cta" style={{ marginTop: 6 }}>Go to Read{I.arrow(15)}</span>
          </Link>
        )}
        <Link to="/up-next" className="ch-pick">
          <span className="ch-kick w">Up next</span>
          <span className="t">{saved.length} saved for later</span>
          <span className="s">{saved[0] ? `${saved[0].content.title}${saved.length > 1 ? `, and ${saved.length - 1} more` : ""}` : "Nothing saved yet."}</span>
          <span className="ch-cta" style={{ marginTop: 6 }}>See what you saved{I.arrow(15)}</span>
        </Link>
      </div>
    </section>
  );
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(m / 60), dd = Math.floor(h / 24);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  if (dd === 1) return "yesterday";
  if (dd < 30) return `${dd} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function NewCardView({ c, d, userId }: { c: NewCard; d: HomeData; userId: string | null }) {
  const save = useSaveForLater(userId);
  const released = new Date(c.at).getTime() <= new Date(d.now).getTime();
  if (c.kind === "devotional") {
    const v = c.devo;
    return (
      <article className="ch-card">
        <DevoLink d={v}><Photo p={v} ratio="4 / 5" alt={v.title} /></DevoLink>
        <span className="ch-kick"><span className="ch-dot" style={{ width: 7, height: 7, background: TYPE_DOT.devotional }} />Devotional · {shortDate(c.at)}</span>
        <h3><DevoLink d={v}>{v.title}</DevoLink></h3>
        <div><DevoLink d={v} className="ch-cta">Start in your workspace{I.arrow(15)}</DevoLink></div>
      </article>
    );
  }
  const p = c.piece;
  const t = p.type ?? "";
  const cta = !released ? "Save for later" : t === "podcast" ? "Listen now" : t === "teaching" || t === "clip" ? "Watch now" : "Read now";
  return (
    <article className="ch-card">
      {released ? <PieceLink p={p}><Photo p={p} ratio="4 / 5" alt={p.title ?? ""} /></PieceLink> : <Photo p={p} ratio="4 / 5" alt={p.title ?? ""} />}
      <span className="ch-kick"><span className="ch-dot" style={{ width: 7, height: 7, background: TYPE_DOT[t] ?? "var(--cs-ink)" }} />{TYPE_LABEL[t] ?? "Release"} · {shortDate(c.at)}</span>
      <h3>{released ? <PieceLink p={p}>{p.title}</PieceLink> : p.title}</h3>
      <div>
        {released
          ? <PieceLink p={p} className="ch-cta">{cta}{I.arrow(15)}</PieceLink>
          : <button type="button" className="ch-cta" onClick={() => save(p.id)}>{cta}{I.arrow(15)}</button>}
      </div>
    </article>
  );
}

function NewAndSchedule({ d, preview, userId }: { d: HomeData; preview: boolean; userId: string | null }) {
  const s = d.currentSeries;
  const n = d.nextSeries;
  const nextMonth = n?.series_month ? new Date(n.series_month + "T12:00:00").toLocaleDateString(undefined, { month: "long" }) : "";
  if (!d.newThisMonth.length && !d.schedule.length && !n && !preview) return null;
  return (
    <section className="wrap ch-sec" style={{ paddingTop: 72 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 48 }}>
        <div style={{ flex: "3 1 560px", minWidth: 0 }}>
          <div className="ch-h2row">
            <h2 className="ch-h2"><span className="ch-dot" style={{ background: "var(--cs-amber)" }} />New this month</h2>
            <Link to="/watch" className="ch-more">All releases{I.arrow(15)}</Link>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
            {d.newThisMonth.map((c) => <NewCardView key={c.kind === "piece" ? c.piece.id : c.devo.id} c={c} d={d} userId={userId} />)}
            {!d.newThisMonth.length && <Ph show={preview}>[No releases this month yet. Turn on “Feature in New this month” on up to 3 pieces.]</Ph>}
          </div>
        </div>
        <aside style={{ flex: "1 1 280px", minWidth: 0 }}>
          <div className="ch-h2row"><h2 className="ch-h2"><span className="ch-dot" style={{ background: "var(--cs-ink)" }} />Release schedule</h2></div>
          {d.schedule.length ? (
            <ul className="ch-sched">
              {d.schedule.map(({ piece, released }) => (
                <li key={piece.id}>
                  <span className="d" style={{ color: released ? "var(--cs-green)" : "var(--cs-amber-ink)" }}>{shortDate(piece.release_at)}</span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <span className="k">{TYPE_LABEL[piece.type ?? ""] ?? "Release"} · {released ? "Out now" : "Coming"}</span>
                    {released ? <PieceLink p={piece}>{piece.title}</PieceLink> : <span style={{ fontFamily: "var(--cs-font-head)", fontSize: 15.5, fontWeight: 500, lineHeight: 1.35, color: "var(--cs-ink)" }}>{piece.title}</span>}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Ph show={preview}>{s ? "[Add pieces to this month’s series to build the schedule.]" : "[Set a series month on a series to show its schedule.]"}</Ph>
          )}
          {n ? (
            <div className="ch-next">
              <span className="ch-kick w" style={{ letterSpacing: "0.14em" }}>Next series{nextMonth ? ` · ${nextMonth}` : ""}</span>
              <span className="t">{n.title}</span>
              <Link to="/subscribe" className="ch-cta">Get notified{I.arrow(15)}</Link>
            </div>
          ) : preview ? (
            <div className="ch-next"><span className="ph">[Next series — set a later series month on a series.]</span></div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

function Devotionals({ d, preview }: { d: HomeData; preview: boolean }) {
  const c = d.copy;
  if (!d.devotionals.length && !preview) return null;
  return (
    <section className="wrap ch-sec" style={{ paddingTop: 96 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 40, alignItems: "flex-end", marginBottom: 28 }}>
        <div style={{ flex: "1 1 420px", minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          <span className="ch-kick w" style={{ color: "var(--cs-green)" }}>Devotionals</span>
          {c["devotionals_headline"] ? <h2 className="ch-big-h2" style={{ margin: 0, fontFamily: "var(--cs-font-head)", fontSize: 40, fontWeight: 600, lineHeight: 1.1, letterSpacing: "-0.02em", color: "var(--cs-ink)" }}>{c["devotionals_headline"]}</h2> : <Ph show={preview}>[Devotionals headline]</Ph>}
          {c["devotionals_subline"] ? <p style={{ margin: 0, fontFamily: "var(--cs-font-head)", fontSize: 17, fontWeight: 300, lineHeight: 1.55, color: "var(--cs-text)" }}>{c["devotionals_subline"]}</p> : <Ph show={preview}>[Devotionals subline]</Ph>}
        </div>
        <div style={{ flex: "0 1 auto", display: "flex", flexDirection: "column", gap: 6 }}>
          <Link to="/plans/new" search={{ length: 3 }} style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", minHeight: 46, padding: "0 22px", borderRadius: 999, border: "1.5px solid var(--cs-ink)", color: "var(--cs-ink)", fontSize: 14, fontWeight: 600 }}>Create your own devotional</Link>
          {c["devotionals_create_note"] ? <span style={{ fontSize: 13, color: "var(--cs-muted)" }}>{c["devotionals_create_note"]}</span> : null}
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
        {d.devotionals.map((v) => {
          const photo = photoOf(v);
          return (
            <DevoLink key={v.id} d={v} className={`ch-overcard${photo ? "" : " empty"}`} style={{ flex: "0 1 calc((100% - 40px) / 3)", minWidth: 220, aspectRatio: "3 / 4" }}>
              <Img src={photo} alt={v.title} fd={v.hero_focal_desktop} fm={v.hero_focal_mobile} />
              <span className="shade" />
              <span className="txt">
                {v.duration_days ? <span className="k">{v.duration_days} day{v.duration_days === 1 ? "" : "s"}</span> : null}
                <span className="t">{v.title}</span>
                <span className="c">Start in your workspace{I.arrow(15)}</span>
              </span>
            </DevoLink>
          );
        })}
        {!d.devotionals.length && <Ph show={preview}>[Publish a devotional to show it here.]</Ph>}
      </div>
    </section>
  );
}

function Watch({ d }: { d: HomeData }) {
  const [big, ...rest] = d.watch;
  if (!big) return null;
  const photo = photoOf(big);
  return (
    <section className="wrap ch-sec" style={{ paddingTop: 96 }}>
      <div className="ch-h2row">
        <h2 className="ch-h2"><span className="ch-dot" style={{ background: "var(--cs-amber)" }} />Watch</h2>
        <Link to="/watch" className="ch-more">All teachings{I.arrow(15)}</Link>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 32 }}>
        <div style={{ flex: "2 1 520px", minWidth: 0, display: "flex" }}>
          <PieceLink p={big} className={`ch-overcard big${photo ? "" : " empty"}`} style={{ flex: "1 1 100%", minWidth: 0, aspectRatio: "16 / 10" }}>
            <Img src={photo} alt={big.title ?? ""} fd={big.hero_focal_desktop} fm={big.hero_focal_mobile} />
            <span className="shade" />
            <span className="txt">
              <span className="k">{TYPE_LABEL[big.type ?? ""] ?? "Teaching"}</span>
              <span className="t">{big.title}</span>
              <span className="c">Watch now{I.arrow(15)}</span>
            </span>
          </PieceLink>
        </div>
        {rest.length > 0 && (
          <div style={{ flex: "1 1 300px", minWidth: 0, borderTop: "1px solid var(--cs-line)" }}>
            {rest.map((p) => (
              <PieceLink key={p.id} p={p} className="ch-wrow">
                <span className="ch-wthumb">
                  <Img src={photoOf(p)} alt={p.title ?? ""} fd={p.hero_focal_desktop} fm={p.hero_focal_mobile} />
                  <span className="play">{I.play(13, "var(--cs-ink)")}</span>
                </span>
                <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                  <span className="ch-kick w">{TYPE_LABEL[p.type ?? ""] ?? "Teaching"}</span>
                  <span className="t">{p.title}</span>
                </span>
              </PieceLink>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Columns({ d }: { d: HomeData }) {
  const cols: ReactNode[] = [];
  const pieceCol = (label: string, dot: string, list: Piece[]) => {
    const [lead, ...more] = list;
    if (!lead) return null;
    return (
      <div key={label} className="ch-col" style={{ flex: "1 1 260px", minWidth: 0 }}>
        <div className="ch-h2row"><h2 className="ch-h2"><span className="ch-dot" style={{ background: dot }} />{label}</h2></div>
        <PieceLink p={lead}><Photo p={lead} ratio="4 / 3" alt={lead.title ?? ""} /></PieceLink>
        <div style={{ margin: "14px 0 6px" }}><span className="ch-kick w">{TYPE_LABEL[lead.type ?? ""] ?? label}</span></div>
        <PieceLink p={lead} className="lead">{lead.title}</PieceLink>
        {more.length > 0 && <ul>{more.map((p) => <li key={p.id}><PieceLink p={p}>{p.title}</PieceLink></li>)}</ul>}
      </div>
    );
  };
  cols.push(pieceCol("Read", "var(--cs-green)", d.read));
  cols.push(pieceCol("Listen", "var(--cs-periwinkle)", d.listen));
  const [lead, ...more] = d.products;
  if (lead) {
    const ProdLink = ({ p, className, children }: { p: typeof lead; className?: string; children: ReactNode }) =>
      p.checkout_url ? <a href={p.checkout_url} className={className} target="_blank" rel="noreferrer">{children}</a> : <Link to="/shop" className={className}>{children}</Link>;
    cols.push(
      <div key="shop" className="ch-col" style={{ flex: "1 1 260px", minWidth: 0 }}>
        <div className="ch-h2row"><h2 className="ch-h2"><span className="ch-dot" style={{ background: "var(--cs-blush)" }} />Shop</h2></div>
        <ProdLink p={lead}><Photo p={lead} ratio="4 / 3" alt={lead.title} /></ProdLink>
        {lead.category && <div style={{ margin: "14px 0 6px" }}><span className="ch-kick w">{lead.category}</span></div>}
        <ProdLink p={lead} className="lead">{lead.title}</ProdLink>
        {more.length > 0 && <ul>{more.map((p) => <li key={p.id}><ProdLink p={p}>{p.title}</ProdLink></li>)}</ul>}
      </div>,
    );
  }
  if (!cols.some(Boolean)) return null;
  return (
    <section className="wrap ch-sec" style={{ paddingTop: 96 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 40 }}>{cols}</div>
    </section>
  );
}

function Newsletter({ copy, preview }: { copy: Record<string, string>; preview: boolean }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const img = copy["newsletter_image_url"] || null;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || v.length > 254) { toast.error("Please enter a valid email."); return; }
    setBusy(true);
    const { error } = await (supabase.rpc as any)("subscribe_email", { _email: v, _first_name: null, _tags: ["everything"], _season: null, _source: "home_newsletter" });
    setBusy(false);
    if (error) { toast.error("That didn't go through. Please try again."); return; }
    setDone(true);
  };
  return (
    <section className="wrap ch-sec" style={{ paddingTop: 104 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 48, alignItems: "center", paddingTop: 56, borderTop: "1px solid var(--cs-line)" }}>
        <div style={{ flex: "1 1 360px", minWidth: 0, borderRadius: 6, overflow: "hidden" }}>
          <div className="cs-photo" style={{ aspectRatio: "4 / 3" }}>{img && <img src={img} alt="" loading="lazy" />}</div>
        </div>
        <form className="ch-nl" onSubmit={submit} style={{ flex: "1 1 360px", minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          {copy["newsletter_headline"] ? <h2>{copy["newsletter_headline"]}</h2> : <Ph show={preview}>[Newsletter headline]</Ph>}
          {copy["newsletter_subline"] ? <p style={{ margin: "0 0 8px", fontSize: 15, lineHeight: 1.55, color: "var(--cs-muted)" }}>{copy["newsletter_subline"]}</p> : null}
          {done ? (
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--cs-green)" }}>You’re subscribed. Watch your inbox.</p>
          ) : (
            <>
              <label htmlFor="nl-email-0" style={{ fontSize: 13, fontWeight: 600, color: "var(--cs-ink)" }}>Email</label>
              <input id="nl-email-0" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} required />
              <button type="submit" disabled={busy}>{busy ? "Subscribing…" : "Subscribe"}</button>
            </>
          )}
        </form>
      </div>
    </section>
  );
}

function Footer() {
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
