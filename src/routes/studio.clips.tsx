import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/studio/ui";

export const Route = createFileRoute("/studio/clips")({
  component: () => (
    <>
      <TopBar left={<h1>Clips & media</h1>} />
      <div style={{ padding: 28 }}><div className="st-empty"><b>Coming soon</b>Vertical clips with captions arrive with the series builder.</div></div>
    </>
  ),
  head: () => ({ meta: [{ title: "Clips & media — CoCreate Studio" }, { name: "description", content: "Clips & media in CoCreate Studio." }, { property: "og:title", content: "Clips & media — CoCreate Studio" }, { property: "og:description", content: "Clips & media in CoCreate Studio." }] }),
});
