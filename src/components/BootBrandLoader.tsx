/**
 * Pre-hydration boot loader.
 *
 * The React loader can only appear after hydration, which is why the SSR'd
 * Home page flashed for a beat on a cold mobile launch. This inline script is
 * parsed before the page body, so the limelight lockup is the very first thing
 * painted. Once the React loader takes over (or if it decides not to show) the
 * boot overlay removes itself.
 */
const BOOT_SCRIPT = `(function(){
  try{
    if (location.pathname !== "/") return;
    if (window.innerWidth > 1023) return;
    var cold = !sessionStorage.getItem("cocreate:home_redirect_done");
    var d = new Date();
    var today = d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate();
    var newDay = localStorage.getItem("cocreate:last_active_day") !== today;
    if (!cold && !newDay) return;
    var css = document.createElement("style");
    css.textContent = "#cc-boot-loader{position:fixed;inset:0;z-index:10000;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#DCE07A;font-family:'Poppins',ui-sans-serif,system-ui,sans-serif}"
      + "#cc-boot-loader .b-sp{width:64px;height:64px;margin-bottom:18px}"
      + "#cc-boot-loader circle.t{fill:none;stroke:rgba(24,26,77,.15);stroke-width:3}"
      + "#cc-boot-loader circle.c{fill:none;stroke:#181A4D;stroke-width:3;stroke-linecap:round;stroke-dasharray:170;stroke-dashoffset:170;animation:cc-boot-draw 1.3s ease-in-out infinite}"
      + "@keyframes cc-boot-draw{0%{stroke-dashoffset:170}50%{stroke-dashoffset:0}100%{stroke-dashoffset:-170}}"
      + "#cc-boot-loader .b-lk{display:flex;align-items:center;justify-content:center}"
      + "#cc-boot-loader .b-bg{width:56px;height:56px;border-radius:16px;background:#181A4D;display:flex;align-items:center;justify-content:center;margin-right:12px}"
      + "#cc-boot-loader .b-bg span{font-weight:900;font-size:29px;color:#FBF8ED;line-height:1}"
      + "#cc-boot-loader .b-wd{font-weight:900;font-size:23px;color:#181A4D;letter-spacing:-.01em}"
      + "#cc-boot-loader .b-tg{margin-top:14px;font-size:11px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:rgba(24,26,77,.5);text-align:center;line-height:1.6;max-width:170px}";
    document.head.appendChild(css);
    var el = document.createElement("div");
    el.id = "cc-boot-loader";
    el.setAttribute("role","status");
    el.setAttribute("aria-label","Loading your workspace");
    el.innerHTML = '<div class="b-sp"><svg viewBox="0 0 64 64" aria-hidden="true"><circle class="t" cx="32" cy="32" r="27"></circle><circle class="c" cx="32" cy="32" r="27" transform="rotate(-90 32 32)"></circle></svg></div>'
      + '<div class="b-lk"><div class="b-bg"><span>C</span></div><div class="b-wd">CoCreate</div></div>'
      + '<div class="b-tg">Daily Devotional<br/>Workspace</div>';
    (document.body || document.documentElement).appendChild(el);
    window.__ccBootLoader = true;
    // Safety net: never trap the user if hydration never happens.
    setTimeout(function(){
      if (window.__ccBootLoader && el.parentNode) { el.parentNode.removeChild(el); window.__ccBootLoader = false; }
    }, 12000);
  }catch(e){}
})();`;

export function removeBootLoader() {
  if (typeof document === "undefined") return;
  const el = document.getElementById("cc-boot-loader");
  if (el?.parentNode) el.parentNode.removeChild(el);
  (window as unknown as { __ccBootLoader?: boolean }).__ccBootLoader = false;
}

export default function BootBrandLoader() {
  return <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />;
}
