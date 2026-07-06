import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

const BELL_CSS = `
.nb-wrap{position:relative;font-family:'Poppins',sans-serif;}
.nb-btn{position:relative;background:transparent;border:none;width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#181A4D;transition:background .18s ease;}
.nb-btn:hover{background:#FBF8ED;}
.nb-btn svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}
.nb-badge{position:absolute;top:4px;right:4px;min-width:16px;height:16px;padding:0 4px;border-radius:99px;background:#FF340C;color:#fff;font-size:9.5px;font-weight:900;display:flex;align-items:center;justify-content:center;line-height:1;box-shadow:0 0 0 2px #fff;}
.nb-panel{position:absolute;top:calc(100% + 10px);right:0;width:360px;max-width:calc(100vw - 24px);background:#fff;border:1px solid rgba(20,20,20,0.08);border-radius:16px;box-shadow:0 20px 50px rgba(0,0,0,0.18);z-index:200;overflow:hidden;}
.nb-head{padding:14px 18px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(20,20,20,0.06);}
.nb-head h3{margin:0;font-size:14px;font-weight:800;color:#181A4D;letter-spacing:-0.01em;}
.nb-head button{background:none;border:none;color:#8a8678;font-size:11.5px;font-family:'Poppins';font-weight:700;cursor:pointer;}
.nb-head button:hover{color:#181A4D;}
.nb-list{max-height:440px;overflow-y:auto;}
.nb-item{padding:14px 18px;border-bottom:1px solid rgba(20,20,20,0.05);cursor:pointer;display:flex;gap:12px;align-items:flex-start;background:#fff;transition:background .15s ease;}
.nb-item:last-child{border-bottom:none;}
.nb-item:hover{background:#FBF8ED;}
.nb-item.unread{background:#FBF8ED;}
.nb-item.unread:hover{background:#f5efd8;}
.nb-dot{width:8px;height:8px;border-radius:50%;margin-top:6px;flex-shrink:0;background:transparent;}
.nb-item.unread .nb-dot{background:#FF340C;}
.nb-body{flex:1;min-width:0;}
.nb-kind{font-size:9.5px;font-weight:800;color:#8a8678;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:4px;}
.nb-title{font-size:13px;font-weight:700;color:#181A4D;letter-spacing:-0.005em;margin-bottom:2px;line-height:1.4;}
.nb-sub{font-size:12px;color:#20201c;font-weight:500;line-height:1.4;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}
.nb-when{font-size:10.5px;color:#8a8678;font-weight:600;margin-top:4px;}
.nb-empty{padding:36px 24px;text-align:center;color:#8a8678;font-size:13px;line-height:1.55;}
.nb-empty strong{display:block;color:#181A4D;font-weight:800;font-size:14px;margin-bottom:4px;}
`;

const KIND_LABEL: Record<string, string> = {
  new_content: "New content",
  pinned_reflection: "Pinned reflection",
  streak_reminder: "Practice reminder",
};

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const todayISO = () => {
  const d = new Date(); const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

/** Once per day, seed a "streak reminder" if the user has practiced before but not today. */
async function maybeSeedStreakReminder(userId: string) {
  const flag = `cocreate:streak-checked:${userId}:${todayISO()}`;
  if (typeof window === "undefined") return;
  if (window.sessionStorage.getItem(flag)) return;
  window.sessionStorage.setItem(flag, "1");

  const today = todayISO();
  const dedupe = `streak_reminder:${today}`;

  // Do they have any past entries and none today?
  const { data: entries } = await supabase
    .from("devotional_entries")
    .select("entry_date")
    .eq("user_id", userId)
    .order("entry_date", { ascending: false })
    .limit(3);
  if (!entries || entries.length === 0) return;
  if (entries.some((e) => e.entry_date === today)) return;

  await supabase.from("notifications").insert({
    user_id: userId,
    kind: "streak_reminder",
    title: "A quiet moment to return",
    body: "Your devotional practice is here whenever you're ready.",
    link_route: "/devotionals",
    link_params: {},
    dedupe_key: dedupe,
  });
}

export function NotificationBell() {
  const [userId, setUserId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => { if (userId) maybeSeedStreakReminder(userId); }, [userId]);

  const listQ = useQuery({
    queryKey: ["notifications", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications").select("*").eq("user_id", userId!).order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
    refetchInterval: open ? false : 60_000,
  });

  const countQ = useQuery({
    queryKey: ["notifications-unread", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count, error } = await supabase.from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId!)
        .is("read_at", null);
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", userId] });
      qc.invalidateQueries({ queryKey: ["notifications-unread", userId] });
    },
  });

  const clearAll = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const { error } = await supabase.from("notifications").delete().eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", userId] });
      qc.invalidateQueries({ queryKey: ["notifications-unread", userId] });
    },
  });

  // Mark all as read when the panel opens
  useEffect(() => {
    if (open && userId && (countQ.data ?? 0) > 0) markAllRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDoc);
    return () => window.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!userId) return null;

  const unread = countQ.data ?? 0;
  const items = listQ.data ?? [];

  const openNotif = (n: Notification) => {
    setOpen(false);
    if (!n.link_route) return;
    const params = (n.link_params ?? {}) as Record<string, string>;
    // Router route strings are typed literals; cast for dynamic dispatch.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigate as any)({ to: n.link_route, params });
  };

  return (
    <div className="nb-wrap" ref={wrapRef}>
      <style dangerouslySetInnerHTML={{ __html: BELL_CSS }} />
      <button className="nb-btn" onClick={() => setOpen((o) => !o)} aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
        <svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/></svg>
        {unread > 0 && <span className="nb-badge">{unread > 99 ? "99+" : unread}</span>}
      </button>

      {open && (
        <div className="nb-panel" role="dialog" aria-label="Notifications">
          <div className="nb-head">
            <h3>Notifications</h3>
            {items.length > 0 && (
              <button onClick={() => clearAll.mutate()} disabled={clearAll.isPending}>Clear all</button>
            )}
          </div>
          <div className="nb-list">
            {listQ.isLoading ? (
              <div className="nb-empty">Loading…</div>
            ) : items.length === 0 ? (
              <div className="nb-empty">
                <strong>All caught up</strong>
                Nothing new right now — we'll ping you when something lands in a topic you follow.
              </div>
            ) : (
              items.map((n) => (
                <div key={n.id} className={`nb-item ${n.read_at ? "" : "unread"}`} onClick={() => openNotif(n)}>
                  <span className="nb-dot" />
                  <div className="nb-body">
                    <div className="nb-kind">{KIND_LABEL[n.kind] ?? n.kind}</div>
                    <div className="nb-title">{n.title}</div>
                    {n.body && <div className="nb-sub">{n.body}</div>}
                    <div className="nb-when">{timeAgo(n.created_at)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
