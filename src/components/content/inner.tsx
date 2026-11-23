import { Link } from "@tanstack/react-router";
import type { CSSProperties, ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { HOME_CSS } from "@/components/content/home-css";
import { PIECE_CSS } from "@/components/content/PieceRenderer";
import { Header, InfoBar, Footer } from "@/components/content/SiteHeader";
import { useCurrentSeries, kindLabel, monD, pieceRoute, type CalendarItem, type SeriesInfo, type SeriesPart } from "@/lib/content-pages";

/** Shared chrome + styles for the public inner content pages (article, series, devotional day). */
export const INNER_CSS = `
.ci{--ink:#181A4D;--txt:#2A2B33;--mut:#5F5D55;--line:#E6E3DC;--soft:#F6F5F1;--ph:#E9E6DF;color:var(--txt);font-family:'Instrument Sans',sans-serif;}
.ci *{font-style:normal;}
.ci a{color:inherit;text-decoration:none;}
.ci .k{font-family:'Instrument Sans',sans-serif;font-size:11.5px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:var(--mut);}
.ci .crumb{font-size:13px;color:var(--mut);display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
.ci .crumb .sl{color:#B5B2A8;}
.ci .pill{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 18px;border-radius:999px;font-size:14px;font-weight:600;cursor:pointer;border:1.5px solid var(--line);background:#fff;color:var(--ink);font-family:inherit;white-space:nowrap;}
.ci .pill.pri{background:var(--ink);border-color:var(--ink);color:#fff;}
.ci .pill.big{min-height:46px;padding:0 22px;font-size:15px;}
.ci .pill.sm{min-height:34px;padding:0 14px;font-size:13px;}
.ci .pill:disabled{opacity:.5;cursor:default;}
.ci .done{color:#0F4A42;border-color:#0F4A42;}
.ci .sh{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:0 0 18px;}
.ci .sh h2{margin:0;font-family:Poppins,sans-serif;font-size:20px;font-weight:600;color:var(--ink);}
.ci .sh a{font-size:13.5px;font-weight:600;color:var(--ink);}
.ci .ph{position:relative;overflow:hidden;background:var(--ph);}
.ci .ph img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:var(--fd,center);}
@media(max-width:760px){.ci .ph img{object-position:var(--fm,var(--fd,center));}}
.ci .ttl{font-family:Poppins,sans-serif;color:var(--ink);}
.ci .iconbtn{width:44px;height:44px;border-radius:999px;border:1px solid var(--line);background:#fff;display:flex;align-items:center;justify-content:center;color:var(--ink);cursor:pointer;}
.ci .iconbtn.on{background:var(--ink);color:#fff;border-color:var(--ink);}
.ci .playb{position:absolute;display:flex;align-items:center;justify-content:center;border-radius:999px;background:#fff;color:var(--ink);}
.ci .cards3{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;}
.ci .card .ph{aspect-ratio:16/10;border-radius:6px;}
.ci .card .ct{margin-top:8px;font-family:Poppins,sans-serif;font-size:16.5px;font-weight:600;color:var(--ink);line-height:1.3;}
.ci .card .why{margin-top:4px;font-size:12px;color:var(--mut);}
.ci .rail-card{border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#fff;}
.ci .bar{height:6px;border-radius:99px;background:#ECEAE4;overflow:hidden;}
.ci .bar>i{display:block;height:100%;background:var(--ink);}
.ci .prow{display:flex;gap:10px;align-items:center;padding:10px;border-radius:8px;}
.ci .prow.cur{background:var(--soft);}
.ci .tile{width:46px;height:50px;flex:none;border-radius:8px;background:var(--soft);display:flex;flex-direction:column;align-items:center;justify-content:center;}
.ci .linkbtn{background:none;border:0;padding:0;font:inherit;font-size:12.5px;font-weight:600;color:var(--ink);cursor:pointer;display:inline-flex;align-items:center;gap:4px;}
.ci .coming{padding:80px 0;text-align:center;}
@media(max-width:760px){.ci .cards3{grid-template-columns:1fr;}}
`;

export const Ico = {
  bookmark: (on = false, s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round"><path d="M6 3h12v18l-6-4-6 4V3z" /></svg>,
  share: (s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v14" /></svg>,
  chat: (s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>,
  plus: (s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>,
  bell: (s = 15) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10.3 21a1.9 1.9 0 0 0 3.4 0" /></svg>,
  play: (s = 14) => <svg width={s} height={s} viewBox="0 0 24 24"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" fill="currentColor" /></svg>,
  check: (s = 15) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>,
  lock: (s = 12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>,
};

export const focalStyle = (d?: string | null, m?: string | null) => ({ ["--fd" as any]: d || "center", ["--fm" as any]: m || d || "center" }) as CSSProperties;

export function Ph({ src, ratio, radius = 6, fd, fm, children, style, gray }: { src: string | null | undefined; ratio: string; radius?: number; fd?: string | null; fm?: string | null; children?: ReactNode; style?: CSSProperties; gray?: boolean }) {
  return (
    <div className="ph" style={{ aspectRatio: ratio, borderRadius: radius, ...focalStyle(fd, fm), ...style }}>
      {src ? <img src={src} alt="" loading="lazy" style={gray ? { filter: "grayscale(.6)", opacity: .75 } : undefined} /> : null}
      {children}
    </div>
  );
}

export function PlayBadge({ size = 30, center = false }: { size?: number; center?: boolean }) {
  const pos: CSSProperties = center ? { left: "50%", top: "50%", transform: "translate(-50%,-50%)" } : { left: 8, bottom: 8 };
  return <span className="playb" style={{ width: size, height: size, ...pos }}>{Ico.play(Math.round(size * 0.42))}</span>;
}

/** Content-site chrome. Signed-in desktop sits inside AppShell (Explore active); signed-in mobile keeps the bottom nav. */
export function PageFrame({ signedIn, staged, now, children }: { signedIn: boolean; staged: boolean; now: Date; children: ReactNode }) {
  const cur = useCurrentSeries(now);
  return (
    <AppShell current="explore" hideSide={!signedIn || staged} hideTopbar hideBottomNav={!signedIn}>
      <style dangerouslySetInnerHTML={{ __html: HOME_CSS + PIECE_CSS + INNER_CSS }} />
      <div className="content-site ch ci">
        <Header signedIn={signedIn} />
        <InfoBar currentSeries={cur.data as any} now={staged ? now.toISOString() : undefined} />
        {children}
        <Footer />
      </div>
    </AppShell>
  );
}

export type CardItem = { key: string; type: string | null; id: string; title: string; at: string | null; img: string | null; fd?: string | null; fm?: string | null; reason: string };

export function CardRow({ title, items, more }: { title: string; items: CardItem[]; more?: { label: string; to: string } }) {
  if (!items.length) return null;
  return (
    <section style={{ marginTop: 64 }}>
      <div className="sh"><h2>{title}</h2>{more ? <Link to={more.to as any}>{more.label} →</Link> : null}</div>
      <div className="cards3">
        {items.map((c) => (
          <Link key={c.key} to={pieceRoute(c.type)} params={{ id: c.id }} className="card" data-piece-id={c.id}>
            <Ph src={c.img} ratio="16/10" fd={c.fd} fm={c.fm}>{c.type === "teaching" || c.type === "podcast" || c.type === "clip" ? <PlayBadge /> : null}</Ph>
            <div className="k" style={{ marginTop: 12 }}>{[kindLabel(c.type), monD(c.at)].filter(Boolean).join(" · ")}</div>
            <div className="ct">{c.title}</div>
            <div className="why">{c.reason}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function PartLink({ part, children, className, style }: { part: SeriesPart; children: ReactNode; className?: string; style?: CSSProperties }) {
  if (part.released && part.piece) return <Link to={pieceRoute(part.piece.type)} params={{ id: part.piece.id }} className={className} style={style} data-piece-id={part.piece.id}>{children}</Link>;
  if (part.released && part.templateId) return <Link to="/devotionals/$id/day/$n" params={{ id: part.templateId, n: "today" }} className={className} style={style}>{children}</Link>;
  return <div className={className} style={style} data-piece-id={part.piece?.id}>{children}</div>;
}

/** Series card used in the article rail and devotional rail. */
export function SeriesRail({ series, parts, currentKey, signedIn, explored, following, reminded, onFollow, onRemind }: {
  series: SeriesInfo; parts: SeriesPart[]; currentKey?: string | null; signedIn: boolean; explored: number;
  following: boolean; reminded: (p: SeriesPart) => boolean; onFollow: () => void; onRemind: (p: SeriesPart) => void;
}) {
  const pct = parts.length ? Math.round((explored / parts.length) * 100) : 0;
  return (
    <div className="rail-card">
      <div className="ph" style={{ aspectRatio: "16/9", ...focalStyle(series.hero_focal_desktop, series.hero_focal_mobile) }}>
        {series.banner_url || series.cover_image_url ? <img src={(series.banner_url || series.cover_image_url)!} alt="" /> : null}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 30%, rgba(10,14,36,.7))" }} />
        <div style={{ position: "absolute", left: 16, bottom: 14, right: 16 }}>
          <div className="k" style={{ color: "#fff" }}>Part of a series</div>
          <div className="ttl" style={{ fontSize: 19, fontWeight: 700, color: "#fff", marginTop: 2 }}>{series.title}</div>
        </div>
      </div>
      <div style={{ padding: 16 }}>
        {signedIn && parts.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--mut)", marginBottom: 6 }}><span>{explored} of {parts.length} explored</span><span>{pct}%</span></div>
            <div className="bar"><i style={{ width: `${pct}%` }} /></div>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {parts.map((p, i) => (
            <PartLink key={p.key} part={p} className={`prow${p.key === currentKey ? " cur" : ""}`}>
              <span className="ttl" style={{ fontSize: 13, fontWeight: 600, color: p.released ? "var(--ink)" : "#A19E94", width: 20 }}>{String(i + 1).padStart(2, "0")}</span>
              <Ph src={p.thumb} ratio="1/1" radius={6} style={{ width: 56, flex: "none" }} gray={!p.released} />
              <span style={{ minWidth: 0, flex: 1 }}>
                <span className="k" style={{ fontSize: 10.5, display: "block" }}>{p.released ? [kindLabel(p.kind), p.length].filter(Boolean).join(" · ") : `${kindLabel(p.kind)} · Coming ${monD(p.releaseAt)}`}{p.key === currentKey ? " · Reading now" : ""}</span>
                <span className="ttl" style={{ display: "block", fontSize: 14.5, fontWeight: 500, color: p.released ? "var(--ink)" : "var(--mut)", lineHeight: 1.3 }}>{p.title}</span>
                {!p.released && (p.piece || p.templateId || p.collectionItemId) && (
                  <button type="button" className="linkbtn" onClick={(e) => { e.preventDefault(); onRemind(p); }}>{Ico.bell(13)}{reminded(p) ? "Reminder set" : "Remind me"}</button>
                )}
              </span>
            </PartLink>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <button type="button" className="pill sm" onClick={onFollow}>{Ico.bell(14)}{following ? "Following" : "Follow series"}</button>
          <Link to="/series/$slug" params={{ slug: series.slug }} style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>See the series →</Link>
        </div>
      </div>
    </div>
  );
}

export function CalendarRail({ items }: { items: CalendarItem[] }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="k" style={{ marginBottom: 12 }}>On the calendar</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {items.map((c) => {
          const d = new Date(c.at);
          const inner = (
            <>
              <span className="tile"><span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--mut)", letterSpacing: ".08em" }}>{d.toLocaleDateString(undefined, { month: "short" }).toUpperCase()}</span><span className="ttl" style={{ fontSize: 18, fontWeight: 600 }}>{d.getDate()}</span></span>
              <span style={{ minWidth: 0 }}><span className="k" style={{ fontSize: 10.5, display: "block" }}>{c.kicker}</span><span className="ttl" style={{ fontSize: 14.5, fontWeight: 500, lineHeight: 1.3 }}>{c.title}</span></span>
            </>
          );
          return c.href ? <Link key={c.key} to={c.href.to as any} params={c.href.params as any} style={{ display: "flex", gap: 12, alignItems: "center" }}>{inner}</Link>
            : <div key={c.key} style={{ display: "flex", gap: 12, alignItems: "center" }}>{inner}</div>;
        })}
      </div>
    </div>
  );
}

export function MostReadRail({ items }: { items: { id: string; type: string; title: string }[] }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="k" style={{ marginBottom: 12 }}>Most read this week</div>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        {items.slice(0, 3).map((p, i) => (
          <li key={p.id}><Link to={pieceRoute(p.type)} params={{ id: p.id }} style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
            <span className="ttl" style={{ fontSize: 18, fontWeight: 700, color: "#C9C6BE" }}>{i + 1}</span>
            <span className="ttl" style={{ fontSize: 14.5, fontWeight: 500, lineHeight: 1.3 }}>{p.title}</span>
          </Link></li>
        ))}
      </ol>
    </div>
  );
}

export async function shareLink(title: string, url: string, toastFn: (m: string) => void) {
  try {
    if (navigator.share) { await navigator.share({ title, url }); return; }
  } catch { return; }
  try { await navigator.clipboard.writeText(url); toastFn("Link copied"); } catch { toastFn(url); }
}
