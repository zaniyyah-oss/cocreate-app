import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { AppShell } from "@/components/AppShell";
import { NotificationBell } from "@/components/NotificationBell";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "CoCreate — Essays, teachings & practices for how you actually live" },
      { name: "description", content: "A publication for identity, marriage, parenting, ministry, and marketplace — essays, teachings, podcasts, and practices to help you build with him, not just for him." },
      { property: "og:title", content: "CoCreate" },
      { property: "og:description", content: "A publication for identity, marriage, parenting, ministry, and marketplace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type ContentPreview = Database["public"]["Views"]["content_items_public"]["Row"];
type ContentType = Database["public"]["Enums"]["content_type"];

const IMG_FALLBACK = (id: string, w = 800, h = 500) => `https://picsum.photos/seed/${id}/${w}/${h}`;

const routeForType = (t: ContentType | null | undefined) =>
  t === "teaching" ? "/teachings/$id" : t === "podcast" ? "/podcasts/$id" : "/essays/$id";

/* Relative time — "2 hours ago", "Yesterday", "2 days ago", etc. */
function relTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d} days ago`;
  if (d < 30) return `${Math.floor(d / 7)} week${Math.floor(d / 7) === 1 ? "" : "s"} ago`;
  if (d < 365) return `${Math.floor(d / 30)} month${Math.floor(d / 30) === 1 ? "" : "s"} ago`;
  return `${Math.floor(d / 365)} year${Math.floor(d / 365) === 1 ? "" : "s"} ago`;
}

/* Take the opening line(s) of the body — first ~180 chars, no markdown symbols. */
function openingLines(body: string | null | undefined, max = 160): string {
  if (!body) return "";
  const clean = body
    .replace(/[#*_>`~]/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

const coverOf = (c: ContentPreview) => (c as any).cover_image_url || c.thumbnail_url || IMG_FALLBACK(c.id ?? "x");
const readTimeOf = (c: ContentPreview) => {
  const rt = (c as any).read_time_minutes as number | null | undefined;
  if (rt && rt > 0) return `${rt} min read`;
  const words = (((c as any).body as string | undefined) ?? "").split(/\s+/).filter(Boolean).length;
  if (words > 0) return `${Math.max(1, Math.round(words / 220))} min read`;
  return "";
};

/* ---------- Filler / demo content ---------- */
const DEMO_AUTHORS = ["Ada Blackwell", "Jonah Rivers", "Naomi Cole", "Micah Tran", "Ruth Adeyemi", "Silas Park", "Hannah Osei", "Elias Moreno"];
const DEMO_TITLES: Record<string, string[]> = {
  latest: [
    "The quiet work of becoming: notes from a slow season",
    "What we mean when we say 'called'",
    "A liturgy for Monday mornings",
    "On the friendships that stay",
    "Rebuilding after the plan fell through",
    "The gospel in ordinary time",
  ],
  identity: [
    "Daughterhood is not a phase",
    "Sonship without performance",
    "The name beneath the name",
    "Becoming, unhurried",
    "When healing feels like grief",
  ],
  marriage: [
    "Partnership as practice, not performance",
    "The fight that changed everything",
    "Intimacy after the hard year",
    "Engaged, and terrified, and hopeful",
    "How we learned to say the hard thing",
  ],
  parenting: [
    "The early years are the small years",
    "Discipling without control",
    "Teens, tenderly",
    "Single parenting and the weight of enough",
    "A prayer for the child who left",
  ],
  ministry: [
    "Calling is not a spotlight",
    "Serving from a full cup",
    "Leadership that lays things down",
    "Notes on burnout",
    "The pulpit and the kitchen table",
  ],
  streaming: [
    "The Room: episode 12 — Rest as resistance",
    "Teaching: on the wilderness season",
    "Clip: 'You were not made to hustle for love'",
    "Podcast: raising kids who love the church",
    "Teaching: what marriage teaches us about God",
  ],
  spotlight: [
    "The essay that started it all",
    "A letter to my younger self in ministry",
    "How we practice sabbath now",
    "On leaving well",
  ],
};
const DEMO_EXCERPT = "A short, warm read on how faith actually shows up in the everyday — the kitchen, the calendar, the conversation you keep avoiding.";

function makeDemo(kind: keyof typeof DEMO_TITLES, count: number, offset = 0, type: ContentType = "essay"): ContentPreview[] {
  const titles = DEMO_TITLES[kind];
  return Array.from({ length: count }).map((_, i) => {
    const seed = `${kind}-${i + offset}`;
    const title = titles[(i + offset) % titles.length];
    return {
      id: `demo-${seed}`,
      title,
      excerpt: DEMO_EXCERPT,
      author_name: DEMO_AUTHORS[(i + offset) % DEMO_AUTHORS.length],
      published_at: new Date(Date.now() - (i + offset + 1) * 36 * 3600 * 1000).toISOString(),
      thumbnail_url: IMG_FALLBACK(seed, 800, 500),
      cover_image_url: IMG_FALLBACK(seed, 800, 500),
      type,
      topic_id: null,
      slug: seed,
      read_time_minutes: 4 + ((i + offset) % 6),
      body: null,
    } as unknown as ContentPreview;
  });
}
const padDemo = (real: ContentPreview[], kind: keyof typeof DEMO_TITLES, needed: number, type: ContentType = "essay") =>
  real.length >= needed ? real : [...real, ...makeDemo(kind, needed - real.length, real.length, type)];

/* ============================================================ */
/*  CSS                                                          */
/* ============================================================ */
const CSS = `
.hp{--navy:#181A4D;--navy-2:#22245e;--lime:#CAC307;--limelight:#DCE07A;--teal:#0F4A42;--amber:#FFAE00;--burgundy:#441B07;--blush:#E990A2;--cream:#FBF8ED;--ink:#20201C;--periwinkle:#6C6FD4;font-family:'Poppins',sans-serif;color:var(--ink);background:var(--cream);}
.hp a{text-decoration:none;color:inherit;}
.hp *{box-sizing:border-box;}
.hp .wrap{max-width:1240px;margin:0 auto;padding:0 24px;}
@media(min-width:900px){.hp .wrap{padding:0 40px;}}

/* Topic quick-links row */
.hp-topics{background:#fff;border-bottom:1px solid rgba(24,26,77,0.08);box-shadow:0 1px 3px rgba(24,26,77,0.04);}
.hp-topics .wrap{display:flex;align-items:center;gap:24px;padding-top:14px;padding-bottom:14px;overflow-x:auto;-webkit-overflow-scrolling:touch;}
.hp-topics a{font-size:13.5px;font-weight:600;color:#514c3d;white-space:nowrap;flex-shrink:0;}
.hp-topics a:hover,.hp-topics a.is-active{color:var(--navy);}

/* Section frames */
.hp-section{padding:60px 0;}
.hp-eyebrow{display:flex;align-items:center;gap:10px;margin-bottom:22px;}
.hp-eyebrow .bar{width:4px;height:18px;background:var(--teal);border-radius:2px;}
.hp-eyebrow h2{font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--navy);margin:0;}
.hp-eyebrow .see-all{margin-left:auto;font-size:12.5px;font-weight:700;color:var(--teal);white-space:nowrap;}

/* Latest */
.hp-latest-grid{display:grid;grid-template-columns:1fr;gap:26px;}
@media(min-width:900px){.hp-latest-grid{grid-template-columns:1.4fr 1fr;}}
.hp-lead{display:block;}
.hp-lead .art{border-radius:16px;height:280px;margin-bottom:16px;background-size:cover;background-position:center;background-color:var(--navy);}
@media(min-width:900px){.hp-lead .art{height:340px;}}
.hp-lead h3{font-size:22px;font-weight:800;color:var(--navy);line-height:1.25;margin:0 0 8px;}
@media(min-width:900px){.hp-lead h3{font-size:28px;}}
.hp-lead p{font-size:14.5px;color:#6b6656;line-height:1.55;margin:0 0 10px;}
.hp-meta{font-size:12px;color:#9a9484;font-weight:600;}
.hp-side{display:flex;flex-direction:column;gap:18px;}
.hp-side-item{display:flex;gap:14px;align-items:flex-start;}
.hp-side-item .thumb{width:96px;height:72px;border-radius:10px;flex-shrink:0;background-size:cover;background-position:center;background-color:var(--limelight);}
.hp-side-item h4{font-size:14.5px;font-weight:700;color:var(--navy);line-height:1.35;margin:0 0 4px;}
.hp-side-item .hp-meta{font-size:11.5px;}

/* Topic sections */
.hp-topic-grid{display:grid;grid-template-columns:1fr;gap:20px;}
@media(min-width:640px){.hp-topic-grid{grid-template-columns:repeat(2,1fr);}}
@media(min-width:900px){.hp-topic-grid{grid-template-columns:repeat(3,1fr);}}
.hp-tcard{display:block;}
.hp-tcard .art{border-radius:14px;height:168px;margin-bottom:12px;background-size:cover;background-position:center;background-color:var(--limelight);}
.hp-tcard h4{font-size:16px;font-weight:700;color:var(--navy);margin:0 0 6px;line-height:1.3;}
.hp-tcard p{font-size:13px;color:#6b6656;line-height:1.55;margin:0 0 8px;}

/* Full-bleed burgundy collection */
.hp-collection{background:var(--burgundy);padding:68px 0 60px;margin:8px 0 0;}
.hp-collection-heading{font-size:36px;font-weight:900;color:var(--cream);margin:0 0 10px;letter-spacing:-0.01em;line-height:1.05;}
@media(min-width:900px){.hp-collection-heading{font-size:46px;}}
.hp-collection-sub{font-size:15px;color:rgba(255,255,255,0.75);max-width:580px;line-height:1.55;margin:0 0 40px;}
.hp-col-header{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;border-top:1px solid rgba(255,255,255,0.18);padding-top:26px;margin-bottom:26px;flex-wrap:wrap;}
.hp-col-eyebrow{font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,0.6);margin-bottom:8px;}
.hp-col-header h3{font-size:22px;font-weight:800;color:#fff;margin:0 0 6px;}
@media(min-width:900px){.hp-col-header h3{font-size:24px;}}
.hp-col-header p{font-size:13.5px;color:rgba(255,255,255,0.7);margin:0;max-width:480px;}
.hp-col-actions{display:flex;flex-direction:column;align-items:flex-start;gap:10px;flex-shrink:0;}
@media(min-width:640px){.hp-col-actions{align-items:flex-end;}}
.hp-add-btn{background:var(--navy);color:#fff;font-weight:700;font-size:13px;padding:11px 20px;border-radius:999px;white-space:nowrap;border:none;cursor:pointer;font-family:inherit;}
.hp .hp-see-inside{font-size:12.5px;font-weight:600;color:#fff;text-decoration:underline;white-space:nowrap;}
.hp-col-grid{display:grid;grid-template-columns:1fr;gap:18px;}
@media(min-width:900px){.hp-col-grid{grid-template-columns:1.4fr 1fr;}}
.hp-col-left,.hp-col-right{display:flex;flex-direction:column;gap:18px;}
.hp-col-lead{background:#fff;border-radius:14px;overflow:hidden;display:block;}
.hp-col-lead .art{height:220px;background-size:cover;background-position:center;background-color:var(--limelight);}
@media(min-width:900px){.hp-col-lead .art{height:260px;}}
.hp-col-lead .body{padding:18px 20px;}
.hp-col-lead h4{font-size:18px;font-weight:700;color:var(--navy);margin:0 0 6px;}
.hp-col-lead p{font-size:13px;color:#6b6656;line-height:1.5;margin:0;}
.hp-col-hcard{background:#fff;border-radius:14px;overflow:hidden;display:flex;flex:1;}
.hp-col-hcard .thumb{width:42%;flex-shrink:0;background-size:cover;background-position:center;background-color:var(--limelight);}
.hp-col-hcard .body{padding:16px 18px;display:flex;flex-direction:column;justify-content:center;min-width:0;}
.hp-col-hcard h5{font-size:14.5px;font-weight:700;color:var(--navy);margin:0 0 6px;line-height:1.35;}
.hp-col-hcard .byline{font-size:12px;color:#9a9484;font-weight:600;}
.hp-see-collection-wrap{text-align:center;margin-top:26px;}
.hp .hp-see-collection-btn{display:inline-block;border:1.5px solid rgba(255,255,255,0.35);color:#fff;font-weight:700;font-size:13.5px;padding:12px 24px;border-radius:999px;}

/* Navy interruption modules */
.hp-navy{background:var(--navy);padding:52px 0;}
.hp-navy .hp-eyebrow .bar{background:var(--limelight);}
.hp-navy .hp-eyebrow h2{color:var(--limelight);}
.hp-navy .hp-eyebrow .see-all{color:var(--limelight);}

.hp-stream-row{display:grid;grid-template-columns:1fr;gap:20px;}
@media(min-width:900px){.hp-stream-row{grid-template-columns:1.5fr 1fr;}}
.hp-stream-feature{position:relative;border-radius:16px;overflow:hidden;height:280px;background-size:cover;background-position:center;background-color:var(--navy-2);display:flex;align-items:flex-end;padding:22px;color:#fff;}
@media(min-width:900px){.hp-stream-feature{height:320px;}}
.hp-stream-feature::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(24,26,77,0.15),rgba(13,14,46,0.85));}
.hp-stream-feature .play{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:54px;height:54px;border-radius:50%;background:rgba(255,255,255,0.92);display:flex;align-items:center;justify-content:center;z-index:2;}
.hp-stream-feature .play svg{width:18px;height:18px;fill:var(--navy);}
.hp-stream-feature .label{position:relative;z-index:2;color:#fff;font-weight:700;font-size:16px;line-height:1.35;}
.hp-stream-mini-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.hp-stream-mini{border-radius:12px;height:148px;padding:12px;display:flex;flex-direction:column;justify-content:flex-end;color:#fff;background-size:cover;background-position:center;background-color:var(--navy-2);position:relative;overflow:hidden;}
.hp-stream-mini::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(24,26,77,0.1),rgba(13,14,46,0.82));}
.hp-stream-mini span{position:relative;z-index:2;font-size:12.5px;font-weight:700;line-height:1.35;}

.hp-spot-row{display:grid;grid-template-columns:1fr;gap:20px;}
@media(min-width:900px){.hp-spot-row{grid-template-columns:1.5fr 1fr;}}
.hp-spot-feature{position:relative;border-radius:16px;overflow:hidden;height:280px;background-size:cover;background-position:center;background-color:var(--navy-2);display:flex;flex-direction:column;justify-content:flex-end;padding:24px;color:#fff;cursor:pointer;}
@media(min-width:900px){.hp-spot-feature{height:320px;}}
.hp-spot-feature::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(24,26,77,0.1),rgba(13,14,46,0.85));}
.hp-spot-feature > *{position:relative;z-index:2;}
.hp-spot-feature .dots{display:flex;gap:5px;margin-bottom:12px;}
.hp-spot-feature .dots span{width:18px;height:3px;border-radius:2px;background:rgba(255,255,255,0.3);cursor:pointer;transition:background .15s;}
.hp-spot-feature .dots span.active{background:var(--limelight);}
.hp-spot-feature h3{font-size:20px;font-weight:800;margin:0 0 4px;line-height:1.3;}
@media(min-width:900px){.hp-spot-feature h3{font-size:22px;}}
.hp-spot-feature .meta-light{font-size:12px;color:rgba(255,255,255,0.7);font-weight:600;}
.hp-spot-list{display:flex;flex-direction:column;gap:0;}
.hp-spot-list a{display:block;padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.1);}
.hp-spot-list a:first-child{padding-top:0;}
.hp-spot-list a:last-child{border-bottom:none;}
.hp-spot-list .tag{font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--limelight);margin-bottom:5px;display:block;}
.hp-spot-list h5{font-size:14px;font-weight:700;color:#fff;margin:0;line-height:1.4;}

/* Footer */
.hp-footer{background:var(--navy);color:var(--cream);padding-top:44px;}
.hp-footer-search{display:flex;align-items:center;background:#fff;border-radius:12px;padding:14px 18px;margin-bottom:40px;gap:10px;}
.hp-footer-search input{border:none;outline:none;flex:1;font-family:'Poppins';font-size:14px;color:var(--ink);background:transparent;}
.hp-footer-search svg{width:18px;height:18px;color:#9a9484;flex-shrink:0;}
.hp-footer-cols{display:grid;grid-template-columns:repeat(2,1fr);gap:26px 20px;padding-bottom:36px;border-bottom:1px solid rgba(255,255,255,0.12);}
@media(min-width:640px){.hp-footer-cols{grid-template-columns:repeat(3,1fr);}}
@media(min-width:1024px){.hp-footer-cols{grid-template-columns:repeat(6,1fr);}}
.hp-footer-cols h6{font-size:13px;font-weight:700;color:#fff;margin:0 0 14px;}
.hp-footer-cols a{display:block;font-size:13px;color:rgba(251,248,237,0.65);margin-bottom:10px;}
.hp-footer-cols a:hover{color:var(--limelight);}
.hp-footer-brand-row{display:flex;align-items:center;justify-content:space-between;padding:26px 0;gap:20px;flex-wrap:wrap;}
.hp-brand{display:flex;align-items:center;gap:10px;}
.hp-brand .badge{width:34px;height:34px;border-radius:9px;background:var(--limelight);color:var(--navy);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:17px;}
.hp-brand .word{font-weight:900;font-size:19px;color:#fff;}
.hp-footer-social{display:flex;gap:14px;align-items:center;}
.hp-footer-social .lbl{font-size:11px;font-weight:700;letter-spacing:.06em;color:rgba(251,248,237,0.55);margin-right:4px;}
.hp-icon-circle{width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;}
.hp-icon-circle svg{width:14px;height:14px;fill:#fff;}
.hp-app-badges{display:flex;gap:10px;flex-wrap:wrap;}
.hp-app-pill{display:flex;align-items:center;gap:6px;border:1px dashed rgba(255,255,255,0.3);border-radius:8px;padding:7px 12px;font-size:11.5px;font-weight:600;color:rgba(255,255,255,0.7);}
.hp-footer-legal{display:flex;justify-content:space-between;align-items:center;padding:18px 0 28px;font-size:12px;color:rgba(251,248,237,0.5);flex-wrap:wrap;gap:10px;}
.hp-footer-legal .links{display:flex;gap:18px;flex-wrap:wrap;}
.hp-footer-legal a:hover{color:var(--limelight);}

/* skeletons */
.hp-skel{background:#fff;border-radius:12px;height:120px;position:relative;overflow:hidden;}
.hp-skel::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(0,0,0,0.04),transparent);animation:hp-shim 1.4s infinite;}
@keyframes hp-shim{0%{transform:translateX(-100%);}100%{transform:translateX(100%);}}

/* Full-width masthead (signed-out) */
.hp-masthead{background:#fff;border-bottom:1px solid rgba(24,26,77,0.08);}
.hp-masthead .wrap{display:flex;align-items:center;gap:20px;padding-top:18px;padding-bottom:18px;}
.hp-mast-brand{display:flex;align-items:center;gap:10px;text-decoration:none;flex-shrink:0;}
.hp-mast-brand .mark{width:32px;height:32px;background:var(--limelight);color:var(--navy);border-radius:9px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:16px;}
.hp-mast-brand .word{font-weight:900;font-size:20px;color:var(--navy);letter-spacing:-0.02em;}
.hp-mast-links{display:flex;flex:1;align-items:center;gap:14px;min-width:0;flex-wrap:nowrap;overflow:hidden;}
@media(min-width:900px){.hp-mast-links{gap:22px;}}
.hp-mast-links a{font-size:13px;font-weight:600;color:#514c3d;white-space:nowrap;}
@media(min-width:900px){.hp-mast-links a{font-size:13.5px;}}
.hp-mast-links a:hover{color:var(--navy);}
.hp-mast-links a.mast-link-hide-sm{display:none;}
@media(min-width:640px){.hp-mast-links a.mast-link-hide-sm{display:inline;}}
.hp-mast-links a.mast-link-hide-md{display:none;}
@media(min-width:900px){.hp-mast-links a.mast-link-hide-md{display:inline;}}
.hp-mast-more{position:relative;flex-shrink:0;}
.hp-mast-more-btn{background:transparent;border:none;font-family:'Poppins';font-size:13px;font-weight:700;color:var(--navy);cursor:pointer;padding:6px 10px;border-radius:8px;display:inline-flex;align-items:center;gap:4px;}
.hp-mast-more-btn:hover{background:#FBF8ED;}
@media(min-width:1100px){.hp-mast-more{display:none;}}
.hp-mast-more-menu{position:absolute;top:calc(100% + 6px);right:0;background:#fff;border:1px solid rgba(24,26,77,0.1);border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,0.12);padding:8px;min-width:200px;z-index:50;display:flex;flex-direction:column;}
.hp-mast-more-menu a{font-size:13.5px;font-weight:600;color:var(--navy);padding:10px 12px;border-radius:8px;white-space:nowrap;}
.hp-mast-more-menu a:hover{background:#FBF8ED;}
.hp-mast-actions{display:flex;align-items:center;gap:10px;flex-shrink:0;}
.hp-mast-signin{color:var(--navy);font-weight:700;font-size:13px;padding:8px 12px;}
.hp-mast-subscribe{background:var(--navy);color:#fff !important;font-weight:800;font-size:12.5px;padding:9px 18px;border-radius:999px;text-decoration:none;}
.hp-mast-subscribe:hover{background:var(--navy-2);color:#fff !important;}
/* Signed-in masthead: hide the auth CTAs (icon bar handles nav) but ALWAYS keep the brand */
.hp-masthead.is-inline .hp-mast-actions .hp-mast-signin,
.hp-masthead.is-inline .hp-mast-actions .hp-mast-subscribe{display:none;}

.hp-mast-media{display:flex;align-items:center;gap:4px;margin-left:auto;flex-shrink:0;}
.hp-mast-media-link{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:#181A4D;padding:6px 10px;border-radius:8px;text-decoration:none;background:none;border:none;cursor:pointer;font-family:'Poppins',sans-serif;transition:background .15s;}
.hp-mast-media-link:hover{background:#FBF8ED;}
.hp-mast-media-link svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}
.hp-mast-media-dot{width:10px;height:10px;border-radius:50%;background:#FF340C;display:inline-block;}
.hp-mast-search-form{display:flex;align-items:center;gap:6px;}
.hp-mast-search-form input{width:160px;background:#fff;border:1px solid rgba(24,26,77,0.15);border-radius:8px;padding:6px 10px;font-family:'Poppins',sans-serif;font-size:13px;color:#181A4D;outline:none;transition:border-color .15s;}
.hp-mast-search-form input:focus{border-color:#181A4D;}
.hp-mast-search-form button{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;background:#181A4D;color:#fff;border:none;border-radius:8px;cursor:pointer;}
.hp-mast-search-form button svg{width:14px;height:14px;stroke:#fff;fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round;}
@media(max-width:420px){.hp-mast-media-link span{display:none;}.hp-mast-media-dot{margin:0;}.hp-mast-search-form input{width:120px;}}

/* Signed-in home: horizontal navy icon bar (replaces the left rail) */
.hp-tourbar{background:var(--navy);height:68px;display:flex;align-items:center;}
.hp-tourbar .wrap{display:flex;align-items:center;}
.hp-tourbar-pill{display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border:1.5px dashed rgba(220,224,122,0.45);border-radius:999px;color:var(--limelight) !important;font-weight:600;font-size:14px;transition:color .15s, border-color .15s;}
.hp-tourbar-pill:hover{color:#fff !important;border-color:#fff !important;}
.hp-tourbar-pill svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}
.hp-iconbar{background:var(--navy);padding:14px 0;}

.hp-iconbar .wrap{display:flex;align-items:center;justify-content:center;}
.hp-iconbar-nav{display:flex;align-items:center;justify-content:center;gap:10px;}
.hp-iconbar a{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:10px;color:#fff;transition:background .15s,color .15s;}
.hp-iconbar a:hover{background:rgba(255,255,255,0.08);color:#fff;}
.hp-iconbar a.active{background:var(--limelight);color:var(--navy);}
.hp-iconbar svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}
.hp-iconbar-avatar{color:#fff !important;}
.hp-iconbar-avatar:hover{background:rgba(255,255,255,0.08);color:#fff !important;}
.hp-iconbar-bell{display:inline-flex;align-items:center;justify-content:center;}
.hp-iconbar-bell .nb-btn{color:#fff !important;width:40px;height:40px;background:transparent !important;border-radius:10px;}
.hp-iconbar-bell .nb-btn:hover{background:rgba(255,255,255,0.08) !important;}
.hp-iconbar-bell .nb-btn svg{width:20px;height:20px;}
.hp-iconbar-bell .nb-badge{box-shadow:0 0 0 2px var(--navy);}


`;

/* ============================================================ */
/*  Data                                                         */
/* ============================================================ */

type TopicRow = Database["public"]["Tables"]["topics"]["Row"] & {
  display_name?: string | null;
  sort_order?: number | null;
};

function useTopics() {
  return useQuery({
    queryKey: ["hp-topics"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("topics").select("*").order("sort_order").order("name");
      if (error) throw error;
      return (data ?? []) as TopicRow[];
    },
    staleTime: 5 * 60_000,
  });
}

function useLatest(limit = 5) {
  return useQuery({
    queryKey: ["hp-latest", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_items_public")
        .select("*")
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as ContentPreview[];
    },
  });
}

function useByTopic(topicId: string | undefined, limit = 3) {
  return useQuery({
    queryKey: ["hp-topic", topicId, limit],
    enabled: !!topicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_items_public")
        .select("*")
        .eq("topic_id", topicId!)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as ContentPreview[];
    },
  });
}

/* ============================================================ */
/*  Sections                                                     */
/* ============================================================ */

function TopicsNav() {
  const topicsQ = useTopics();
  const primary = ["identity", "marriage", "parenting", "ministry", "career", "business", "church"];
  const list = (topicsQ.data ?? [])
    .filter((t) => primary.includes(t.slug))
    .sort((a, b) => primary.indexOf(a.slug) - primary.indexOf(b.slug));
  return (
    <div className="hp-topics">
      <div className="wrap">
        {list.map((t) => (
          <Link key={t.id} to="/topics/$slug" params={{ slug: t.slug }}>
            {t.display_name || t.name}
          </Link>
        ))}
      </div>
    </div>
  );
}

function HomeIconBar() {
  const items = [
    { to: "/", label: "Home", active: true, icon: <svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/></svg> },
    { to: "/devotionals", label: "Workspace", icon: <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg> },
    { to: "/calendar", label: "Calendar", icon: <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg> },
    { to: "/explore", label: "Bookmarks", icon: <svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4V3z"/></svg> },
    { to: "/notes", label: "Notes", icon: <svg viewBox="0 0 24 24"><path d="M5 4h11l3 3v13H5z"/><path d="M9 9h6M9 13h6M9 17h3"/></svg> },
  ];
  return (
    <div className="hp-iconbar">
      <div className="wrap">
        <div className="hp-iconbar-nav">
          {items.map((it) => (
            <Link key={it.to} to={it.to} className={it.active ? "active" : ""} aria-label={it.label} title={it.label}>
              {it.icon}
            </Link>
          ))}
          <span className="hp-iconbar-bell"><NotificationBell /></span>
          <Link to="/profile" className="hp-iconbar-avatar" aria-label="Profile" title="Profile">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6"/></svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

function HomeTourBar() {
  return (
    <div className="hp-tourbar">
      <div className="wrap">
        <Link to="/tour" className="hp-tourbar-pill">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
          <span>Tour the Workspace</span>
        </Link>
      </div>
    </div>
  );
}


function HomeMasthead({ signedIn }: { signedIn: boolean }) {
  const topicsQ = useTopics();
  const primary = ["identity", "marriage", "parenting", "ministry", "career", "business", "church"];
  const list = (topicsQ.data ?? [])
    .filter((t) => primary.includes(t.slug))
    .sort((a, b) => primary.indexOf(a.slug) - primary.indexOf(b.slug));
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => {
    if (!moreOpen) return;
    const close = () => setMoreOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [moreOpen]);
  return (
    <div className={`hp-masthead${signedIn ? " is-inline" : ""}`}>
      <div className="wrap">
        <Link to="/" className="hp-mast-brand">
          <div className="mark">C</div>
          <div className="word">CoCreate</div>
        </Link>
        <nav className="hp-mast-links">
          {list.map((t, i) => (
            <Link
              key={t.id}
              to="/topics/$slug"
              params={{ slug: t.slug }}
              className={i >= 4 ? "mast-link-hide-md" : i >= 2 ? "mast-link-hide-sm" : ""}
            >
              {t.display_name || t.name}
            </Link>
          ))}
        </nav>
        <div className="hp-mast-more">
          <button
            type="button"
            className="hp-mast-more-btn"
            onClick={(e) => { e.stopPropagation(); setMoreOpen((v) => !v); }}
            aria-haspopup="menu"
            aria-expanded={moreOpen}
          >
            More <span aria-hidden>▾</span>
          </button>
          {moreOpen && (
            <div className="hp-mast-more-menu" role="menu" onClick={(e) => e.stopPropagation()}>
              {list.map((t) => (
                <Link key={t.id} to="/topics/$slug" params={{ slug: t.slug }} onClick={() => setMoreOpen(false)}>
                  {t.display_name || t.name}
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="hp-mast-actions">
          {!signedIn && (
            <>
              <Link to="/auth" className="hp-mast-signin">Sign in</Link>
              <Link to="/auth" search={{ mode: "signup" } as any} className="hp-mast-subscribe">Subscribe</Link>
            </>
          )}
        </div>
        <MediaNav />
      </div>
    </div>
  );
}

function MediaNav() {
  const navigate = useNavigate({ from: "/" });
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const s = query.trim();
    if (!s) return;
    navigate({ to: "/search", search: { q: s } as any });
    setSearchOpen(false);
    setQuery("");
  };
  return (
    <div className="hp-mast-media">
      <Link to="/watch" className="hp-mast-media-link" aria-label="Watch">
        <span className="hp-mast-media-dot" />
        <span>Watch</span>
      </Link>
      <Link to="/listen" className="hp-mast-media-link" aria-label="Listen">
        <svg viewBox="0 0 24 24"><path d="M3 14v3a2 2 0 0 0 2 2h1l2-3h-3a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1h3l-2-3H5a2 2 0 0 0-2 2z"/><path d="M17 14v3a2 2 0 0 1-2 2h-1l-2-3h3a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1h-3l2-3h1a2 2 0 0 1 2 2z"/><path d="M7 10v4M17 10v4"/></svg>
        <span>Listen</span>
      </Link>
      {searchOpen ? (
        <form className="hp-mast-search-form" onSubmit={submit} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget) && !query.trim()) setSearchOpen(false); }}>
          <input
            type="text"
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button type="submit" aria-label="Search">
            <svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="hp-mast-media-link"
          onClick={() => setSearchOpen(true)}
          aria-label="Search"
        >
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          <span>Search</span>
        </button>
      )}
    </div>
  );
}


function LatestSection() {
  const q = useLatest(5);
  const real = q.data ?? [];
  const items = padDemo(real, "latest", 5);
  const lead = items[0];
  const sides = items.slice(1, 5);

  return (
    <div className="wrap hp-section" style={{ paddingTop: 56, paddingBottom: 40 }}>

      <div className="hp-eyebrow">
        <div className="bar" />
        <h2>Latest</h2>
      </div>
      {q.isLoading ? (
        <div className="hp-latest-grid">
          <div className="hp-skel" style={{ height: 340 }} />
          <div className="hp-side">
            {[0, 1, 2, 3].map((i) => <div key={i} className="hp-skel" style={{ height: 72 }} />)}
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="hp-meta">No articles yet.</div>
      ) : (
        <div className="hp-latest-grid">
          {lead && (
            <Link
              to={routeForType(lead.type) as any}
              params={{ id: lead.id! } as any}
              className="hp-lead"
            >
              <div className="art" style={{ backgroundImage: `url(${coverOf(lead)})` }} />
              <h3>{lead.title}</h3>
              {lead.excerpt && <p>{lead.excerpt}</p>}
              <div className="hp-meta">
                {(lead.author_name ?? "CoCreate") + " · " + relTime(lead.published_at)}
              </div>
            </Link>
          )}
          <div className="hp-side">
            {sides.map((s) => (
              <Link key={s.id ?? ""} to={routeForType(s.type) as any} params={{ id: s.id! } as any} className="hp-side-item">
                <div className="thumb" style={{ backgroundImage: `url(${coverOf(s)})` }} />
                <div>
                  <h4>{s.title}</h4>
                  <div className="hp-meta">{relTime(s.published_at)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TopicSection({ topic, label, id, demoKind, style }: { topic: TopicRow | undefined; label: string; id: string; demoKind: keyof typeof DEMO_TITLES; style?: React.CSSProperties }) {
  const q = useByTopic(topic?.id, 3);
  const real = q.data ?? [];
  const items = padDemo(real, demoKind, 3);
  return (
    <div className="wrap hp-section" id={id} style={style}>
      <div className="hp-eyebrow">
        <div className="bar" />
        <h2>{label}</h2>
        {topic && <Link to="/topics/$slug" params={{ slug: topic.slug }} className="see-all">See all →</Link>}
      </div>
      <div className="hp-topic-grid">
        {items.map((c) => (
          <Link key={c.id ?? ""} to={routeForType(c.type) as any} params={{ id: c.id! } as any} className="hp-tcard">
            <div className="art" style={{ backgroundImage: `url(${coverOf(c)})` }} />
            <h4>{c.title}</h4>
            <p>{openingLines(((c as any).body as string | undefined) ?? c.excerpt)}</p>
            <div className="hp-meta">{readTimeOf(c)}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}


/* Featured Collection */
type CollectionRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  description_md: string | null;
  cover_image_url: string | null;
  banner_url: string | null;
  is_featured?: boolean | null;
};

function FeaturedCollectionSection() {
  const q = useQuery({
    queryKey: ["hp-featured-collection"],
    queryFn: async () => {
      // Prefer is_featured; fall back to most recent published.
      const { data: featData } = await (supabase.from as any)("collections")
        .select("id,slug,title,description,description_md,cover_image_url,banner_url,is_featured")
        .eq("status", "published")
        .eq("is_featured", true)
        .limit(1);
      let col = (featData ?? [])[0] as CollectionRow | undefined;
      if (!col) {
        const { data: recent } = await (supabase.from as any)("collections")
          .select("id,slug,title,description,description_md,cover_image_url,banner_url,is_featured")
          .eq("status", "published")
          .order("published_at", { ascending: false, nullsFirst: false })
          .limit(1);
        col = (recent ?? [])[0];
      }
      if (!col) return null;
      const { data: itemsData } = await (supabase.from as any)("collection_items")
        .select("position, layout_slot, content:content_items_public(*)")
        .eq("collection_id", col.id)
        .order("position", { ascending: true })
        .limit(6);
      const items = ((itemsData ?? []) as Array<{ position: number; layout_slot: string; content: ContentPreview | null }>)
        .map((r) => r.content)
        .filter((c): c is ContentPreview => !!c);
      return { collection: col, items };
    },
  });

  const demoCollection: CollectionRow = {
    id: "demo-collection",
    slug: "abide-in-the-ordinary",
    title: "Abide in the Ordinary",
    description: "Six pieces on finding God in the middle of a regular Tuesday — the commute, the laundry, the quiet after the kids finally sleep.",
    description_md: null,
    cover_image_url: IMG_FALLBACK("collection-cover", 1200, 700),
    banner_url: null,
    is_featured: true,
  };
  const demoItems = makeDemo("latest", 5, 20);
  const collection = q.data?.collection ?? demoCollection;
  const items = q.data && q.data.items.length >= 5 ? q.data.items : [...(q.data?.items ?? []), ...demoItems].slice(0, 5);
  const lead = items[0];
  const paired = items[1];
  const rest = items.slice(2, 5);
  const cover = collection.cover_image_url || collection.banner_url;


  return (
    <div className="hp-collection">
      <div className="wrap">
        <h2 className="hp-collection-heading">Collections</h2>
        <p className="hp-collection-sub">
          A handful of pieces released together, circling one question from a few different angles. No order to follow, nothing to finish.
        </p>

        <div className="hp-col-header">
          <div>
            <div className="hp-col-eyebrow">Featured Now</div>
            <h3>{collection.title}</h3>
            {(collection.description || collection.description_md) && (
              <p>{collection.description || collection.description_md}</p>
            )}
          </div>
          <div className="hp-col-actions">
            <button className="hp-add-btn" type="button">+ Add to my Abide</button>
            <Link to="/collections/$slug" params={{ slug: collection.slug }} className="hp-see-inside">
              See what's inside →
            </Link>
          </div>
        </div>

        <div className="hp-col-grid">
          <div className="hp-col-left">
            {lead && (
              <Link to={routeForType(lead.type) as any} params={{ id: lead.id! } as any} className="hp-col-lead">
                <div className="art" style={{ backgroundImage: `url(${coverOf(lead) || (cover ?? "")})` }} />
                <div className="body">
                  <h4>{lead.title}</h4>
                  {(lead.excerpt || (lead as any).body) && <p>{openingLines(lead.excerpt ?? ((lead as any).body as string | undefined), 140)}</p>}
                </div>
              </Link>
            )}
            {paired && (
              <Link to={routeForType(paired.type) as any} params={{ id: paired.id! } as any} className="hp-col-hcard">
                <div className="thumb" style={{ backgroundImage: `url(${coverOf(paired)})` }} />
                <div className="body">
                  <h5>{paired.title}</h5>
                  <div className="byline">{paired.author_name ?? ""}</div>
                </div>
              </Link>
            )}
          </div>
          <div className="hp-col-right">
            {rest.map((c) => (
              <Link key={c.id ?? ""} to={routeForType(c.type) as any} params={{ id: c.id! } as any} className="hp-col-hcard">
                <div className="thumb" style={{ backgroundImage: `url(${coverOf(c)})` }} />
                <div className="body">
                  <h5>{c.title}</h5>
                  <div className="byline">{c.author_name ?? ""}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="hp-see-collection-wrap">
          <Link to="/collections/$slug" params={{ slug: collection.slug }} className="hp-see-collection-btn">
            See all pieces from this collection →
          </Link>
        </div>
      </div>
    </div>
  );
}

/* Streaming (navy) */
function StreamingSection() {
  const q = useQuery({
    queryKey: ["hp-streaming"],
    queryFn: async () => {
      const { data } = await supabase
        .from("content_items_public")
        .select("*")
        .in("type", ["podcast", "teaching", "clip"])
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(5);
      return (data ?? []) as ContentPreview[];
    },
  });
  const real = q.data ?? [];
  const items = padDemo(real, "streaming", 5, "podcast");
  const feature = items[0];
  const grid = items.slice(1, 5);


  return (
    <div className="hp-navy">
      <div className="wrap">
        <div className="hp-eyebrow">
          <div className="bar" />
          <h2>Now Streaming in The Room</h2>
          <Link to="/explore" className="see-all">See all →</Link>
        </div>
        <div className="hp-stream-row">
          {feature ? (
            <Link
              to={routeForType(feature.type) as any}
              params={{ id: feature.id! } as any}
              className="hp-stream-feature"
              style={{ backgroundImage: `url(${coverOf(feature)})` }}
            >
              <div className="play"><svg viewBox="0 0 24 24"><path d="M6 4l14 8-14 8V4z" /></svg></div>
              <span className="label">{feature.title}</span>
            </Link>
          ) : <div className="hp-skel" style={{ height: 320 }} />}
          <div className="hp-stream-mini-grid">
            {grid.map((c) => (
              <Link
                key={c.id ?? ""}
                to={routeForType(c.type) as any}
                params={{ id: c.id! } as any}
                className="hp-stream-mini"
                style={{ backgroundImage: `url(${coverOf(c)})` }}
              >
                <span>{c.title}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Spotlight (navy, rotating) */
function SpotlightSection() {
  const q = useLatest(6);
  const real = q.data ?? [];
  const items = padDemo(real, "spotlight", 4);
  const [idx, setIdx] = useState(0);
  const feats = items.slice(0, 4);
  const list = items.slice(0, 4);
  useEffect(() => {
    if (feats.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % feats.length), 6000);
    return () => clearInterval(t);
  }, [feats.length]);
  const featureItems = feats;
  const feature = featureItems[Math.min(idx, Math.max(0, featureItems.length - 1))];
  const topicsQ = useTopics();
  const topicById = useMemo(() => {
    const m = new Map<string, TopicRow>();
    (topicsQ.data ?? []).forEach((t) => m.set(t.id, t));
    return m;
  }, [topicsQ.data]);



  return (
    <div className="hp-navy">
      <div className="wrap">
        <div className="hp-eyebrow">
          <div className="bar" />
          <h2>In Case You Missed It</h2>
        </div>
        <div className="hp-spot-row">
          {feature ? (
            <Link
              to={routeForType(feature.type) as any}
              params={{ id: feature.id! } as any}
              className="hp-spot-feature"
              style={{ backgroundImage: `url(${coverOf(feature)})` }}
            >
              <div className="dots">
                {featureItems.map((_, i) => (
                  <span
                    key={i}
                    className={i === idx ? "active" : ""}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIdx(i); }}
                  />
                ))}
              </div>
              <h3>{feature.title}</h3>
              <div className="meta-light">{feature.excerpt ?? feature.author_name ?? ""}</div>
            </Link>
          ) : <div className="hp-skel" style={{ height: 320 }} />}
          <div className="hp-spot-list">
            {list.map((c) => {
              const t = c.topic_id ? topicById.get(c.topic_id) : undefined;
              return (
                <Link key={c.id ?? ""} to={routeForType(c.type) as any} params={{ id: c.id! } as any}>
                  {t && <span className="tag">{t.display_name || t.name}</span>}
                  <h5>{c.title}</h5>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Footer */
function SiteFooter() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const s = q.trim();
    if (!s) return;
    navigate({ to: "/search", search: { q: s } as any });
  };
  const col = (title: string, links: { label: string; to?: string; slug?: string }[]) => (
    <div>
      <h6>{title}</h6>
      {links.map((l) => (
        l.slug ? (
          <Link key={l.label} to="/topics/$slug" params={{ slug: l.slug }}>{l.label}</Link>
        ) : (
          <a key={l.label} href={l.to ?? "#"}>{l.label}</a>
        )
      ))}
    </div>
  );

  return (
    <footer className="hp-footer">
      <div className="wrap">
        <form className="hp-footer-search" onSubmit={submit}>
          <input
            type="text"
            placeholder="Search CoCreate…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        </form>

        <div className="hp-footer-cols">
          {col("Identity", [
            { label: "Daughterhood", slug: "identity" },
            { label: "Sonhood", slug: "identity" },
            { label: "Becoming", slug: "identity" },
            { label: "Grief & Healing", slug: "identity" },
          ])}
          {col("Marriage", [
            { label: "Partnership", slug: "marriage" },
            { label: "Conflict", slug: "marriage" },
            { label: "Intimacy", slug: "marriage" },
            { label: "Engaged", slug: "marriage" },
          ])}
          {col("Parenting", [
            { label: "Early Years", slug: "parenting" },
            { label: "Discipleship", slug: "parenting" },
            { label: "Teens", slug: "parenting" },
            { label: "Single Parenting", slug: "parenting" },
          ])}
          {col("Ministry", [
            { label: "Calling", slug: "ministry" },
            { label: "Serving", slug: "ministry" },
            { label: "Leadership", slug: "ministry" },
            { label: "Burnout", slug: "ministry" },
          ])}
          {col("Marketplace", [
            { label: "Work & Faith", slug: "career" },
            { label: "Leadership", slug: "career" },
            { label: "Ambition", slug: "business" },
            { label: "Rest", slug: "career" },
          ])}
          {col("Company", [
            { label: "About", to: "#" },
            { label: "Contact", to: "#" },
            { label: "Store", to: "#" },
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
            <div className="hp-app-pill">📱 iOS — Coming Soon</div>
            <div className="hp-app-pill">▶ Android — Coming Soon</div>
          </div>
        </div>

        <div className="hp-footer-legal">
          <div>© {new Date().getFullYear()} CoCreate. All rights reserved.</div>
          <div className="links">
            <a href="#">Terms</a>
            <a href="#">Privacy</a>
            <a href="#">Help Center</a>
            <a href="#">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ============================================================ */
/*  Page                                                         */
/* ============================================================ */
function HomePage() {
  const topicsQ = useTopics();
  const navigate = useNavigate({ from: "/" });
  const isMobile = useIsMobile();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session?.user.id));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s?.user.id));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Mobile first-open: redirect to workspace (kept from previous behavior).
  useEffect(() => {
    if (typeof window === "undefined" || isMobile !== true) return;
    if (window.sessionStorage.getItem("cocreate:home_redirect_done")) return;
    window.sessionStorage.setItem("cocreate:home_redirect_done", "1");
    navigate({ to: "/devotionals", replace: true });
  }, [isMobile, navigate]);

  const bySlug = (slug: string) => (topicsQ.data ?? []).find((t) => t.slug === slug);

  return (
    <AppShell current="home" hideSide>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="hp">
        {signedIn ? <HomeIconBar /> : <HomeTourBar />}
        <HomeMasthead signedIn={signedIn} />
        <LatestSection />
        <TopicSection topic={bySlug("identity")} label="Identity — Daughterhood, Sonhood, Becoming" id="identity" demoKind="identity" style={{ paddingTop: 32, paddingBottom: 88 }} />
        <FeaturedCollectionSection />
        <StreamingSection />
        <TopicSection topic={bySlug("marriage")} label="Marriage & Partnership" id="marriage" demoKind="marriage" style={{ paddingTop: 80, paddingBottom: 80 }} />
        <SpotlightSection />
        <TopicSection topic={bySlug("parenting")} label="Parenting" id="parenting" demoKind="parenting" style={{ paddingTop: 80, paddingBottom: 44 }} />
        <TopicSection topic={bySlug("ministry")} label="Ministry & Calling" id="ministry" demoKind="ministry" style={{ paddingTop: 44, paddingBottom: 80 }} />

        <SiteFooter />
      </div>
    </AppShell>
  );
}

