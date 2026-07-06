import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/")({
  component: Mockup,
});

const CSS = `
:root{
  --navy:#181A4D; --fire:#FF340C; --peri:#8a96e0; --pink:#F03172;
  --lime:#CAC307; --limelight:#DCE07A; --amber:#FFAE00; --teal:#0F4A42; --burg:#441B07;
  --blush:#E990A2; --cream:#FBF8ED; --ink:#20201c; --muted:#8a8678;
  --line: rgba(20,20,20,0.08); --paper:#ffffff;
}
.cc-root, .cc-root *{box-sizing:border-box;}
.cc-root{font-family:'Poppins',sans-serif;background:#eee9d9;color:var(--ink);-webkit-font-smoothing:antialiased;min-height:100vh;}
.cc-root img{display:block;max-width:100%;}
.cc-root h1,.cc-root h2,.cc-root h3,.cc-root h4,.cc-root p{margin:0;}

.switcher{position:sticky;top:0;z-index:100;background:var(--paper);border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:14px 24px;flex-wrap:wrap;gap:10px;}
.switcher-brand{display:flex;align-items:center;gap:10px;color:var(--navy);}
.switcher-brand .mark{width:26px;height:26px;background:var(--limelight);border-radius:7px;display:flex;align-items:center;justify-content:center;color:var(--navy);font-weight:900;font-size:14px;}
.switcher-brand .name{font-weight:900;font-size:18px;color:var(--navy);letter-spacing:-0.02em;}
.switcher-tabs{display:flex;gap:8px;}
.stab{background:var(--cream);border:1.5px solid var(--line);color:var(--muted);font-family:'Poppins';font-weight:700;font-size:12px;padding:8px 16px;border-radius:20px;cursor:pointer;letter-spacing:0.02em;}
.stab.active{background:var(--navy);border-color:var(--navy);color:white;}
.screen-tabs{display:flex;gap:6px;flex-wrap:wrap;}
.stab2{background:transparent;border:1.5px solid var(--line);color:var(--navy);font-family:'Poppins';font-weight:600;font-size:11.5px;padding:6px 13px;border-radius:16px;cursor:pointer;}
.stab2.active{background:var(--limelight);border-color:var(--limelight);color:var(--navy);}

.tag{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;padding:4px 10px;border-radius:20px;}
.tag.teaching{background:var(--amber);color:var(--navy);}
.tag.essay{background:var(--limelight);color:var(--navy);}
.tag.podcast{background:var(--teal);color:var(--cream);}
.tag.devotional{background:var(--lime);color:var(--navy);}

.thumb{position:relative;overflow:hidden;}
.thumb::after{content:'';position:absolute;inset:0;mix-blend-mode:multiply;opacity:0.55;}
.thumb.t-teaching::after{background:var(--amber);}
.thumb.t-essay::after{background:var(--limelight);}
.thumb.t-podcast::after{background:var(--teal);}
.thumb.t-devotional::after{background:var(--lime);}
.thumb img{filter:grayscale(0.25) contrast(1.05);}

.d-frame{max-width:1400px;margin:24px auto;background:var(--cream);border-radius:20px;overflow:hidden;box-shadow:0 30px 60px rgba(0,0,0,0.18);border:1px solid var(--line);}
.d-app{display:grid;grid-template-columns:230px 1fr 290px;min-height:800px;}
.d-nav{background:var(--paper);padding:26px 16px;display:flex;flex-direction:column;border-right:1px solid var(--line);}
.d-logo{display:flex;align-items:center;gap:10px;margin-bottom:30px;padding:0 8px;}
.d-logo .mark{width:30px;height:30px;background:var(--limelight);border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--navy);font-weight:900;}
.d-logo .word{font-weight:900;font-size:19px;color:var(--navy);letter-spacing:-0.02em;}
.d-item{display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:10px;font-size:13px;font-weight:600;color:var(--muted);cursor:pointer;margin-bottom:3px;}
.d-item svg{width:18px;height:18px;flex-shrink:0;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}
.d-item.active{background:var(--limelight);color:var(--navy);}
.d-item:not(.active):hover{background:var(--cream);color:var(--navy);}
.d-nav-label{font-size:9.5px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:var(--muted);padding:20px 14px 8px;}
.d-topic{display:flex;align-items:center;justify-content:space-between;padding:7px 14px;border-radius:8px;font-size:12px;color:var(--ink);cursor:pointer;}
.d-topic:hover{background:var(--cream);}
.d-topic .dot{width:7px;height:7px;border-radius:50%;}
.d-nav-foot{margin-top:auto;padding:14px;border-top:1px solid var(--line);display:flex;align-items:center;gap:10px;}
.d-avatar{width:34px;height:34px;border-radius:50%;background:var(--teal);color:var(--cream);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;}
.d-nav-foot .n{color:var(--navy);font-size:12.5px;font-weight:700;}
.d-nav-foot .s{color:var(--muted);font-size:10.5px;}

.d-main{padding:30px 34px;overflow-y:auto;background:var(--cream);}
.d-header{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:6px;}
.d-header h1{font-size:26px;font-weight:900;letter-spacing:-0.03em;color:var(--navy);}
.d-header .sub{font-size:12.5px;color:var(--muted);font-weight:600;}
.d-subhead{font-size:13.5px;color:var(--muted);margin-bottom:22px;font-weight:500;}

.d-card{background:var(--paper);border-radius:16px;overflow:hidden;border:1px solid var(--line);margin-bottom:18px;display:flex;gap:0;transition:transform .15s;}
.d-card:hover{transform:translateY(-2px);}
.d-card .thumb{width:200px;flex-shrink:0;}
.d-card .thumb img{width:100%;height:100%;object-fit:cover;min-height:150px;}
.d-card .thumb .playdot{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:2;}
.d-card .thumb .playdot .pd{width:38px;height:38px;background:rgba(24,26,77,0.85);border-radius:50%;display:flex;align-items:center;justify-content:center;}
.d-card .body{padding:18px 20px;flex:1;display:flex;flex-direction:column;}
.d-card .toprow{display:flex;align-items:center;gap:8px;margin-bottom:9px;}
.d-card .scripture{font-size:10.5px;color:var(--teal);font-weight:700;}
.d-card h3{font-size:17px;font-weight:800;color:var(--navy);letter-spacing:-0.01em;margin-bottom:6px;line-height:1.25;}
.d-card p{font-size:12.5px;color:var(--muted);line-height:1.55;font-weight:400;margin-bottom:10px;}
.d-card .meta{display:flex;align-items:center;gap:14px;margin-top:auto;font-size:11px;color:var(--muted);font-weight:600;}
.d-card .meta .icn{display:inline-flex;align-items:center;gap:4px;cursor:pointer;}
.d-card .meta svg{width:14px;height:14px;stroke:var(--muted);fill:none;stroke-width:2;}

.d-side{padding:30px 22px;border-left:1px solid var(--line);background:var(--paper);overflow-y:auto;}
.d-side h4{font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:var(--navy);margin-bottom:14px;}
.d-topicchip{display:inline-block;background:var(--cream);border:1.5px solid var(--line);color:var(--navy);font-size:11px;font-weight:700;padding:6px 12px;border-radius:16px;margin:0 6px 8px 0;}
.d-topicchip.on{background:var(--teal);border-color:var(--teal);color:#fff;}
.d-encourage{background:var(--paper);border:1.5px solid var(--line);border-left:5px solid var(--limelight);border-radius:14px;padding:18px;margin-top:22px;}
.d-encourage .scr{font-weight:800;font-size:15px;color:var(--navy);margin-bottom:8px;line-height:1.3;}
.d-encourage p{font-size:11.5px;color:var(--muted);line-height:1.5;}
.d-mininote{background:var(--cream);border:1.5px dashed var(--peri);border-radius:12px;padding:14px;margin-top:18px;}
.d-mininote .l{font-size:10px;font-weight:700;color:var(--peri);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;}
.d-mininote p{font-size:12px;color:var(--navy);font-style:italic;line-height:1.5;}

.devo-wrap{max-width:720px;}
.devo-hero{background:var(--paper);border:1px solid var(--line);border-top:5px solid var(--teal);border-radius:16px;padding:26px 28px;margin-bottom:22px;}
.devo-hero .lbl{font-size:10.5px;letter-spacing:0.15em;text-transform:uppercase;color:var(--teal);font-weight:800;margin-bottom:8px;}
.devo-hero h2{font-size:24px;font-weight:900;margin-bottom:8px;color:var(--navy);}
.devo-hero .scr{font-size:13px;color:var(--muted);font-weight:500;}
.devo-block{background:var(--paper);border-radius:14px;padding:20px 22px;margin-bottom:14px;border:1px solid var(--line);}
.devo-block .q{font-size:10px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#8a9407;margin-bottom:8px;}
.devo-block .prompt{font-size:14.5px;color:var(--navy);font-weight:600;margin-bottom:12px;line-height:1.4;}
.devo-block textarea{width:100%;border:none;background:var(--cream);border-radius:8px;padding:12px;font-family:'Poppins';font-size:13px;color:var(--ink);min-height:70px;resize:none;}
.devo-block textarea::placeholder{color:var(--muted);}

.savedgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;}
.quote-card{background:var(--paper);border:1px solid var(--line);border-left:5px solid var(--burg);border-radius:14px;padding:20px;position:relative;}
.quote-card .qmark{font-weight:900;font-size:34px;color:var(--burg);line-height:0.4;}
.quote-card p{font-size:14px;line-height:1.5;font-weight:600;margin:8px 0 10px;color:var(--navy);}
.quote-card .src{font-size:10.5px;color:var(--muted);font-weight:600;}
.note-card{background:var(--paper);border-radius:14px;padding:18px;border:1px solid var(--line);}
.note-card .d{font-size:10px;color:var(--muted);font-weight:600;margin-bottom:6px;}
.note-card p{font-size:12.5px;color:var(--navy);line-height:1.5;}

.pillrow{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px;}
.pill{padding:8px 16px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;border:1.5px solid var(--line);color:var(--navy);background:var(--paper);}
.pill.on{background:var(--navy);border-color:var(--navy);color:#fff;}
.exgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
.exgrid .d-card{flex-direction:column;margin-bottom:0;}
.exgrid .d-card .thumb{width:100%;height:130px;}
.exgrid .d-card .thumb img{height:130px;}

.profile-hero{display:flex;align-items:center;gap:18px;margin-bottom:26px;}
.profile-hero .av{width:74px;height:74px;border-radius:50%;background:var(--teal);color:var(--cream);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:28px;}
.stat-row{display:flex;gap:14px;margin-bottom:26px;}
.stat{background:var(--paper);border:1px solid var(--line);border-radius:12px;padding:14px 20px;text-align:center;}
.stat .n{font-size:22px;font-weight:900;color:var(--navy);}
.stat .l{font-size:10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:0.06em;}

.m-wrap{display:flex;justify-content:center;padding:24px 0 60px;}
.m-frame-outer{position:relative;}
.m-frame{width:390px;background:var(--cream);border-radius:44px;border:10px solid var(--navy);overflow:hidden;box-shadow:0 30px 60px rgba(0,0,0,0.25);}
.m-notch{height:28px;background:var(--paper);display:flex;justify-content:center;align-items:flex-end;padding-bottom:6px;border-bottom:1px solid var(--line);}
.m-notch .pill2{width:80px;height:5px;background:var(--line);border-radius:4px;}
.m-topbar{padding:14px 18px 10px;display:flex;align-items:center;justify-content:space-between;background:var(--paper);border-bottom:1px solid var(--line);}
.m-topbar .word{font-weight:900;font-size:19px;color:var(--navy);letter-spacing:-0.02em;}
.m-topbar .bell{width:32px;height:32px;border-radius:50%;background:var(--limelight);display:flex;align-items:center;justify-content:center;}
.m-topbar .bell svg{width:15px;height:15px;stroke:var(--navy);fill:none;stroke-width:2;}
.m-body{height:660px;overflow-y:auto;padding:6px 16px 90px;background:var(--cream);}
.m-body h1{font-size:21px;font-weight:900;color:var(--navy);letter-spacing:-0.02em;margin:6px 0 2px;}
.m-body .sub{font-size:11.5px;color:var(--muted);font-weight:600;margin-bottom:14px;}
.m-topicscroll{display:flex;gap:8px;overflow-x:auto;padding-bottom:12px;margin-bottom:10px;}
.m-topicscroll .chip{flex-shrink:0;background:var(--paper);border:1.5px solid var(--line);color:var(--navy);font-size:11px;font-weight:700;padding:7px 14px;border-radius:16px;}
.m-topicscroll .chip.on{background:var(--teal);border-color:var(--teal);color:#fff;}
.m-card{background:var(--paper);border-radius:16px;overflow:hidden;border:1px solid var(--line);margin-bottom:14px;}
.m-card .thumb{height:150px;}
.m-card .thumb img{width:100%;height:150px;object-fit:cover;}
.m-card .thumb .tagwrap{position:absolute;top:10px;left:10px;z-index:2;}
.m-card .thumb .pd{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:2;}
.m-card .thumb .pd .c{width:36px;height:36px;background:rgba(24,26,77,0.85);border-radius:50%;display:flex;align-items:center;justify-content:center;}
.m-card .cb{padding:13px 15px;}
.m-card .scripture{font-size:10px;color:var(--teal);font-weight:700;margin-bottom:5px;}
.m-card h3{font-size:15px;font-weight:800;color:var(--navy);line-height:1.3;margin-bottom:4px;}
.m-card p{font-size:11.5px;color:var(--muted);line-height:1.5;margin-bottom:8px;}
.m-card .meta{display:flex;gap:12px;font-size:10.5px;color:var(--muted);font-weight:600;align-items:center;}
.m-card .meta svg{width:13px;height:13px;stroke:var(--muted);fill:none;stroke-width:2;}

.m-bottomnav{position:absolute;bottom:0;left:0;right:0;background:var(--paper);display:flex;justify-content:space-around;padding:12px 6px 16px;border-top:1px solid var(--line);}
.m-navitem{display:flex;flex-direction:column;align-items:center;gap:4px;color:var(--muted);cursor:pointer;}
.m-navitem svg{width:21px;height:21px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}
.m-navitem.active{color:#8a9407;}
.m-navitem span{font-size:9px;font-weight:700;}

.m-devohero{background:var(--paper);border:1px solid var(--line);border-top:4px solid var(--teal);border-radius:16px;padding:18px;margin-bottom:14px;}
.m-devohero .lbl{font-size:9.5px;letter-spacing:0.13em;text-transform:uppercase;color:var(--teal);font-weight:800;margin-bottom:6px;}
.m-devohero h2{font-size:19px;font-weight:900;margin-bottom:6px;color:var(--navy);}
.m-devohero .scr{font-size:11.5px;color:var(--muted);}
.m-devoblock{background:var(--paper);border-radius:12px;padding:15px;margin-bottom:12px;border:1px solid var(--line);}
.m-devoblock .q{font-size:9px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#8a9407;margin-bottom:6px;}
.m-devoblock .prompt{font-size:12.5px;color:var(--navy);font-weight:600;margin-bottom:8px;line-height:1.4;}
.m-devoblock textarea{width:100%;border:none;background:var(--cream);border-radius:8px;padding:10px;font-family:'Poppins';font-size:12px;min-height:55px;resize:none;}

.m-quote{background:var(--paper);border:1px solid var(--line);border-left:5px solid var(--burg);border-radius:14px;padding:16px;margin-bottom:12px;}
.m-quote .qmark{font-weight:900;font-size:26px;color:var(--burg);line-height:0.4;}
.m-quote p{font-size:13px;line-height:1.5;font-weight:600;margin:6px 0 8px;color:var(--navy);}
.m-quote .src{font-size:10px;color:var(--muted);font-weight:600;}

.m-profhero{display:flex;align-items:center;gap:14px;margin:8px 0 18px;}
.m-profhero .av{width:58px;height:58px;border-radius:50%;background:var(--teal);color:var(--cream);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:22px;}
.m-statrow{display:flex;gap:10px;margin-bottom:18px;}
.m-stat{flex:1;background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:10px;text-align:center;}
.m-stat .n{font-size:17px;font-weight:900;color:var(--navy);}
.m-stat .l{font-size:8.5px;color:var(--muted);font-weight:700;text-transform:uppercase;}

.section-lbl{font-size:10.5px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:var(--navy);margin:16px 0 10px;}
.footnote{max-width:1400px;margin:0 auto 60px;padding:0 24px;color:#5b5847;font-size:12.5px;line-height:1.7;}
.footnote h4{color:var(--navy);font-size:13px;margin-bottom:6px;font-weight:800;}
`;

const IMG = {
  devo1: "https://picsum.photos/seed/cocreate-devo1/600/400",
  work1: "https://picsum.photos/seed/cocreate-work1/600/400",
  pod1: "https://picsum.photos/seed/cocreate-pod1/600/400",
  wild1: "https://picsum.photos/seed/cocreate-wild1/600/400",
  calling1: "https://picsum.photos/seed/cocreate-calling1/600/400",
  forge1: "https://picsum.photos/seed/cocreate-forge1/600/400",
};

type CardType = "teaching" | "essay" | "podcast" | "devotional";
interface Card {
  type: CardType; tag: string; img: string; scripture: string;
  title: string; topic: string; desc: string; meta: string;
}

const CARDS: Card[] = [
  { type: "teaching", tag: "Teaching · 24 min", img: IMG.devo1, scripture: "Isaiah 40:31", title: "The Weight of Waiting", topic: "Identity in Christ", desc: "On what it means to be renewed in strength while nothing around you moves yet.", meta: "12.4k views · Pastor Elijah Cross" },
  { type: "essay", tag: "Essay · 9 min read", img: IMG.work1, scripture: "Colossians 3:23", title: 'What "Working Like It Matters" Actually Looks Like', topic: "Theology of Work", desc: "A long-form look at ordinary labor as an act of worship — and why that changes Monday morning.", meta: "2.1k reads · Dara Whitfield" },
  { type: "podcast", tag: "Podcast · Ep. 42 · 38 min", img: IMG.pod1, scripture: "Psalm 62:1", title: "Held, Not Hurried", topic: "Abiding", desc: "A conversation on slowness, presence, and what it costs to stay near God on ordinary days.", meta: "8.7k plays · with Naomi Fields" },
  { type: "devotional", tag: "Devotional Template", img: IMG.wild1, scripture: "Deuteronomy 8:2", title: "7 Days in the Wilderness", topic: "Suffering & Endurance", desc: "A repeatable seven-entry template for walking through a hard season without rushing it.", meta: "Save to start · 4.3k in progress" },
  { type: "essay", tag: "Essay · 6 min read", img: IMG.calling1, scripture: "Jeremiah 29:11", title: "Calling Is Not a Feeling", topic: "Calling", desc: "Why the search for certainty before obedience usually gets the order backwards.", meta: "1.8k reads · Marcus Iheanacho" },
  { type: "teaching", tag: "Teaching · 31 min", img: IMG.forge1, scripture: "James 1:2-4", title: "Formed Under Pressure", topic: "Discipline", desc: "Part of the Forged series — on discipline as the shape endurance takes day to day.", meta: "6.9k views · Coach Renee Abara" },
];

const tagLabel = (t: CardType) => ({ teaching: "Teaching", essay: "Essay", podcast: "Podcast", devotional: "Devotional" }[t]);

function cardHTML(c: Card, mobile: boolean) {
  const isPlay = c.type === "teaching" || c.type === "podcast";
  if (mobile) {
    const play = isPlay ? `<div class="pd"><div class="c"><svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg></div></div>` : "";
    return `<div class="m-card">
      <div class="thumb t-${c.type}"><img src="${c.img}" alt="${c.title}"/><div class="tagwrap"><span class="tag ${c.type}">${tagLabel(c.type)}</span></div>${play}</div>
      <div class="cb">
        <div class="scripture">${c.scripture}</div>
        <h3>${c.title}</h3>
        <p>${c.desc}</p>
        <div class="meta">
          <span class="icn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12v18l-6-4-6 4V3z"/></svg></span>
          <span class="icn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.5l6.8-3.9M8.6 13.5l6.8 3.9"/></svg></span>
          <span style="margin-left:auto;">${c.meta.split("·")[0]}</span>
        </div>
      </div>
    </div>`;
  }
  const playDesk = isPlay ? `<div class="playdot"><div class="pd"><svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg></div></div>` : "";
  return `<div class="d-card">
    <div class="thumb t-${c.type}"><img src="${c.img}" alt="${c.title}"/>${playDesk}</div>
    <div class="body">
      <div class="toprow"><span class="tag ${c.type}">${tagLabel(c.type)}</span><span class="scripture">${c.scripture}</span></div>
      <h3>${c.title}</h3>
      <p>${c.desc}</p>
      <div class="meta">
        <span>${c.meta}</span>
        <span class="icn" style="margin-left:auto;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12v18l-6-4-6 4V3z"/></svg>Save</span>
        <span class="icn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.5l6.8-3.9M8.6 13.5l6.8 3.9"/></svg>Share</span>
      </div>
    </div>
  </div>`;
}

function sideHTML() {
  return `<h4>Subscribed Topics</h4>
    <div><span class="d-topicchip on">Abiding</span><span class="d-topicchip on">Theology of Work</span><span class="d-topicchip on">Identity in Christ</span><span class="d-topicchip">Prayer</span><span class="d-topicchip">Calling</span><span class="d-topicchip">Motherhood</span></div>
    <div class="d-encourage"><div class="scr">Renewed, not rushed.</div><p>You've spent 4 days this week in Identity in Christ. Here's a reminder rooted in Isaiah 40 for wherever today finds you.</p></div>
    <div class="d-mininote"><div class="l">Pinned from your notes</div><p>"Obedience before certainty — that's the whole essay, really."</p></div>`;
}

function homeMain(mobile: boolean) {
  const cards = CARDS.map((c) => cardHTML(c, mobile)).join("");
  if (mobile) {
    return `<h1>Good morning, Zaniyyah</h1><div class="sub">Continuing in Identity in Christ &amp; Abiding</div>
    <div class="m-topicscroll"><span class="chip on">Abiding</span><span class="chip on">Theology of Work</span><span class="chip on">Identity in Christ</span><span class="chip">Prayer</span><span class="chip">Calling</span></div>
    ${cards}`;
  }
  return `<div class="d-header"><h1>Good morning, Zaniyyah</h1><span class="sub">Tue, Jul 6</span></div><div class="d-subhead">Continuing in Identity in Christ &amp; Abiding — here's what's next.</div>${cards}`;
}

function exploreMain(mobile: boolean) {
  const topics = ["Abiding", "Theology of Work", "Identity in Christ", "Prayer", "Calling", "Spiritual Formation", "Discipline", "Suffering & Endurance", "Friendship & Fellowship", "Kingdom Culture", "Motherhood", "Creativity", "Leadership", "Obedience", "Purpose"];
  const pills = topics.map((t, i) => `<span class="pill ${i < 2 ? "on" : ""}">${t}</span>`).join("");
  if (mobile) {
    const g = CARDS.slice(0, 4).map((c) => cardHTML(c, mobile)).join("");
    return `<h1>Explore</h1><div class="sub">Browse every topic, format &amp; collection</div>
    <div class="m-topicscroll">${topics.slice(0, 8).map((t, i) => `<span class="chip ${i < 2 ? "on" : ""}">${t}</span>`).join("")}</div>${g}`;
  }
  const grid = CARDS.map((c) => `<div class="d-card"><div class="thumb t-${c.type}"><img src="${c.img}"/></div><div class="body"><span class="tag ${c.type}" style="margin-bottom:8px;width:fit-content;">${tagLabel(c.type)}</span><h3 style="font-size:14.5px;">${c.title}</h3><p style="font-size:11.5px;">${c.topic}</p></div></div>`).join("");
  return `<div class="d-header"><h1>Explore</h1></div><div class="d-subhead">Browse all content by topic, format, or collection.</div><div class="pillrow">${pills}</div><div class="exgrid">${grid}</div>`;
}

function savedMain(mobile: boolean) {
  const quotes = [
    { q: "Obedience before certainty — that's the whole essay, really.", s: 'from "Calling Is Not a Feeling"' },
    { q: "Renewed, not rushed. That's the posture, not the outcome.", s: 'from "The Weight of Waiting"' },
  ];
  const notes = [
    { d: "Jul 4 · Personal note", t: "Come back to the wilderness devotional on Sunday — day 3 hit different." },
    { d: "Jun 29 · Personal note", t: "Ask: what would it look like to treat Monday's work as an offering, not a transaction?" },
  ];
  if (mobile) {
    const qh = quotes.map((x) => `<div class="m-quote"><div class="qmark">"</div><p>${x.q}</p><div class="src">${x.s}</div></div>`).join("");
    const nh = notes.map((x) => `<div class="note-card" style="margin-bottom:12px;"><div class="d">${x.d}</div><p>${x.t}</p></div>`).join("");
    const savedCards = CARDS.slice(0, 3).map((c) => cardHTML(c, mobile)).join("");
    return `<h1>Saved &amp; Notes</h1><div class="sub">Everything you've kept, in one place</div>
    <div class="section-lbl">Pinned Quotes</div>${qh}
    <div class="section-lbl">Your Notes</div>${nh}
    <div class="section-lbl">Saved Content</div>${savedCards}`;
  }
  const qh = quotes.map((x) => `<div class="quote-card"><div class="qmark">"</div><p>${x.q}</p><div class="src">${x.s}</div></div>`).join("");
  const nh = notes.map((x) => `<div class="note-card"><div class="d">${x.d}</div><p>${x.t}</p></div>`).join("");
  const savedCards = CARDS.slice(0, 4).map((c) => cardHTML(c, false)).join("");
  return `<div class="d-header"><h1>Saved</h1></div><div class="d-subhead">Essays, teachings, podcasts, devotionals, quotes, and notes — all in one place.</div>
  <h4 style="color:var(--navy);font-size:12px;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:12px;">Pinned Quotes</h4>
  <div class="savedgrid" style="margin-bottom:26px;">${qh}</div>
  <h4 style="color:var(--navy);font-size:12px;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:12px;">Your Notes</h4>
  <div class="savedgrid" style="margin-bottom:26px;">${nh}</div>
  <h4 style="color:var(--navy);font-size:12px;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:12px;">Saved Content</h4>
  ${savedCards}`;
}

function devoMain(mobile: boolean) {
  const templates = [
    { name: "Abide — Daily Reflection", topic: "Abiding", entries: "Day 14 of an open practice" },
    { name: "7 Days in the Wilderness", topic: "Suffering & Endurance", entries: "Day 3 of 7" },
    { name: "Forged — Discipline Log", topic: "Discipline", entries: "Day 6 of an open practice" },
  ];
  const tlist = templates.map((t) => `<div class="${mobile ? "m-devoblock" : "devo-block"}" style="cursor:pointer;">
    <div class="q">${t.topic}</div><div class="prompt" style="margin-bottom:2px;">${t.name}</div>
    <div style="font-size:${mobile ? "11px" : "12px"};color:var(--muted);font-weight:500;">${t.entries} &nbsp;·&nbsp; Tap to continue</div>
  </div>`).join("");

  const entry = mobile
    ? `<div class="m-devohero"><div class="lbl">Suffering & Endurance</div><h2>7 Days in the Wilderness</h2><div class="scr">Deuteronomy 8:2 — Day 3</div></div>
    <div class="m-devoblock"><div class="q">Scripture Focus</div><div class="prompt">"Remember how the Lord led you all the way in the wilderness."</div></div>
    <div class="m-devoblock"><div class="q">Reflect</div><div class="prompt">Where have you felt most led, even when you couldn't see the path?</div><textarea placeholder="Start writing..."></textarea></div>
    <div class="m-devoblock"><div class="q">Pray</div><div class="prompt">Ask God to show you one place He was present in a season you called "wilderness."</div><textarea placeholder="Start writing..."></textarea></div>
    <div class="m-devoblock"><div class="q">Apply</div><div class="prompt">Name one small act of trust you can take today.</div><textarea placeholder="Start writing..."></textarea></div>`
    : `<div class="devo-wrap">
    <div class="devo-hero"><div class="lbl">Suffering & Endurance · Day 3 of 7</div><h2>7 Days in the Wilderness</h2><div class="scr">Deuteronomy 8:2 — "Remember how the Lord your God led you all the way in the wilderness these forty years."</div></div>
    <div class="devo-block"><div class="q">Reflect</div><div class="prompt">Where have you felt most led, even when you couldn't see the path ahead?</div><textarea placeholder="Start writing..."></textarea></div>
    <div class="devo-block"><div class="q">Pray</div><div class="prompt">Ask God to show you one place He was present in a season you called "wilderness."</div><textarea placeholder="Start writing..."></textarea></div>
    <div class="devo-block"><div class="q">Apply</div><div class="prompt">Name one small, concrete act of trust you can take today.</div><textarea placeholder="Start writing..."></textarea></div>
    </div>`;

  if (mobile) {
    return `<h1>Devotionals</h1><div class="sub">Templates you return to, not content you finish</div>
    <div class="section-lbl">Your Templates</div>${tlist}
    <div class="section-lbl">Today's Entry</div>${entry}`;
  }
  return `<div class="d-header"><h1>Devotionals</h1></div><div class="d-subhead">Stable practice templates you return to — the content changes, the practice doesn't.</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px;">${tlist}</div>
  ${entry}`;
}

function notesMain(mobile: boolean) {
  const notes = [
    { d: 'Jul 4 · On "7 Days in the Wilderness"', t: "Come back to day 3 on Sunday — the line about being led, not lost, hit different this time." },
    { d: 'Jun 29 · On "What Working Like It Matters"', t: "Ask: what would it look like to treat Monday's work as an offering, not a transaction?" },
    { d: "Jun 21 · Free note", t: "Keep circling back to Calling this month. Maybe subscribe to Purpose too — feels adjacent." },
  ];
  const cards = notes.map((n) => `<div class="note-card" style="margin-bottom:${mobile ? "12px" : "16px"};"><div class="d">${n.d}</div><p>${n.t}</p></div>`).join("");
  if (mobile) return `<h1>Notes</h1><div class="sub">Everything you've written to yourself</div>${cards}`;
  return `<div class="d-header"><h1>Notes</h1></div><div class="d-subhead">Personal notes, pulled from essays, teachings, podcasts, and devotional entries.</div><div class="savedgrid">${cards}</div>`;
}

function profileMain(mobile: boolean) {
  const topics = ["Abiding", "Theology of Work", "Identity in Christ", "Calling", "Prayer", "Motherhood"];
  const chips = topics.map((t) => `<span class="${mobile ? "chip on" : "d-topicchip on"}" style="${mobile ? "" : "margin-bottom:8px;"}">${t}</span>`).join("");
  if (mobile) {
    return `<div class="m-profhero"><div class="av">Z</div><div><div style="font-weight:800;color:var(--navy);font-size:16px;">Zaniyyah</div><div style="font-size:11px;color:var(--muted);">Member since Feb 2026</div></div></div>
    <div class="m-statrow">
      <div class="m-stat"><div class="n">7</div><div class="l">Day Streak</div></div>
      <div class="m-stat"><div class="n">32</div><div class="l">Saved</div></div>
      <div class="m-stat"><div class="n">6</div><div class="l">Topics</div></div>
    </div>
    <div class="section-lbl">Subscribed Topics</div>
    <div class="m-topicscroll" style="flex-wrap:wrap;overflow:visible;">${chips}<span class="chip">+ Add topic</span></div>
    <div class="section-lbl">Settings</div>
    <div class="note-card" style="margin-bottom:10px;"><p style="font-weight:600;">Notification preferences</p></div>
    <div class="note-card" style="margin-bottom:10px;"><p style="font-weight:600;">Profile visibility — Private</p></div>
    <div class="note-card"><p style="font-weight:600;">Account &amp; subscription</p></div>`;
  }
  return `<div class="d-header"><h1>Profile</h1></div><div class="d-subhead">Your spiritual workspace, at a glance.</div>
  <div class="profile-hero"><div class="av">Z</div><div><div style="font-weight:800;color:var(--navy);font-size:19px;">Zaniyyah</div><div style="font-size:12px;color:var(--muted);">Member since Feb 2026</div></div></div>
  <div class="stat-row"><div class="stat"><div class="n">7</div><div class="l">Day Streak</div></div><div class="stat"><div class="n">32</div><div class="l">Saved</div></div><div class="stat"><div class="n">6</div><div class="l">Topics</div></div><div class="stat"><div class="n">14</div><div class="l">Notes</div></div></div>
  <h4 style="color:var(--navy);font-size:12px;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:12px;">Subscribed Topics</h4>
  <div style="margin-bottom:26px;">${chips}<span class="d-topicchip">+ Add topic</span></div>
  <h4 style="color:var(--navy);font-size:12px;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:12px;">Settings</h4>
  <div class="savedgrid"><div class="note-card"><p style="font-weight:600;">Notification preferences</p></div><div class="note-card"><p style="font-weight:600;">Profile visibility — Private</p></div><div class="note-card"><p style="font-weight:600;">Account &amp; subscription</p></div><div class="note-card"><p style="font-weight:600;">Connected devices</p></div></div>`;
}

type Screen = "home" | "explore" | "saved" | "devo" | "notes" | "profile";
const SCREENS: Record<Screen, { label: string; build: (m: boolean) => string; side: boolean }> = {
  home: { label: "Home", build: homeMain, side: true },
  explore: { label: "Explore", build: exploreMain, side: false },
  saved: { label: "Saved", build: savedMain, side: false },
  devo: { label: "Devotionals", build: devoMain, side: false },
  notes: { label: "Notes", build: notesMain, side: false },
  profile: { label: "Profile", build: profileMain, side: false },
};

const NAV_ITEMS: { key: Screen; label: string; icon: JSX.Element }[] = [
  { key: "home", label: "Home", icon: <svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" /></svg> },
  { key: "explore", label: "Explore", icon: <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg> },
  { key: "saved", label: "Saved", icon: <svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4V3z" /></svg> },
  { key: "devo", label: "Devotionals", icon: <svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13z" /><path d="M8 7h8M8 11h5" /></svg> },
  { key: "notes", label: "Notes", icon: <svg viewBox="0 0 24 24"><path d="M5 4h11l3 3v13H5z" /><path d="M9 9h6M9 13h6M9 17h3" /></svg> },
  { key: "profile", label: "Profile", icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" /></svg> },
];

const MOBILE_NAV: { key: Screen; label: string; icon: JSX.Element }[] = [
  NAV_ITEMS[0],
  NAV_ITEMS[1],
  { key: "devo", label: "Devo", icon: NAV_ITEMS[3].icon },
  NAV_ITEMS[2],
  NAV_ITEMS[5],
];

function Mockup() {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [screen, setScreen] = useState<Screen>("home");

  const s = SCREENS[screen];
  const desktopMain = useMemo(() => s.build(false), [screen]);
  const desktopSide = useMemo(
    () => (s.side ? sideHTML() : `<h4>About this screen</h4><p style="font-size:12px;color:var(--muted);line-height:1.6;">Right rail adapts per screen — topic context on Home, filters on Explore, streak &amp; encouragement throughout.</p>`),
    [screen],
  );
  const mobileBody = useMemo(() => s.build(true), [screen]);

  useEffect(() => {
    document.body.style.background = "#eee9d9";
    return () => { document.body.style.background = ""; };
  }, []);

  return (
    <div className="cc-root">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="switcher">
        <div className="switcher-brand">
          <div className="mark">C</div>
          <div className="name">CoCreate</div>
        </div>
        <div className="screen-tabs">
          {(Object.keys(SCREENS) as Screen[]).map((k) => (
            <button key={k} className={`stab2 ${k === screen ? "active" : ""}`} onClick={() => setScreen(k)}>
              {SCREENS[k].label}
            </button>
          ))}
        </div>
        <div className="switcher-tabs">
          <button className={`stab ${device === "desktop" ? "active" : ""}`} onClick={() => setDevice("desktop")}>Desktop</button>
          <button className={`stab ${device === "mobile" ? "active" : ""}`} onClick={() => setDevice("mobile")}>Mobile</button>
        </div>
      </div>

      {device === "desktop" && (
        <div>
          <div className="d-frame">
            <div className="d-app">
              <div className="d-nav">
                <div className="d-logo"><div className="mark">C</div><div className="word">CoCreate</div></div>
                {NAV_ITEMS.map((n) => (
                  <div key={n.key} className={`d-item ${n.key === screen ? "active" : ""}`} onClick={() => setScreen(n.key)}>
                    {n.icon}{n.label}
                  </div>
                ))}
                <div className="d-nav-label">Your Topics</div>
                {[
                  ["Abiding", "var(--lime)"],
                  ["Theology of Work", "var(--amber)"],
                  ["Identity in Christ", "var(--limelight)"],
                  ["Calling", "var(--peri)"],
                  ["Prayer", "var(--teal)"],
                ].map(([t, c]) => (
                  <div key={t} className="d-topic">
                    <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <span className="dot" style={{ background: c }} />{t}
                    </span>
                  </div>
                ))}
                <div className="d-nav-foot">
                  <div className="d-avatar">Z</div>
                  <div><div className="n">Zaniyyah</div><div className="s">7-day streak 🔥</div></div>
                </div>
              </div>

              <div className="d-main" dangerouslySetInnerHTML={{ __html: desktopMain }} />
              <div className="d-side" dangerouslySetInnerHTML={{ __html: desktopSide }} />
            </div>
          </div>
          <div className="footnote">
            <h4>Photo &amp; color note</h4>
            Each thumbnail carries a single tinted pop of color keyed to its content type (amber for teaching, pink for essay, teal for podcast, lime for devotional) — one accent per image, not a wash of every color at once. Swap in real photography or video stills and the same tint overlay will carry through.
          </div>
        </div>
      )}

      {device === "mobile" && (
        <div className="m-wrap">
          <div className="m-frame-outer">
            <div className="m-frame">
              <div className="m-notch"><div className="pill2" /></div>
              <div className="m-topbar">
                <div className="word">CoCreate</div>
                <div className="bell">
                  <svg viewBox="0 0 24 24"><path d="M12 2a6 6 0 0 0-6 6v3.5c0 .8-.3 1.6-.9 2.2L4 15h16l-1.1-1.3c-.6-.6-.9-1.4-.9-2.2V8a6 6 0 0 0-6-6z" /><path d="M9 19a3 3 0 0 0 6 0" /></svg>
                </div>
              </div>
              <div className="m-body" dangerouslySetInnerHTML={{ __html: mobileBody }} />
              <div className="m-bottomnav">
                {MOBILE_NAV.map((n) => (
                  <div key={n.key} className={`m-navitem ${n.key === screen ? "active" : ""}`} onClick={() => setScreen(n.key)}>
                    {n.icon}<span>{n.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
