import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  SAVED_CSS, SavedNav, SignGate,
  QuotesSection, NotesSection, SavedContentSection,
  useAuth, useSavedData, openContent, openTemplate,
} from "@/components/saved-shared";

export const Route = createFileRoute("/saved")({
  component: SavedPage,
  head: () => ({
    meta: [
      { title: "Saved — CoCreate" },
      { name: "description", content: "Your pinned quotes, notes, and saved content on CoCreate." },
      { property: "og:title", content: "Saved — CoCreate" },
      { property: "og:description", content: "The lines that stayed with you, in one calm place." },
    ],
  }),
});

function SavedPage() {
  const { userId, ready } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"saved" | "notes">("saved");

  useEffect(() => {
    document.body.style.background = "#eee9d9";
    return () => { document.body.style.background = ""; };
  }, []);

  const { pins, notes, saved, contentMap, templateMap } = useSavedData(userId, ready);

  if (ready && !userId) {
    return (
      <div className="sv-root">
        <style dangerouslySetInnerHTML={{ __html: SAVED_CSS }} />
        <SavedNav current="saved" />
        <div className="sv-shell">
          <h1 className="sv-h1">Saved</h1>
          <p className="sv-sub">The lines that stayed with you, notes you took, and everything you've saved to return to.</p>
          <SignGate />
        </div>
      </div>
    );
  }

  return (
    <div className="sv-root">
      <style dangerouslySetInnerHTML={{ __html: SAVED_CSS }} />
      <SavedNav current="saved" />
      <div className="sv-shell">
        <h1 className="sv-h1">Saved</h1>
        <p className="sv-sub">The lines that stayed with you, notes you took, and everything you've saved to return to.</p>

        {/* Mobile-only segmented tabs — folds Notes into Saved on small screens */}
        <div className="sv-tabs" role="tablist">
          <button className={tab === "saved" ? "on" : ""} onClick={() => setTab("saved")}>Saved</button>
          <button className={tab === "notes" ? "on" : ""} onClick={() => setTab("notes")}>Notes</button>
        </div>

        {/* Desktop: always show everything. Mobile: hide other tab via inline flag. */}
        <MobileFilter tab={tab}>
          <QuotesSection
            pins={pins.data ?? []}
            contentMap={contentMap}
            onOpen={(c) => openContent(navigate, c)}
            loading={pins.isLoading}
          />
          <SavedContentSection
            saved={saved.data ?? []}
            contentMap={contentMap}
            templateMap={templateMap}
            onOpenContent={(c) => openContent(navigate, c)}
            onOpenTemplate={(t) => openTemplate(navigate, t)}
            loading={saved.isLoading}
          />
        </MobileFilter>

        <MobileFilter tab={tab} show="notes">
          <NotesSection
            notes={notes.data ?? []}
            contentMap={contentMap}
            templateMap={templateMap}
            onOpenContent={(c) => openContent(navigate, c)}
            onOpenTemplate={(t) => openTemplate(navigate, t)}
            loading={notes.isLoading}
          />
        </MobileFilter>
      </div>
    </div>
  );
}

/**
 * Renders children always on desktop (>720px). On mobile shows only when the
 * active tab matches `show` (default "saved").
 */
function MobileFilter({ tab, show = "saved", children }: { tab: "saved" | "notes"; show?: "saved" | "notes"; children: React.ReactNode }) {
  const hideOnMobile = tab !== show;
  return (
    <div className={hideOnMobile ? "sv-mobile-hide" : ""}>
      <style>{`@media (max-width:720px){.sv-mobile-hide{display:none;}}`}</style>
      {children}
    </div>
  );
}
