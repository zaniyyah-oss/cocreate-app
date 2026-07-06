## Goal

Replace the per-user "default template" model with a single, platform-wide Default Devotional that every user always has active. Topical/temporary devotionals a user saves become additive layers, never substitutes.

## Backend

1. **Migration**
   - Add `is_default boolean NOT NULL DEFAULT false` to `devotional_templates`.
   - Add a unique partial index enforcing at most one default: `CREATE UNIQUE INDEX devotional_templates_one_default ON devotional_templates ((is_default)) WHERE is_default = true;`
   - Add a trigger `BEFORE INSERT OR UPDATE` on `devotional_templates` that blocks setting `is_default = true` unless the row is `status = 'published'` (so the default is always visible), and blocks removing the default if it would leave zero defaults (only admins can swap by flipping another row true in the same transaction — the unique index handles the "only one" invariant).
   - Retire `profiles.default_template_id`: drop the column (it was introduced in Prompt 18 and is now meaningless — the default is platform-wide).
   - Seed: mark the existing "Morning Abiding" seed template as the default so the app has one out of the box. If no template qualifies (all seeds purged), leave `is_default` unset; the app handles that as "no default configured".

2. **Admin surface (small addition, not the focus)**
   - In `/admin/content` and the edit form for a devotional template, add a "Set as platform Default Devotional" toggle. Flipping it on another template atomically clears the old default and sets the new one (single SQL update using the unique index; on conflict fall back to a two-step `UPDATE ... SET is_default = false WHERE is_default = true; UPDATE ... SET is_default = true WHERE id = $1;` inside a transaction / server fn).

## Frontend

3. **`ContinuePractice` (Home card)** — rewrite the query logic:
   - Fetch the platform default template (`devotional_templates` where `is_default = true AND status = 'published'`).
   - Check if the signed-in user has a `devotional_entries` row for that template with today's local date. If not, render the primary "Continue your practice" card exactly as today (teal top accent, calm styling) pointing at the default.
   - Additionally fetch the user's topical/temporary templates — everything in `saved_items.devotional_template_id` OR templates they have any prior entry for — **excluding** the default. For each, check today's entry; render any that are incomplete as smaller secondary prompts stacked below the main card (same white card, thinner, muted label like "Also today"). Never merge into or replace the primary card.
   - If the default is complete but topical ones are not, still show the topical prompts (no primary card). If everything is complete, render nothing.

4. **Devotionals screen (`/devotionals`)** — restructure into two sections:
   - **Your Default Devotional** — always the first section, always shows the platform default template card even if the user has no entries yet. No "Set as default" button, no remove button. Small "Always active" pill.
   - **Topical & Temporary Devotionals** — the existing grid, but excluding the default. Keeps the current add-from-Explore / progress display. Remove the "Set as default" button entirely (that concept no longer exists user-side).
   - Remove all `default_template_id` reads/writes and the `setDefault` mutation.

## Files to change

- New migration under `supabase/migrations/`
- `src/components/ContinuePractice.tsx` — rewrite fetch + render for primary + secondary prompts
- `src/routes/devotionals.tsx` — split into two sections, drop default-selection UI
- `src/components/admin/content-form.tsx` (or the devotional template edit path) — add "Platform default" toggle
- `src/integrations/supabase/types.ts` regenerates after migration approval

## Out of scope

- No changes to entry-writing flow, analytics events, recommendations, or seed content behavior.
