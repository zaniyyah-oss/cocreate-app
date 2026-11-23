import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminOutletLayout } from "@/components/admin/shell";

/** Old /admin screens redirect to their Studio replacements; page copy and invites stay here for now. */
export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: ({ location }) => {
    const p = location.pathname.replace(/\/+$/, "");
    if (p === "/admin") throw redirect({ to: "/studio" });
    if (p.startsWith("/admin/content") || p === "/admin/new") throw redirect({ to: "/studio/pieces" });
    const m = /^\/admin\/edit\/([^/]+)/.exec(p);
    if (m) throw redirect({ to: "/studio/pieces/$id", params: { id: m[1]! } });
    if (p.startsWith("/admin/collections")) throw redirect({ to: "/studio/series" });
  },
  component: AdminOutletLayout,
  head: () => ({
    meta: [
      { title: "Admin — CoCreate" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});
