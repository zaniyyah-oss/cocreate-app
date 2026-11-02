import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonPage } from "@/components/ComingSoonPage";

export const Route = createFileRoute("/mission")({
  component: () => <ComingSoonPage eyebrow="CoCreate" title="Our mission" />,
  head: () => ({
    meta: [
      { title: "Our mission — CoCreate" },
      { name: "description", content: "Why CoCreate exists: helping you build with God, not just for him." },
      { property: "og:title", content: "Our mission — CoCreate" },
      { property: "og:description", content: "Why CoCreate exists: helping you build with God, not just for him." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
