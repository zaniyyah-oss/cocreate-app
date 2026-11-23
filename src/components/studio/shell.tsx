import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import { LayoutGrid, Layers, FileText, Film, Home, MessageSquare, Users, Plus, ExternalLink, ArrowLeft } from "lucide-react";
import { useAdminGate } from "@/components/admin/shell";
import { STUDIO_CSS, C } from "./ui";
import { NewPieceMenu } from "./NewPiece";

const NAV = [
  { to: "/studio", label: "Releases", icon: LayoutGrid, exact: true },
  { to: "/studio/series", label: "Series", icon: Layers },
  { to: "/studio/pieces", label: "All pieces", icon: FileText },
  { to: "/studio/clips", label: "Clips & media", icon: Film },
  { to: "/studio/homepage", label: "Homepage layout", icon: Home },
  { to: "/studio/comments", label: "Comments", icon: MessageSquare, badge: 0 },
  { to: "/studio/team", label: "Team", icon: Users },
] as const;

function Gate({ children }: { children: ReactNode }) {
  const { ready, userId, isAdmin } = useAdminGate();
  const box = (title: string, body: string, link: ReactNode) => (
    <div className="st-root" style={{ alignItems: "center", justifyContent: "center", background: C.SBG }}>
      <style dangerouslySetInnerHTML={{ __html: STUDIO_CSS }} />
      <div style={{ maxWidth: 440, background: "#fff", border: `1px solid ${C.LINE}`, borderRadius: 14, padding: 28, display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
        <b style={{ fontFamily: "Poppins", fontSize: 18 }}>{title}</b>
        <span style={{ color: C.MUTED, fontSize: 14, lineHeight: 1.5 }}>{body}</span>
        {link}
      </div>
    </div>
  );
  if (!ready) return box("CoCreate Studio", "Checking access…", null);
  if (!userId) return box("Sign in to Studio", "Studio is for the CoCreate team. Sign in with your team account.", <Link to="/auth" className="st-btn primary">Sign in</Link>);
  if (!isAdmin) return box("No Studio access", "Your account isn't on the Studio team. Ask an admin to add you.", <Link to="/devotionals" className="st-btn">Back to my workspace</Link>);
  return <>{children}</>;
}

export function StudioGate({ children }: { children: ReactNode }) {
  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = "#fff";
    return () => { document.body.style.background = prev; };
  }, []);
  return <Gate>{children}<Toaster position="bottom-center" /></Gate>;
}

export function StudioLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [newOpen, setNewOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!newOpen) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setNewOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [newOpen]);
  const active = (to: string, exact?: boolean) => exact ? pathname === to || pathname === to + "/" : pathname === to || pathname.startsWith(to + "/");
  return (
    <StudioGate>
      <div className="st-root">
        <style dangerouslySetInnerHTML={{ __html: STUDIO_CSS }} />
        <aside className="st-side">
          <div className="st-brand"><b>CoCreate</b><span>Studio</span></div>
          <div ref={ref} style={{ position: "relative" }}>
            <button type="button" className="st-newbtn" onClick={() => setNewOpen((o) => !o)} aria-expanded={newOpen}><Plus size={16} strokeWidth={1.7} />New piece</button>
            {newOpen && <NewPieceMenu onDone={() => setNewOpen(false)} style={{ top: 46, left: 0 }} />}
          </div>
          <nav className="st-nav" aria-label="Studio">
            {NAV.map((n) => {
              const Icon = n.icon;
              return (
                <Link key={n.to} to={n.to} className={active(n.to, "exact" in n) ? "active" : ""}>
                  <Icon size={18} strokeWidth={1.7} />{n.label}
                  {"badge" in n && n.badge > 0 ? <span className="st-badge">{n.badge}</span> : null}
                </Link>
              );
            })}
          </nav>
          <div className="st-foot">
            <a href="/?feed=1" target="_blank" rel="noopener" style={{ fontWeight: 600, color: C.INK }}><ExternalLink size={15} strokeWidth={1.7} />View live site</a>
            <Link to="/devotionals" style={{ color: C.MUTED }}><ArrowLeft size={15} strokeWidth={1.7} />Back to my workspace</Link>
          </div>
        </aside>
        <div className="st-main"><Outlet /></div>
        <div className="st-phone">
          <b style={{ fontFamily: "Poppins", fontSize: 20 }}>CoCreate Studio</b>
          <span style={{ color: C.MUTED, fontSize: 15, lineHeight: 1.5 }}>Studio works best on a larger screen. Open it on a laptop or desktop.</span>
          <Link to="/devotionals" className="st-btn">Back to my workspace</Link>
        </div>
      </div>
    </StudioGate>
  );
}

export function useGoPiece() {
  const navigate = useNavigate();
  return (id: string) => navigate({ to: "/studio/pieces/$id", params: { id } });
}
