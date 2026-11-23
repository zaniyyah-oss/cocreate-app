# Content page redesign + CoCreate Studio — phased plan

Two connected projects: a new photography-led public content site, and a Studio editorial space at /studio that replaces /admin. Every phase ships on its own; existing content, URLs and the signed-in app keep working throughout.

## What exists today and how it is reused

| Today | Plan |
|---|---|
| `content_items` (type, title, excerpt, body text, topic_id, published_at, scheduled_at, thumbnail_url, shelf, is_seed) + `content_items_public` view (no body for signed-out) | Becomes the "piece" table. Add new columns only; old `body` stays as fallback and is converted to blocks on first Studio edit. Public view gains the new safe columns. |
| `collections` + `collection_items` (position, layout_slot, banner, intro video, linked devotional) | Becomes "series". `collection_items.position` = part order. Existing `/collections/$slug` redirects to the new series page. |
| `topics` (one per item) | Keep table; add a join table for 1–3 topics per piece, backfilled from `topic_id`. |
| `devotional_templates` / `devotional_movements` / `devotional_days` | Kept as the devotional source; day pages read `devotional_days`. Studio edits days as tabs. |
| `page_content` (CMS copy) | Holds homepage copy (info bar text, newsletter, section headings). Missing copy shows a clear "[placeholder]" marker, never invented text. |
| `saved_items` + `src/lib/up-next.ts` | Powers "Save for later" and "Pick up where you left off". |
| thumbnails storage bucket | Reused for hero photos; new private-then-public bucket for 9:16 clips. |
| `has_role(uid,'admin')` + `/admin` shell | Same gate for /studio. `/admin/*` redirects to the matching /studio page once each Studio screen exists (until then old forms stay reachable). |
| TipTap 3 already installed (WorkspaceEditor) | Recommended block editor — see Technical details. |
| App skins (`brand-palette`) | Scoped to signed-in app pages via a wrapper class; content pages and Studio use a fixed, separate token set. |
