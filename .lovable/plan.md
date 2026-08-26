# Fill out "Continue where you left off" on desktop

## Goal
The row currently stops after 6 tiles, leaving empty white space on wide desktop screens. Fill that space with more recent items, and make sure the specific notes you've been working on appear in the row.

## Changes (`src/components/ContinueStrip.tsx`)

1. Fetch more source rows so there is enough to show:
   - workspace entries: 3 → 8
   - notes (`workspace_items`): 3 → 10
   - devotional plan assignments: 3 → 5
   - saved plans: 6 → 8

2. Raise the tile cap from 6 to 12, still sorted by most recently updated.

3. Guarantee note coverage: reserve slots so the most recent notes are always represented rather than being pushed out by workspace entries. Take the top notes (up to 5) plus the newest of everything else, then sort the combined set by recency.

4. Better note titles: prefer the note title, fall back to the first non-empty line of the body, then "Untitled note". Skip notes with no title and no body text so blank rows don't create empty tiles.

5. Layout so tiles fill the width instead of leaving a gap:
   - Keep horizontal scrolling (needed on mobile/tablet), but on wide screens let cards flex to share the available width with a `min-width` of 150px and a `max-width` around 210px, so 12 tiles spread across the row rather than clustering on the left.
   - Keep existing card styling, tag dots, and click behavior unchanged.

## Out of scope
- No database, schema, or routing changes.
- Card design and navigation targets stay as they are.
