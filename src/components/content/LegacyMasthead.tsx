import { Link, useNavigate } from "@tanstack/react-router";
import { Fragment, useEffect, useState } from "react";
import { Headphones } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBell } from "@/components/NotificationBell";

/* The previous home page masthead, kept for the Shop page until its redesign. */
export const HOME_CSS = `
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
.hp-lead p{font-size:15px;color:#4a4638;line-height:1.6;margin:0 0 12px;}
.hp-lead .readmore{display:inline-block;font-size:12px;font-weight:800;color:var(--navy);text-transform:uppercase;letter-spacing:.1em;border-bottom:2px solid var(--limelight);padding-bottom:2px;margin-bottom:10px;}
.hp-lead:hover .readmore{color:var(--limelight);}
.hp-meta{font-size:12px;color:#9a9484;font-weight:600;}
.hp-side{display:flex;flex-direction:column;gap:20px;}
.hp-side-item{display:flex;gap:14px;align-items:flex-start;}
.hp-side-item .thumb{width:96px;height:72px;border-radius:10px;flex-shrink:0;background-size:cover;background-position:center;background-color:var(--limelight);}
.hp-side-item .body{min-width:0;flex:1;}
.hp-side-item h4{font-size:14.5px;font-weight:700;color:var(--navy);line-height:1.35;margin:0 0 4px;}
.hp-side-item p{font-size:13px;color:#6b6656;line-height:1.5;margin:0 0 4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
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
.hp-mast-more-mobile{display:none;}
@media(max-width:767px){.hp-mast-links{display:none;}.hp-mast-more-desktop{display:none;}.hp-mast-more-mobile{display:inline;}}
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
.hp-mast-media-link.is-active{background:#F3F6DC;}
.hp-quickrow a.is-active{text-decoration:underline;text-underline-offset:4px;}
.hp-mast-media-link{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:#181A4D;padding:6px 10px;border-radius:8px;text-decoration:none;background:none;border:none;cursor:pointer;font-family:'Poppins',sans-serif;transition:background .15s;}
.hp-mast-media-link:hover{background:#FBF8ED;}
.hp-mast-media-link svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}
.hp-mast-media-link--listen svg{color:#3B82F6;}
.hp-mast-media-dot{width:10px;height:10px;border-radius:50%;background:#FF340C;display:inline-block;}
.hp-mast-search-form{display:flex;align-items:center;gap:6px;}
.hp-mast-search-form input{width:160px;background:#fff;border:1px solid rgba(24,26,77,0.15);border-radius:8px;padding:6px 10px;font-family:'Poppins',sans-serif;font-size:13px;color:#181A4D;outline:none;transition:border-color .15s;}
.hp-mast-search-form input:focus{border-color:#181A4D;}
.hp-mast-search-form button{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;background:#181A4D;color:#fff;border:none;border-radius:8px;cursor:pointer;}
.hp-mast-search-form button svg{width:14px;height:14px;stroke:#fff;fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round;}
@media(max-width:820px){.hp-mast-media-link > span:not(.hp-mast-media-dot):not(.ic){display:none;}.hp-mast-media-link{padding:6px 6px;gap:0;}.hp-mast-search-form input{width:110px;}.hp-masthead .wrap{gap:10px;}.hp-mast-media{gap:2px;}}
@media(max-width:640px){.hp-mast-subscribe{display:none;}.hp-mast-signin{padding:6px 8px;font-size:12.5px;}.hp-mast-actions{gap:4px;}.hp-mast-more-btn{padding:6px 6px;}.hp-mast-search-form input{width:88px;}.hp-masthead .wrap{padding-left:12px;padding-right:12px;gap:6px;}}

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
.hp-iconbar svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;}
.hp-iconbar-avatar{color:#fff !important;}
.hp-iconbar-avatar:hover{background:rgba(255,255,255,0.08);color:#fff !important;}
.hp-iconbar-bell{display:inline-flex;align-items:center;justify-content:center;}
.hp-iconbar-bell .nb-btn{color:#fff !important;width:40px;height:40px;background:transparent !important;border-radius:10px;}
.hp-iconbar-bell .nb-btn:hover{background:rgba(255,255,255,0.08) !important;}
.hp-iconbar-bell .nb-btn svg{width:20px;height:20px;}
.hp-iconbar-bell .nb-badge{box-shadow:0 0 0 2px var(--navy);}
.hp-iconbar-disabled{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:10px;color:#fff;opacity:.55;cursor:default;}
/* Blue icon bar is mobile-only now; desktop uses the hamburger side menu */
@media (min-width:1024px){.hp-iconbar{display:none;}}

/* Hamburger + slide-in side menu (home page) */
.hp-mast-burger{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:10px;background:transparent;border:none;cursor:pointer;color:var(--navy);flex-shrink:0;transition:background .15s;}
.hp-mast-burger:hover{background:#FBF8ED;}
.hp-mast-burger svg{width:24px;height:24px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;}
.hp-drawer-scrim{position:fixed;inset:0;background:rgba(20,20,20,0.32);z-index:80;}
.hp-drawer{position:fixed;top:0;left:0;bottom:0;width:250px;background:#fff;border-right:1px solid rgba(20,20,20,0.08);box-shadow:0 12px 40px rgba(0,0,0,0.16);z-index:81;display:flex;flex-direction:column;padding:18px 12px;font-family:'Poppins',sans-serif;}
.hp-drawer-head{display:flex;align-items:center;justify-content:space-between;padding:0 6px 0 8px;margin-bottom:20px;gap:8px;}
.hp-drawer-logo{display:flex;align-items:center;gap:10px;text-decoration:none;}
.hp-drawer-logo .mark{width:30px;height:30px;background:var(--limelight);border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--navy);font-weight:900;}
.hp-drawer-logo .word{font-weight:900;font-size:19px;color:var(--navy);letter-spacing:-0.02em;}
.hp-drawer-close{background:transparent;border:none;cursor:pointer;color:#8a8678;display:flex;align-items:center;justify-content:center;padding:6px;border-radius:8px;}
.hp-drawer-close:hover{background:#FBF8ED;color:var(--navy);}
.hp-drawer-close svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;}
.hp-drawer-item{display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:10px;font-size:13.5px;font-weight:600;color:#8a8678;text-decoration:none;margin-bottom:2px;transition:background .15s,color .15s;}
.hp-drawer-item svg{width:24px;height:24px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0;}
.hp-drawer-item:hover{background:#FBF8ED;color:var(--navy);}
.hp-drawer-item.active{background:var(--limelight);color:var(--navy);}
.hp-drawer-foot{margin-top:auto;padding-top:12px;border-top:1px solid rgba(20,20,20,0.08);display:flex;align-items:center;justify-content:space-between;gap:8px;}
.hp-drawer-signin{background:var(--navy);color:#fff !important;font-weight:800;font-size:12.5px;padding:8px 16px;border-radius:20px;text-decoration:none;}


/* Photo-overlay cards must stay white even though they are <a> tags. */
.hp .hp-spot-feature,.hp .hp-spot-feature h3,.hp .hp-stream-feature,.hp .hp-stream-mini,.hp .hp-stream-mini span{color:#fff;}

/* Signed-in masthead quick links */
.hp-mast-quick{display:flex;align-items:center;gap:2px;}
.hp-mast-quick svg,.hp-mast-upnext svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}
.hp-mast-divider{width:1px;height:22px;background:rgba(24,26,77,0.14);margin:0 6px;flex-shrink:0;}
.hp-mast-media{margin-left:0;}
.hp-mast-upnext .ic{position:relative;display:inline-flex;}
.hp-count{position:absolute;top:-7px;right:-9px;min-width:17px;height:17px;padding:0 4px;border-radius:99px;background:var(--limelight);color:var(--navy);font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px #fff;}
.hp-mast-upnext-m{display:none;}
.hp-quickrow{display:none;}
@media(max-width:767px){
  .hp-mast-quick,.hp-mast-divider{display:none;}
  .hp-mast-upnext-m{display:inline-flex;}
  .hp-quickrow{display:flex;gap:22px;background:#fff;border-bottom:1px solid rgba(24,26,77,0.08);padding:12px 16px;overflow-x:auto;}
  .hp-quickrow a{font-size:13.5px;font-weight:700;color:var(--navy);white-space:nowrap;}
}
.hp-eyebrow-sub{font-size:13.5px;color:#6f6b5e;margin:0 0 18px 14px;}
.hp-meta-row{display:flex;align-items:center;justify-content:space-between;gap:10px;}
.hp-save{display:inline-flex;flex-shrink:0;}
.hp-save-corner{position:absolute;top:12px;right:12px;z-index:3;}
/* Continue */
.hp-cont-wrap{display:grid;grid-template-columns:1fr;gap:20px;}
@media(min-width:1000px){.hp-cont-wrap.has-plan{grid-template-columns:2fr 1fr;align-items:end;}}
.hp-cont-grid{display:grid;grid-template-columns:1fr;gap:12px;}
@media(min-width:640px){.hp-cont-grid{grid-template-columns:repeat(3,1fr);}}
.hp-cont-card{background:#fff;border:1px solid rgba(24,26,77,0.08);border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:6px;transition:transform .15s,box-shadow .15s;}
.hp-cont-card:hover{transform:translateY(-2px);box-shadow:0 8px 18px rgba(0,0,0,0.05);}
.hp-cont-card .tag{display:flex;align-items:center;gap:6px;font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#6f6b5e;}
.hp-cont-card .dot{width:7px;height:7px;border-radius:50%;}
.hp-cont-card .ttl{font-size:15px;font-weight:700;color:var(--navy);line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.hp-plan-card{background:var(--navy);color:var(--cream);border-radius:16px;padding:20px;}
.hp-plan-card .eb{font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--limelight);margin-bottom:6px;}
.hp-plan-card h3{margin:0 0 6px;font-size:19px;font-weight:800;color:#fff;}
.hp-plan-card p{margin:0 0 14px;font-size:13.5px;color:rgba(251,248,237,0.78);line-height:1.5;}
.hp-lime-btn{display:inline-flex;align-items:center;background:var(--limelight);color:var(--navy) !important;font-weight:800;font-size:13px;padding:10px 18px;border-radius:999px;border:none;cursor:pointer;font-family:inherit;}
.hp-lime-btn:hover{background:var(--lime);}
.hp-lime-btn:disabled{opacity:.6;}
/* Up next row */
.hp-upnext-row{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;}
.hp-un-extra{display:none;}
.hp-un-card .art{height:130px;border-radius:12px;background-size:cover;background-position:center;background-color:var(--limelight);margin-bottom:10px;}
.hp-un-card h4{font-size:14.5px;font-weight:700;color:var(--navy);margin:0 0 4px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
@media(max-width:899px){
  .hp-upnext-row{display:flex;overflow-x:auto;gap:14px;scrollbar-width:none;padding-bottom:4px;}
  .hp-upnext-row::-webkit-scrollbar{display:none;}
  .hp-un-card{flex:0 0 200px;}
  .hp-un-extra{display:block;}
}
/* Devotionals band */
.hp-dev-grid{display:grid;grid-template-columns:1fr;gap:16px;}
@media(min-width:900px){.hp-dev-grid{grid-template-columns:repeat(3,1fr);}}
.hp-dev-card{background:var(--navy-2);border-top:4px solid var(--acc);border-radius:14px;padding:20px;display:flex;flex-direction:column;gap:8px;align-items:flex-start;}
.hp-dev-card .meta{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:rgba(251,248,237,0.6);}
.hp-dev-card h3{margin:0;font-size:18px;font-weight:800;color:#fff;}
.hp-dev-card p{margin:0 0 6px;font-size:13px;color:rgba(251,248,237,0.75);line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}
.hp-dev-create{border:1.5px dashed rgba(220,224,122,0.5);border-radius:14px;padding:20px;display:flex;flex-direction:column;gap:6px;justify-content:center;min-height:160px;}
.hp-dev-create:hover{border-color:var(--limelight);}
.hp-dev-create .plus{font-size:24px;color:var(--limelight);font-weight:700;line-height:1;}
.hp-dev-create .t{font-size:16px;font-weight:800;color:#fff;}
.hp-dev-create .s{font-size:13px;color:rgba(251,248,237,0.7);line-height:1.5;}
.hp-footer-cols--4{grid-template-columns:repeat(2,1fr);}
@media(min-width:900px){.hp-footer-cols--4{grid-template-columns:repeat(4,1fr);}}
.hp-stream-mini > .hp-save-corner{z-index:3;}

`;

/* ============================================================ */
/*  Data                                                         */
/* ============================================================ */

type TopicRow = Database["public"]["Tables"]["topics"]["Row"] & {
  display_name?: string | null;
  sort_order?: number | null;
};

function HomeIconBar() {
  const items = [
    { to: "/", label: "Home", active: true, icon: <svg viewBox="0 0 24 24"><path d="M4 12l8-7 8 7"/><path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9"/></svg> },
    { to: "/devotionals", label: "Workspace", icon: <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6"/></svg> },
    { to: "/read", label: "Read", icon: <svg viewBox="0 0 24 24"><path d="M3 5.5c2-1.2 4.3-1.5 6.5-.9 1 .27 1.9.7 2.5 1.4v13c-.6-.7-1.5-1.13-2.5-1.4-2.2-.6-4.5-.3-6.5.9z"/><path d="M21 5.5c-2-1.2-4.3-1.5-6.5-.9-1 .27-1.9.7-2.5 1.4v13c.6-.7 1.5-1.13 2.5-1.4 2.2-.6 4.5-.3 6.5.9z"/></svg> },
    { to: "/calendar", label: "Calendar", icon: <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><circle cx="9" cy="15.5" r="1.6" fill="currentColor" stroke="none"/></svg> },
    { to: "/notes", label: "Notes", icon: <svg viewBox="0 0 24 24"><path d="M4 20.5l3.2-.9L18.8 8a1.4 1.4 0 0 0 0-2l-1.3-1.3a1.4 1.4 0 0 0-2 0L4.9 16.3z"/><path d="M4 20.5V17"/></svg> },
  ];
  return (
    <div className="hp-iconbar">
      <div className="wrap">
        <div className="hp-iconbar-nav">
          {items.map((it) => (
            <Fragment key={it.to}>
              {(it as any).prepend}
              <Link to={it.to} className={it.active ? "active" : ""} aria-label={it.label} title={it.label}>
                {it.icon}
              </Link>
            </Fragment>
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


function HomeSideDrawer({ signedIn, onClose }: { signedIn: boolean; onClose: () => void }) {
  const items = [
    { to: "/devotionals", label: "Workspace", icon: <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6"/></svg> },
    { to: "/read", label: "Read", icon: <svg viewBox="0 0 24 24"><path d="M3 5.5c2-1.2 4.3-1.5 6.5-.9 1 .27 1.9.7 2.5 1.4v13c-.6-.7-1.5-1.13-2.5-1.4-2.2-.6-4.5-.3-6.5.9z"/><path d="M21 5.5c-2-1.2-4.3-1.5-6.5-.9-1 .27-1.9.7-2.5 1.4v13c.6-.7 1.5-1.13 2.5-1.4 2.2-.6 4.5-.3 6.5.9z"/></svg> },
    { to: "/calendar", label: "Calendar", icon: <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><circle cx="9" cy="15.5" r="1.6" fill="currentColor" stroke="none"/></svg> },
    { to: "/notes", label: "Notes", icon: <svg viewBox="0 0 24 24"><path d="M4 20.5l3.2-.9L18.8 8a1.4 1.4 0 0 0 0-2l-1.3-1.3a1.4 1.4 0 0 0-2 0L4.9 16.3z"/><path d="M4 20.5V17"/></svg> },
  ];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <>
      <div className="hp-drawer-scrim" onClick={onClose} />
      <aside className="hp-drawer" aria-label="Primary">
        <div className="hp-drawer-head">
          <Link to="/" className="hp-drawer-logo" onClick={onClose}>
            <div className="mark">C</div><div className="word">CoCreate</div>
          </Link>
          <button type="button" className="hp-drawer-close" onClick={onClose} aria-label="Close menu">
            <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </div>
        {items.map((it) => (
          <Link key={it.to} to={it.to} className={`hp-drawer-item${it.to === "/" ? " active" : ""}`} onClick={onClose}>
            {it.icon}<span>{it.label}</span>
          </Link>
        ))}
        <div className="hp-drawer-foot">
          {signedIn ? (
            <>
              <Link to="/profile" className="hp-drawer-item" onClick={onClose} style={{ marginBottom: 0 }}>
                <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6"/></svg>
                <span>Profile</span>
              </Link>
              <button
                type="button"
                onClick={async () => { await supabase.auth.signOut(); onClose(); }}
                style={{ background: "transparent", border: "1.5px solid rgba(20,20,20,0.12)", color: "#20201c", fontWeight: 700, fontSize: 12, padding: "7px 13px", borderRadius: 16, fontFamily: "'Poppins',sans-serif", cursor: "pointer" }}
              >
                Sign out
              </button>
            </>
          ) : (
            <Link to="/auth" className="hp-drawer-signin" onClick={onClose}>Sign in</Link>
          )}
        </div>
      </aside>
    </>
  );
}

const BOOKMARK_SVG = <svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4V3z" /></svg>;
const BOOK_SVG = <svg viewBox="0 0 24 24"><path d="M12 6c-2-1.2-4.5-2-8-2v14c3.5 0 6 .8 8 2 2-1.2 4.5-2 8-2V4c-3.5 0-6 .8-8 2zM12 6v14" /></svg>;
const BAG_SVG = <svg viewBox="0 0 24 24"><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>;

export function HomeMasthead({ signedIn, upNextCount, active }: { signedIn: boolean; upNextCount: number; active?: "shop" }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <>
    <div className={`hp-masthead${signedIn ? " is-inline" : ""}`}>
      <div className="wrap">
        <Link to="/" search={{ feed: 1 } as any} className="hp-mast-brand">
          <div className="mark">C</div>
          <div className="word">CoCreate</div>
        </Link>
        <button
          type="button"
          className="hp-mast-burger"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
        </button>
        {menuOpen && <HomeSideDrawer signedIn={signedIn} onClose={() => setMenuOpen(false)} />}
        <div style={{ flex: 1 }} />
        <div className="hp-mast-actions">
          {!signedIn && (
            <>
              <Link to="/auth" className="hp-mast-signin">Sign in</Link>
              <Link to="/subscribe" className="hp-mast-subscribe">Subscribe</Link>
            </>
          )}
        </div>
        {signedIn && (
          <>
            <nav className="hp-mast-quick" aria-label="Your content">
              <Link to="/explore/devotionals" className="hp-mast-media-link">{BOOK_SVG}<span>Devotionals</span></Link>
              <Link to="/up-next" className="hp-mast-media-link hp-mast-upnext">
                <span className="ic">{BOOKMARK_SVG}{upNextCount > 0 && <span className="hp-count">{upNextCount}</span>}</span>
                <span>Up next</span>
              </Link>
              <Link to="/shop" className={`hp-mast-media-link${active === "shop" ? " is-active" : ""}`} aria-current={active === "shop" ? "page" : undefined}>{BAG_SVG}<span>Shop</span></Link>
            </nav>
            <span className="hp-mast-divider" aria-hidden />
          </>
        )}
        <MediaNav />
        {signedIn && (
          <Link to="/up-next" className="hp-mast-media-link hp-mast-upnext hp-mast-upnext-m" aria-label="Up next">
            <span className="ic">{BOOKMARK_SVG}{upNextCount > 0 && <span className="hp-count">{upNextCount}</span>}</span>
          </Link>
        )}
      </div>
    </div>
    {signedIn && (
      <div className="hp-quickrow">
        <Link to="/explore/devotionals">Devotionals</Link>
        <Link to="/up-next">Up next ({upNextCount})</Link>
        <Link to="/shop" className={active === "shop" ? "is-active" : undefined}>Shop</Link>
      </div>
    )}
    </>
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
      <Link to="/listen" className="hp-mast-media-link hp-mast-media-link--listen" aria-label="Listen">
        <Headphones size={18} />
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


