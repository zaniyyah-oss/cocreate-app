import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonPage } from "@/components/ComingSoonPage";

export const Route = createFileRoute("/shop")({
  component: () => <ComingSoonPage eyebrow="CoCreate" title="Shop" />,
  head: () => ({
    meta: [
      { title: "Shop — CoCreate" },
      { name: "description", content: "Journals, studies and goods from CoCreate." },
      { property: "og:title", content: "Shop — CoCreate" },
      { property: "og:description", content: "Journals, studies and goods from CoCreate." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
