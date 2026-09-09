# Workspace (Entry view): dedupe date + cleaner right-side nav

## Context
On the Entry view of `src/routes/devotionals.$id.tsx`, the date is shown twice:
- Center stepper: `‹ Wednesday, September 9 ›  Today` (full date)
- Headcard (item 1): `Wednesday, September 9` (full date)

The right side has a `Full week` link (item 2). Per your answers, we want the full date to appear once (in the headcard), a compact `‹ Today ›` date stepper on the far right, and `Full week` relabeled `See calendar`.

## Changes (single file: `src/routes/devotionals.$id.tsx`)

### 1. Remove the center full-date stepper (lines ~1243–1284)
In the Entry-view branch, delete the `{workspaceMode !== "day" && (...)}` block that renders the `‹ [full date] › Today` control in the middle of the top bar. The headcard's `de-headdate` (line ~1315) becomes the only full-date display.

### 2. Right side becomes a two-control group
Replace the `Full week` `<Link>` (lines ~1285–1298) with a flex row containing:

- **`‹ Today ›` date stepper** — reuses `stepBtnStyle` and `shiftISODate`/`setSelectedDate`.
  - Center label shows `Today` when `selectedDate === todayISO()`, otherwise a compact relative label (e.g. `Yesterday`, `Tomorrow`, or the short weekday + month/day like `Sep 8`). Clicking `Today` (shown only when not on today) jumps back to today — same behavior as the existing `Today` link.
  - This satisfies "‹ Today › on the far right replacing 'Full week'".
- **`See calendar` link** — same `<Link to="/calendar">` as before, same calendar icon, but label text changes from `Full week` to `See calendar` and the trailing `→` arrow is dropped to keep it compact.

### 3. Keep Day-view behavior unchanged
`CalendarDayView` already shows arrows next to its own bold date (the prior fix). No change there; only the Entry-view top bar is touched.

### 4. Keep the "viewing a past/future day" amber banner
The existing `search.view === "today" && selectedDate !== todayISO()` banner (lines ~1175–1218) stays as-is — it still appears above the top bar for non-today dates.

## Technical notes
- `stepBtnStyle`, `shiftISODate`, `todayISO`, `formatDate` already exist; no new helpers needed except a small `shortDateLabel(iso)` for the compact center label of the `‹ Today ›` control.
- Layout stays within the existing `display:flex; justify-content:space-between` top bar; the left `de-viewtabs` (Entry/Day) is untouched.
- Mobile: the compact `‹ Today ›` + `See calendar` group wraps fine under the existing `flexWrap: wrap`.

## Out of scope
- Day view, Calendar page, Focus Mode, and the headcard date itself are not modified.
