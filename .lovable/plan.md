# Remove the supplemental material section from the Read column

## Goal
Remove the "What supplemental material will you be reviewing today?" free-text box from the Read column of the workspace. Read, Pray, and To-Do writing areas stay exactly as they are — only the supplemental sub-section goes away.

## Why
You don't use the supplemental box (you put those notes in the workspace), it's what makes the Read column taller than Pray/To-Do, and its content can't be recalled/edited later. Removing it simplifies the Read column and collapses the three columns to one clean shared baseline.

## What changes

### 1. Remove the supplemental UI (`src/routes/devotionals.$id.tsx`)
- Delete the second `.de-read-part` block that holds the `ResizableTextarea` (the `.de-supp` field, placeholder "What supplemental material will you reviewing today?") and its save-status row.
- Remove the now-unused `furtherReading` state, its hydration from the entry (`setFurtherReading(...)`), and `further_reading_text` from the local entry type / saveable-fields union. (No data is lost — see step 3.)
- The main scripture response area (input + RichTextField) and its status row remain untouched.

### 2. Re-anchor the visual-balance logic
The alignment `useEffect` currently anchors Pray/To-Do baselines to the bottom of `.de-supp`. With that element gone:
- Change the anchor selector from `.de-supp` to the bottom of the main scripture `RichTextField` editor (`.de-read-part .rtf-editor`).
- Result: all three writing areas (Read, Pray, To-Do) end on the same baseline — equal-height columns with no special extra section. This is simpler and more stable than the current two-tier anchor.

### 3. Database: no change
- Keep the `further_reading_text` column and all existing data in place. Nothing is dropped or migrated. If you ever want the field back, the data and column are still there.

### 4. Out of scope (confirmed unchanged)
- Read, Pray, and To-Do writing areas render exactly as they do now.
- The `/devotionals/focus/$id` topical focus page is untouched (it shows template-curated `scripture_items`, which is a different thing).
