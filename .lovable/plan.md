## Problem

The guest preview only exists inside `/devotionals/$id` (a specific devotional template page). But signed-out visitors never get there:

- `/devotionals` shows a hard "Sign in to open Abide" gate and never redirects guests through.
- The home page (`/index`) has no path into a devotional entry for a guest.

So testing as a signed-out user, you correctly see nothing new — the guest experience is unreachable.

Once inside `/devotionals/$id`, the preview does work identically on desktop, tablet, and mobile (all the changes are in a shared component and route file; no viewport gating).

## Fix

1. **`src/routes/devotionals.index.tsx`** — drop the signed-out gate. Let guests fall through the same `<Navigate to="/devotionals/$id" params={{ id: defaultTemplateId }} replace />` that signed-in users get. This drops guests straight into the Abide guest preview.

2. **`src/routes/index.tsx`** — make the main home-page devotional CTA route to `/devotionals` (Abide) for guests instead of `/auth`. That's the "Add to my devotionals" / open button around line 516 (`if (!userId) navigate({ to: "/auth" })`). For guests, navigate to `/devotionals` so they land in the preview. (Personal features like Sticky Notes stay gated as they are today — those are truly private.)

3. No changes needed to `devotionals.$id.tsx` — the guest preview added last turn already renders identically at all viewports.

## Verification

After the change: sign out, visit `/` → click into Abide, or visit `/devotionals` directly → land in the Abide entry with the full guest workspace (Read/Pray/To-Do/Workspace notes), local-only typing, soft "sign in to save" banner on first keystroke, and hard modal on Save & file away. Verified on mobile, tablet, and desktop viewports.

No backend / schema changes.
