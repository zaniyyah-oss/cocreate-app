import { createFileRoute, Link } from "@tanstack/react-router";
import { ArticlePage } from "@/components/content/ArticlePage";
import { validateStageSearch } from "@/lib/content-pages";

export const Route = createFileRoute("/teachings/$id")({
  validateSearch: validateStageSearch,
  component: Page,
  errorComponent: ({ error }) => <div style={{ padding: 60, textAlign: "center", fontFamily: "Instrument Sans, sans-serif" }}><p>{error instanceof Error ? error.message : String(error)}</p><Link to="/" search={{ feed: 1 }}>Back to home</Link></div>,
  notFoundComponent: () => <div style={{ padding: 60, textAlign: "center" }}>Not found. <Link to="/" search={{ feed: 1 }}>Back to home</Link></div>,
  head: () => ({
    meta: [
      { title: "Teaching — CoCreate" },
      { name: "description", content: "Watch this teaching on CoCreate, part of a monthly series." },
      { property: "og:title", content: "Teaching — CoCreate" },
      { property: "og:description", content: "Watch this teaching on CoCreate, part of a monthly series." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Page() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  return <ArticlePage param={id} kinds={["teaching", "clip"]} search={search} />;
}
