import { createFileRoute, Link } from "@tanstack/react-router";
import { MediaDetail } from "@/components/MediaDetail";

export const Route = createFileRoute("/podcasts/$id")({
  component: () => {
    const { id } = Route.useParams();
    return <MediaDetail id={id} kind="podcast" />;
  },
  errorComponent: ({ error }) => (
    <div style={{ minHeight: "100vh", background: "#eee9d9", fontFamily: "Poppins, sans-serif", padding: 80, textAlign: "center" }}>
      <h1 style={{ color: "#181A4D", fontWeight: 900 }}>This episode didn't load</h1>
      <p style={{ color: "#8a8678" }}>{error.message}</p>
      <Link to="/" style={{ color: "#181A4D", fontWeight: 700 }}>Back to Home</Link>
    </div>
  ),
  notFoundComponent: () => (
    <div style={{ minHeight: "100vh", background: "#eee9d9", fontFamily: "Poppins, sans-serif", padding: 80, textAlign: "center" }}>
      <h1 style={{ color: "#181A4D", fontWeight: 900 }}>Episode not found</h1>
      <Link to="/" style={{ color: "#181A4D", fontWeight: 700 }}>Back to Home</Link>
    </div>
  ),
  head: () => ({
    meta: [
      { title: "Podcast — CoCreate" },
      { name: "description", content: "Listen to this podcast episode on CoCreate." },
      { property: "og:title", content: "Podcast — CoCreate" },
      { property: "og:type", content: "music.song" },
    ],
  }),
});
