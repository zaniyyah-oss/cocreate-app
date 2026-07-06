import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  SAVED_CSS, SavedNav, SignGate, NotesSection,
  useAuth, useSavedData, openContent, openTemplate,
} from "@/components/saved-shared";

export const Route = createFileRoute("/notes")({
  component: NotesPage,
  head: () => ({
    meta: [
      { title: "Notes — CoCreate" },
      { name: "description", content: "All of your notes across essays, teachings, podcasts, and devotionals." },
      { property: "og:title", content: "Notes — CoCreate" },
      { property: "og:description", content: "Everything you've written down, in one calm list." },
    ],
  }),
});

function NotesPage() {
  const { userId, ready } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.body.style.background = "#eee9d9";
    return () => { document.body.style.background = ""; };
  }, []);

  const { notes, contentMap, templateMap } = useSavedData(userId, ready);

  if (ready && !userId) {
    return (
      <div className="sv-root">
        <style dangerouslySetInnerHTML={{ __html: SAVED_CSS }} />
        <SavedNav current="notes" />
        <div className="sv-shell">
          <h1 className="sv-h1">Notes</h1>
          <p className="sv-sub">Everything you've written down, newest first.</p>
          <SignGate />
        </div>
      </div>
    );
  }

  return (
    <div className="sv-root">
      <style dangerouslySetInnerHTML={{ __html: SAVED_CSS }} />
      <SavedNav current="notes" />
      <div className="sv-shell">
        <h1 className="sv-h1">Notes</h1>
        <p className="sv-sub">Everything you've written down across essays, teachings, podcasts, and devotionals — newest first.</p>

        <NotesSection
          notes={notes.data ?? []}
          contentMap={contentMap}
          templateMap={templateMap}
          onOpenContent={(c) => openContent(navigate, c)}
          onOpenTemplate={(t) => openTemplate(navigate, t)}
        />
      </div>
    </div>
  );
}
