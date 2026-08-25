# One toolbar: a + and a dropdown, nothing else

Drop the "Start today's study / Start new study / Continue a study" card. A blank Read box is already an invitation to start typing — the first study begins the moment you write. Everything else collapses into two controls on the Read toolbar: a small **+** icon to open a second study, and the study dropdown to switch between today's studies or return to an older one.

## The Read toolbar, always the same

```text
  READ                                          [ open ]
  ──────────────────────────────────────────────────────
  Untitled study  ▾     +            [book] [tag]
```

- **Left: study dropdown.** Always present, even before anything is saved. Label is the scripture reference you typed, or "Untitled study" while blank. Opening it shows: today's studies (current one checked), then "Continue a past study" with the search field and dated list, then "Delete this study".
- **Middle: + icon button.** Small, borderless, navy, a plus over a page glyph. Tooltip and aria-label: "New study for today". Adds a second (or third) study for the day. It goes quiet/disabled at the 3-study cap, where the "More in Read →" link takes its place as today.
- **Right: unchanged** book and tag icon buttons, with the chip row below.
- No headings, no pill buttons, no empty-state card anywhere in the Read box.

## Making it read as intuitive, not just compact

Discoverability replaces the buttons that were carrying it:

- The blank Read body gets a single line of placeholder guidance — the scripture field already prompts "What are you reading today?", and the body placeholder reads "Start writing — your study saves as you go." So a first-time visitor sees where to begin without a button telling them to.
- Both icons get real tooltips on hover and focus, so the + and the dropdown chevron are self-describing.
- The dropdown's first group is labelled "Today", the second "Continue a past study" — the two jobs are named inside the one menu, so nothing outside it needs to explain them.

## What stays the same

Saving, lazy creation (nothing is written until you type), the 3-per-day cap, the Read page table, Pray, To-Do, and Where-are-you are all untouched.

## Technical notes

- `src/routes/devotionals.$id.tsx`: delete the `de-startcard` block (lines ~1300–1337) and its CSS; `startDismissed` and its state/`setStartDismissed` calls go with it. The `pickerOpen` picker inside that card is redundant with `studyMenuOpen` — remove it too.
- Relax the study-dropdown render condition so it shows unconditionally for signed-in users (drop the `dayEntries.length > 0 || currentEntry || pendingNewStudy` gate); `studyLabel` falls back to "Untitled study".
- Replace the `+ Add study` text button with an icon button (new `.de-studyicon` rule matching the existing `.de-readbar-right` icon styling), keeping `addStudyForDay` as its handler and the existing cap logic.
- No schema, query, or save-path changes.
