import { createFileRoute, Link } from "@tanstack/react-router";
import { ArticlePage } from "@/components/content/ArticlePage";
import { validateStageSearch } from "@/lib/content-pages";

export const Route = createFileRoute("/podcasts/$id")({
  validateSearch: validateStageSearch,
  component: Page,
  errorComponent: ({ error }) => <div style={{ padding: 60, textAlign: "center", fontFamily: "Instrument Sans, sans-serif" }}><p>{error instanceof Error ? error.message : String(error)}</p><Link to="/" search={{ feed: 1 }}>Back to home</Link></div>,
  notFoundComponent: () => <div style={{ padding: 60, textAlign: "center" }}>Not found. <Link to="/" search={{ feed: 1 }}>Back to home</Link></div>,
  head: () => ({
    meta: [
      { title: "Podcast — CoCreate" },
      { name: "description", content: "Listen to this CoCreate podcast episode." },
      { property: "og:title", content: "Podcast — CoCreate" },
      { property: "og:description", content: "Listen to this CoCreate podcast episode." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Page() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  return <ArticlePage param={id} kinds={["podcast"]} search={search} />;
}
