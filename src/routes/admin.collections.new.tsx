import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CollectionForm } from "@/components/admin/collection-form";

export const Route = createFileRoute("/admin/collections/new")({
  component: NewCollection,
});

function NewCollection() {
  const navigate = useNavigate();
  return (
    <>
      <button
        onClick={() => navigate({ to: "/admin/collections" })}
        style={{ background: "none", border: "none", color: "#8a8678", fontSize: 12, cursor: "pointer", marginBottom: 8, fontFamily: "Poppins", fontWeight: 700 }}
      >← Back to collections</button>
      <h1 className="ad-h1">New collection</h1>
      <p className="ad-sub">Give it a title and description. You can add items after saving.</p>
      <CollectionForm />
    </>
  );
}
