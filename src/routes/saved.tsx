import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  SAVED_CSS, SignGate,
  QuotesSection, NotesSection, SavedContentSection, DevotionalHistorySection, WorkspaceDocsSection,
  useAuth, useSavedData, openContent, openTemplate,
} from "@/components/saved-shared";
import { SavedDevotionalsSection } from "@/components/SavedDevotionals";


export const Route = createFileRoute("/saved")({
  component: LibraryPage,
  head: () => ({
    meta: [
      { title: "Library — CoCreate" },
      { name: "description", content: "Your workspace documents, devotional history, saved content, notes, and pinned quotes on CoCreate." },
      { property: "og:title", content: "Library — CoCreate" },
      { property: "og:description", content: "Everything you've written, saved, and practiced — in one calm place." },
    ],
  }),
});

type Tab = "workspace" | "abide" | "saved" | "notes";

function LibraryPage() {
  const { userId, ready } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("workspace");

  const { pins, notes, saved, abideEntries, workspaceDocs, entryMeta, contentMap, templateMap } = useSavedData(userId, ready);

  if (ready && !userId) {
    return (
      <AppShell current="library">
        <style dangerouslySetInnerHTML={{ __html: SAVED_CSS }} />
        <div className="sv-shell">
          <h1 className="sv-h1">Library</h1>
          <p className="sv-sub">Workspace documents, devotional history, saved content, notes, and pinned quotes — all in one place.</p>
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
        <p className="sv-sub">Workspace documents, devotional history, saved content, notes, and pinned quotes — all in one place.</p>

        <div className="sv-tabs" role="tablist">
          <button className={tab === "workspace" ? "on" : ""} onClick={() => setTab("workspace")}>Workspace documents</button>
          <button className={tab === "abide" ? "on" : ""} onClick={() => setTab("abide")}>Devotional history</button>
          <button className={tab === "saved" ? "on" : ""} onClick={() => setTab("saved")}>Saved</button>
          <button className={tab === "notes" ? "on" : ""} onClick={() => setTab("notes")}>Notes</button>
        </div>

        {tab === "workspace" && (
          <WorkspaceDocsSection
            docs={workspaceDocs.data ?? []}
            entryMeta={entryMeta}
            loading={workspaceDocs.isLoading || abideEntries.isLoading}
            onOpen={(d) => {
              const meta = d.devotional_entry_id ? entryMeta[d.devotional_entry_id] : undefined;
              if (!meta?.template_id) return;
              navigate({
                to: "/devotionals/$id",
                params: { id: meta.template_id },
                search: { date: meta.entry_date, ws: d.id } as any,
              });
            }}
          />
        )}

        {tab === "abide" && (
          <DevotionalHistorySection
            entries={abideEntries.data ?? []}
            templateMap={templateMap}
            loading={abideEntries.isLoading}
            onOpen={(templateId: string, date: string) =>
              navigate({ to: "/devotionals/$id", params: { id: templateId }, search: { date } as any })
            }
          />
        )}

        {tab === "saved" && (
          <>
            <SavedDevotionalsSection />
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

      </div>
    </AppShell>
  );
}
