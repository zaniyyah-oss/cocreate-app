import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { MediaDetail } from "@/components/MediaDetail";

export const Route = createFileRoute("/teachings/$id")({
  component: () => {
    const { id } = Route.useParams();
    return <MediaDetail id={id} kind="teaching" />;
  },
  errorComponent: ({ error }) => (
    <div style={{ minHeight: "100vh", background: "#eee9d9", fontFamily: "Poppins, sans-serif", padding: 80, textAlign: "center" }}>
      <h1 style={{ color: "#181A4D", fontWeight: 900 }}>This teaching didn't load</h1>
      <p style={{ color: "#8a8678" }}>{error.message}</p>
      <Link to="/" style={{ color: "#181A4D", fontWeight: 700 }}>Back to Home</Link>
    </div>
  ),
  notFoundComponent: () => (
    <div style={{ minHeight: "100vh", background: "#eee9d9", fontFamily: "Poppins, sans-serif", padding: 80, textAlign: "center" }}>
      <h1 style={{ color: "#181A4D", fontWeight: 900 }}>Teaching not found</h1>
      <Link to="/" style={{ color: "#181A4D", fontWeight: 700 }}>Back to Home</Link>
    </div>
  ),
  head: () => ({
    meta: [
      { title: "Teaching — CoCreate" },
      { name: "description", content: "Watch this teaching on CoCreate." },
      { property: "og:title", content: "Teaching — CoCreate" },
      { property: "og:type", content: "video.other" },
    ],
  }),
});

// keep notFound importable for future use
void notFound;
