import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { ContentForm, KIND_META, type Kind } from "@/components/admin/content-form";

const searchSchema = z.object({
  kind: z.enum(["content", "template"]),
});

export const Route = createFileRoute("/admin/edit/$id")({
  validateSearch: searchSchema,
  component: EditPage,
});

function EditPage() {
  const { id } = Route.useParams();
  const { kind } = Route.useSearch();

  const contentQ = useQuery({
    queryKey: ["admin-content-one", id],
    enabled: kind === "content",
    queryFn: async () => {
      const { data, error } = await supabase.from("content_items").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const tplQ = useQuery({
    queryKey: ["admin-template-one", id],
    enabled: kind === "template",
    queryFn: async () => {
      const { data, error } = await supabase.from("devotional_templates").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const loading = (kind === "content" ? contentQ.isLoading : tplQ.isLoading);
  const row = kind === "content" ? contentQ.data : tplQ.data;

  if (loading) return <div className="ad-empty">Loading…</div>;
  if (!row) return (
    <div className="ad-empty">
      <strong>Not found</strong>
      This item may have been deleted. <Link to="/admin/content" style={{ color: "#181A4D", fontWeight: 700 }}>Back to content</Link>
    </div>
  );

  const editorKind: Kind = kind === "template"
    ? "devotional"
    : (row as { type: Kind }).type;
  const m = KIND_META[editorKind];

  return (
    <>
      <Link to="/admin/content" style={{ background: "none", border: "none", color: "#8a8678", fontSize: 12, fontWeight: 700, textDecoration: "none", marginBottom: 8, display: "inline-block" }}>← Back to content</Link>
      <h1 className="ad-h1">Edit {m.label.toLowerCase()}</h1>
      <p className="ad-sub">{row.title}</p>
      {kind === "content"
        ? <ContentForm kind={editorKind} existingContent={row as Parameters<typeof ContentForm>[0]["existingContent"]} />
        : <ContentForm kind="devotional" existingTemplate={row as Parameters<typeof ContentForm>[0]["existingTemplate"]} />
      }
    </>
  );
}
