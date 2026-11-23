## Phases

**Phase 0 — groundwork (ships with Phase 1).** Additive database changes (below), a `content-site` token set + Poppins/Instrument Sans fonts, and skin scoping so themes only apply inside signed-in app pages.

**Phase 1 — content home page.** Rebuild `/` top to bottom per mockups: header (wordmark rules for signed-in desktop), info bar (today · "This month: [series]" from the current series · CMS line), featured hero (desktop/mobile focal points, 4:5 mobile crop), signed-in "Pick up where you left off", New this month + schedule rail + Next series, Devotionals, Watch, Read/Listen/Shop, newsletter (existing `subscribe_email`), footer. Signed-in desktop inside AppShell (Explore active), mobile bottom nav kept. No "For you" labels, no topic nav. Existing cards link to current detail pages until Phase 3.

**Phase 2 — Studio core.** `/studio` with its own shell and admin gate; Releases home (going live next, month calendar incl. dashed planned slots, needs attention, series progress); All pieces list; piece editor (block editor, right panel, readiness checklist, autosave, Write/Preview, Schedule); devotionals as day tabs; Homepage layout (featured piece, New this month picks); staged preview (date/time + viewer, desktop and mobile side by side, This piece / Series / Homepage / Newsletter tabs, "Goes live [date]" outline); token share links. "Open Studio" in the profile menu. `/admin/*` redirects to /studio.

**Phase 3 — inner pages + related content.** New article, series and devotional-day pages; old routes (`/essays/$id`, `/teachings/$id`, `/podcasts/$id`, `/collections/$slug`) keep working and point to or render the new layouts. One shared related-content function applying your three rules with de-duplication and "Shares the topic X" reasons. Series progress, Remind me, Follow series, devotional "Your response" saving into Notes, "Add to today's workspace" through the existing day-entry helpers.

**Phase 4 — comments + moderation.** Comments on articles, teachings, podcasts and devotional days; Agree, one-level replies, Copy link / Flag; auto-hide at N flags (setting, default 3); hidden row placeholder; Studio Comments queue with badge.

**Phase 5 — series builder + clips.** Release rhythm, ordered parts with drag reorder and planned slots, 9:16 clip uploads with captions, live click-to-edit series preview.

**Phase 6 — studio.justcocreate.com.** When the hostname is studio.*, `/` redirects to `/studio` (checked on the server request and on the client). Needs the domain's DNS connected (currently "awaiting DNS").

## Technical details

**New/changed data (all additive, RLS on every table):**
- `content_items` + columns: `slug`, `status` (draft/scheduled/published), `release_at` (backfilled from scheduled_at/published_at), `body_doc jsonb` (block document), `summary`, `kicker`, `hero_url`, `hero_caption`, `hero_focal_desktop` / `hero_focal_mobile` (x,y %), `feature_new_this_month bool`, `comments_enabled bool`, `read_minutes`. Public view exposes these except `body_doc` for unpublished rows.
- `content_topics` (content_id, topic_id, position ≤3), backfilled.
- `collections` + `release_rhythm`, `hero focal points`, `teacher`, `themes`; `collection_items` + nullable `content_id` with `planned_title`/`planned_date` for empty planned slots (slot rows readable by admins only).
- `series_clips` (series, storage path, caption, position).
- `content_progress` (user, content, started/finished) and `series_follows`, `release_reminders` — owner-only.
- `comments` (target type+id, parent_id one level, body, hidden_at, hidden_reason), `comment_agrees`, `comment_flags` (unique per user); trigger auto-hides at the threshold from a `site_settings` row. Read: everyone; write: signed-in owner; hide/unhide: admins.
- `preview_tokens` (token hash, scope, expires_at); a server function validates the token and returns staged content read-only — no admin login needed.
- Publishing visibility uses `release_at <= now()` in the policies/view, so scheduled pieces go live with no cron job; staged preview passes a simulated "now" to the same query code.

**Block editor:** TipTap 3 (already in the app). Custom nodes: scripture block, pull quote, image with caption, "Go deeper" card, vertical clip; "/" menu and selection bar reused from WorkspaceEditor patterns. One shared renderer component draws the same JSON on public pages and in the editor, so they look identical.

## Risks

- Signed-out users currently can't read full `body`; the new public article page must deliberately expose published bodies — confirm this is intended.
- Converting old plain-text bodies to blocks is lossy for odd formatting; converted lazily and the original is kept.
- Staged preview of the homepage requires all homepage queries to accept a "now" — built in from Phase 1 to avoid rework.
- The studio subdomain shares sign-in storage per domain; admins sign in once on studio.* separately.

## Decisions needed from you

1. Should signed-out visitors read full articles (vs. preview + sign-in prompt)?
2. Release time zone: always ET, displayed to readers in their own time or ET?
3. Who can comment — any signed-in user, or only after email confirmation? Default flag threshold 3 OK?
4. "Team" in Studio: just a list of admins for now, or invite editors with a separate editor role?
5. Fonts: OK to load Poppins + Instrument Sans from Google Fonts?
