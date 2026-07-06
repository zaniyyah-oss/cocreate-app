import { createFileRoute } from "@tanstack/react-router";
import { AdminOutletLayout } from "@/components/admin/shell";

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: AdminOutletLayout,
  head: () => ({
    meta: [
      { title: "Admin — CoCreate" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});
