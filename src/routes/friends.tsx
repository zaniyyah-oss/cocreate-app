import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { AppShell } from "@/components/AppShell";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Friendship = Database["public"]["Tables"]["friendships"]["Row"];
type Discipleship = Database["public"]["Tables"]["discipleships"]["Row"];

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
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);

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
          <header className="fr-head">
            <div className="fr-eyebrow">Community</div>
            <h1 className="fr-title">Friends</h1>
            <p className="fr-sub">Walk with a small circle. Friends is capped at 10 people so it stays personal.</p>
            <div className={`fr-cap ${atCap ? "full" : ""}`}>
              <span className="dot" />
              {friendCount}/{FRIEND_CAP} friends
            </div>
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
        </div>
        {toast && <div className="fr-toast">{toast}</div>}
      </div>
    </AppShell>
  );
}
