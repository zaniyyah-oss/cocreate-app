import { Link, useRouterState } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBell } from "@/components/NotificationBell";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { usePageContent } from "@/lib/page-content";

export type NavKey = "home" | "explore" | "devotionals" | "calendar" | "saved" | "notes" | "profile" | "library" | "messages";

const ICON = {
  home:        <svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/></svg>,
  explore:     <svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4V3z"/></svg>,
  devotionals: <svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13z"/><path d="M8 7h8M8 11h5"/></svg>,
  calendar:    <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>,
  saved:       <svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4V3z"/></svg>,
  notes:       <svg viewBox="0 0 24 24"><path d="M5 4h11l3 3v13H5z"/><path d="M9 9h6M9 13h6M9 17h3"/></svg>,
  library:     <svg viewBox="0 0 24 24"><path d="M4 4h4v16H4zM10 4h4v16h-4zM16 5l4 1-3 15-4-1z"/></svg>,
  messages:    <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  profile:     <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6"/></svg>,

};

function buildDesktopNav(labels: Record<string, string>) {
  return [
    { key: "home" as const,        label: labels.home_label        || "Home",      to: "/",            icon: ICON.home },
    { key: "devotionals" as const, label: labels.devotionals_label || "Workspace", to: "/devotionals", icon: ICON.devotionals },
    { key: "calendar" as const,    label: labels.calendar_label    || "Calendar",  to: "/calendar",    icon: ICON.calendar },
    { key: "explore" as const,    label: "Bookmarks", to: "/explore", icon: ICON.explore },
    { key: "notes" as const,       label: labels.notes_label       || "Notes",     to: "/notes",       icon: ICON.notes },
  ];
}



const SHELL_CSS = `
.app-shell, .app-shell *{box-sizing:border-box;}
.app-shell{min-height:100vh;background:#eee9d9;color:#20201c;font-family:'Poppins',sans-serif;-webkit-font-smoothing:antialiased;}
.app-layout{display:grid;grid-template-columns:1fr;min-height:100vh;}

/* Mobile top bar */
.app-topbar{background:#fff;border-bottom:1px solid rgba(20,20,20,0.08);padding:calc(12px + env(safe-area-inset-top,0px)) 18px 12px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:40;}
.app-brand{display:flex;align-items:center;gap:10px;text-decoration:none;}
.app-brand .mark{width:28px;height:28px;background:#DCE07A;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#181A4D;font-weight:900;}
.app-brand .word{font-weight:900;font-size:18px;color:#181A4D;letter-spacing:-0.02em;}
.app-topbar-actions{display:flex;align-items:center;gap:8px;}
.app-signin{background:#181A4D;color:#fff;font-weight:800;font-size:12.5px;padding:8px 16px;border-radius:20px;text-decoration:none;border:none;cursor:pointer;font-family:'Poppins';}
.app-signout{background:transparent;border:1.5px solid rgba(20,20,20,0.12);color:#20201c;font-weight:700;font-size:12px;padding:7px 13px;border-radius:16px;font-family:'Poppins';cursor:pointer;}
.app-topbar-profile{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:#FBF8ED;color:#181A4D;text-decoration:none;border:1px solid rgba(20,20,20,0.08);}
.app-topbar-profile svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}

.app-side{display:none;}
.app-main-wrap{min-width:0;display:flex;flex-direction:column;}
.app-main{flex:1;min-width:0;padding-bottom:calc(84px + env(safe-area-inset-bottom,0));}

/* Notes page is full-bleed, no card container, viewport-locked so internal panels scroll independently */
.app-shell.is-notes .app-main{padding-bottom:0;}
@media (min-width:1024px){
  .app-shell.is-notes, .app-shell.is-notes .app-layout{height:100vh;min-height:0;overflow:hidden;}
  .app-shell.is-notes .app-main-wrap{height:100vh;min-height:0;overflow:hidden;}
  .app-shell.is-notes .app-main{height:100%;min-height:0;overflow:hidden;display:flex;flex-direction:column;}
}

/* Fixed mobile bottom nav — always visible while scrolling */
.app-bottomnav{position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid rgba(20,20,20,0.08);display:flex;justify-content:space-around;padding:10px 4px calc(10px + env(safe-area-inset-bottom,0));z-index:50;box-shadow:0 -4px 16px rgba(0,0,0,0.04);transform:translateZ(0);will-change:transform;}
.app-bottomnav a{display:flex;flex-direction:column;align-items:center;gap:3px;color:#8a8678;text-decoration:none;padding:4px 8px;transition:color .15s;min-width:52px;}
.app-bottomnav a.active{color:#181A4D;}
.app-bottomnav svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}
.app-bottomnav span{font-size:9.5px;font-weight:700;letter-spacing:0.02em;}

@media (max-width:1023px){
  html, body{background:#eee9d9 !important;}
  .app-shell{background:#eee9d9;}
  .app-main{background:#eee9d9;}
  /* Workspace pages: nav sits at end of page, not fixed */
  .app-shell.is-workspace .app-bottomnav{position:static;left:auto;right:auto;bottom:auto;box-shadow:none;transform:none;}
  .app-shell.is-workspace .app-main{padding-bottom:0;}

  /* Notes page: full-bleed list + panel, nav sits at end of page */
  .app-shell.is-notes .app-bottomnav{position:static;left:auto;right:auto;bottom:auto;box-shadow:none;transform:none;}
}

@media (min-width:1024px){
  .app-layout{grid-template-columns:var(--side-w,236px) 1fr;transition:grid-template-columns .2s ease;}
  .app-side{display:flex;flex-direction:column;background:#fff;border-right:1px solid rgba(20,20,20,0.08);padding:20px 12px;position:sticky;top:0;height:100vh;overflow:hidden;}
  .app-side-head{display:flex;align-items:center;justify-content:space-between;padding:0 6px 0 8px;margin-bottom:22px;gap:6px;}
  .app-side-head-actions{display:flex;align-items:center;gap:6px;}
  .app-side-logo{display:flex;align-items:center;gap:10px;text-decoration:none;min-width:0;}
  .app-side-logo .mark{width:30px;height:30px;background:#DCE07A;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#181A4D;font-weight:900;flex-shrink:0;}
  .app-side-logo .word{font-weight:900;font-size:19px;color:#181A4D;letter-spacing:-0.02em;white-space:nowrap;overflow:hidden;}
  .app-side-toggle{background:transparent;border:none;padding:6px;border-radius:8px;cursor:pointer;color:#8a8678;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
  .app-side-profile{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:#FBF8ED;color:#181A4D;text-decoration:none;border:1px solid rgba(20,20,20,0.08);flex-shrink:0;}
  .app-side-profile.active{background:#DCE07A;border-color:transparent;}
  .app-side-profile svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}
  .app-side-toggle:hover{background:#FBF8ED;color:#181A4D;}
  .app-side-toggle svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}
  .app-side-item{display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:10px;font-size:13.5px;font-weight:600;color:#8a8678;cursor:pointer;margin-bottom:2px;text-decoration:none;transition:background .15s, color .15s;white-space:nowrap;overflow:hidden;}
  .app-side-item svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0;}
  .app-side-item:hover{background:#FBF8ED;color:#181A4D;}
  .app-side-item.active{background:#DCE07A;color:#181A4D;}
  .app-side-divider{height:1px;background:rgba(24,26,77,0.08);margin:10px 10px;}
  .app-side-label{font-size:10px;font-weight:800;color:#8a8678;text-transform:uppercase;letter-spacing:0.08em;margin:8px 14px 6px;}
  .app-shell.collapsed .app-side-label{display:none;}
  .app-side-foot{margin-top:auto;padding:12px 8px 4px;border-top:1px solid rgba(20,20,20,0.08);display:flex;align-items:center;justify-content:space-between;gap:8px;}
  .app-topbar{display:none;}
  .app-bottomnav{display:none;}
  .app-main{padding-bottom:60px;}

  /* Collapsed sidebar variant */
  .app-shell.collapsed .app-layout{grid-template-columns:68px 1fr;}
  .app-shell.collapsed .app-side{padding:20px 8px;}
  .app-shell.collapsed .app-side-head{flex-direction:column;justify-content:center;align-items:center;gap:6px;padding:0;margin-bottom:18px;}
  .app-shell.collapsed .app-side-logo{justify-content:center;}
  .app-shell.collapsed .app-side-logo .word{display:none;}
  .app-shell.collapsed .app-side-item{justify-content:center;padding:11px 0;}
  .app-shell.collapsed .app-side-item .lbl{display:none;}
  .app-side-foot-actions{display:flex;align-items:center;gap:8px;}
  .app-shell.collapsed .app-side-foot{flex-direction:column;padding:12px 0 4px;}
  .app-shell.collapsed .app-side-foot .app-side-foot-actions{flex-direction:column;}
  .app-shell.collapsed .app-side-foot .app-signout,
  .app-shell.collapsed .app-side-foot .app-signin{display:none;}

  /* Focus mode tile in the sidebar (always present to avoid layout jank) */
  .app-side-focus-btn{display:flex;align-items:center;justify-content:center;gap:8px;background:transparent;color:#0F4A42;border:none;padding:10px 12px;border-radius:10px;margin:0 4px 14px;cursor:pointer;font-family:'Poppins',sans-serif;font-weight:700;font-size:12.5px;letter-spacing:0.02em;transition:background .15s;}
  .app-side-focus-btn:hover{background:#FBF8ED;}
  .app-side-focus-btn svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0;}
  .app-shell.collapsed .app-side-focus-btn{padding:10px 0;margin:0 0 14px;}
  .app-shell.collapsed .app-side-focus-btn .lbl{display:none;}

  /* Focus mode (desktop): sidebar becomes a hidden overlay, revealed on hover of left edge */
  .app-shell.is-focus .app-layout{grid-template-columns:1fr;}
  .app-shell.is-focus .app-side{
    position:fixed;top:0;left:0;height:100vh;width:236px;z-index:60;
    transform:translateX(-100%);transition:transform .2s ease;
    box-shadow:0 12px 40px rgba(0,0,0,0.12);
  }
  .app-shell.is-focus.collapsed .app-side{width:68px;}
  .app-shell.is-focus.side-revealed .app-side{transform:translateX(0);}
}

/* Focus mode: hide chrome so the page fills the screen */
.app-shell.is-focus .app-topbar{display:none;}
.app-shell.is-focus .app-bottomnav{display:none;}
.app-shell.is-focus .app-main{padding-bottom:0;}

/* Hover trigger strip on the far left in focus mode (desktop only, hover-capable) */
.app-focus-hover-zone{display:none;}
@media (min-width:1024px) and (hover:hover){
  .app-shell.is-focus .app-focus-hover-zone{
    display:block;position:fixed;top:0;left:0;width:14px;height:100vh;z-index:59;
  }
}

/* Floating exit-focus pill — always visible when in focus mode so touch users can leave */
.app-focus-exit{
  position:fixed;top:calc(12px + env(safe-area-inset-top,0));left:12px;z-index:70;
  display:none;align-items:center;gap:6px;background:#181A4D;color:#fff;
  border:none;border-radius:999px;padding:8px 12px;font-family:'Poppins',sans-serif;
  font-weight:700;font-size:12px;letter-spacing:0.02em;cursor:pointer;
  box-shadow:0 6px 18px rgba(0,0,0,0.18);
}
.app-focus-exit svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;}
.app-shell.is-focus .app-focus-exit{display:inline-flex;}
@media (min-width:1024px) and (hover:hover){
  .app-shell.is-focus.side-revealed .app-focus-exit{opacity:0;pointer-events:none;transition:opacity .15s;}
}
`;

const STORAGE_KEY = "cocreate:sidebar-collapsed";
const FOCUS_KEY = "cocreate:workspace-focus";

export function AppShell({ current, children }: { current?: NavKey; children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  });
  const [focusMode, setFocusMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(FOCUS_KEY) === "1";
  });
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navLabelsQ = usePageContent("site_nav");
  const desktopNav = useMemo(() => buildDesktopNav(navLabelsQ.data ?? {}), [navLabelsQ.data]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);


  useEffect(() => {
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    document.body.style.background = "#eee9d9";
    document.documentElement.style.background = isDesktop ? "#eee9d9" : "#fff";
    return () => {
      document.body.style.background = "";
      document.documentElement.style.background = "";
    };
  }, [pathname]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    }
  }, [collapsed]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(FOCUS_KEY, focusMode ? "1" : "0");
    }
  }, [focusMode]);

  const signOut = async () => { await supabase.auth.signOut(); };

  const isActive = (item: { key: NavKey; to: string; matchPaths?: string[] }) => {
    if (current) return item.key === current || (item.key === "library" && (current === "saved" || current === "notes"));
    if (item.matchPaths?.some((p) => pathname === p || pathname.startsWith(p + "/"))) return true;
    if (item.to === "/") return pathname === "/";
    return pathname === item.to || pathname.startsWith(item.to + "/");
  };

  const isWorkspace = pathname === "/devotionals" || pathname.startsWith("/devotionals/");
  const isNotes = pathname === "/notes";
  const focusActive = isWorkspace && focusMode;

  return (
    <div className={`app-shell${collapsed ? " collapsed" : ""}${isWorkspace ? " is-workspace" : ""}${isNotes ? " is-notes" : ""}${focusActive ? " is-focus" : ""}`}>
      <style dangerouslySetInnerHTML={{ __html: SHELL_CSS }} />
      <div className="app-layout">
        {/* Desktop sidebar */}
        <aside className="app-side" aria-label="Primary">
          <div className="app-side-head">
            <Link to="/" className="app-side-logo">
              <div className="mark">C</div><div className="word">CoCreate</div>
            </Link>
            <div className="app-side-head-actions">
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
          </div>
          <button
            type="button"
            className="app-side-focus-btn"
            onClick={() => setFocusMode(true)}
            title="Enter focus mode"
            aria-label="Enter focus mode"
          >
            <svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>
            <span className="lbl">Focus mode</span>
          </button>

          {desktopNav.map((n) => {
            const item = (
              <Link
                key={n.key}
                to={n.to}
                className={`app-side-item${isActive(n) ? " active" : ""}`}
                title={collapsed ? n.label : undefined}
              >
                {n.icon}<span className="lbl">{n.label}</span>
              </Link>
            );
            if (n.key === "explore") {
              return (
                <Fragment key={n.key}>
                  <div className="app-side-divider" />
                  <div className="app-side-label">Your reference</div>
                  {item}
                </Fragment>
              );
            }
            return item;
          })}
          <div className="app-side-foot">
            {userId ? (
              <>
                <div className="app-side-foot-actions">
                  <Link
                    to="/profile"
                    className={`app-side-profile${pathname.startsWith("/profile") ? " active" : ""}`}
                    aria-label="Profile"
                    title="Profile"
                  >
                    {ICON.profile}
                  </Link>
                  <NotificationBell />
                </div>
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
            <div className="app-topbar-brand-wrap">
              {focusActive && (
                <button
                  type="button"
                  className="app-topbar-menu"
                  onClick={() => setFocusMode(false)}
                  aria-label="Exit focus mode"
                  title="Exit focus mode"
                >
                  <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
                </button>
              )}
              <Link to="/" className="app-brand">
                <div className="mark">C</div><div className="word">CoCreate</div>
              </Link>
            </div>
            <div className="app-topbar-actions">
              {userId ? (
                <>
                  <Link to="/profile" className="app-topbar-profile" aria-label="Profile">
                    {ICON.profile}
                  </Link>
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

      <MobileBottomNav />
    </div>
  );
}

