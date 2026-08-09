# Let Read and Pray grow with the To-Do column

## Goal
On tablet/desktop three-column view, when tasks are added and the To-Do column gets taller, the Read and Pray writing areas should grow to match — showing more of what you typed instead of blank white space. To-Do keeps rendering exactly as it does now.

## Current behavior
The alignment logic treats the Read scripture editor as the anchor and forces Pray and To-Do writing areas to end at that same baseline. Adding tasks stretches the row taller, but the Read and Pray editors stay fixed, so the extra height shows up as empty card space.

## The change (`src/routes/devotionals.$id.tsx`)

Flip the anchor in the column-alignment effect:

- Anchor becomes the bottom of the tallest column content in the row — effectively the To-Do card's bottom (open-text + "Tasks" header + task rows + "Add a step").
- Targets become the Read scripture editor and the Pray editor. Each is sized so its bottom rule lands on that shared baseline, with `overflow-y: auto` so long text scrolls inside a taller visible area.
- The To-Do open-text editor is no longer resized by the effect — it keeps its natural/user-dragged height.
- Behavior is unchanged below the 900px breakpoint and in focus mode: all explicit heights are cleared, as today.

Safety rails kept:
- A minimum height so Read/Pray never collapse when To-Do is short.
- The existing viewport clamp from `src/lib/editor-height.ts`, so programmatic stretch heights are never saved to localStorage and columns can't run away on iPad.
- Re-measure on resize, on To-Do DOM changes (task add/remove), and on window resize.

## Out of scope
- No database or task-logic changes.
- To-Do column layout, Tasks header, and status pills stay exactly as they are.
