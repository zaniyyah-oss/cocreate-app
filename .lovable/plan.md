# Read page restructure

Reorganize `/read` around three sub-destinations, plus the schema and feed changes your answers imply.

## 1. Sub-nav

A segmented control at the top of the Read page: **Studies · Devotionals · Saved**. The Old/New Testament toggle stops being top-level nav and moves inside Studies, next to the book grid.

## 2. Studies

- Flat reverse-chronological feed of every entry, with the date shown on each card (no date section headers).
- The feed now includes entries tagged with a **book** *or* with a **topic** — today it only shows confirmed book tags, so topic-only entries appear for the first time. Entries with neither stay hidden.
- Cards show the book abbreviations (multiple, when present) plus topic pills, the entry title, date, and a snippet.
- Topic filter here uses **your topics** — the ones you create on this page — and matches entries by `topic_ids`.
- Multiple studies per day: a "New study" button in Studies creates a fresh entry for today and opens it. The Workspace page keeps showing a single study per day for now; extra studies are created and opened from Read.

## 3. Devotionals

The existing "Create your own devotional" card, the 1/3/5/10-day quick starts, and "Your devotionals" — kept together and resized to match the page width and card rhythm of the other tabs.

## 4. Saved

Moves the saved-content experience out of the Library page and into Read:

- Saved CoCreate content (teachings, podcasts, essays, devotional templates) — nothing from outside the app.
- Sorted most-recently-saved first.
- Filterable by **Categories** — the app-curated content topics, kept deliberately distinct in naming from your personal Studies topics.
- The Library page's Saved tab points here so there is one saved surface, not two.

## 5. Devotional review

In devotional focus/review, the notes panel lists only the notes tied to that devotional plan day (`plan_assignment_id` + `plan_day_number`), and those notes are openable and editable inline from the review screen.

## Technical notes

- **Schema:** add `entry_id` (nullable uuid, FK to `devotional_entries`) to `workspace_items` where a note originates from a specific study, and stop treating `(user_id, entry_date)` as an identity. New reads/writes address an entry by id; date-addressed flows keep working by resolving to the *earliest* entry of that date.
- `devotional_entries` gains no chapter/verse columns in this pass — cards continue showing book + free-text `scripture_reference`.
- Split `read.tsx` (~1150 lines) into `ReadStudies`, `ReadDevotionals`, and `ReadSaved` components with the shared CSS in one module.
- Saved tab reuses the existing `useSavedItems` / `useContentLookup` / `useTemplateLookup` hooks from `saved-shared.tsx`; no new table.
