import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { AppShell } from "@/components/AppShell";
import { GroupsInner } from "@/components/GroupsInner";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Thread = Database["public"]["Tables"]["message_threads"]["Row"];
type Participant = Database["public"]["Tables"]["thread_participants"]["Row"];
type Message = Database["public"]["Tables"]["messages"]["Row"];
type Friendship = Database["public"]["Tables"]["friendships"]["Row"];
type Discipleship = Database["public"]["Tables"]["discipleships"]["Row"];

const searchSchema = z.object({
  t: z.string().optional(),
  with: z.string().optional(),
  view: z.enum(["groups"]).optional(),
  code: z.string().optional(),
});

export const Route = createFileRoute("/messages")({
  validateSearch: (s) => searchSchema.parse(s),
  component: MessagesPage,
  head: () => ({
    meta: [
      { title: "Messages — CoCreate" },
      { name: "description", content: "Direct and group messages with friends, disciplers, disciples, and facilitator groups." },
      { property: "og:title", content: "Messages — CoCreate" },
    ],
  }),
});

const FG_PREFIX = "fg_"; // sentinel for facilitator group threads in ?t=

const CSS = `
.mg-root *{box-sizing:border-box;}
.mg-root{min-height:100vh;background:#eee9d9;font-family:'Poppins',sans-serif;color:#20201c;}
.mg-shell{max-width:1120px;margin:0 auto;padding:28px 24px 40px;}
.mg-grid{display:grid;grid-template-columns:340px minmax(0,1fr);gap:20px;height:calc(100vh - 160px);min-height:520px;}
@media (max-width:820px){.mg-grid{grid-template-columns:1fr;height:auto;}}

.mg-panel{background:#fff;border:1px solid rgba(20,20,20,0.06);border-radius:16px;display:flex;flex-direction:column;overflow:hidden;min-height:0;}
.mg-panel-head{padding:16px 18px;display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:1px solid rgba(20,20,20,0.05);}
.mg-panel-head h2{font-size:14px;font-weight:900;color:#181A4D;margin:0;letter-spacing:-0.01em;}
.mg-panel-head .sub{font-size:11.5px;color:#8a8678;font-weight:600;}

.mg-newbtn{background:#181A4D;color:#fff;border:none;border-radius:18px;padding:7px 14px;font-family:'Poppins';font-weight:800;font-size:11.5px;cursor:pointer;letter-spacing:-0.005em;}
.mg-newbtn:hover{opacity:0.9;}
.mg-newbtn.ghost{background:transparent;color:#181A4D;border:1.5px solid rgba(20,20,20,0.12);}

.mg-actions{display:flex;gap:8px;padding:12px 14px;border-bottom:1px solid rgba(20,20,20,0.05);background:#FBF8ED;}
.mg-actionbtn{flex:1;background:#fff;border:1.5px solid rgba(20,20,20,0.12);color:#181A4D;font-family:'Poppins';font-weight:800;font-size:12px;padding:9px 12px;border-radius:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all .15s;}
.mg-actionbtn:hover{border-color:#181A4D;}
.mg-actionbtn svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}

.mg-section{margin-top:6px;}
.mg-section-head{padding:14px 18px 6px;font-size:10.5px;font-weight:800;color:#8a8678;letter-spacing:0.14em;text-transform:uppercase;display:flex;align-items:center;gap:8px;}
.mg-section-count{background:rgba(24,26,77,0.06);color:#181A4D;font-size:10px;font-weight:800;padding:2px 7px;border-radius:10px;letter-spacing:0.02em;text-transform:none;}

.mg-list{overflow-y:auto;flex:1;}
.mg-thread{padding:12px 18px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center;cursor:pointer;border-bottom:1px solid rgba(20,20,20,0.04);background:#fff;transition:background .15s ease;}
.mg-thread:hover{background:#FBF8ED;}
.mg-thread.active{background:#FBF8ED;}
.mg-av{width:38px;height:38px;border-radius:50%;background:#0F4A42;color:#FBF8ED;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:13px;overflow:hidden;flex-shrink:0;letter-spacing:-0.02em;}
.mg-av.group{background:#DCE07A;color:#181A4D;}
.mg-av.fg{background:#181A4D;color:#DCE07A;border-radius:10px;}
.mg-av img{width:100%;height:100%;object-fit:cover;}
.mg-tname{font-size:13.5px;font-weight:800;color:#181A4D;letter-spacing:-0.005em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:6px;}
.mg-tpreview{font-size:12px;color:#8a8678;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;}
.mg-tmeta{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;}
.mg-twhen{font-size:10.5px;color:#8a8678;font-weight:700;}
.mg-badge{min-width:18px;height:18px;padding:0 6px;border-radius:99px;background:#FF340C;color:#fff;font-size:10px;font-weight:900;display:inline-flex;align-items:center;justify-content:center;line-height:1;}
.mg-tag{font-size:9px;font-weight:800;padding:2px 6px;border-radius:6px;letter-spacing:0.06em;text-transform:uppercase;}
.mg-tag.fg{background:#DCE07A;color:#181A4D;}

.mg-empty{padding:40px 24px;text-align:center;color:#8a8678;font-size:13px;line-height:1.55;}
.mg-empty strong{display:block;color:#181A4D;font-weight:800;font-size:14px;margin-bottom:6px;}
.mg-section-empty{padding:8px 18px 14px;color:#8a8678;font-size:11.5px;font-style:italic;}

/* Thread view */
.mg-view-head{padding:14px 18px;display:flex;align-items:center;gap:12px;border-bottom:1px solid rgba(20,20,20,0.05);}
.mg-back{background:transparent;border:none;color:#8a8678;font-weight:800;font-size:12px;cursor:pointer;padding:6px 8px;display:none;font-family:'Poppins';}
@media (max-width:820px){.mg-back{display:inline-flex;}}
.mg-view-name{font-size:14px;font-weight:900;color:#181A4D;letter-spacing:-0.005em;display:flex;align-items:center;gap:8px;}
.mg-view-sub{font-size:11.5px;color:#8a8678;font-weight:600;margin-top:1px;}

.mg-msgs{flex:1;overflow-y:auto;padding:20px 18px;display:flex;flex-direction:column;gap:6px;background:#FBF8ED;}
.mg-msg{max-width:74%;padding:9px 13px;border-radius:14px;font-size:13.5px;line-height:1.45;font-weight:500;color:#20201c;background:#fff;border:1px solid rgba(20,20,20,0.05);word-wrap:break-word;}
.mg-msg.mine{align-self:flex-end;background:#181A4D;color:#fff;border-color:transparent;}
.mg-msg .sender{font-size:10.5px;font-weight:800;color:#8a8678;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:3px;}
.mg-msg .when{font-size:10px;font-weight:600;opacity:0.7;margin-top:4px;}
.mg-daysep{align-self:center;font-size:10.5px;font-weight:800;color:#8a8678;letter-spacing:0.14em;text-transform:uppercase;padding:8px 0;}

.mg-composer{padding:12px 14px;display:flex;gap:10px;align-items:flex-end;border-top:1px solid rgba(20,20,20,0.06);background:#fff;}
.mg-composer textarea{flex:1;resize:none;border:1.5px solid rgba(20,20,20,0.10);border-radius:16px;padding:10px 14px;font-family:'Poppins';font-size:13.5px;color:#181A4D;outline:none;min-height:40px;max-height:140px;font-weight:500;}
.mg-composer textarea:focus{border-color:#181A4D;}
.mg-send{background:#181A4D;color:#fff;border:none;border-radius:16px;padding:10px 18px;font-family:'Poppins';font-weight:800;font-size:12.5px;cursor:pointer;height:40px;flex-shrink:0;}
.mg-send:disabled{opacity:0.45;cursor:not-allowed;}

/* Modal */
.mg-scrim{position:fixed;inset:0;background:rgba(20,20,60,0.35);display:flex;align-items:center;justify-content:center;z-index:200;padding:20px;}
.mg-modal{background:#fff;border-radius:18px;width:100%;max-width:440px;max-height:80vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,0.25);}
.mg-modal-head{padding:16px 20px;border-bottom:1px solid rgba(20,20,20,0.06);}
.mg-modal-head h3{margin:0 0 4px;font-size:16px;font-weight:900;color:#181A4D;letter-spacing:-0.01em;}
.mg-modal-head p{margin:0;font-size:12.5px;color:#8a8678;font-weight:500;line-height:1.5;}
.mg-modal-body{padding:12px 8px;overflow-y:auto;flex:1;}
.mg-friend{padding:10px 14px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center;border-radius:12px;cursor:pointer;transition:background .15s ease;}
.mg-friend:hover{background:#FBF8ED;}
.mg-check{width:18px;height:18px;border-radius:6px;border:1.5px solid rgba(20,20,20,0.20);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#fff;font-weight:900;font-size:11px;}
.mg-check.on{background:#181A4D;border-color:#181A4D;}
.mg-modal-foot{padding:14px 18px;display:flex;justify-content:space-between;align-items:center;gap:10px;border-top:1px solid rgba(20,20,20,0.06);}
.mg-modal-foot input{flex:1;border:1.5px solid rgba(20,20,20,0.10);border-radius:14px;padding:8px 12px;font-family:'Poppins';font-size:12.5px;color:#181A4D;outline:none;font-weight:500;}
.mg-modal-actions{display:flex;gap:8px;}
.mg-btn-cancel{background:transparent;border:1.5px solid rgba(20,20,20,0.12);color:#181A4D;padding:8px 14px;border-radius:16px;font-family:'Poppins';font-weight:800;font-size:12px;cursor:pointer;}

.mg-gate{background:#fff;border:1px solid rgba(20,20,20,0.08);border-left:4px solid #FF340C;border-radius:14px;padding:22px;max-width:520px;margin:40px auto;}
.mg-gate h3{font-size:16px;font-weight:800;color:#181A4D;margin:0 0 6px;}
.mg-gate p{font-size:13.5px;color:#8a8678;margin:0 0 14px;line-height:1.55;}
.mg-gate a{background:#181A4D;color:#fff;font-weight:800;font-size:12.5px;padding:9px 18px;border-radius:20px;text-decoration:none;display:inline-block;}
`;

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

function initials(name?: string | null) {
  const src = (name && name.trim()) || "?";
  return src.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("") || "?";
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  const days = Math.floor(diff / 86400);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function fullTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date(); today.setHours(0,0,0,0);
  const midnight = new Date(d); midnight.setHours(0,0,0,0);
  const diff = (today.getTime() - midnight.getTime()) / 86400000;
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

function MessagesPage() {
  const { userId, ready } = useAuth();
  const nav = useNavigate();
  const search = Route.useSearch();
  const qc = useQueryClient();
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [winWidth, setWinWidth] = useState<number>(1024);

  useEffect(() => {
    document.body.style.background = "#eee9d9";
    return () => { document.body.style.background = ""; };
  }, []);

  useEffect(() => {
    const update = () => setWinWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // ============ FRIEND-BASED THREADS (existing) ============
  const partsQ = useQuery({
    queryKey: ["msg-my-parts", userId],
    enabled: ready && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("thread_participants").select("*").eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []) as Participant[];
    },
  });
  const myParts = partsQ.data ?? [];
  const threadIds = myParts.map((p) => p.thread_id);

  const threadsQ = useQuery({
    queryKey: ["msg-threads", threadIds.sort().join(",")],
    enabled: threadIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("message_threads").select("*").in("id", threadIds).order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Thread[];
    },
  });
  const threads = threadsQ.data ?? [];

  const allPartsQ = useQuery({
    queryKey: ["msg-all-parts", threadIds.sort().join(",")],
    enabled: threadIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("thread_participants").select("*").in("thread_id", threadIds);
      if (error) throw error;
      return (data ?? []) as Participant[];
    },
  });
  const allParts = allPartsQ.data ?? [];

  const counterpartIds = useMemo(() => {
    const s = new Set<string>();
    for (const p of allParts) if (p.user_id !== userId) s.add(p.user_id);
    return Array.from(s);
  }, [allParts, userId]);
  const profilesQ = useQuery({
    queryKey: ["msg-profiles", counterpartIds.sort().join(",")],
    enabled: counterpartIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id,name,avatar_url,member_since,streak_count,created_at,updated_at").in("id", counterpartIds);
      if (error) throw error;
      const map: Record<string, Profile> = {};
      for (const p of (data ?? []) as Profile[]) map[p.id] = p;
      return map;
    },
  });
  const profiles = profilesQ.data ?? {};

  const previewsQ = useQuery({
    queryKey: ["msg-previews", threadIds.sort().join(",")],
    enabled: threadIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("messages").select("*").in("thread_id", threadIds).order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      const rows = (data ?? []) as Message[];
      const latest: Record<string, Message> = {};
      for (const m of rows) if (!latest[m.thread_id]) latest[m.thread_id] = m;
      return { latest, all: rows };
    },
  });
  const previews = previewsQ.data?.latest ?? {};

  // Friends for New Group modal
  const friendsQ = useQuery({
    queryKey: ["msg-friends", userId],
    enabled: ready && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("friendships").select("*").eq("status", "accepted").or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
      if (error) throw error;
      const fs = (data ?? []) as Friendship[];
      const ids = fs.map((f) => (f.requester_id === userId ? f.addressee_id : f.requester_id));
      if (ids.length === 0) return [] as Profile[];
      const { data: ps, error: e2 } = await supabase.from("profiles").select("id,name,avatar_url,member_since,streak_count,created_at,updated_at").in("id", ids);
      if (e2) throw e2;
      return (ps ?? []) as Profile[];
    },
  });
  const friends = friendsQ.data ?? [];

  // Discipleships — for tagging discipleship threads
  const discipleshipsQ = useQuery({
    queryKey: ["msg-discipleships", userId],
    enabled: ready && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("discipleships").select("*").eq("status", "accepted");
      if (error) throw error;
      return (data ?? []) as Discipleship[];
    },
  });
  const discipleshipPartnerIds = useMemo(() => {
    const s = new Set<string>();
    for (const d of discipleshipsQ.data ?? []) {
      if (d.mentor_id === userId) s.add(d.disciple_id);
      else if (d.disciple_id === userId) s.add(d.mentor_id);
    }
    return s;
  }, [discipleshipsQ.data, userId]);

  // ============ FACILITATOR GROUP THREADS ============
  const fgThreadsQ = useQuery({
    queryKey: ["msg-fg-threads", userId],
    enabled: ready && !!userId,
    queryFn: async () => {
      const [{ data: mine, error: e1 }, { data: mem, error: e2 }] = await Promise.all([
        supabase.from("facilitator_groups").select("id, name, description, facilitator_id, created_at").eq("facilitator_id", userId!),
        supabase.from("facilitator_group_members").select("group_id, facilitator_groups!inner(id, name, description, facilitator_id, created_at)").eq("user_id", userId!),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const map = new Map<string, { id: string; name: string; description: string | null; facilitator_id: string; created_at: string; role: "facilitator" | "member" }>();
      for (const g of (mine ?? []) as any[]) map.set(g.id, { ...g, role: "facilitator" });
      for (const row of (mem ?? []) as any[]) {
        const g = row.facilitator_groups;
        if (g && !map.has(g.id)) map.set(g.id, { ...g, role: "member" });
      }
      return Array.from(map.values());
    },
  });
  const fgThreads = fgThreadsQ.data ?? [];
  const fgIds = fgThreads.map((g) => g.id);

  const fgPreviewsQ = useQuery({
    queryKey: ["msg-fg-previews", fgIds.sort().join(",")],
    enabled: fgIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facilitator_group_messages")
        .select("id, group_id, user_id, body, created_at")
        .in("group_id", fgIds)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const rows = (data ?? []) as { id: string; group_id: string; user_id: string; body: string; created_at: string }[];
      const latest: Record<string, typeof rows[number]> = {};
      for (const m of rows) if (!latest[m.group_id]) latest[m.group_id] = m;
      return latest;
    },
  });
  const fgPreviews = fgPreviewsQ.data ?? {};

  // Realtime for friend messages
  useEffect(() => {
    if (!userId || threadIds.length === 0) return;
    const channel = supabase
      .channel(`msg-user-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const row = payload.new as Message;
        if (threadIds.includes(row.thread_id)) {
          qc.invalidateQueries({ queryKey: ["msg-previews", threadIds.sort().join(",")] });
          qc.invalidateQueries({ queryKey: ["msg-thread-messages", row.thread_id] });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, threadIds.join(","), qc]);

  // Realtime for facilitator group messages
  useEffect(() => {
    if (!userId || fgIds.length === 0) return;
    const channel = supabase
      .channel(`msg-user-fg-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "facilitator_group_messages" }, (payload) => {
        const row = payload.new as { group_id: string };
        if (fgIds.includes(row.group_id)) {
          qc.invalidateQueries({ queryKey: ["msg-fg-previews", fgIds.sort().join(",")] });
          qc.invalidateQueries({ queryKey: ["msg-fg-thread-messages", row.group_id] });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, fgIds.join(","), qc]);

  // Start-with flow (from Friend "Message" button)
  const startWith = search.with;
  const startingRef = useRef(false);
  useEffect(() => {
    if (!startWith || !userId || !ready || startingRef.current) return;
    startingRef.current = true;
    (async () => {
      const existingThreadId = threads
        .filter((t) => !t.is_group)
        .find((t) => {
          const parts = allParts.filter((p) => p.thread_id === t.id);
          const ids = parts.map((p) => p.user_id).sort();
          return parts.length === 2 && ids.includes(userId) && ids.includes(startWith);
        })?.id;
      if (existingThreadId) {
        nav({ to: "/messages", search: { t: existingThreadId }, replace: true });
        return;
      }
      const { data: t, error } = await supabase.from("message_threads").insert({ is_group: false, created_by: userId }).select().single();
      if (error) { startingRef.current = false; return; }
      const { error: pe } = await supabase.from("thread_participants").insert([
        { thread_id: t.id, user_id: userId },
        { thread_id: t.id, user_id: startWith },
      ]);
      if (pe) { startingRef.current = false; return; }
      await qc.invalidateQueries({ queryKey: ["msg-my-parts", userId] });
      nav({ to: "/messages", search: { t: t.id }, replace: true });
    })();
  }, [startWith, userId, ready, threads, allParts, nav, qc]);

  // Selected thread
  const currentThreadId = search.t ?? null;
  const isFgThread = !!currentThreadId && currentThreadId.startsWith(FG_PREFIX);
  const currentFgId = isFgThread ? currentThreadId!.slice(FG_PREFIX.length) : null;
  const currentThread = !isFgThread ? threads.find((t) => t.id === currentThreadId) ?? null : null;
  const currentFg = currentFgId ? fgThreads.find((g) => g.id === currentFgId) ?? null : null;
  const viewingGroups = search.view === "groups";

  // Categorize friend threads: discipleship vs friend
  const discipleshipThreads: Thread[] = [];
  const friendThreads: Thread[] = [];
  for (const t of threads) {
    if (!t.is_group) {
      const other = allParts.find((p) => p.thread_id === t.id && p.user_id !== userId);
      if (other && discipleshipPartnerIds.has(other.user_id)) {
        discipleshipThreads.push(t);
        continue;
      }
    }
    friendThreads.push(t);
  }

  function friendThreadLabel(t: Thread): { name: string; sub: string; av: React.ReactNode } {
    const others = allParts.filter((p) => p.thread_id === t.id && p.user_id !== userId).map((p) => profiles[p.user_id]).filter(Boolean) as Profile[];
    if (t.is_group) {
      const names = others.map((o) => o.name ?? "Friend").slice(0, 3).join(", ");
      return {
        name: t.title || names || "Group",
        sub: `${others.length + 1} members`,
        av: <div className="mg-av group">{initials(t.title || names)}</div>,
      };
    }
    const other = others[0];
    return {
      name: other?.name ?? "Direct message",
      sub: "Direct message",
      av: <div className="mg-av">{other?.avatar_url ? <img src={other.avatar_url} alt="" /> : initials(other?.name)}</div>,
    };
  }

  function renderThreadRow(t: Thread) {
    const { name, sub, av } = friendThreadLabel(t);
    const last = previews[t.id];
    const myPart = myParts.find((p) => p.thread_id === t.id);
    const unread = last && myPart && new Date(last.created_at) > new Date(myPart.last_read_at) && last.sender_id !== userId;
    return (
      <div
        key={t.id}
        className={`mg-thread ${currentThreadId === t.id ? "active" : ""}`}
        onClick={() => nav({ to: "/messages", search: { t: t.id } })}
      >
        {av}
        <div style={{ minWidth: 0 }}>
          <div className="mg-tname">{name}</div>
          <div className="mg-tpreview">{last ? (last.sender_id === userId ? "You: " : "") + last.body : sub}</div>
        </div>
        <div className="mg-tmeta">
          {last && <div className="mg-twhen">{timeAgo(last.created_at)}</div>}
          {unread && <span className="mg-badge">1</span>}
        </div>
      </div>
    );
  }

  function renderFgRow(g: typeof fgThreads[number]) {
    const last = fgPreviews[g.id];
    const active = currentThreadId === `${FG_PREFIX}${g.id}`;
    return (
      <div
        key={g.id}
        className={`mg-thread ${active ? "active" : ""}`}
        onClick={() => nav({ to: "/messages", search: { t: `${FG_PREFIX}${g.id}` } })}
      >
        <div className="mg-av fg">{initials(g.name)}</div>
        <div style={{ minWidth: 0 }}>
          <div className="mg-tname">
            {g.name}
            <span className="mg-tag fg">{g.role === "facilitator" ? "Facilitating" : "Member"}</span>
          </div>
          <div className="mg-tpreview">
            {last ? (last.user_id === userId ? "You: " : "") + last.body : (g.description || "Group conversation")}
          </div>
        </div>
        <div className="mg-tmeta">
          {last && <div className="mg-twhen">{timeAgo(last.created_at)}</div>}
        </div>
      </div>
    );
  }

  if (ready && !userId) {
    return (
      <AppShell current="messages">
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="mg-root">
          <div className="mg-gate">
            <h3>Sign in to message</h3>
            <p>Direct messages, discipleship, facilitator groups, and group threads are for signed-in members.</p>
            <a href="/auth">Sign in</a>
          </div>
        </div>
      </AppShell>
    );
  }

  const totalThreads = threads.length + fgThreads.length;
  const showThreadPanel = !currentThreadId && !viewingGroups;
  const showViewPanel = !!currentThreadId || viewingGroups || winWidth > 820;

  return (
    <AppShell current="messages">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="mg-root">
        <div className="mg-shell">
          <div className="mg-grid">
            {/* Thread list panel */}
            <div className="mg-panel" style={{ display: (currentThreadId || viewingGroups) && winWidth <= 820 ? "none" : "flex" }}>
              <div className="mg-panel-head">
                <div>
                  <h2>Messages</h2>
                  <div className="sub">{totalThreads} thread{totalThreads === 1 ? "" : "s"}</div>
                </div>
                <button className="mg-newbtn" onClick={() => setShowNewGroup(true)}>+ New group</button>
              </div>

              <div className="mg-actions">
                <button
                  className="mg-actionbtn"
                  onClick={() => nav({ to: "/messages", search: { view: "groups" } })}
                >
                  <svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="4"/><path d="M17 11l2 2 4-4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6"/></svg>
                  Facilitator Groups
                </button>
              </div>

              <div className="mg-list">
                {totalThreads === 0 ? (
                  <div className="mg-empty">
                    <strong>No messages yet</strong>
                    Message a friend, start a group, or join a facilitator group with an invite code.
                  </div>
                ) : (
                  <>
                    {/* Facilitator Groups section */}
                    {fgThreads.length > 0 && (
                      <div className="mg-section">
                        <div className="mg-section-head">
                          Facilitator Groups
                          <span className="mg-section-count">{fgThreads.length}</span>
                        </div>
                        {fgThreads.map(renderFgRow)}
                      </div>
                    )}

                    {/* Discipleship section */}
                    {discipleshipThreads.length > 0 && (
                      <div className="mg-section">
                        <div className="mg-section-head">
                          Discipleship
                          <span className="mg-section-count">{discipleshipThreads.length}</span>
                        </div>
                        {discipleshipThreads.map(renderThreadRow)}
                      </div>
                    )}

                    {/* Friends section */}
                    {friendThreads.length > 0 && (
                      <div className="mg-section">
                        <div className="mg-section-head">
                          Friends
                          <span className="mg-section-count">{friendThreads.length}</span>
                        </div>
                        {friendThreads.map(renderThreadRow)}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* View panel: groups inner, thread view, or empty */}
            <div className="mg-panel" style={{ display: showThreadPanel && winWidth <= 820 ? "none" : "flex" }}>
              {viewingGroups && userId ? (
                <GroupsInner
                  userId={userId}
                  onBack={() => nav({ to: "/messages", search: {} })}
                  prefilledCode={search.code ?? null}
                />
              ) : isFgThread && currentFg ? (
                <FacilitatorGroupThreadView
                  group={currentFg}
                  userId={userId!}
                  onBack={() => nav({ to: "/messages", search: {} })}
                />
              ) : currentThread ? (
                <ThreadView
                  thread={currentThread}
                  userId={userId!}
                  participants={allParts.filter((p) => p.thread_id === currentThread.id)}
                  profiles={profiles}
                  onBack={() => nav({ to: "/messages", search: {} })}
                  myLastReadAt={myParts.find((p) => p.thread_id === currentThread.id)?.last_read_at}
                />
              ) : (
                <div className="mg-empty" style={{ margin: "auto" }}>
                  <strong>Pick a conversation</strong>
                  Select a thread on the left, or open Facilitator Groups.
                </div>
              )}
            </div>
          </div>
        </div>

        {showNewGroup && (
          <NewGroupModal
            friends={friends}
            userId={userId!}
            onClose={() => setShowNewGroup(false)}
            onCreated={(id) => {
              setShowNewGroup(false);
              qc.invalidateQueries({ queryKey: ["msg-my-parts", userId] });
              nav({ to: "/messages", search: { t: id } });
            }}
          />
        )}
      </div>
    </AppShell>
  );
}

function ThreadView({ thread, userId, participants, profiles, onBack, myLastReadAt }: {
  thread: Thread;
  userId: string;
  participants: Participant[];
  profiles: Record<string, Profile>;
  onBack: () => void;
  myLastReadAt?: string;
}) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);

  const msgsQ = useQuery({
    queryKey: ["msg-thread-messages", thread.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("messages").select("*").eq("thread_id", thread.id).order("created_at", { ascending: true }).limit(200);
      if (error) throw error;
      return (data ?? []) as Message[];
    },
  });
  const messages = msgsQ.data ?? [];

  useEffect(() => {
    const channel = supabase
      .channel(`msg-thread-${thread.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${thread.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["msg-thread-messages", thread.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [thread.id, qc]);

  useEffect(() => {
    if (scrollerRef.current) scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [messages.length, thread.id]);

  useEffect(() => {
    if (messages.length === 0) return;
    const latest = messages[messages.length - 1];
    if (myLastReadAt && new Date(latest.created_at) <= new Date(myLastReadAt)) return;
    supabase.from("thread_participants").update({ last_read_at: new Date().toISOString() })
      .eq("thread_id", thread.id).eq("user_id", userId).then(() => {
        qc.invalidateQueries({ queryKey: ["msg-my-parts", userId] });
      });
  }, [thread.id, userId, messages.length, myLastReadAt, qc]);

  const send = useMutation({
    mutationFn: async (body: string) => {
      const { error } = await supabase.from("messages").insert({ thread_id: thread.id, sender_id: userId, body });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["msg-thread-messages", thread.id] });
    },
  });

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const t = text.trim();
      if (t) send.mutate(t);
    }
  }

  const others = participants.filter((p) => p.user_id !== userId).map((p) => profiles[p.user_id]).filter(Boolean) as Profile[];
  const headerName = thread.is_group
    ? (thread.title || others.map((o) => o.name ?? "Friend").slice(0, 3).join(", ") || "Group")
    : (others[0]?.name ?? "Direct message");
  const headerSub = thread.is_group ? `${participants.length} members` : "Direct message";

  const withSeps: Array<{ kind: "sep"; label: string } | { kind: "msg"; m: Message }> = [];
  let lastDay = "";
  for (const m of messages) {
    const dl = dayLabel(m.created_at);
    if (dl !== lastDay) { withSeps.push({ kind: "sep", label: dl }); lastDay = dl; }
    withSeps.push({ kind: "msg", m });
  }

  return (
    <>
      <div className="mg-view-head">
        <button className="mg-back" onClick={onBack}>← Back</button>
        <div>
          <div className="mg-view-name">{headerName}</div>
          <div className="mg-view-sub">{headerSub}</div>
        </div>
      </div>
      <div className="mg-msgs" ref={scrollerRef}>
        {withSeps.length === 0 ? (
          <div className="mg-empty" style={{ margin: "auto" }}>
            <strong>No messages yet</strong>
            Say hello — messages are only visible to participants.
          </div>
        ) : withSeps.map((item, i) => item.kind === "sep" ? (
          <div key={`s${i}`} className="mg-daysep">{item.label}</div>
        ) : (
          <div key={item.m.id} className={`mg-msg ${item.m.sender_id === userId ? "mine" : ""}`}>
            {thread.is_group && item.m.sender_id !== userId && (
              <div className="sender">{profiles[item.m.sender_id]?.name ?? "Member"}</div>
            )}
            {item.m.body}
            <div className="when">{fullTime(item.m.created_at)}</div>
          </div>
        ))}
      </div>
      <div className="mg-composer">
        <textarea
          placeholder="Write a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
        />
        <button className="mg-send" disabled={!text.trim() || send.isPending} onClick={() => { const t = text.trim(); if (t) send.mutate(t); }}>
          Send
        </button>
      </div>
    </>
  );
}

function FacilitatorGroupThreadView({ group, userId, onBack }: {
  group: { id: string; name: string; description: string | null; facilitator_id: string; role: "facilitator" | "member" };
  userId: string;
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);

  const msgsQ = useQuery({
    queryKey: ["msg-fg-thread-messages", group.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facilitator_group_messages")
        .select("id, group_id, user_id, body, created_at")
        .eq("group_id", group.id)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
  const messages = msgsQ.data ?? [];

  // Profiles for message senders
  const senderIds = useMemo(() => Array.from(new Set(messages.map((m) => m.user_id))), [messages]);
  const profilesQ = useQuery({
    queryKey: ["msg-fg-profiles", group.id, senderIds.sort().join(",")],
    enabled: senderIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, name, avatar_url").in("id", senderIds);
      if (error) throw error;
      const m: Record<string, { id: string; name: string | null; avatar_url: string | null }> = {};
      for (const p of data ?? []) m[p.id] = p as any;
      return m;
    },
  });
  const senderProfiles = profilesQ.data ?? {};

  // Member count
  const countQ = useQuery({
    queryKey: ["msg-fg-membercount", group.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("facilitator_group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", group.id);
      if (error) throw error;
      return count ?? 0;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`msg-fg-thread-${group.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "facilitator_group_messages", filter: `group_id=eq.${group.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["msg-fg-thread-messages", group.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [group.id, qc]);

  useEffect(() => {
    if (scrollerRef.current) scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [messages.length, group.id]);

  const send = useMutation({
    mutationFn: async (body: string) => {
      const { error } = await supabase.from("facilitator_group_messages").insert({ group_id: group.id, user_id: userId, body });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["msg-fg-thread-messages", group.id] });
      qc.invalidateQueries({ queryKey: ["msg-fg-previews"] });
    },
  });

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const t = text.trim();
      if (t) send.mutate(t);
    }
  }

  const withSeps: Array<{ kind: "sep"; label: string } | { kind: "msg"; m: typeof messages[number] }> = [];
  let lastDay = "";
  for (const m of messages) {
    const dl = dayLabel(m.created_at);
    if (dl !== lastDay) { withSeps.push({ kind: "sep", label: dl }); lastDay = dl; }
    withSeps.push({ kind: "msg", m });
  }

  const memberSub = countQ.data != null
    ? `${countQ.data + 1}/26 · ${group.role === "facilitator" ? "You facilitate" : "Facilitator group"}`
    : (group.role === "facilitator" ? "You facilitate this group" : "Facilitator group");

  return (
    <>
      <div className="mg-view-head">
        <button className="mg-back" onClick={onBack}>← Back</button>
        <div>
          <div className="mg-view-name">
            {group.name}
            <span className="mg-tag fg">Facilitator Group</span>
          </div>
          <div className="mg-view-sub">{memberSub}</div>
        </div>
      </div>
      <div className="mg-msgs" ref={scrollerRef}>
        {withSeps.length === 0 ? (
          <div className="mg-empty" style={{ margin: "auto" }}>
            <strong>No messages yet</strong>
            Kick off the conversation.
          </div>
        ) : withSeps.map((item, i) => item.kind === "sep" ? (
          <div key={`s${i}`} className="mg-daysep">{item.label}</div>
        ) : (
          <div key={item.m.id} className={`mg-msg ${item.m.user_id === userId ? "mine" : ""}`}>
            {item.m.user_id !== userId && (
              <div className="sender">{senderProfiles[item.m.user_id]?.name ?? "Member"}</div>
            )}
            {item.m.body}
            <div className="when">{fullTime(item.m.created_at)}</div>
          </div>
        ))}
      </div>
      <div className="mg-composer">
        <textarea
          placeholder="Write to the group…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
        />
        <button className="mg-send" disabled={!text.trim() || send.isPending} onClick={() => { const t = text.trim(); if (t) send.mutate(t); }}>
          Send
        </button>
      </div>
    </>
  );
}

function NewGroupModal({ friends, userId, onClose, onCreated }: {
  friends: Profile[];
  userId: string;
  onClose: () => void;
  onCreated: (threadId: string) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }

  async function create() {
    if (selected.size < 2) { setErr("Pick at least 2 friends for a group."); return; }
    setPending(true); setErr(null);
    try {
      const { data: t, error } = await supabase.from("message_threads").insert({
        is_group: true, title: title.trim() || null, created_by: userId,
      }).select().single();
      if (error) throw error;
      const rows = [{ thread_id: t.id, user_id: userId }, ...Array.from(selected).map((uid) => ({ thread_id: t.id, user_id: uid }))];
      const { error: pe } = await supabase.from("thread_participants").insert(rows);
      if (pe) throw pe;
      onCreated(t.id);
    } catch (e: any) {
      setErr(e?.message ?? "Couldn't create group");
      setPending(false);
    }
  }

  return (
    <div className="mg-scrim" onClick={onClose}>
      <div className="mg-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mg-modal-head">
          <h3>New group</h3>
          <p>Pick from your friends — group threads are friends only. Choose at least 2.</p>
        </div>
        <div className="mg-modal-body">
          {friends.length === 0 ? (
            <div className="mg-empty"><strong>No friends yet</strong>Add friends first, then start a group.</div>
          ) : friends.map((f) => {
            const on = selected.has(f.id);
            return (
              <div key={f.id} className="mg-friend" onClick={() => toggle(f.id)}>
                <div className={`mg-check ${on ? "on" : ""}`}>{on ? "✓" : ""}</div>
                <div className="mg-tname">{f.name ?? "Friend"}</div>
                <div className="mg-av" style={{ width: 32, height: 32, fontSize: 12 }}>
                  {f.avatar_url ? <img src={f.avatar_url} alt="" /> : initials(f.name)}
                </div>
              </div>
            );
          })}
          {err && <div style={{ padding: "10px 14px", color: "#FF340C", fontSize: 12, fontWeight: 700 }}>{err}</div>}
        </div>
        <div className="mg-modal-foot">
          <input type="text" placeholder="Group name (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="mg-modal-actions">
            <button className="mg-btn-cancel" onClick={onClose}>Cancel</button>
            <button className="mg-newbtn" disabled={pending || selected.size < 2} onClick={create}>
              {pending ? "Creating…" : `Create (${selected.size})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
