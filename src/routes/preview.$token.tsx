import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { getPreviewByToken } from "@/lib/preview-tokens.functions";
import { PieceRenderer, DevotionalDaysView } from "@/components/content/PieceRenderer";

export const Route = createFileRoute("/preview/$token")({
  ssr: false,
  component: SharedPreview,
  head: () => ({ meta: [{ title: "Preview — CoCreate" }, { name: "description", content: "A preview of an upcoming CoCreate piece." }, { property: "og:title", content: "Preview — CoCreate" }, { property: "og:description", content: "A preview of an upcoming CoCreate piece." }, { property: "og:type", content: "article" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex,nofollow" }] }),
});

const KIND: Record<string, string> = { teaching: "Teaching", essay: "Article", blog: "Blog", podcast: "Podcast", clip: "Clip", devotional: "Devotional" };

function SharedPreview() {
  const { token } = Route.useParams();
  const q = useQuery({ queryKey: ["share-preview", token], queryFn: () => getPreviewByToken({ data: { token } }), retry: false });
  const p = q.data?.piece;
  return (
    <div style={{ minHeight: "100vh", background: "#FAF9F6", fontFamily: "'Instrument Sans',sans-serif" }}>
      <div style={{ background: "#181A4D", color: "#fff", fontSize: 13, fontWeight: 600, padding: "8px 16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Eye size={15} strokeWidth={1.7} />Preview · not yet public</div>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 80px" }}>
        {q.isLoading && <p style={{ color: "#5F5D55" }}>Loading…</p>}
        {(q.isError || (q.isFetched && !q.data)) && <div style={{ background: "#fff", border: "1px solid #E6E3DC", borderRadius: 12, padding: 28 }}><b style={{ fontFamily: "Poppins", color: "#181A4D" }}>This preview link has expired or was turned off.</b></div>}
        {p && (
          <PieceRenderer piece={{ kicker: [KIND[p.kind] ?? p.kind, p.seriesTitle, p.part ? `Part ${p.part} of ${p.seriesTotal}` : null].filter(Boolean).join(" · "), title: p.title, summary: p.summary, heroUrl: p.heroUrl, heroCaption: p.heroCaption, focalDesktop: p.fd, focalMobile: p.fm, doc: p.doc }}>
            {q.data?.scope === "devotional" && <DevotionalDaysView days={q.data.days} />}
          </PieceRenderer>
        )}
      </div>
    </div>
  );
}
