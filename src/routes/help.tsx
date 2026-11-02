import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonPage } from "@/components/ComingSoonPage";

export const Route = createFileRoute("/help")({
  component: () => <ComingSoonPage eyebrow="CoCreate" title="Help center" />,
  head: () => ({
    meta: [
      { title: "Help center — CoCreate" },
      { name: "description", content: "Answers and guides for using CoCreate and your workspace." },
      { property: "og:title", content: "Help center — CoCreate" },
      { property: "og:description", content: "Answers and guides for using CoCreate and your workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
