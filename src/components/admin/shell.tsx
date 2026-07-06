import { Link, useRouterState, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Returns { ready, isAdmin, userId }. */
export function useAdminGate() {
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
      setSessionReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setUserId(s?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const roleQ = useQuery({
    queryKey: ["is-admin", userId],
    enabled: sessionReady && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: userId!,
        _role: "admin",
      });
      if (error) throw error;
      return !!data;
    },
  });

  return {
    ready: sessionReady && (!userId || roleQ.isFetched),
    userId,
    isAdmin: !!roleQ.data,
  };
}

const CSS = `
.ad-root, .ad-root *{box-sizing:border-box;}
.ad-root{min-height:100vh;background:#f6f4ec;color:#20201c;font-family:'Poppins',sans-serif;-webkit-font-smoothing:antialiased;}
.ad-layout{display:grid;grid-template-columns:1fr;min-height:100vh;}
.ad-topbar{background:#181A4D;color:#fff;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:40;}
.ad-brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:#fff;}
.ad-brand .mark{width:28px;height:28px;background:#DCE07A;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#181A4D;font-weight:900;}
.ad-brand .word{font-weight:900;font-size:16px;letter-spacing:-0.02em;}
.ad-brand .tag{font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;padding:3px 8px;border-radius:99px;background:#FFAE00;color:#181A4D;margin-left:8px;}
.ad-topnav{display:flex;gap:4px;flex-wrap:wrap;}
.ad-topnav a{color:rgba(255,255,255,0.7);text-decoration:none;font-weight:700;font-size:12.5px;padding:8px 14px;border-radius:20px;}
.ad-topnav a.active{background:#DCE07A;color:#181A4D;}
.ad-topnav a:hover:not(.active){color:#fff;}
.ad-exit{background:transparent;border:1.5px solid rgba(255,255,255,0.25);color:#fff;font-weight:700;font-size:12px;padding:7px 13px;border-radius:16px;font-family:'Poppins';cursor:pointer;text-decoration:none;}
.ad-main{padding:28px 24px 80px;max-width:1200px;margin:0 auto;width:100%;}
@media (min-width:900px){.ad-main{padding:40px 40px 80px;}}

.ad-h1{font-size:28px;font-weight:900;letter-spacing:-0.03em;color:#181A4D;margin:0 0 6px;}
.ad-sub{font-size:13.5px;color:#8a8678;margin:0 0 24px;}

.ad-btn{background:#181A4D;color:#fff;font-weight:800;font-size:13px;padding:10px 18px;border-radius:20px;border:none;cursor:pointer;font-family:'Poppins';text-decoration:none;display:inline-flex;align-items:center;gap:6px;}
.ad-btn:hover{background:#2a2d70;}
.ad-btn.ghost{background:transparent;color:#181A4D;border:1.5px solid rgba(20,20,20,0.14);}
.ad-btn.ghost:hover{background:#fff;}
.ad-btn.danger{background:#FF340C;color:#fff;}
.ad-btn.danger:hover{background:#e02a05;}
.ad-btn.sm{padding:6px 12px;font-size:11.5px;}

.ad-card{background:#fff;border:1px solid rgba(20,20,20,0.06);border-radius:14px;padding:22px;}
.ad-empty{background:#fff;border:1.5px dashed rgba(20,20,20,0.14);border-radius:14px;padding:36px 24px;text-align:center;color:#8a8678;}
.ad-empty strong{display:block;color:#181A4D;font-size:15px;font-weight:800;margin-bottom:4px;}

.ad-signgate{max-width:520px;background:#fff;border:1px solid rgba(20,20,20,0.08);border-left:4px solid #FF340C;border-radius:14px;padding:22px;margin:60px auto;text-align:center;}
.ad-signgate h3{color:#181A4D;font-weight:800;margin:0 0 8px;}
.ad-signgate p{color:#8a8678;font-size:13.5px;margin:0 0 16px;line-height:1.55;}
`;

const NAV = [
  { to: "/admin/content", label: "Content" },
  { to: "/admin/invites", label: "Team" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  useEffect(() => {
    document.body.style.background = "#f6f4ec";
    return () => { document.body.style.background = ""; };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const isActive = (to: string) =>
    pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="ad-root">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="ad-layout">
        <header className="ad-topbar">
          <Link to="/admin/content" className="ad-brand">
            <div className="mark">C</div>
            <div className="word">CoCreate</div>
            <span className="tag">Admin</span>
          </Link>
          <nav className="ad-topnav">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className={isActive(n.to) ? "active" : ""}>{n.label}</Link>
            ))}
          </nav>
          <div style={{ display: "flex", gap: 8 }}>
            <Link to="/" className="ad-exit">View site</Link>
            <button className="ad-exit" onClick={signOut}>Sign out</button>
          </div>
        </header>
        <main className="ad-main">{children}</main>
      </div>
    </div>
  );
}

export function AdminGate({ children }: { children: ReactNode }) {
  const { ready, userId, isAdmin } = useAdminGate();

  if (!ready) {
    return (
      <div style={{ minHeight: "100vh", background: "#f6f4ec", display: "grid", placeItems: "center", fontFamily: "Poppins,sans-serif", color: "#8a8678" }}>
        Checking access…
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="ad-root">
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="ad-signgate">
          <h3>Sign in required</h3>
          <p>The admin area is only available to signed-in team members.</p>
          <Link to="/auth" className="ad-btn">Sign in</Link>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="ad-root">
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="ad-signgate">
          <h3>Not authorized</h3>
          <p>Your account doesn't have admin access. If you should, ask an existing admin to add you from the Team page.</p>
          <Link to="/" className="ad-btn">Back to CoCreate</Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function AdminOutletLayout() {
  return (
    <AdminGate>
      <AdminShell>
        <Outlet />
      </AdminShell>
    </AdminGate>
  );
}
