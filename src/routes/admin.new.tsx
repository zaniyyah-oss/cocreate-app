import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { ContentForm, KIND_META, KIND_LIST, type Kind } from "@/components/admin/content-form";

const searchSchema = z.object({
  kind: z.enum(["teaching", "essay", "podcast", "blog", "devotional"]).optional(),
});

export const Route = createFileRoute("/admin/new")({
  validateSearch: searchSchema,
  component: NewContent,
});

function NewContent() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [kind, setKind] = useState<Kind | null>(search.kind ?? null);

  if (!kind) {
    return (
      <>
        <h1 className="ad-h1">New content</h1>
        <p className="ad-sub">Choose what you're creating. You can save it as a draft and publish later.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 14, marginTop: 20 }}>
          {KIND_LIST.map((k) => {
            const m = KIND_META[k];
            return (
              <button
                key={k}
                className="ad-card"
                onClick={() => { setKind(k); navigate({ to: "/admin/new", search: { kind: k } }); }}
                style={{ textAlign: "left", cursor: "pointer", border: "1px solid rgba(20,20,20,0.06)" }}
              >
                <div style={{ fontSize: 15, fontWeight: 800, color: "#181A4D", marginBottom: 6 }}>{m.label}</div>
                <div style={{ fontSize: 12.5, color: "#8a8678", lineHeight: 1.5 }}>{m.blurb}</div>
              </button>
            );
          })}
        </div>
      </>
    );
  }

  const m = KIND_META[kind];
  return (
    <>
      <button
        onClick={() => { setKind(null); navigate({ to: "/admin/new", search: {} }); }}
        style={{ background: "none", border: "none", color: "#8a8678", fontSize: 12, cursor: "pointer", marginBottom: 8, fontFamily: "Poppins", fontWeight: 700 }}
      >← Choose a different type</button>
      <h1 className="ad-h1">New {m.label.toLowerCase()}</h1>
      <p className="ad-sub">{m.blurb}</p>
      <ContentForm kind={kind} />
    </>
  );
}
