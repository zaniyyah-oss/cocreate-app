import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/studio/ui";

export const Route = createFileRoute("/studio/comments")({
  component: () => (
    <>
      <TopBar left={<h1>Comments</h1>} />
      <div style={{ padding: 28 }}><div className="st-empty"><b>Coming soon</b>Reader comments and the moderation queue arrive in a later phase.</div></div>
    </>
  ),
  head: () => ({ meta: [{ title: "Comments — CoCreate Studio" }, { name: "description", content: "Comments in CoCreate Studio." }, { property: "og:title", content: "Comments — CoCreate Studio" }, { property: "og:description", content: "Comments in CoCreate Studio." }] }),
});
