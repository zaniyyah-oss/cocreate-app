import { createFileRoute, redirect } from "@tanstack/react-router";

/** Old series URL — the series page now lives at /series/$slug. */
export const Route = createFileRoute("/collections/$slug")({
  beforeLoad: ({ params }) => { throw redirect({ to: "/series/$slug", params: { slug: params.slug }, replace: true }); },
});
