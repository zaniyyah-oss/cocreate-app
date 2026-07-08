import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBell } from "@/components/NotificationBell";

export type NavKey = "home" | "explore" | "devotionals" | "saved" | "notes" | "profile" | "library";

const ICON = {
  home:        <svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/></svg>,
  explore:     <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>,
  devotionals: <svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13z"/><path d="M8 7h8M8 11h5"/></svg>,
  saved:       <svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4V3z"/></svg>,
  notes:       <svg viewBox="0 0 24 24"><path d="M5 4h11l3 3v13H5z"/><path d="M9 9h6M9 13h6M9 17h3"/></svg>,
  library:     <svg viewBox="0 0 24 24"><path d="M4 4h4v16H4zM10 4h4v16h-4zM16 5l4 1-3 15-4-1z"/></svg>,
  profile:     <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6"/></svg>,
};

// Desktop sidebar: Saved and Notes now fold into a single "Library" item.
const DESKTOP_NAV: { key: NavKey; label: string; to: string; icon: ReactNode; matchPaths?: string[] }[] = [
  { key: "home",        label: "Home",        to: "/",            icon: ICON.home },
  { key: "explore",     label: "Explore",     to: "/explore",     icon: ICON.explore },
  { key: "devotionals", label: "Workspace", to: "/devotionals", icon: ICON.devotionals },
  { key: "library",     label: "Library",     to: "/saved",       icon: ICON.library, matchPaths: ["/saved", "/notes"] },
  { key: "profile",     label: "Profile",     to: "/profile",     icon: ICON.profile },
];


// Mobile bottom nav: Saved + Notes fold into "Library" to keep bar uncluttered.
const MOBILE_NAV: { key: NavKey; label: string; to: string; icon: ReactNode; matchPaths?: string[] }[] = [
  { key: "home",        label: "Home",        to: "/",            icon: ICON.home },
  { key: "explore",     label: "Explore",     to: "/explore",     icon: ICON.explore },
  { key: "devotionals", label: "Workspace", to: "/devotionals", icon: ICON.devotionals },
  { key: "library",     label: "Library",     to: "/saved",       icon: ICON.library, matchPaths: ["/saved", "/notes"] },
  { key: "profile",     label: "Profile",     to: "/profile",     icon: ICON.profile },
];

const SHELL_CSS = `
.app-shell, .app-shell *{box-sizing:border-box;}
.app-shell{min-height:100vh;background:#eee9d9;color:#20201c;font-family:'Poppins',sans-serif;-webkit-font-smoothing:antialiased;}
.app-layout{display:grid;grid-template-columns:1fr;min-height:100vh;}

/* Mobile top bar */
.app-topbar{background:#fff;border-bottom:1px solid rgba(20,20,20,0.08);padding:12px 18px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:40;}
.app-brand{display:flex;align-items:center;gap:10px;text-decoration:none;}
.app-brand .mark{width:28px;height:28px;background:#DCE07A;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#181A4D;font-weight:900;}
.app-brand .word{font-weight:900;font-size:18px;color:#181A4D;letter-spacing:-0.02em;}
.app-topbar-actions{display:flex;align-items:center;gap:8px;}
.app-signin{background:#181A4D;color:#fff;font-weight:800;font-size:12.5px;padding:8px 16px;border-radius:20px;text-decoration:none;border:none;cursor:pointer;font-family:'Poppins';}
.app-signout{background:transparent;border:1.5px solid rgba(20,20,20,0.12);color:#20201c;font-weight:700;font-size:12px;padding:7px 13px;border-radius:16px;font-family:'Poppins';cursor:pointer;}

.app-side{display:none;}
.app-main-wrap{min-width:0;display:flex;flex-direction:column;}
.app-main{flex:1;min-width:0;padding-bottom:calc(84px + env(safe-area-inset-bottom,0));}

/* Fixed mobile bottom nav — always visible while scrolling */
.app-bottomnav{position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid rgba(20,20,20,0.08);display:flex;justify-content:space-around;padding:10px 4px calc(10px + env(safe-area-inset-bottom,0));z-index:50;box-shadow:0 -4px 16px rgba(0,0,0,0.04);transform:translateZ(0);will-change:transform;}
.app-bottomnav a{display:flex;flex-direction:column;align-items:center;gap:3px;color:#8a8678;text-decoration:none;padding:4px 8px;transition:color .15s;min-width:52px;}
.app-bottomnav a.active{color:#181A4D;}
.app-bottomnav svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}
.app-bottomnav span{font-size:9.5px;font-weight:700;letter-spacing:0.02em;}

@media (max-width:1023px){
  html, body{background:#fff !important;}
  .app-shell{background:#fff;}
  .app-main{background:#fff;}
  /* Workspace pages: nav sits at end of page, not fixed */
  .app-shell.is-workspace .app-bottomnav{position:static;left:auto;right:auto;bottom:auto;box-shadow:none;transform:none;}
  .app-shell.is-workspace .app-main{padding-bottom:0;}
}

@media (min-width:1024px){
  .app-layout{grid-template-columns:var(--side-w,236px) 1fr;transition:grid-template-columns .2s ease;}
  .app-side{display:flex;flex-direction:column;background:#fff;border-right:1px solid rgba(20,20,20,0.08);padding:20px 12px;position:sticky;top:0;height:100vh;overflow:hidden;}
  .app-side-head{display:flex;align-items:center;justify-content:space-between;padding:0 6px 0 8px;margin-bottom:22px;gap:6px;}
  .app-side-logo{display:flex;align-items:center;gap:10px;text-decoration:none;min-width:0;}
  .app-side-logo .mark{width:30px;height:30px;background:#DCE07A;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#181A4D;font-weight:900;flex-shrink:0;}
  .app-side-logo .word{font-weight:900;font-size:19px;color:#181A4D;letter-spacing:-0.02em;white-space:nowrap;overflow:hidden;}
  .app-side-toggle{background:transparent;border:none;padding:6px;border-radius:8px;cursor:pointer;color:#8a8678;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
  .app-side-toggle:hover{background:#FBF8ED;color:#181A4D;}
  .app-side-toggle svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}
  .app-side-item{display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:10px;font-size:13.5px;font-weight:600;color:#8a8678;cursor:pointer;margin-bottom:2px;text-decoration:none;transition:background .15s, color .15s;white-space:nowrap;overflow:hidden;}
  .app-side-item svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0;}
  .app-side-item:hover{background:#FBF8ED;color:#181A4D;}
  .app-side-item.active{background:#DCE07A;color:#181A4D;}
  .app-side-foot{margin-top:auto;padding:12px 8px 4px;border-top:1px solid rgba(20,20,20,0.08);display:flex;align-items:center;justify-content:space-between;gap:8px;}
  .app-topbar{display:none;}
  .app-bottomnav{display:none;}
  .app-main{padding-bottom:60px;}

  /* Collapsed sidebar variant */
  .app-shell.collapsed .app-layout{grid-template-columns:68px 1fr;}
  .app-shell.collapsed .app-side{padding:20px 8px;}
  .app-shell.collapsed .app-side-head{justify-content:center;padding:0;}
  .app-shell.collapsed .app-side-logo .word{display:none;}
  .app-shell.collapsed .app-side-item{justify-content:center;padding:11px 0;}
  .app-shell.collapsed .app-side-item .lbl{display:none;}
  .app-shell.collapsed .app-side-foot{flex-direction:column;padding:12px 0 4px;}
  .app-shell.collapsed .app-side-foot .app-signout,
  .app-shell.collapsed .app-side-foot .app-signin{display:none;}
}
`;

const STORAGE_KEY = "cocreate:sidebar-collapsed";

export function AppShell({ current, children }: { current?: NavKey; children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  });
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    document.body.style.background = "#eee9d9";
    return () => { document.body.style.background = ""; };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    }
  }, [collapsed]);

  const signOut = async () => { await supabase.auth.signOut(); };

  const isActive = (item: { key: NavKey; to: string; matchPaths?: string[] }) => {
    if (current) return item.key === current || (item.key === "library" && (current === "saved" || current === "notes"));
    if (item.matchPaths?.some((p) => pathname === p || pathname.startsWith(p + "/"))) return true;
    if (item.to === "/") return pathname === "/";
    return pathname === item.to || pathname.startsWith(item.to + "/");
  };

  return (
    <div className={`app-shell${collapsed ? " collapsed" : ""}`}>
      <style dangerouslySetInnerHTML={{ __html: SHELL_CSS }} />
      <div className="app-layout">
        {/* Desktop sidebar */}
        <aside className="app-side" aria-label="Primary">
          <div className="app-side-head">
            <Link to="/" className="app-side-logo">
              <div className="mark">C</div><div className="word">CoCreate</div>
            </Link>
            <button
              className="app-side-toggle"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>
              ) : (
                <svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>
              )}
            </button>
          </div>
          {DESKTOP_NAV.map((n) => (
            <Link
              key={n.key}
              to={n.to}
              className={`app-side-item${isActive(n) ? " active" : ""}`}
              title={collapsed ? n.label : undefined}
            >
              {n.icon}<span className="lbl">{n.label}</span>
            </Link>
          ))}
          <div className="app-side-foot">
            {userId ? (
              <>
                <NotificationBell />
                <button className="app-signout" onClick={signOut}>Sign out</button>
              </>
            ) : (
              <Link to="/auth" className="app-signin">Sign in</Link>
            )}
          </div>
        </aside>

        {/* Main column */}
        <div className="app-main-wrap">
          <header className="app-topbar">
            <Link to="/" className="app-brand">
              <div className="mark">C</div><div className="word">CoCreate</div>
            </Link>
            <div className="app-topbar-actions">
              {userId ? (
                <>
                  <NotificationBell />
                  <button className="app-signout" onClick={signOut}>Sign out</button>
                </>
              ) : (
                <Link to="/auth" className="app-signin">Sign in</Link>
              )}
            </div>
          </header>
          <main className="app-main">{children}</main>
        </div>
      </div>

      {/* Fixed mobile bottom nav */}
      <nav className="app-bottomnav" aria-label="Primary mobile">
        {MOBILE_NAV.map((n) => (
          <Link key={n.key} to={n.to} className={isActive(n) ? "active" : ""}>
            {n.icon}<span>{n.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
