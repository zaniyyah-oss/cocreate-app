import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { AppShell } from "@/components/AppShell";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
  head: () => ({
    meta: [
      { title: "Notifications — CoCreate" },
      { name: "description", content: "Your friend requests, discipleship invites, and messages in one place." },
      { property: "og:title", content: "Notifications — CoCreate" },
      { property: "og:description", content: "Your friend requests, discipleship invites, and messages in one place." },
    ],
  }),
});

const CSS = `
.nt-root *{box-sizing:border-box;}
.nt-root{min-height:100vh;background:#eee9d9;font-family:'Poppins',sans-serif;color:#20201c;}
.nt-shell{max-width:820px;margin:0 auto;padding:44px 28px 100px;}
.nt-head{margin-bottom:28px;display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;}
.nt-eyebrow{font-size:11px;font-weight:800;color:#8a8678;letter-spacing:0.16em;text-transform:uppercase;margin-bottom:8px;}
.nt-title{font-size:32px;font-weight:900;color:#181A4D;letter-spacing:-0.03em;margin:0 0 6px;line-height:1.05;}
.nt-sub{font-size:14px;color:#8a8678;font-weight:500;line-height:1.55;max-width:560px;margin:0;}
.nt-mark{background:transparent;color:#181A4D;border:1.5px solid rgba(20,20,20,0.14);border-radius:20px;padding:8px 16px;font-family:'Poppins';font-weight:800;font-size:12px;cursor:pointer;letter-spacing:-0.005em;transition:border-color .15s ease;}
.nt-mark:hover:not(:disabled){border-color:#181A4D;}
.nt-mark:disabled{opacity:0.4;cursor:not-allowed;}
.nt-list{background:#fff;border:1px solid rgba(20,20,20,0.06);border-radius:16px;overflow:hidden;}
.nt-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:14px;align-items:flex-start;padding:16px 18px;border-bottom:1px solid rgba(20,20,20,0.05);cursor:pointer;background:#fff;transition:background .15s ease;text-align:left;width:100%;border-left:none;border-right:none;border-top:none;font-family:'Poppins';}
.nt-row:last-child{border-bottom:none;}
.nt-row:hover{background:#FBF8ED;}
.nt-av{width:42px;height:42px;border-radius:50%;background:#0F4A42;color:#FBF8ED;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:15px;overflow:hidden;letter-spacing:-0.02em;flex-shrink:0;}
.nt-av img{width:100%;height:100%;object-fit:cover;}
.nt-av.msg{background:#181A4D;}
.nt-av.friend{background:#0F4A42;}
.nt-av.disc{background:#8B5A2B;}
.nt-av.sys{background:#8a8678;}
.nt-av svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;color:#FBF8ED;}
.nt-body{min-width:0;}
.nt-kind{font-size:9.5px;font-weight:800;color:#8a8678;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:4px;}
.nt-name{font-size:14px;font-weight:800;color:#181A4D;letter-spacing:-0.005em;line-height:1.35;}
.nt-desc{font-size:12.5px;color:#20201c;font-weight:500;line-height:1.45;margin-top:2px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}
.nt-when{font-size:10.5px;color:#8a8678;font-weight:700;margin-top:6px;letter-spacing:0.02em;}
.nt-side{display:flex;align-items:center;justify-content:center;padding-top:6px;flex-shrink:0;}
.nt-unread{width:9px;height:9px;border-radius:50%;background:#FF340C;box-shadow:0 0 0 3px rgba(255,52,12,0.15);}
.nt-empty{padding:48px 24px;text-align:center;color:#8a8678;font-size:13.5px;line-height:1.55;}
.nt-empty strong{display:block;color:#181A4D;font-weight:800;font-size:15px;margin-bottom:6px;}
.nt-gate{background:#fff;border:1px solid rgba(20,20,20,0.08);border-left:4px solid #FF340C;border-radius:14px;padding:22px;max-width:520px;}
.nt-gate h3{font-size:16px;font-weight:800;color:#181A4D;margin:0 0 6px;}
.nt-gate p{font-size:13.5px;color:#8a8678;margin:0 0 14px;line-height:1.55;}
.nt-gate a{background:#181A4D;color:#fff;font-weight:800;font-size:12.5px;padding:9px 18px;border-radius:20px;text-decoration:none;display:inline-block;}
@media (max-width:640px){.nt-title{font-size:26px;} .nt-shell{padding:28px 18px 100px;}}
`;

const KIND_LABEL: Record<string, string> = {
  friend_request: "Friend request",
  friend_accepted: "Friend accepted",
  discipleship_request: "Discipleship request",
  discipleship_accepted: "Discipleship accepted",
  message_1to1: "New message",
  message_group: "Group message",
  new_content: "New content",
  pinned_reflection: "Pinned reflection",
  streak_reminder: "Practice reminder",
};

function kindVariant(kind: string): "friend" | "disc" | "msg" | "sys" {
  if (kind.startsWith("friend")) return "friend";
  if (kind.startsWith("discipleship")) return "disc";
  if (kind.startsWith("message")) return "msg";
  return "sys";
}

function KindIcon({ kind }: { kind: string }) {
  const v = kindVariant(kind);
  if (v === "msg") return (<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>);
  if (v === "friend") return (<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 11h-6M19 8v6"/></svg>);
  if (v === "disc") return (<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>);
  return (<svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/></svg>);
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function useAuth() {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setUserId(data.session?.user.id ?? null); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);
  return { userId, ready };
}

function NotificationsPage() {
  const { userId, ready } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    document.body.style.background = "#eee9d9";
    return () => { document.body.style.background = ""; };
  }, []);

  const listQ = useQuery({
    queryKey: ["notifications-page", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const { error } = await supabase.from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", userId)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications-page", userId] });
      qc.invalidateQueries({ queryKey: ["notifications", userId] });
      qc.invalidateQueries({ queryKey: ["notifications-unread", userId] });
    },
  });

  const markOneRead = async (id: string) => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null);
    qc.invalidateQueries({ queryKey: ["notifications-page", userId] });
    qc.invalidateQueries({ queryKey: ["notifications", userId] });
    qc.invalidateQueries({ queryKey: ["notifications-unread", userId] });
  };

  const openNotif = (n: Notification) => {
    if (!n.read_at) void markOneRead(n.id);
    if (!n.link_route) return;
    const params = (n.link_params ?? {}) as Record<string, string>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigate as any)({ to: n.link_route, params });
  };

  if (!ready) {
    return (
      <AppShell><style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="nt-root"><div className="nt-shell" /></div>
      </AppShell>
    );
  }

  if (!userId) {
    return (
      <AppShell>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="nt-root"><div className="nt-shell">
          <div className="nt-gate">
            <h3>Sign in to see your notifications</h3>
            <p>Friend requests, discipleship invites, and messages will land here once you're signed in.</p>
            <a href="/auth">Sign in</a>
          </div>
        </div></div>
      </AppShell>
    );
  }

  const items = listQ.data ?? [];
  const hasUnread = items.some((n) => !n.read_at);

  return (
    <AppShell>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="nt-root">
        <div className="nt-shell">
          <div className="nt-head">
            <div>
              <div className="nt-eyebrow">Inbox</div>
              <h1 className="nt-title">Notifications</h1>
              <p className="nt-sub">Friend requests, discipleship invites, and new messages all in one place.</p>
            </div>
            <button
              className="nt-mark"
              onClick={() => markAllRead.mutate()}
              disabled={!hasUnread || markAllRead.isPending}
            >
              Mark all as read
            </button>
          </div>

          <div className="nt-list">
            {listQ.isLoading ? (
              <div className="nt-empty">Loading…</div>
            ) : items.length === 0 ? (
              <div className="nt-empty">
                <strong>All caught up</strong>
                Nothing new right now — we'll ping you when something lands.
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  className="nt-row"
                  onClick={() => openNotif(n)}
                  type="button"
                >
                  <div className={`nt-av ${kindVariant(n.kind)}`}><KindIcon kind={n.kind} /></div>
                  <div className="nt-body">
                    <div className="nt-kind">{KIND_LABEL[n.kind] ?? n.kind.replace(/_/g, " ")}</div>
                    <div className="nt-name">{n.title}</div>
                    {n.body && <div className="nt-desc">{n.body}</div>}
                    <div className="nt-when">{timeAgo(n.created_at)}</div>
                  </div>
                  <div className="nt-side">
                    {!n.read_at && <span className="nt-unread" aria-label="Unread" />}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
