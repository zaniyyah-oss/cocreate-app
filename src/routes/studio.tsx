import { createFileRoute } from "@tanstack/react-router";
import { StudioLayout } from "@/components/studio/shell";

export const Route = createFileRoute("/studio")({
  ssr: false,
  component: StudioLayout,
  head: () => ({
    meta: [
      { title: "Studio — CoCreate" },
      { name: "description", content: "CoCreate Studio: plan, write and schedule releases." },
      { property: "og:title", content: "CoCreate Studio" },
      { property: "og:description", content: "Plan, write and schedule CoCreate releases." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});
