/** Styles for the public content home page. Colors come only from the fixed
 *  `.content-site` token set in styles.css, so app skins can never reach it. */
export const HOME_CSS = `
.ch{min-height:400px;box-sizing:border-box;}
.ch a{text-decoration:none;}
.ch .wrap{max-width:1240px;margin:0 auto;padding-left:32px;padding-right:32px;box-sizing:border-box;}
.ch .row{display:flex;align-items:center;}
.ch .ico{display:inline-block;flex:none;}
.ch .ph{opacity:.55;}
.ch-head{border-bottom:1px solid var(--cs-line);}
.ch-head .bar{display:flex;align-items:center;gap:40px;min-height:76px;}
.ch-logo{display:flex;align-items:center;gap:9px;min-height:44px;}
.ch-logo .tile{width:28px;height:28px;border-radius:7px;background:var(--cs-lime);color:var(--cs-ink);display:flex;align-items:center;justify-content:center;font-family:var(--cs-font-head);font-weight:900;font-size:16px;}
.ch-logo .word{font-family:var(--cs-font-head);font-size:19px;font-weight:900;letter-spacing:-0.02em;color:var(--cs-ink);}
.ch-nav{display:flex;gap:30px;flex-grow:1;}
.ch-nav a{display:inline-flex;align-items:center;min-height:44px;font-size:15px;font-weight:500;color:var(--cs-ink);white-space:nowrap;}
.ch-actions{display:flex;align-items:center;gap:16px;position:relative;}
.ch-iconbtn{width:44px;height:44px;border:0;background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--cs-ink);}
.ch-signin{display:inline-flex;align-items:center;min-height:44px;font-size:14.5px;font-weight:500;color:var(--cs-ink);}
.ch-sub{display:inline-flex;align-items:center;min-height:40px;padding:0 18px;border-radius:999px;background:var(--cs-ink);color:#FFF;font-size:14px;font-weight:600;}
.ch-menu{display:none;}
.ch-menu-panel{position:absolute;right:0;top:48px;z-index:30;min-width:200px;background:var(--cs-bg);border:1px solid var(--cs-line);border-radius:12px;padding:8px;display:flex;flex-direction:column;}
.ch-menu-panel a{display:flex;align-items:center;min-height:44px;padding:0 12px;font-size:15px;font-weight:500;color:var(--cs-ink);border-radius:8px;}
.ch-menu-panel a:hover{background:var(--cs-panel);}
.ch-nav2{display:none;}
.ch-info{border-bottom:1px solid var(--cs-line);}
.ch-info .wrap{display:flex;justify-content:space-between;gap:12px;min-height:44px;align-items:center;font-size:13px;color:var(--cs-muted);}
.ch-info .series{display:inline-flex;align-items:center;gap:6px;min-height:44px;color:var(--cs-ink);font-weight:600;}
.cs-photo{position:relative;width:100%;overflow:hidden;background:var(--cs-photo-empty);}
.cs-photo img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:var(--fd,center);}
.ch-hero{position:relative;overflow:hidden;border-radius:6px;min-height:600px;background:var(--cs-photo-empty);}
.ch-hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:var(--fd,center);}
.ch-hero .shade{position:absolute;inset:0;background:rgba(10,14,36,0.34);}
.ch-hero .txt{position:absolute;left:0;right:0;bottom:0;padding:56px;display:flex;flex-direction:column;gap:16px;max-width:720px;}
.ch-pill{align-self:flex-start;padding:6px 12px;border-radius:999px;background:rgba(255,255,255,0.16);border:1px solid rgba(255,255,255,0.5);font-size:11.5px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#FFF;}
.ch-hero h1{margin:0;font-family:var(--cs-font-head);font-size:72px;font-weight:700;line-height:1.02;letter-spacing:-0.03em;color:#FFF;}
.ch-hero p{margin:0;font-family:var(--cs-font-head);font-size:19px;font-weight:300;line-height:1.5;color:#FFF;}
.ch-hero.empty h1,.ch-hero.empty p{color:var(--cs-ink);}
.ch-btns{display:flex;flex-wrap:wrap;gap:12px;margin-top:6px;}
.ch-btn-w{display:inline-flex;align-items:center;gap:8px;min-height:48px;padding:0 22px;border-radius:999px;background:#FFF;color:var(--cs-ink);font-size:15px;font-weight:600;border:0;cursor:pointer;font-family:inherit;}
.ch-btn-o{display:inline-flex;align-items:center;gap:8px;min-height:48px;padding:0 20px;border-radius:999px;border:1.5px solid rgba(255,255,255,0.85);background:transparent;color:#FFF;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;}
.ch-h2row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:24px;}
.ch-h2{margin:0;display:flex;align-items:center;gap:10px;font-family:var(--cs-font-head);font-size:22px;font-weight:600;letter-spacing:-0.01em;color:var(--cs-ink);}
.ch-dot{width:8px;height:8px;border-radius:99px;display:inline-block;flex:none;}
.ch-more{display:inline-flex;align-items:center;gap:6px;min-height:36px;font-size:13.5px;font-weight:600;color:var(--cs-ink);}
.ch-kick{display:inline-flex;align-items:center;gap:8px;font-size:11.5px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--cs-muted);}
.ch-kick.w{letter-spacing:0.14em;}
.ch-cta{display:inline-flex;align-items:center;gap:6px;min-height:36px;font-size:14px;font-weight:600;color:var(--cs-green);background:none;border:0;padding:0;cursor:pointer;font-family:inherit;}
.ch-card{flex:0 1 calc((100% - 48px) / 3);min-width:200px!important;min-width:0;display:flex;flex-direction:column;gap:12px;}
.ch-card h3{margin:0;font-family:var(--cs-font-head);font-size:19px;font-weight:600;line-height:1.3;color:var(--cs-ink);}
.ch-card h3 a{color:inherit;}
.ch-sched{list-style:none;margin:0;padding:0;border-top:1px solid var(--cs-line);}
.ch-sched li{display:flex;gap:16px;padding:16px 0;border-bottom:1px solid var(--cs-line);}
.ch-sched .d{flex:0 0 56px;font-size:13.5px;font-weight:600;}
.ch-sched .k{font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--cs-muted);}
.ch-sched a{font-family:var(--cs-font-head);font-size:15.5px;font-weight:500;line-height:1.35;color:var(--cs-ink);}
.ch-next{margin-top:24px;padding:20px 22px;border:1px solid var(--cs-line);border-radius:12px;display:flex;flex-direction:column;gap:6px;}
.ch-next .t{font-family:var(--cs-font-head);font-size:18px;font-weight:600;line-height:1.3;color:var(--cs-ink);}
.ch-overcard{position:relative;display:block;border-radius:6px;overflow:hidden;background:var(--cs-photo-empty);}
.ch-overcard img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:var(--fd,center);}
.ch-overcard .shade{position:absolute;inset:0;background:var(--cs-overlay);}
.ch-overcard .txt{position:absolute;left:0;right:0;bottom:0;padding:22px;display:flex;flex-direction:column;gap:8px;}
.ch-overcard .k{font-size:11.5px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#FFF;}
.ch-overcard .t{font-family:var(--cs-font-head);font-size:22px;font-weight:600;line-height:1.2;color:#FFF;}
.ch-overcard .c{display:inline-flex;align-items:center;gap:6px;font-size:14px;font-weight:600;color:#FFF;}
.ch-overcard.big .t{font-size:30px;}
.ch-overcard.empty .shade{display:none;}
.ch-overcard.empty .k,.ch-overcard.empty .t,.ch-overcard.empty .c{color:var(--cs-ink);}
.ch-wrow{display:flex;gap:16px;align-items:center;padding:14px 0;border-bottom:1px solid var(--cs-line);}
.ch-wthumb{position:relative;flex:0 0 150px;aspect-ratio:16/10;border-radius:4px;overflow:hidden;background:var(--cs-photo-empty);}
.ch-wthumb img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:var(--fd,center);}
.ch-wthumb .play{position:absolute;left:8px;bottom:8px;width:28px;height:28px;border-radius:99px;background:#FFF;display:flex;align-items:center;justify-content:center;}
.ch-wrow .t{font-family:var(--cs-font-head);font-size:16px;font-weight:600;line-height:1.3;color:var(--cs-ink);}
.ch-col .lead{display:block;font-family:var(--cs-font-head);font-size:20px;font-weight:600;line-height:1.3;color:var(--cs-ink);}
.ch-col ul{list-style:none;margin:16px 0 0;padding:0;}
.ch-col li{padding:14px 0;border-top:1px solid var(--cs-line);}
.ch-col li a{font-family:var(--cs-font-head);font-size:15.5px;font-weight:400;line-height:1.4;color:var(--cs-ink);}
.ch-nl h2{margin:0;font-family:var(--cs-font-head);font-weight:300;font-size:44px;line-height:1.1;letter-spacing:-0.02em;color:var(--cs-ink);}
.ch-nl input{margin-top:-8px;min-height:44px;border:0;border-bottom:1.5px solid var(--cs-ink);background:transparent;outline:none;padding:0;font-family:var(--cs-font-sans);font-size:16px;color:var(--cs-ink);}
.ch-nl button{align-self:flex-start;min-height:46px;padding:0 28px;margin-top:6px;border:0;border-radius:999px;background:var(--cs-green);color:#FFF;font-family:var(--cs-font-sans);font-size:14px;font-weight:600;cursor:pointer;}
.ch-pick{flex:1 1 260px;min-width:0;display:flex;flex-direction:column;gap:8px;padding:22px 24px;border:1px solid var(--cs-line);border-radius:12px;background:var(--cs-bg);}
.ch-pick .t{font-family:var(--cs-font-head);font-size:19px;font-weight:600;line-height:1.3;color:var(--cs-ink);}
.ch-pick .s{font-size:14px;color:var(--cs-muted);}
.ch-foot{margin-top:96px;padding-top:40px;padding-bottom:56px;border-top:1px solid var(--cs-line);display:flex;flex-wrap:wrap;gap:24px;align-items:center;justify-content:space-between;}
.ch-foot nav{display:flex;flex-wrap:wrap;gap:22px;}
.ch-foot nav a{font-size:13.5px;color:var(--cs-ink);}
@media (max-width:767px){
  .ch .wrap{padding-left:16px;padding-right:16px;}
  .ch-head .bar{gap:8px;min-height:60px;}
  .ch-head .bar .ch-nav{display:none;}
  .ch-actions{gap:4px;margin-left:auto;}
  .ch-signin{display:none;}
  .ch-sub{min-height:36px;padding:0 14px;font-size:13px;margin-right:4px;}
  .ch-menu{display:flex;}
  .ch-nav2{display:flex;gap:22px;overflow-x:auto;padding:0 16px;scrollbar-width:none;border-top:1px solid var(--cs-line);}
  .ch-nav2::-webkit-scrollbar{display:none;}
  .ch-nav2 a{display:inline-flex;align-items:center;min-height:44px;font-size:14.5px;font-weight:500;color:var(--cs-ink);white-space:nowrap;}
  .ch-info .series{display:none;}
  .ch-hero{min-height:0;aspect-ratio:4/5;}
  .ch-hero img,.cs-photo img,.ch-overcard img,.ch-wthumb img{object-position:var(--fm,var(--fd,center));}
  .ch-hero .txt{padding:22px;gap:12px;}
  .ch-hero h1{font-size:40px;}
  .ch-hero p{font-size:16px;}
  .ch-sec{padding-top:56px!important;}
  .ch-hero-sec{padding-top:16px!important;}
  .ch-big-h2{font-size:30px!important;}
  .ch-nl h2{font-size:34px;}
  .ch-foot{margin-top:64px;}
  .ch-card,.ch-overcard{flex:1 1 100%!important;min-width:0!important;}
}
`;
