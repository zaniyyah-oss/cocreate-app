import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  SAVED_CSS, SignGate,
  QuotesSection, NotesSection, SavedContentSection, DevotionalHistorySection,
  useAuth, useSavedData, openContent, openTemplate,
} from "@/components/saved-shared";

export const Route = createFileRoute("/saved")({
  component: LibraryPage,
  head: () => ({
    meta: [
      { title: "Library — CoCreate" },
      { name: "description", content: "Your saved content, notes, pinned quotes, and Abide entry history on CoCreate." },
      { property: "og:title", content: "Library — CoCreate" },
      { property: "og:description", content: "Everything you've saved, written, and practiced — in one calm place." },
    ],
  }),
});

type Tab = "saved" | "notes" | "abide";

function LibraryPage() {
  const { userId, ready } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("saved");

  const { pins, notes, saved, abideEntries, contentMap, templateMap } = useSavedData(userId, ready);

  if (ready && !userId) {
    return (
      <AppShell current="library">
        <style dangerouslySetInnerHTML={{ __html: SAVED_CSS }} />
        <div className="sv-shell">
          <h1 className="sv-h1">Library</h1>
          <p className="sv-sub">Saved content, notes, pinned quotes, and your Abide entry history — all in one place.</p>
          <SignGate />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell current="library">
      <style dangerouslySetInnerHTML={{ __html: SAVED_CSS }} />
      <div className="sv-shell">
        <h1 className="sv-h1">Library</h1>
        <p className="sv-sub">Saved content, notes, pinned quotes, and your Abide entry history — all in one place.</p>

        <div className="sv-tabs" role="tablist">
          <button className={tab === "saved" ? "on" : ""} onClick={() => setTab("saved")}>Saved</button>
          <button className={tab === "notes" ? "on" : ""} onClick={() => setTab("notes")}>Notes</button>
          <button className={tab === "abide" ? "on" : ""} onClick={() => setTab("abide")}>Devotional history</button>
        </div>

        {tab === "saved" && (
          <>
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
          </>
        )}

        {tab === "notes" && (
          <NotesSection
            notes={notes.data ?? []}
            contentMap={contentMap}
            templateMap={templateMap}
            onOpenContent={(c) => openContent(navigate, c)}
            onOpenTemplate={(t) => openTemplate(navigate, t)}
            loading={notes.isLoading}
          />
        )}

        {tab === "abide" && (
          <DevotionalHistorySection
            entries={abideEntries.data ?? []}
            templateMap={templateMap}
            loading={abideEntries.isLoading}
            onOpen={(templateId: string, date: string) =>
              navigate({ to: "/devotionals/$id", params: { id: templateId }, search: { date } })
            }
          />
        )}

      </div>
    </AppShell>
  );
}
