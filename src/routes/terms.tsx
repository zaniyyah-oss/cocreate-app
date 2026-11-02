import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonPage } from "@/components/ComingSoonPage";

export const Route = createFileRoute("/terms")({
  component: () => <ComingSoonPage eyebrow="CoCreate" title="Terms" />,
  head: () => ({
    meta: [
      { title: "Terms — CoCreate" },
      { name: "description", content: "The terms of service for using CoCreate." },
      { property: "og:title", content: "Terms — CoCreate" },
      { property: "og:description", content: "The terms of service for using CoCreate." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
