import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const CSS = `
.fg-inner *{box-sizing:border-box;}
.fg-inner{font-family:'Poppins',sans-serif;color:#20201c;}
.fg-inner-head{display:flex;align-items:center;gap:10px;padding:16px 18px;border-bottom:1px solid rgba(20,20,20,0.05);}
.fg-inner-back{background:transparent;border:none;color:#8a8678;font-weight:800;font-size:12.5px;cursor:pointer;padding:6px 8px;font-family:'Poppins';}
.fg-inner-back:hover{color:#181A4D;}
.fg-inner-title{font-size:15px;font-weight:900;color:#181A4D;letter-spacing:-0.01em;margin:0;}
.fg-inner-body{padding:20px 18px 40px;overflow-y:auto;flex:1;}
.fg-section{margin-bottom:28px;}
.fg-section:last-child{margin-bottom:0;}
.fg-section h2{font-size:11.5px;font-weight:800;color:#8a8678;letter-spacing:0.14em;text-transform:uppercase;margin:0 0 10px;}
.fg-card{background:#fff;border:1px solid rgba(20,20,20,0.06);border-radius:14px;padding:16px;}
.fg-form{display:flex;flex-direction:column;gap:11px;}
.fg-label{font-size:11px;font-weight:800;color:#8a8678;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:4px;}
.fg-input, .fg-textarea{width:100%;background:#fff;border:1.5px solid rgba(20,20,20,0.10);border-radius:12px;padding:10px 12px;font-family:'Poppins';font-size:13.5px;font-weight:500;color:#181A4D;outline:none;transition:border-color .15s;}
.fg-input:focus, .fg-textarea:focus{border-color:#181A4D;}
.fg-textarea{min-height:64px;resize:vertical;}
.fg-btn{background:#181A4D;color:#fff;border:none;border-radius:18px;padding:9px 16px;font-family:'Poppins';font-weight:800;font-size:12px;cursor:pointer;letter-spacing:-0.005em;transition:opacity .15s;align-self:flex-start;}
.fg-btn:hover{opacity:0.88;}
.fg-btn:disabled{opacity:0.45;cursor:not-allowed;}
.fg-btn.accept{background:#0F4A42;}
.fg-limit{background:#FBF8ED;border:1px dashed rgba(20,20,20,0.14);border-radius:12px;padding:14px;font-size:12.5px;color:#8a8678;font-weight:600;}
.fg-limit strong{color:#181A4D;display:block;font-weight:800;margin-bottom:2px;font-size:13px;}
.fg-list{background:#fff;border:1px solid rgba(20,20,20,0.06);border-radius:14px;overflow:hidden;}
.fg-name{font-size:14px;font-weight:800;color:#181A4D;letter-spacing:-0.005em;}
.fg-meta{font-size:11.5px;color:#8a8678;font-weight:600;margin-top:3px;}
.fg-badge{display:inline-block;background:#DCE07A;color:#181A4D;font-size:10px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;padding:3px 8px;border-radius:10px;margin-left:8px;}
.fg-badge.member{background:#FBF8ED;color:#8a8678;}
.fg-full-badge{background:#FF340C;color:#fff;}
.fg-invite{background:#FBF8ED;border:1px dashed rgba(20,20,20,0.14);border-radius:10px;padding:10px 12px;margin-top:10px;font-family:'Menlo', monospace;font-size:12.5px;color:#181A4D;font-weight:700;letter-spacing:0.02em;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;}
.fg-invite button{background:transparent;border:1px solid rgba(20,20,20,0.14);border-radius:12px;padding:5px 10px;font-family:'Poppins';font-size:10.5px;font-weight:800;cursor:pointer;color:#181A4D;}
.fg-invite button:hover{background:#fff;}
.fg-empty{padding:20px;text-align:center;color:#8a8678;font-size:12.5px;line-height:1.55;}
.fg-empty strong{display:block;color:#181A4D;font-weight:800;font-size:13.5px;margin-bottom:4px;}
.fg-err{color:#FF340C;font-size:12px;font-weight:700;}
.fg-toast-inner{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);background:#181A4D;color:#fff;padding:10px 16px;border-radius:18px;font-size:12px;font-weight:700;box-shadow:0 12px 30px rgba(0,0,0,0.2);z-index:10;}
`;

function genInviteCode() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export function GroupsInner({ userId, onBack, prefilledCode }: {
  userId: string;
  onBack: () => void;
  prefilledCode?: string | null;
}) {
  const qc = useQueryClient();
  const [toast, setToast] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState((prefilledCode ?? "").toUpperCase());
  const [joinErr, setJoinErr] = useState<string | null>(null);

  useEffect(() => {
    if (prefilledCode) setJoinCode(prefilledCode.toUpperCase());
  }, [prefilledCode]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const profileQ = useQuery({
    queryKey: ["my-profile-facilitator", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, name, facilitator_level").eq("id", userId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const facilitatedQ = useQuery({
    queryKey: ["my-facilitated-groups", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facilitator_groups")
        .select("id, name, description, invite_code, created_at")
        .eq("facilitator_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const facilitatedIds = useMemo(() => (facilitatedQ.data ?? []).map((g) => g.id), [facilitatedQ.data]);

  const memberCountsQ = useQuery({
    queryKey: ["facilitator-group-counts", facilitatedIds],
    enabled: facilitatedIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facilitator_group_members")
        .select("group_id")
        .in("group_id", facilitatedIds);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data ?? []).forEach((r) => { counts[r.group_id] = (counts[r.group_id] ?? 0) + 1; });
      return counts;
    },
  });

  const membershipsQ = useQuery({
    queryKey: ["my-group-memberships", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facilitator_group_members")
        .select("group_id, joined_at, facilitator_groups!inner(id, name, description, facilitator_id)")
        .eq("user_id", userId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Group name is required");
      let lastErr: any = null;
      for (let i = 0; i < 5; i++) {
        const code = genInviteCode();
        const { data, error } = await supabase
          .from("facilitator_groups")
          .insert({ facilitator_id: userId, name: trimmed, description: description.trim() || null, invite_code: code })
          .select("id")
          .single();
        if (!error) return data;
        lastErr = error;
        if (!String(error.message ?? "").toLowerCase().includes("invite_code")) break;
      }
      throw lastErr ?? new Error("Failed to create group");
    },
    onSuccess: () => {
      setName(""); setDescription(""); setCreateErr(null);
      setToast("Group created");
      qc.invalidateQueries({ queryKey: ["my-facilitated-groups", userId] });
      qc.invalidateQueries({ queryKey: ["msg-fg-threads", userId] });
    },
    onError: (e: any) => setCreateErr(e?.message ?? "Failed to create group"),
  });

  const joinMut = useMutation({
    mutationFn: async () => {
      const code = joinCode.trim().toUpperCase();
      if (!code) throw new Error("Enter an invite code");
      const { data, error } = await supabase.rpc("join_facilitator_group_by_code", { _code: code });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      setJoinCode(""); setJoinErr(null);
      setToast("Joined group");
      qc.invalidateQueries({ queryKey: ["my-group-memberships", userId] });
      qc.invalidateQueries({ queryKey: ["msg-fg-threads", userId] });
    },
    onError: (e: any) => setJoinErr(e?.message ?? "Could not join group"),
  });

  const level = profileQ.data?.facilitator_level as 1 | 2 | null | undefined;
  const facilitatedCount = facilitatedQ.data?.length ?? 0;
  const canCreate = (level === 1 && facilitatedCount === 0) || level === 2;
  const showCreateSection = level === 1 || level === 2;

  const copy = async (text: string, label = "Copied") => {
    try { await navigator.clipboard.writeText(text); setToast(label); } catch { setToast("Copy failed"); }
  };

  return (
    <div className="fg-inner" style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative", minHeight: 0 }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="fg-inner-head">
        <button className="fg-inner-back" onClick={onBack}>← Back to Messages</button>
        <h2 className="fg-inner-title" style={{ marginLeft: 4 }}>Groups</h2>
      </div>
      <div className="fg-inner-body">
        {/* Join section — always visible, primary entry point */}
        <div className="fg-section">
          <h2>Join a group</h2>
          <div className="fg-card">
            <div className="fg-form">
              <div>
                <div className="fg-label">Invite code</div>
                <input
                  className="fg-input"
                  value={joinCode}
                  maxLength={16}
                  placeholder="Enter 8-character code"
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  style={{ fontFamily: "Menlo, monospace", letterSpacing: "0.05em" }}
                />
              </div>
              {joinErr && <div className="fg-err">{joinErr}</div>}
              <button
                className="fg-btn accept"
                disabled={joinMut.isPending || !joinCode.trim()}
                onClick={() => joinMut.mutate()}
              >
                {joinMut.isPending ? "Joining…" : "Join Group"}
              </button>
            </div>
          </div>
        </div>

        {/* Create section — facilitators only */}
        {showCreateSection && (
          <div className="fg-section">
            <h2>Create a group</h2>
            {canCreate ? (
              <div className="fg-card">
                <div className="fg-form">
                  <div>
                    <div className="fg-label">Group name</div>
                    <input
                      className="fg-input"
                      value={name}
                      maxLength={80}
                      placeholder="e.g. Thursday Morning Group"
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <div className="fg-label">Description (optional)</div>
                    <textarea
                      className="fg-textarea"
                      value={description}
                      maxLength={300}
                      placeholder="What is this group about?"
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  {createErr && <div className="fg-err">{createErr}</div>}
                  <button
                    className="fg-btn"
                    disabled={createMut.isPending || !name.trim()}
                    onClick={() => createMut.mutate()}
                  >
                    {createMut.isPending ? "Creating…" : "Create Group"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="fg-limit">
                <strong>You've reached your group limit.</strong>
                Level 1 facilitators can create 1 group.
              </div>
            )}
          </div>
        )}

        {/* Facilitated groups list */}
        {showCreateSection && (
          <div className="fg-section">
            <h2>Groups you facilitate</h2>
            {facilitatedQ.isLoading ? (
              <div className="fg-empty">Loading…</div>
            ) : (facilitatedQ.data?.length ?? 0) === 0 ? (
              <div className="fg-list"><div className="fg-empty"><strong>No groups yet</strong>Create your first group above.</div></div>
            ) : (
              <div className="fg-list">
                {facilitatedQ.data!.map((g) => {
                  const count = memberCountsQ.data?.[g.id] ?? 0;
                  const isFull = count >= 25;
                  const link = typeof window !== "undefined" ? `${window.location.origin}/messages?view=groups&code=${g.invite_code}` : `/messages?view=groups&code=${g.invite_code}`;
                  return (
                    <div key={g.id} style={{ padding: "14px 16px", borderBottom: "1px solid rgba(20,20,20,0.05)" }}>
                      <div style={{ minWidth: 0 }}>
                        <div className="fg-name">
                          {g.name}
                          {isFull && <span className="fg-badge fg-full-badge">Full 25/25</span>}
                        </div>
                        <div className="fg-meta">{count}/25 members{g.description ? ` · ${g.description}` : ""}</div>
                      </div>
                      <div className="fg-invite">
                        <div>
                          <div style={{ fontSize: 9.5, fontWeight: 800, color: "#8a8678", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 3 }}>Invite code</div>
                          <div>{g.invite_code}</div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button onClick={() => copy(g.invite_code, "Code copied")}>Copy code</button>
                          <button onClick={() => copy(link, "Link copied")}>Copy link</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Memberships */}
        <div className="fg-section">
          <h2>Groups you belong to</h2>
          {membershipsQ.isLoading ? (
            <div className="fg-empty">Loading…</div>
          ) : (membershipsQ.data?.length ?? 0) === 0 ? (
            <div className="fg-list"><div className="fg-empty"><strong>No memberships yet</strong>Join a group using an invite code above.</div></div>
          ) : (
            <div className="fg-list">
              {membershipsQ.data!.map((m: any) => (
                <div key={m.group_id} style={{ padding: "12px 16px", borderBottom: "1px solid rgba(20,20,20,0.05)" }}>
                  <div className="fg-name">{m.facilitator_groups?.name}<span className="fg-badge member">Member</span></div>
                  {m.facilitator_groups?.description && <div className="fg-meta">{m.facilitator_groups.description}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {toast && <div className="fg-toast-inner">{toast}</div>}
    </div>
  );
}
