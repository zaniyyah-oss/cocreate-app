import { useEffect, useState } from "react";

const CSS = `
.clsx-load{
  position:fixed; inset:0; z-index:9999;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  background:#DCE07A;
  font-family:'Poppins',ui-sans-serif,system-ui,sans-serif;
  transition:opacity .45s ease, transform .45s ease;
  opacity:1; transform:scale(1);
}
.clsx-load.is-out{ opacity:0; transform:scale(1.03); pointer-events:none; }
.clsx-spinner{ width:64px; height:64px; margin-bottom:18px; }
.clsx-spinner svg{ width:100%; height:100%; }
.clsx-track{ fill:none; stroke:rgba(24,26,77,.15); stroke-width:3; }
.clsx-circle{
  fill:none; stroke:#181A4D; stroke-width:3; stroke-linecap:round;
  stroke-dasharray:170; stroke-dashoffset:170;
  animation: clsx-draw 1.3s ease-in-out infinite;
}
@keyframes clsx-draw{
  0%{ stroke-dashoffset:170; }
  50%{ stroke-dashoffset:0; }
  100%{ stroke-dashoffset:-170; }
}
.clsx-lockup{ display:flex; align-items:center; justify-content:center; }
.clsx-badge{
  width:56px; height:56px; border-radius:16px; background:#181A4D;
  display:flex; align-items:center; justify-content:center; margin-right:12px;
}
.clsx-badge span{ font-weight:900; font-size:29px; color:#FBF8ED; line-height:1; }
.clsx-word{ font-weight:900; font-size:23px; color:#181A4D; letter-spacing:-.01em; }
.clsx-tag{
  margin-top:14px; font-size:11px; font-weight:500; letter-spacing:.06em;
  text-transform:uppercase; color:rgba(24,26,77,.5); text-align:center;
  line-height:1.6; max-width:170px;
}
@media (prefers-reduced-motion: reduce){
  .clsx-circle{ animation-duration:2.6s; }
}
`;

export default function BrandLoadingScreen({ leaving = false }: { leaving?: boolean }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <div className={`clsx-load${leaving ? " is-out" : ""}`} role="status" aria-live="polite" aria-label="Loading your workspace" data-mounted={mounted}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="clsx-spinner">
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <circle className="clsx-track" cx="32" cy="32" r="27" />
          <circle className="clsx-circle" cx="32" cy="32" r="27" transform="rotate(-90 32 32)" />
        </svg>
      </div>
      <div className="clsx-lockup">
        <div className="clsx-badge"><span>C</span></div>
        <div className="clsx-word">CoCreate</div>
      </div>
      <div className="clsx-tag">Daily Devotional<br />Workspace</div>
    </div>
  );
}
