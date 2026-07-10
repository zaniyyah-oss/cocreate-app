import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CollectionForm, type CollectionRow } from "@/components/admin/collection-form";

export const Route = createFileRoute("/admin/collections/$id")({
  component: EditCollection,
});

function EditCollection() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const q = useQuery({
    queryKey: ["admin-collection", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("id,title,description,description_md,cover_image_url,banner_url,status,slug")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as CollectionRow | null;
    },
  });

  return (
    <>
      <button
        onClick={() => navigate({ to: "/admin/collections" })}
        style={{ background: "none", border: "none", color: "#8a8678", fontSize: 12, cursor: "pointer", marginBottom: 8, fontFamily: "Poppins", fontWeight: 700 }}
      >← Back to collections</button>
      <h1 className="ad-h1">{q.data?.title ?? "Edit collection"}</h1>
      <p className="ad-sub">Edit details and manage the items included in this collection.</p>
      {q.isLoading ? (
        <div className="ad-empty">Loading…</div>
      ) : !q.data ? (
        <div className="ad-empty"><strong>Not found</strong>This collection may have been deleted.</div>
      ) : (
        <CollectionForm existing={q.data} />
      )}
    </>
  );
}
