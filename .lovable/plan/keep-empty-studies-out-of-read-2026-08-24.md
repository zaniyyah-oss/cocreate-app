# Keep empty studies out of Read

## What's happening today (verified)

- Opening the workspace does **not** create a study. A row is written only when you type something, add a to-do/note, press **+ Add study**, or press **+ New study** on Read.
- **+ Add study** and Read's **+ New study** do insert an empty row immediately, before anything is written. There are currently 5 such empty rows in your data.
- The Read Studies table only lists entries where a book of the Bible has been confirmed, so those 5 empty rows are not visible there. No entry with a confirmed book is currently blank.

So Read isn't cluttered right now, but two gaps remain: empty rows accumulate invisibly, and a study with real writing but no book tag never appears in Read at all. There is also no way to delete a study.

## Changes

### 1. Nothing is created until you write something

- **+ Add study** and **+ New study** stop inserting a row. They switch the workspace into a fresh, unsaved study; the row is created on the first keystroke or first to-do (the same lazy path typing already uses).
- The study switcher shows the pending study as "New study" until it has content, so it still behaves like a real study while you use it.

### 2. Read lists substantial studies, not tagged ones

- Replace the "confirmed book" requirement with a substance test: a study appears once it has any of a title, scripture reference, Read/Pray/To-Do text, or to-dos.
- Effect: studies you actually wrote show up even before you tag a book, and blank studies never show up.

### 3. Delete a study

- Each row in the Read Studies table gets a quiet delete action with a confirm step ("Delete this study? This can't be undone.").
- The workspace study switcher gets the same action for the study you're in; deleting returns you to the day's remaining study, or a blank one.
- Deleting removes the entry and detaches notes created inside it, rather than deleting notes.

### 4. One-time cleanup

- Remove the 5 existing rows that have no title, no scripture reference, no Read/Pray/To-Do text, and no to-dos.

## Technical notes

- `src/routes/devotionals.$id.tsx`: `addStudyForDay` becomes state-only (a `pendingNewStudy` flag that clears `entry` from the search params and blanks the fields); the existing `flushEntrySave` insert path already creates the row on demand, and `ensureEntry` stays as the fallback for workspace items. The three-per-day cap counts saved rows plus the pending one.
- `src/routes/read.tsx`: `useRecentStudies` and `useConfirmedCounts` drop `.eq("book_confirmed", true)`; recent studies filter on the substance test instead of `entryBooks(e).length > 0`. Book counts stay driven by tagged entries so the book shelves don't change meaning. `newStudy` navigates to the workspace instead of inserting.
- Delete goes through a `delete` on `devotional_entries` (RLS already scopes to owner) after nulling `notes.content_item_id`-style references — checked: notes attach via `devotional_entry_id` on `workspace_items`, which is `on delete` unconstrained, so those get set to null first.
- Cleanup runs as a one-off data statement, not a migration.
