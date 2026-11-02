import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonPage } from "@/components/ComingSoonPage";

export const Route = createFileRoute("/about")({
  component: () => <ComingSoonPage eyebrow="CoCreate" title="About" />,
  head: () => ({
    meta: [
      { title: "About — CoCreate" },
      { name: "description", content: "Learn about CoCreate, the people behind it and what we're building." },
      { property: "og:title", content: "About — CoCreate" },
      { property: "og:description", content: "Learn about CoCreate, the people behind it and what we're building." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
