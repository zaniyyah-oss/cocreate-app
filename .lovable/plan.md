# Continue an existing study instead of starting fresh

Today the workspace always addresses "the study for this date", so every day starts blank and there is no way to reopen a study you already began. This adds a choice at the start of the day, keeps the three-column layout feeling like a blank slate, and allows a second work-in-progress study per day.

## 1. The empty-day choice

When today's Read / Pray / To-Do columns are all empty, a single slim card sits above the columns:

```text
  Start today's study            [ Start new study ]  [ Continue a study ▾ ]
```

- **Start new study** dismisses the card and you write as you do now.
- **Continue a study** opens a small searchable list of your recent studies (title, book, topic, last edited). Picking one loads that study into the columns — you keep writing in the same study, nothing is duplicated.
- The card disappears the moment there is any content, so a day in progress looks exactly like it does today.

## 2. Switching and adding a second study

One quiet line replaces nothing and adds nothing heavy — it sits in the existing header row next to the date:

```text
  Mon, Aug 24        Romans · Grace in suffering ▾        + Add study
```

- The title is a button. Its menu lists the studies attached to today, then "Continue a past study…" and "Start new study".
- **+ Add study** creates a second study for the day and switches to it. Only appears once one study has content, so day one still looks like a blank slate.
- No tabs, no extra columns, no change to Read / Pray / To-Do themselves.

## 3. Two studies for one day in Read

The Studies table already lists one row per study, so two studies on the same date show as two rows with the same date. Adjustments:

- The Date column shows the date once per day and leaves it blank on the second row of that day, so the pairing reads clearly.
- The table's Open action opens that specific study, and the workspace link from Read carries the study id, so returning to a study never falls back to "the first study of that day".

## Technical notes

- No schema change needed — `devotional_entries` has no uniqueness on `(user_id, template_id, entry_date)`, so multiple rows per day are already valid. The work is switching the app from date-addressed to id-addressed reads.
- `src/routes/devotionals.$id.tsx`: add an `entry` search param. When present, the workspace loads and saves that entry id. When absent, behaviour stays as today (earliest entry for the date), so existing links and the calendar keep working.
- Replace the `.eq("entry_date", …).maybeSingle()` lookups in the save/ensure/to-do paths with lookups by resolved entry id, and make "create" always insert a new row rather than reuse the day's row.
- The recent-study picker reuses the existing recent-entries query from `src/routes/read.tsx`, extracted into a shared hook so both surfaces use one source.
- `src/routes/read.tsx`: pass `search: { entry: e.id }` when navigating to the workspace, and add the repeated-date suppression in `StudiesTable`.
- Notes created in the workspace continue to attach to the resolved entry, so a second study's notes stay with that study.
