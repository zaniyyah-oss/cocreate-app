import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { AppShell } from "@/components/AppShell";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Friendship = Database["public"]["Tables"]["friendships"]["Row"];
type Discipleship = Database["public"]["Tables"]["discipleships"]["Row"];
type DiscInvite = Database["public"]["Tables"]["discipleship_invites"]["Row"];



const FRIEND_CAP = 10;

export const Route = createFileRoute("/friends")({
  component: FriendsPage,
  head: () => ({
    meta: [
      { title: "Friends — CoCreate" },
      { name: "description", content: "Find friends, manage requests, and see who you're walking with on CoCreate." },
      { property: "og:title", content: "Friends — CoCreate" },
      { property: "og:description", content: "Find friends, manage requests, and see who you're walking with on CoCreate." },
    ],
  }),
});

const CSS = `
.fr-root *{box-sizing:border-box;}
.fr-root{min-height:100vh;background:#eee9d9;font-family:'Poppins',sans-serif;color:#20201c;}
.fr-shell{max-width:820px;margin:0 auto;padding:44px 28px 100px;}
.fr-head{margin-bottom:28px;}
.fr-eyebrow{font-size:11px;font-weight:800;color:#8a8678;letter-spacing:0.16em;text-transform:uppercase;margin-bottom:8px;}
.fr-title{font-size:32px;font-weight:900;color:#181A4D;letter-spacing:-0.03em;margin:0 0 6px;line-height:1.05;}
.fr-sub{font-size:14px;color:#8a8678;font-weight:500;line-height:1.55;max-width:560px;margin:0;}
.fr-cap{display:inline-flex;align-items:center;gap:8px;background:#fff;border:1px solid rgba(20,20,20,0.08);border-radius:20px;padding:7px 14px;font-size:12px;font-weight:800;color:#181A4D;margin-top:14px;letter-spacing:-0.005em;}
.fr-cap .dot{width:7px;height:7px;border-radius:50%;background:#0F4A42;}
.fr-cap.full .dot{background:#FF340C;}
.fr-cap.full{color:#FF340C;border-color:rgba(255,52,12,0.35);}

.fr-section{margin-bottom:36px;}
.fr-section h2{font-size:12.5px;font-weight:800;color:#8a8678;letter-spacing:0.14em;text-transform:uppercase;margin:0 0 12px;}

.fr-search{position:relative;}
.fr-search input{width:100%;background:#fff;border:1.5px solid rgba(20,20,20,0.10);border-radius:22px;padding:13px 18px 13px 44px;font-family:'Poppins';font-size:14px;font-weight:500;color:#181A4D;outline:none;transition:border-color .15s ease;}
.fr-search input:focus{border-color:#181A4D;}
.fr-search svg{position:absolute;left:16px;top:50%;transform:translateY(-50%);width:16px;height:16px;stroke:#8a8678;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}

.fr-list{background:#fff;border:1px solid rgba(20,20,20,0.06);border-radius:16px;overflow:hidden;}
.fr-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:14px;align-items:center;padding:14px 18px;border-bottom:1px solid rgba(20,20,20,0.05);}
.fr-row:last-child{border-bottom:none;}
.fr-av{width:42px;height:42px;border-radius:50%;background:#0F4A42;color:#FBF8ED;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:15px;overflow:hidden;letter-spacing:-0.02em;flex-shrink:0;}
.fr-av img{width:100%;height:100%;object-fit:cover;}
.fr-name{font-size:14px;font-weight:800;color:#181A4D;letter-spacing:-0.005em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.fr-meta{font-size:11.5px;color:#8a8678;font-weight:600;margin-top:2px;}

.fr-btn{background:#181A4D;color:#fff;border:none;border-radius:20px;padding:8px 16px;font-family:'Poppins';font-weight:800;font-size:12px;cursor:pointer;letter-spacing:-0.005em;transition:opacity .15s ease;}
.fr-btn:hover{opacity:0.88;}
.fr-btn:disabled{opacity:0.45;cursor:not-allowed;}
.fr-btn.ghost{background:transparent;color:#181A4D;border:1.5px solid rgba(20,20,20,0.14);}
.fr-btn.ghost:hover{border-color:#181A4D;opacity:1;}
.fr-btn.danger{background:transparent;color:#8a8678;border:1.5px solid rgba(20,20,20,0.10);}
.fr-btn.danger:hover{color:#FF340C;border-color:#FF340C;opacity:1;}
.fr-btn.accept{background:#0F4A42;}
.fr-btnrow{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;}
.fr-pending{font-size:11.5px;font-weight:800;color:#8a8678;letter-spacing:0.06em;text-transform:uppercase;padding:8px 10px;}
.fr-full{font-size:11.5px;font-weight:800;color:#FF340C;letter-spacing:0.02em;padding:8px 10px;text-align:right;}

.fr-empty{padding:22px;text-align:center;color:#8a8678;font-size:13px;line-height:1.55;}
.fr-empty strong{display:block;color:#181A4D;font-weight:800;font-size:14px;margin-bottom:4px;}

.fr-gate{background:#fff;border:1px solid rgba(20,20,20,0.08);border-left:4px solid #FF340C;border-radius:14px;padding:22px;max-width:520px;}
.fr-gate h3{font-size:16px;font-weight:800;color:#181A4D;margin:0 0 6px;}
.fr-gate p{font-size:13.5px;color:#8a8678;margin:0 0 14px;line-height:1.55;}
.fr-gate a{background:#181A4D;color:#fff;font-weight:800;font-size:12.5px;padding:9px 18px;border-radius:20px;text-decoration:none;display:inline-block;}

.fr-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#181A4D;color:#fff;padding:11px 18px;border-radius:20px;font-size:12.5px;font-weight:700;box-shadow:0 12px 30px rgba(0,0,0,0.2);z-index:80;}

@media (max-width:640px){.fr-title{font-size:26px;} .fr-shell{padding:28px 18px 100px;}}

.fr-modal-back{position:fixed;inset:0;background:rgba(20,20,28,0.55);z-index:90;display:flex;align-items:center;justify-content:center;padding:20px;}
.fr-modal{background:#fff;border-radius:20px;width:100%;max-width:440px;padding:26px 24px;box-shadow:0 30px 60px rgba(0,0,0,0.3);}
.fr-modal h3{margin:0 0 4px;font-size:20px;font-weight:900;color:#181A4D;letter-spacing:-0.02em;}
.fr-modal p{margin:0 0 18px;font-size:13px;color:#8a8678;font-weight:500;line-height:1.5;}
.fr-field{margin-bottom:14px;}
.fr-field label{display:block;font-size:10.5px;font-weight:800;color:#8a8678;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:6px;}
.fr-field input, .fr-field select{width:100%;background:#FBF8ED;border:1.5px solid rgba(20,20,20,0.10);border-radius:14px;padding:11px 14px;font-family:'Poppins';font-size:13.5px;font-weight:500;color:#181A4D;outline:none;transition:border-color .15s ease;}
.fr-field input:focus, .fr-field select:focus{border-color:#181A4D;}
.fr-seg{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.fr-seg button{background:#FBF8ED;border:1.5px solid rgba(20,20,20,0.10);border-radius:14px;padding:10px;font-family:'Poppins';font-weight:800;font-size:12px;color:#8a8678;cursor:pointer;letter-spacing:-0.005em;transition:all .15s ease;}
.fr-seg button.on{background:#181A4D;border-color:#181A4D;color:#fff;}
.fr-modal-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:22px;}
.fr-err{font-size:12px;color:#FF340C;font-weight:700;margin-top:-6px;margin-bottom:10px;}
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

function Avatar({ profile }: { profile?: Pick<Profile, "name" | "avatar_url"> | null }) {
  return (
    <div className="fr-av">
      {profile?.avatar_url ? <img src={profile.avatar_url} alt={profile.name ?? ""} /> : initials(profile?.name)}
    </div>
  );
}

function FriendsPage() {
  const { userId, ready } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [discQuery, setDiscQuery] = useState("");

  useEffect(() => {
    document.body.style.background = "#eee9d9";
    return () => { document.body.style.background = ""; };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  // All friendships involving current user
  const friendsQ = useQuery({
    queryKey: ["friendships", userId],
    enabled: ready && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("friendships")
        .select("*")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Friendship[];
    },
  });

  const friendships = friendsQ.data ?? [];
  const accepted = friendships.filter((f) => f.status === "accepted");
  const incoming = friendships.filter((f) => f.status === "pending" && f.addressee_id === userId);
  const outgoing = friendships.filter((f) => f.status === "pending" && f.requester_id === userId);
  const friendCount = accepted.length;
  const atCap = friendCount >= FRIEND_CAP;

  // Collect all counterpart IDs to fetch profiles
  const counterpartIds = useMemo(() => {
    const s = new Set<string>();
    for (const f of friendships) {
      s.add(f.requester_id === userId ? f.addressee_id : f.requester_id);
    }
    return Array.from(s);
  }, [friendships, userId]);

  const profilesQ = useQuery({
    queryKey: ["friend-profiles", counterpartIds.sort().join(",")],
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

  // Search: only when 2+ chars, exclude self and anyone already in a friendship (any status)
  const q = query.trim();
  const existingIds = useMemo(() => {
    const s = new Set<string>();
    if (userId) s.add(userId);
    for (const f of friendships) {
      s.add(f.requester_id === userId ? f.addressee_id : f.requester_id);
    }
    return s;
  }, [friendships, userId]);

  const searchQ = useQuery({
    queryKey: ["friend-search", q, userId],
    enabled: ready && !!userId && q.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,name,avatar_url,member_since,streak_count,created_at,updated_at")
        .ilike("name", `%${q}%`)
        .limit(20);
      if (error) throw error;
      return ((data ?? []) as Profile[]).filter((p) => !existingIds.has(p.id));
    },
  });

  const sendRequest = useMutation({
    mutationFn: async (addresseeId: string) => {
      if (!userId) throw new Error("Not signed in");
      const { error } = await supabase.from("friendships").insert({
        requester_id: userId, addressee_id: addresseeId, status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setToast("Friend request sent");
      qc.invalidateQueries({ queryKey: ["friendships", userId] });
    },
    onError: (e: any) => setToast(e?.message ?? "Couldn't send request"),
  });

  const accept = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("friendships").update({ status: "accepted" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setToast("Friend added");
      qc.invalidateQueries({ queryKey: ["friendships", userId] });
    },
    onError: (e: any) => setToast(e?.message?.includes("Friends list full") ? "Friends list full (10/10)" : (e?.message ?? "Couldn't accept")),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("friendships").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["friendships", userId] }),
  });

  // ---------------- Discipleship ----------------
  const discQ = useQuery({
    queryKey: ["discipleships", userId],
    enabled: ready && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discipleships")
        .select("*")
        .or(`mentor_id.eq.${userId},disciple_id.eq.${userId}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Discipleship[];
    },
  });
  const discs = discQ.data ?? [];
  const disciplersAccepted = discs.filter((d) => d.status === "accepted" && d.disciple_id === userId); // mentor = counterpart
  const disciplesAccepted = discs.filter((d) => d.status === "accepted" && d.mentor_id === userId);   // disciple = counterpart
  const discIncoming = discs.filter((d) => d.status === "pending" && d.requester_id !== userId);
  const discOutgoing = discs.filter((d) => d.status === "pending" && d.requester_id === userId);

  const discCounterpartIds = useMemo(() => {
    const s = new Set<string>();
    for (const d of discs) s.add(d.mentor_id === userId ? d.disciple_id : d.mentor_id);
    return Array.from(s);
  }, [discs, userId]);

  const discProfilesQ = useQuery({
    queryKey: ["disc-profiles", discCounterpartIds.sort().join(",")],
    enabled: discCounterpartIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id,name,avatar_url,member_since,streak_count,created_at,updated_at").in("id", discCounterpartIds);
      if (error) throw error;
      const map: Record<string, Profile> = {};
      for (const p of (data ?? []) as Profile[]) map[p.id] = p;
      return map;
    },
  });
  const discProfiles = discProfilesQ.data ?? {};

  const dq = discQuery.trim();
  const discExistingIds = useMemo(() => {
    const s = new Set<string>();
    if (userId) s.add(userId);
    for (const d of discs) s.add(d.mentor_id === userId ? d.disciple_id : d.mentor_id);
    return s;
  }, [discs, userId]);

  const discSearchQ = useQuery({
    queryKey: ["disc-search", dq, userId],
    enabled: ready && !!userId && dq.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,name,avatar_url,member_since,streak_count,created_at,updated_at")
        .ilike("name", `%${dq}%`)
        .limit(20);
      if (error) throw error;
      return ((data ?? []) as Profile[]).filter((p) => !discExistingIds.has(p.id));
    },
  });

  const sendDiscRequest = useMutation({
    mutationFn: async (vars: { otherId: string; role: "discipler" | "disciple" }) => {
      if (!userId) throw new Error("Not signed in");
      // role = the role the OTHER person will fill
      const mentor_id = vars.role === "discipler" ? vars.otherId : userId;
      const disciple_id = vars.role === "discipler" ? userId : vars.otherId;
      const { error } = await supabase.from("discipleships").insert({
        mentor_id, disciple_id, requester_id: userId, status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      setToast(vars.role === "discipler" ? "Invited to disciple you" : "Invited to be your disciple");
      qc.invalidateQueries({ queryKey: ["discipleships", userId] });
    },
    onError: (e: any) => setToast(e?.message?.includes("duplicate") ? "Already invited" : (e?.message ?? "Couldn't send request")),
  });

  const acceptDisc = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("discipleships").update({ status: "accepted" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setToast("Discipleship started");
      qc.invalidateQueries({ queryKey: ["discipleships", userId] });
    },
    onError: (e: any) => setToast(e?.message ?? "Couldn't accept"),
  });

  const removeDisc = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("discipleships").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["discipleships", userId] }),
  });

  // ---------------- External invites (email / SMS) ----------------
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<"discipler" | "disciple">("discipler");
  const [inviteChannel, setInviteChannel] = useState<"email" | "sms">("email");
  const [inviteContact, setInviteContact] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteErr, setInviteErr] = useState<string | null>(null);

  const invitesQ = useQuery({
    queryKey: ["disc-invites", userId],
    enabled: ready && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discipleship_invites")
        .select("*")
        .eq("inviter_id", userId!)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DiscInvite[];
    },
  });
  const pendingInvites = invitesQ.data ?? [];

  const sendExternalInvite = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not signed in");
      const contact = inviteContact.trim();
      if (!contact) throw new Error("Enter an email or phone number");
      if (inviteChannel === "email") {
        const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
        if (!ok) throw new Error("Enter a valid email");
      } else {
        const digits = contact.replace(/\D/g, "");
        if (digits.length < 7) throw new Error("Enter a valid phone number");
      }
      const { data, error } = await supabase.from("discipleship_invites").insert({
        inviter_id: userId,
        role: inviteRole,
        channel: inviteChannel,
        contact,
        invitee_name: inviteName.trim() || null,
        status: "pending",
      }).select().single();
      if (error) throw error;
      return data as DiscInvite;
    },
    onSuccess: (row) => {
      // Open the user's mail/messages app pre-filled with an invite
      const senderName = (typeof window !== "undefined" && window.sessionStorage.getItem("cocreate:name")) || "A friend";
      const roleText = row.role === "discipler"
        ? `${senderName} is inviting you to disciple them on CoCreate.`
        : `${senderName} is inviting you to be their disciple on CoCreate.`;
      const body = `${roleText}\n\nCoCreate is a quiet space for shared devotional practice. Join here: ${window.location.origin}/auth`;
      if (row.channel === "email") {
        const subject = row.role === "discipler" ? "Would you disciple me?" : "Would you be my disciple?";
        window.location.href = `mailto:${encodeURIComponent(row.contact)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      } else {
        window.location.href = `sms:${encodeURIComponent(row.contact)}?&body=${encodeURIComponent(body)}`;
      }
      setToast("Invite ready to send");
      setInviteOpen(false);
      setInviteContact(""); setInviteName(""); setInviteErr(null);
      qc.invalidateQueries({ queryKey: ["disc-invites", userId] });
    },
    onError: (e: any) => setInviteErr(e?.message ?? "Couldn't create invite"),
  });

  const cancelInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("discipleship_invites").update({ status: "canceled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["disc-invites", userId] }),
  });

  const resendInvite = (row: DiscInvite) => {
    const senderName = (typeof window !== "undefined" && window.sessionStorage.getItem("cocreate:name")) || "A friend";
    const roleText = row.role === "discipler"
      ? `${senderName} is inviting you to disciple them on CoCreate.`
      : `${senderName} is inviting you to be their disciple on CoCreate.`;
    const body = `${roleText}\n\nCoCreate is a quiet space for shared devotional practice. Join here: ${window.location.origin}/auth`;
    if (row.channel === "email") {
      const subject = row.role === "discipler" ? "Would you disciple me?" : "Would you be my disciple?";
      window.location.href = `mailto:${encodeURIComponent(row.contact)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } else {
      window.location.href = `sms:${encodeURIComponent(row.contact)}?&body=${encodeURIComponent(body)}`;
    }
  };

  const openInviteModal = (role: "discipler" | "disciple") => {
    setInviteRole(role);
    setInviteChannel("email");
    setInviteContact("");
    setInviteName("");
    setInviteErr(null);
    setInviteOpen(true);
  };





  if (ready && !userId) {
    return (
      <AppShell current="profile">
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="fr-root">
          <div className="fr-shell">
            <div className="fr-gate">
              <h3>Sign in to find friends</h3>
              <p>Friends on CoCreate is for signed-in members. Sign in to send and accept requests.</p>
              <a href="/auth">Sign in</a>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell current="profile">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="fr-root">
        <div className="fr-shell">
          <header className="fr-head" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", alignItems: "start", gap: 16 }}>
            <div>
              <div className="fr-eyebrow">Community</div>
              <h1 className="fr-title">Friends</h1>
              <p className="fr-sub">Walk with a small circle. Friends is capped at 10 people so it stays personal.</p>
              <div className={`fr-cap ${atCap ? "full" : ""}`}>
                <span className="dot" />
                {friendCount}/{FRIEND_CAP} friends
              </div>
            </div>
            <button
              className="fr-btn"
              disabled={atCap}
              title={atCap ? "Friends list full (10/10)" : "Find and add a friend"}
              onClick={() => {
                const el = document.getElementById("fr-find-input") as HTMLInputElement | null;
                if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(() => el.focus(), 350); }
              }}
              style={{ padding: "11px 20px", fontSize: 13, whiteSpace: "nowrap" }}
            >
              {atCap ? "Friends list full (10/10)" : "+ Add friend"}
            </button>
          </header>

          {/* Incoming requests */}
          {incoming.length > 0 && (
            <section className="fr-section">
              <h2>Requests · {incoming.length}</h2>
              <div className="fr-list">
                {incoming.map((f) => {
                  const p = profiles[f.requester_id];
                  return (
                    <div key={f.id} className="fr-row">
                      <Avatar profile={p} />
                      <div style={{ minWidth: 0 }}>
                        <div className="fr-name">{p?.name ?? "Someone"}</div>
                        <div className="fr-meta">Wants to be your friend</div>
                      </div>
                      <div className="fr-btnrow">
                        {atCap ? (
                          <span className="fr-full">Friends list full (10/10)</span>
                        ) : (
                          <button className="fr-btn accept" disabled={accept.isPending} onClick={() => accept.mutate(f.id)}>Accept</button>
                        )}
                        <button className="fr-btn danger" disabled={remove.isPending} onClick={() => remove.mutate(f.id)}>Decline</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Friends list */}
          <section className="fr-section">
            <h2>Your friends</h2>
            {accepted.length === 0 ? (
              <div className="fr-list">
                <div className="fr-empty">
                  <strong>No friends yet</strong>
                  Search for someone below to send your first request.
                </div>
              </div>
            ) : (
              <div className="fr-list">
                {accepted.map((f) => {
                  const otherId = f.requester_id === userId ? f.addressee_id : f.requester_id;
                  const p = profiles[otherId];
                  return (
                    <div key={f.id} className="fr-row">
                      <Avatar profile={p} />
                      <div style={{ minWidth: 0 }}>
                        <div className="fr-name">{p?.name ?? "Friend"}</div>
                        <div className="fr-meta">Friends since {new Date(f.updated_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</div>
                      </div>
                      <div className="fr-btnrow">
                        <button className="fr-btn ghost" onClick={() => nav({ to: "/messages", search: { with: otherId } })}>Message</button>
                        <button className="fr-btn danger" disabled={remove.isPending} onClick={() => { if (confirm("Remove this friend?")) remove.mutate(f.id); }}>Remove</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Find friends */}
          <section className="fr-section">
            <h2>Find friends</h2>
            <div className="fr-search" style={{ marginBottom: 14 }}>
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
              <input
                type="text"
                placeholder="Search by name…"
                id="fr-find-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {q.length < 2 ? (
              <div className="fr-list"><div className="fr-empty">Type at least 2 characters to search.</div></div>
            ) : searchQ.isLoading ? (
              <div className="fr-list"><div className="fr-empty">Searching…</div></div>
            ) : (searchQ.data ?? []).length === 0 ? (
              <div className="fr-list">
                <div className="fr-empty">
                  <strong>No matches</strong>
                  No one found for "{q}" — try a different name.
                </div>
              </div>
            ) : (
              <div className="fr-list">
                {(searchQ.data ?? []).map((p) => {
                  const pending = sendRequest.isPending && sendRequest.variables === p.id;
                  return (
                    <div key={p.id} className="fr-row">
                      <Avatar profile={p} />
                      <div style={{ minWidth: 0 }}>
                        <div className="fr-name">{p.name ?? "Member"}</div>
                        <div className="fr-meta">Member since {new Date(p.member_since).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</div>
                      </div>
                      <div className="fr-btnrow">
                        {atCap ? (
                          <span className="fr-full">Friends list full (10/10)</span>
                        ) : (
                          <button className="fr-btn" disabled={pending} onClick={() => sendRequest.mutate(p.id)}>
                            {pending ? "Sending…" : "Add Friend"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Outgoing pending */}
          {outgoing.length > 0 && (
            <section className="fr-section">
              <h2>Awaiting response · {outgoing.length}</h2>
              <div className="fr-list">
                {outgoing.map((f) => {
                  const p = profiles[f.addressee_id];
                  return (
                    <div key={f.id} className="fr-row">
                      <Avatar profile={p} />
                      <div style={{ minWidth: 0 }}>
                        <div className="fr-name">{p?.name ?? "Member"}</div>
                        <div className="fr-meta">Request sent {new Date(f.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
                      </div>
                      <div className="fr-btnrow">
                        <button className="fr-btn danger" disabled={remove.isPending} onClick={() => remove.mutate(f.id)}>Cancel</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ============ Discipleship ============ */}
          <div style={{ height: 16, borderTop: "1px solid rgba(20,20,20,0.08)", margin: "24px 0 32px" }} />

          <header className="fr-head" style={{ marginBottom: 20, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", alignItems: "start", gap: 16 }}>
            <div>
              <div className="fr-eyebrow">Discipleship</div>
              <h1 className="fr-title" style={{ fontSize: 26 }}>Walking together</h1>
              <p className="fr-sub">Discipleship is separate from friends. Invite someone to disciple you, or invite someone to be your disciple.</p>
            </div>
            <div className="fr-btnrow" style={{ justifyContent: "flex-end" }}>
              <button className="fr-btn ghost" style={{ padding: "10px 16px", fontSize: 12.5 }} onClick={() => openInviteModal("discipler")}>
                + Invite discipler
              </button>
              <button className="fr-btn" style={{ padding: "10px 16px", fontSize: 12.5 }} onClick={() => openInviteModal("disciple")}>
                + Invite disciple
              </button>
            </div>
          </header>

          {/* Pending external invites (email / text) */}
          {pendingInvites.length > 0 && (
            <section className="fr-section">
              <h2>Pending invites · {pendingInvites.length}</h2>
              <div className="fr-list">
                {pendingInvites.map((inv) => (
                  <div key={inv.id} className="fr-row">
                    <div className="fr-av" style={{ background: inv.role === "discipler" ? "#8B5A2B" : "#0F4A42" }}>
                      {inv.channel === "email" ? (
                        <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: "#FBF8ED", fill: "none", strokeWidth: 2 }}><path d="M4 4h16v16H4z"/><path d="M4 4l8 8 8-8"/></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: "#FBF8ED", fill: "none", strokeWidth: 2 }}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="fr-name">{inv.invitee_name || inv.contact}</div>
                      <div className="fr-meta">
                        Invited {inv.role === "discipler" ? "to disciple you" : "as your disciple"} · via {inv.channel === "email" ? "email" : "text"} · <span style={{ color: "#B8860B", fontWeight: 800 }}>Pending</span>
                      </div>
                    </div>
                    <div className="fr-btnrow">
                      <button className="fr-btn ghost" onClick={() => resendInvite(inv)}>Resend</button>
                      <button className="fr-btn danger" disabled={cancelInvite.isPending} onClick={() => cancelInvite.mutate(inv.id)}>Cancel</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}



          {/* Discipleship requests */}
          {discIncoming.length > 0 && (
            <section className="fr-section">
              <h2>Discipleship requests · {discIncoming.length}</h2>
              <div className="fr-list">
                {discIncoming.map((d) => {
                  const otherId = d.requester_id;
                  const p = discProfiles[otherId];
                  const invitingMeAs = d.mentor_id === userId ? "discipler" : "disciple"; // my role in this pair
                  const label = invitingMeAs === "discipler" ? "wants you to disciple them" : "wants to disciple you";
                  return (
                    <div key={d.id} className="fr-row">
                      <Avatar profile={p} />
                      <div style={{ minWidth: 0 }}>
                        <div className="fr-name">{p?.name ?? "Someone"}</div>
                        <div className="fr-meta">{label}</div>
                      </div>
                      <div className="fr-btnrow">
                        <button className="fr-btn accept" disabled={acceptDisc.isPending} onClick={() => acceptDisc.mutate(d.id)}>Accept</button>
                        <button className="fr-btn danger" disabled={removeDisc.isPending} onClick={() => removeDisc.mutate(d.id)}>Decline</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Discipling Me */}
          <section className="fr-section">
            <h2>Discipling me · {disciplersAccepted.length}</h2>
            {disciplersAccepted.length === 0 ? (
              <div className="fr-list"><div className="fr-empty"><strong>No disciplers yet</strong>Invite someone below to disciple you.</div></div>
            ) : (
              <div className="fr-list">
                {disciplersAccepted.map((d) => {
                  const p = discProfiles[d.mentor_id];
                  return (
                    <div key={d.id} className="fr-row">
                      <Avatar profile={p} />
                      <div style={{ minWidth: 0 }}>
                        <div className="fr-name">{p?.name ?? "Discipler"}</div>
                        <div className="fr-meta">Discipling you since {new Date(d.updated_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</div>
                      </div>
                      <div className="fr-btnrow">
                        <button className="fr-btn ghost" onClick={() => nav({ to: "/messages", search: { with: d.mentor_id } })}>Message</button>
                        <button className="fr-btn danger" disabled={removeDisc.isPending} onClick={() => { if (confirm("End this discipleship?")) removeDisc.mutate(d.id); }}>Remove</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* I'm Discipling */}
          <section className="fr-section">
            <h2>I'm discipling · {disciplesAccepted.length}</h2>
            {disciplesAccepted.length === 0 ? (
              <div className="fr-list"><div className="fr-empty"><strong>No disciples yet</strong>Invite someone below to be your disciple.</div></div>
            ) : (
              <div className="fr-list">
                {disciplesAccepted.map((d) => {
                  const p = discProfiles[d.disciple_id];
                  return (
                    <div key={d.id} className="fr-row">
                      <Avatar profile={p} />
                      <div style={{ minWidth: 0 }}>
                        <div className="fr-name">{p?.name ?? "Disciple"}</div>
                        <div className="fr-meta">Discipling since {new Date(d.updated_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</div>
                      </div>
                      <div className="fr-btnrow">
                        <button className="fr-btn ghost" onClick={() => nav({ to: "/messages", search: { with: d.disciple_id } })}>Message</button>
                        <button className="fr-btn danger" disabled={removeDisc.isPending} onClick={() => { if (confirm("End this discipleship?")) removeDisc.mutate(d.id); }}>Remove</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Find people to disciple / be discipled by */}
          <section className="fr-section">
            <h2>Invite a discipler or disciple</h2>
            <div className="fr-search" style={{ marginBottom: 14 }}>
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
              <input
                type="text"
                placeholder="Search by name…"
                value={discQuery}
                onChange={(e) => setDiscQuery(e.target.value)}
              />
            </div>
            {dq.length < 2 ? (
              <div className="fr-list"><div className="fr-empty">Type at least 2 characters to search.</div></div>
            ) : discSearchQ.isLoading ? (
              <div className="fr-list"><div className="fr-empty">Searching…</div></div>
            ) : (discSearchQ.data ?? []).length === 0 ? (
              <div className="fr-list"><div className="fr-empty"><strong>No matches</strong>No one found for "{dq}".</div></div>
            ) : (
              <div className="fr-list">
                {(discSearchQ.data ?? []).map((p) => {
                  const pending = sendDiscRequest.isPending && sendDiscRequest.variables?.otherId === p.id;
                  return (
                    <div key={p.id} className="fr-row">
                      <Avatar profile={p} />
                      <div style={{ minWidth: 0 }}>
                        <div className="fr-name">{p.name ?? "Member"}</div>
                        <div className="fr-meta">Member since {new Date(p.member_since).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</div>
                      </div>
                      <div className="fr-btnrow">
                        <button className="fr-btn ghost" disabled={pending} onClick={() => sendDiscRequest.mutate({ otherId: p.id, role: "discipler" })}>
                          Invite as discipler
                        </button>
                        <button className="fr-btn" disabled={pending} onClick={() => sendDiscRequest.mutate({ otherId: p.id, role: "disciple" })}>
                          Invite as disciple
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Outgoing discipleship requests */}
          {discOutgoing.length > 0 && (
            <section className="fr-section">
              <h2>Awaiting response · {discOutgoing.length}</h2>
              <div className="fr-list">
                {discOutgoing.map((d) => {
                  const otherId = d.mentor_id === userId ? d.disciple_id : d.mentor_id;
                  const p = discProfiles[otherId];
                  const role = d.mentor_id === userId ? "as your disciple" : "to disciple you";
                  return (
                    <div key={d.id} className="fr-row">
                      <Avatar profile={p} />
                      <div style={{ minWidth: 0 }}>
                        <div className="fr-name">{p?.name ?? "Member"}</div>
                        <div className="fr-meta">Invited {role} · {new Date(d.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
                      </div>
                      <div className="fr-btnrow">
                        <button className="fr-btn danger" disabled={removeDisc.isPending} onClick={() => removeDisc.mutate(d.id)}>Cancel</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
        {inviteOpen && (
          <div className="fr-modal-back" onClick={(e) => { if (e.target === e.currentTarget) setInviteOpen(false); }}>
            <div className="fr-modal" role="dialog" aria-label="Invite discipler or disciple">
              <h3>Invite {inviteRole === "discipler" ? "a discipler" : "a disciple"}</h3>
              <p>{inviteRole === "discipler" ? "Ask someone to disciple you — we'll open a pre-filled message for you to send." : "Ask someone to be your disciple — we'll open a pre-filled message for you to send."}</p>

              <div className="fr-field">
                <label>Role</label>
                <div className="fr-seg">
                  <button type="button" className={inviteRole === "discipler" ? "on" : ""} onClick={() => setInviteRole("discipler")}>They'll disciple me</button>
                  <button type="button" className={inviteRole === "disciple" ? "on" : ""} onClick={() => setInviteRole("disciple")}>They'll be my disciple</button>
                </div>
              </div>

              <div className="fr-field">
                <label>Send via</label>
                <div className="fr-seg">
                  <button type="button" className={inviteChannel === "email" ? "on" : ""} onClick={() => setInviteChannel("email")}>Email</button>
                  <button type="button" className={inviteChannel === "sms" ? "on" : ""} onClick={() => setInviteChannel("sms")}>Text</button>
                </div>
              </div>

              <div className="fr-field">
                <label>Their name (optional)</label>
                <input type="text" value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="e.g. Sarah" maxLength={80} />
              </div>

              <div className="fr-field">
                <label>{inviteChannel === "email" ? "Email address" : "Phone number"}</label>
                <input
                  type={inviteChannel === "email" ? "email" : "tel"}
                  value={inviteContact}
                  onChange={(e) => setInviteContact(e.target.value)}
                  placeholder={inviteChannel === "email" ? "friend@example.com" : "+1 555 555 5555"}
                  maxLength={120}
                />
              </div>

              {inviteErr && <div className="fr-err">{inviteErr}</div>}

              <div className="fr-modal-actions">
                <button className="fr-btn ghost" onClick={() => setInviteOpen(false)}>Cancel</button>
                <button className="fr-btn" disabled={sendExternalInvite.isPending} onClick={() => sendExternalInvite.mutate()}>
                  {sendExternalInvite.isPending ? "Preparing…" : "Send invite"}
                </button>
              </div>
            </div>
          </div>
        )}
        {toast && <div className="fr-toast">{toast}</div>}

      </div>
    </AppShell>
  );
}
