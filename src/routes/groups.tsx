import { createFileRoute, Navigate } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  code: z.string().optional(),
});

export const Route = createFileRoute("/groups")({
  validateSearch: (s) => searchSchema.parse(s),
  component: GroupsRedirect,
  head: () => ({
    meta: [
      { title: "Groups — CoCreate" },
      { name: "description", content: "Facilitator groups now live in Messages." },
    ],
  }),
});

function GroupsRedirect() {
  const { code } = Route.useSearch();
  return (
    <Navigate
      to="/messages"
      search={{ view: "groups", ...(code ? { code } : {}) }}
      replace
    />
  );
}
