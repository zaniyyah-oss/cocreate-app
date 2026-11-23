import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TopBar, C } from "@/components/studio/ui";

export const Route = createFileRoute("/studio/team")({
  component: Team,
  head: () => ({ meta: [{ title: "Team — CoCreate Studio" }, { name: "description", content: "The CoCreate Studio team." }, { property: "og:title", content: "Team — CoCreate Studio" }, { property: "og:description", content: "The CoCreate Studio team." }] }),
});

function Team() {
  const q = useQuery({ queryKey: ["studio-admins"], queryFn: async () => { const { data, error } = await supabase.rpc("list_admins"); if (error) throw error; return data ?? []; } });
  return (
    <>
      <TopBar left={<h1>Team</h1>} right={<Link to="/admin/invites" className="st-btn">Invite someone</Link>} />
      <div style={{ padding: 28, maxWidth: 720 }}>
        <p className="st-help" style={{ marginTop: 0, fontSize: 13.5 }}>Everyone with admin access can use Studio.</p>
        <table className="st-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead><tbody>
          {(q.data ?? []).map((a: any) => (
            <tr key={a.user_id}>
              <td style={{ fontWeight: 600 }}><span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><span style={{ width: 30, height: 30, borderRadius: 99, background: C.SOFT, overflow: "hidden", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>{a.avatar_url ? <img src={a.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (a.name || a.email || "?").slice(0, 1).toUpperCase()}</span>{a.name || "—"}</span></td>
              <td style={{ color: C.MUTED }}>{a.email}</td><td>Admin</td>
            </tr>
          ))}
        </tbody></table>
      </div>
    </>
  );
}
