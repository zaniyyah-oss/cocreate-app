import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/admin/invites")({
  component: AdminInvites,
});

type Invite = Database["public"]["Tables"]["admin_invites"]["Row"];
type Role = Database["public"]["Enums"]["app_role"];

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(255),
  role: z.enum(["admin", "moderator", "user"]),
});

const CSS = `
.iv-form{display:grid;grid-template-columns:1fr auto auto;gap:10px;align-items:end;background:#fff;padding:18px;border-radius:12px;border:1px solid rgba(20,20,20,0.06);margin-bottom:22px;}
.iv-form label{display:block;font-size:11px;font-weight:800;color:#181A4D;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:6px;}
.iv-form input, .iv-form select{padding:10px 12px;border:1px solid rgba(20,20,20,0.14);border-radius:8px;font-family:'Poppins';font-size:13px;background:#fff;color:#20201c;}
.iv-form input:focus, .iv-form select:focus{outline:none;border-color:#181A4D;}
@media (max-width:640px){.iv-form{grid-template-columns:1fr;} .iv-form > *{width:100%;}}
.iv-row{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:center;padding:14px 16px;background:#fff;border:1px solid rgba(20,20,20,0.06);border-radius:10px;margin-bottom:8px;}
.iv-row .email{font-weight:700;color:#181A4D;font-size:13.5px;}
.iv-row .meta{font-size:11px;color:#8a8678;margin-top:3px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;}
.iv-role{font-size:9.5px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;padding:3px 9px;border-radius:12px;background:#FFAE00;color:#181A4D;}
.iv-role.moderator{background:#DCE07A;}
.iv-role.user{background:#FBF8ED;color:#8a8678;}
.iv-state{font-size:9.5px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;padding:3px 9px;border-radius:12px;}
.iv-state.pending{background:#FBF8ED;color:#8a8678;border:1px solid rgba(20,20,20,0.1);}
.iv-state.active{background:#DCE07A;color:#181A4D;}
`;

function AdminInvites() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("admin");
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const invitesQ = useQuery({
    queryKey: ["admin-invites"],
    queryFn: async () => {
      const { data, error } = await supabase.from("admin_invites").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Invite[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: { email: string; role: Role }) => {
      const { error } = await supabase.from("admin_invites").insert({ email: input.email, role: input.role });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-invites"] });
      setEmail("");
      setNote("Invite added. When this person signs in with that email, they'll automatically get the role.");
    },
    onError: (e) => setErr(e instanceof Error ? e.message : "Failed to add invite"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("admin_invites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-invites"] }),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErr(null); setNote(null);
    const parsed = inviteSchema.safeParse({ email, role });
    if (!parsed.success) { setErr(parsed.error.issues[0]?.message ?? "Invalid input"); return; }
    create.mutate(parsed.data);
  };

  const invites = invitesQ.data ?? [];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <h1 className="ad-h1">Team</h1>
      <p className="ad-sub">Invite people to co-manage CoCreate. Once they sign in with the invited email, they get the role automatically — no extra step.</p>

      <form className="iv-form" onSubmit={onSubmit}>
        <div>
          <label>Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
        </div>
        <div>
          <label>Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="admin">Admin</option>
            <option value="moderator">Editor</option>
          </select>
        </div>
        <button type="submit" className="ad-btn" disabled={create.isPending}>{create.isPending ? "Adding…" : "Send invite"}</button>
      </form>

      {err && <div style={{ background: "#FFF0EC", color: "#8f2600", borderLeft: "3px solid #FF340C", padding: "10px 14px", borderRadius: 8, fontSize: 12.5, marginBottom: 14 }}>{err}</div>}
      {note && <div style={{ background: "#F1F5D9", color: "#2b4a00", borderLeft: "3px solid #97A02E", padding: "10px 14px", borderRadius: 8, fontSize: 12.5, marginBottom: 14 }}>{note}</div>}

      {invitesQ.isLoading ? (
        <div className="ad-empty">Loading…</div>
      ) : invites.length === 0 ? (
        <div className="ad-empty">
          <strong>No invites yet</strong>
          Add someone above to give them admin or editor access.
        </div>
      ) : (
        invites.map((iv) => (
          <div key={iv.id} className="iv-row">
            <div>
              <div className="email">{iv.email}</div>
              <div className="meta">
                <span className={`iv-role ${iv.role}`}>{iv.role === "moderator" ? "Editor" : iv.role}</span>
                <span className={`iv-state ${iv.accepted_at ? "active" : "pending"}`}>{iv.accepted_at ? "Active" : "Pending"}</span>
                <span>· Added {new Date(iv.created_at).toLocaleDateString()}</span>
                {iv.accepted_at && <span>· Joined {new Date(iv.accepted_at).toLocaleDateString()}</span>}
              </div>
            </div>
            <button
              className="ad-btn danger sm"
              onClick={() => { if (confirm(`Revoke access for ${iv.email}?`)) remove.mutate(iv.id); }}
              disabled={remove.isPending}
              title={iv.accepted_at ? "Removes the invite record. To revoke the actual role, remove it from the user_roles table." : "Remove pending invite"}
            >Remove</button>
          </div>
        ))
      )}
    </>
  );
}
