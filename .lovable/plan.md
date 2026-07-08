## Home page redesign

Rebuild the Home route to mirror the uploaded mockup pixel-for-pixel, and introduce the new data types the mockup requires.

### 1. New backend tables (one migration)

- `daily_scriptures` — `verse_text`, `reference`. Publicly readable. Seeded with ~30 verses. Random-verse selection driven by `ORDER BY random()` client-side query with a small day-based rotation.
- `sticky_notes` — per-user notes: `user_id`, `body` (≤160 chars), `color` (enum: `limelight`, `blush`, `amber`, `teal`), `rotation` (small int −4..4). RLS: user CRUD own rows.
- Extend `content_type` enum with `clip` and `promoted`. Extend `content_items` with `video_url` (nullable), `duration_seconds` (nullable), `external_url` (nullable, used for promoted CTA).
- `collections` — `slug`, `title`, `eyebrow` (e.g. "week 2"), `description_md`, `banner_url`, `intro_video_content_id`, `devotional_template_id`, `status`, `week_number`, `published_at`. Public read when published.
- `collection_items` — `collection_id`, `content_id`, `position`, `layout_slot` (enum: `lead`, `medium`, `half`, `promo`). Public read.

Grants + RLS + `updated_at` triggers on all new tables.

### 2. Home page (`src/routes/index.tsx`)

Rebuilt to match the mockup exactly:

- Hero: new title/subtitle. Remove green "Return to today's workspace" banner completely.
- Widget row: `TodayScripture` (teal stripe, "↻ New verse" reshuffles) + `StickyNotes` (grid of colored rotated squares + dashed "+" add tile; add-inline via prompt or a tiny inline editor).
- Short-form row: fixed 3 cards — 1 `promoted` + 2 `clip`, pulled from `content_items` filtered by new types. Vertical 3:4 cards with gradient overlay + pills + play icon.
- Featured grid: existing content, restyled to 4-col dense (96px thumb, title + scripture ref only).
- Collection preview module: pulls the latest published collection. Renders eyebrow, title, evergreen "What's a collection?" explainer card, banner image (with `Replace image` for admins → uploads to `workspace-media`), full-width writeup, 2 full-size clip cards (intro + one clip), enlarged devotional promo (`+ Add to my Abide` attaches template, `See what's inside →` links to devotional overview), asymmetric grid (1 lead + 1 medium + 3 half from `collection_items`), "See all" button linking to `/collections/$slug` (page stub not built here — link only).

### 3. Scope kept small

- No admin CRUD UI for collections/clips/scriptures in this pass — data is seeded via migration; admin polish comes later.
- No video playback: clip cards show thumbnail + play icon; clicking a clip navigates to its content detail route (essays route reused for now, since clips are `content_items`).
- No `/collections/$slug` route in this pass — button links there but page shows 404 until Set B.

### Technical notes

- New `src/components/home/` folder: `TodayScripture.tsx`, `StickyNotes.tsx`, `ShortFormRow.tsx`, `FeaturedGrid.tsx`, `CollectionPreview.tsx`. Each self-contained with inline `<style>` blocks matching the mockup CSS.
- Reuse `supabase` client; queries via TanStack Query.
- Admin-only "Replace image" gated by existing `has_role('admin')`.
- Nav "Library" doesn't exist in the app; mockup nav is inspirational — keep existing `AppShell` nav untouched.

Ready to build once approved.