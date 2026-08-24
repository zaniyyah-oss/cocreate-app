# Move study controls into the Read box

All four controls — study switcher, + Add study, add a book of the Bible, add a topic — move into the Read card, on one quiet toolbar row under the READ badge. The bulky "Add a book of the Bible" / "+ Add topic" buttons go away.

## The new Read toolbar

```text
  READ
  ─────────────────────────────────────────────────────────
  Study 1 · Romans ▾   + Add study        [book icon] [tag icon]
  Romans   Grace                          ← chips only when tagged
```

- One row directly under the READ badge. Left side: the study switcher (current study name, dropdown) and + Add study. Right side: two quiet icon buttons — a book icon and a tag icon.
- The date header row loses the switcher and + Add study entirely; the date stays as it is.
- Icon buttons are small, borderless, muted navy, with tooltips ("Add a book of the Bible", "Add a topic"). Each opens its existing compact picker in a popover anchored to the icon.
- Selected books and topics render as small chips on a second line inside the Read box, each with an x to remove. When nothing is tagged there are no chips and no empty-state text — just the two icons.
- The auto-detected book suggestion keeps working: it shows as a faint chip with a check to confirm, in the same chip row.
- At three studies for the day, + Add study is replaced by the existing "More in Read →" link, still in this row.
- On mobile the row wraps: switcher and + Add study on the first line, the two icons trailing; chips wrap below.

## Everything else stays

Read / Pray / To-Do content, saving, the start-of-day "Start new study / Continue a study" card, and the Read page table are unchanged.

## Technical notes

- `src/routes/devotionals.$id.tsx`: move the `de-studyline` block (switcher button, menu, + Add study, More-in-Read link) out of `de-headtop` and into a new `.de-readbar` inside the Read block, under `de-block-header`. Drop `margin-left:auto` and re-anchor `.de-studymenu` to the left.
- `src/components/BookTagger.tsx`: add an icon-trigger presentation — a small icon button that opens the existing picker panel, plus a chips-only display of selected values. Keep the current props (`values`, `suggestion`, `onToggle`, `onConfirmSuggestion`) so workspace save logic is untouched.
- `src/components/TopicPicker.tsx`: same treatment — icon trigger opening the existing menu, chips rendered by the shared chip row.
- Both pickers render their chips into one shared `.de-readchips` row in the Read card so books and topics read as a single tag line; each component keeps ownership of its own removal handler.
- No schema, query, or save changes.
