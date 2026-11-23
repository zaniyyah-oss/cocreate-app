import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStudioData, useInvalidateStudio } from "@/lib/studio-data";
import { pieceStatus } from "@/lib/studio-checklist";
import { TopBar, Btn, StatusPill, C } from "@/components/studio/ui";
import { seriesStatus } from "@/lib/series-status";

export const Route = createFileRoute("/studio/series/")({
  validateSearch: (s: Record<string, unknown>): { id?: string } => (typeof s.id === "string" ? { id: s.id } : {}),
  // Old links used ?id= — send them to the builder.
  beforeLoad: ({ search }) => { if (search.id) throw redirect({ to: "/studio/series/$id", params: { id: search.id } }); },
  component: SeriesList,
  head: () => ({ meta: [{ title: "Series — CoCreate Studio" }, { name: "description", content: "CoCreate series." }, { property: "og:title", content: "Series — CoCreate Studio" }, { property: "og:description", content: "CoCreate series." }] }),
});

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "series";

function SeriesList() {
  const navigate = useNavigate();
  const q = useStudioData();
  const invalidate = useInvalidateStudio();
  const series = q.data?.series ?? [];
  const create = async () => {
    const title = "Untitled series";
    const { data, error } = await supabase.from("collections").insert({ title, slug: `${slugify(title)}-${Math.random().toString(36).slice(2, 7)}`, status: "draft" }).select("id").single();
    if (error) { toast.error(error.message); return; }
    invalidate(); navigate({ to: "/studio/series/$id", params: { id: data.id } });
  };
  return (
    <>
      <TopBar left={<h1>Series</h1>} right={<Btn primary onClick={create}><Plus size={16} strokeWidth={1.7} />New series</Btn>} />
      <div style={{ padding: 28, maxWidth: 860 }}>
        {series.length === 0 && q.data && <div className="st-empty"><b>No series yet</b>Create the first one.</div>}
        {series.map((s) => {
          const st = seriesStatus(s.items.map((i) => {
            const p = q.data!.pieces.find((x) => x.id === (i.content_id ?? i.template_id));
            return p ? pieceStatus(p.rawStatus, p.releaseAt) : "planned";
          }));
          return (
            <Link key={s.id} to="/studio/series/$id" params={{ id: s.id }} style={{ padding: "14px 4px", borderTop: `1px solid ${C.LINE}`, display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ width: 72, aspectRatio: "16/10", borderRadius: 6, background: "#E9E6DF", overflow: "hidden", flex: "none" }}>{(s.banner_url || s.cover_image_url) && <img src={(s.banner_url || s.cover_image_url)!} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}</span>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ fontFamily: "Poppins", fontSize: 15, fontWeight: 600 }}>{s.title}</span>
                <span style={{ fontSize: 12.5, color: C.MUTED }}>{s.series_month ? new Date(`${s.series_month}T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "No month"} · {s.items.length} parts{s.status !== "published" ? " · Hidden on site" : ""}</span>
              </span>
              <StatusPill status={st.status} />
            </Link>
          );
        })}
      </div>
    </>
  );
}
