<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

Workspace daily reflection sections use the shared SectionRichEditor in inline and focus views so rich-text features and toolbar behavior stay consistent.
- workspace_items holds both notes and studies (`kind`); the Workspace widget shows both (studies marked orange); other note lists (Notes page, tags, strips) still filter `kind = note` until their study UI ships.
- Study day-logging (new/continued/revisited) lives in `src/lib/study-log.ts` and `entry_study_links`; the Read box only lists logged studies and opens them as Workspace tabs, so study content is edited in WorkspaceEditor only.
- Day entries are resolved through `resolveDayEntry` in `src/lib/day-entry.ts` (one shared find-or-create promise per user/template/date, used by the workspace page and Notes To-dos); never insert a day's devotional_entries row directly, so concurrent saves can't create duplicates. Cross-day to-do writes go through `updateEntryTodos` so they're serialized per entry.
- The Read page (`StudyLibrary`) and the Workspace widget share the `["workspace-items", userId]` query and `WorkspaceSection` (`mode="studies"` on Read), so a study's open/filed state is one source of truth.
- Saved content ("Up next") goes through `src/lib/up-next.ts` (`kept` / `finished_at` on saved_items); starting a published devotional goes through `subscribeToDevotional` in `src/lib/devotional-start.ts`, so the feed, /up-next and /explore/devotionals stay consistent.
- The content page never pads shelves with demo items for signed-in users; empty shelves/sections are hidden (demo filler is signed-out only).
- Email sign-ups (Subscribe page, Shop paper crew) go through the `subscribe_email` database function, which lowercases the email and merges tags without removing any; the subscribers table itself is admin-read-only. Shop checkout links live in `shop_products.checkout_url` (null = show "Coming soon" linking to /subscribe).
- Study/note pages live in `workspace_items.pages` (rules in `src/lib/doc-pages.ts`); `body` mirrors the first page and `body_text` holds every page, so lists, previews and search keep working without reading pages.
- Document properties render selected book/topic labels in WorkspaceSection and use propertyRow picker modes only for add controls, keeping metadata in one flat wrapping row without altering other picker contexts.
- Rich-text tables use the shared editor's bounded, touch-scrollable tableWrapper in editable and read-only views so wide tables remain reachable without widening the document.
- Margin notes live in `doc_annotations` and are anchored by the `annotation` TipTap mark (`src/components/workspace/annotation-mark.ts`); `AnnotationLayer` renders margin cards or inline strips only when `WorkspaceEditor` gets `annotationItemId` (DocPages passes it), so document saving is unchanged and marks with no row/rows with no mark degrade gracefully (Detached).
- Study Overview indexes are read-only views of the shared annotation cache and page marks; a missing Overview remains virtual until edited, preserving existing documents and the established save path.
- Margin-note activation and placement are presentation-only: reserve the selected annotation's passage position and condense other cards without updating document content or annotation rows.
- Workspace selection menus append to document.body with fixed positioning and viewport flip/shift; their layer sits above document chrome and below modal sheets so notes cannot cover or clip formatting actions.
- Word bank: `word_studies` holds terms; each place a word is studied is a kind='word' `doc_annotations` row with `word_study_id` (deleting a word only unlinks). Matching/suggestions live in `src/lib/word-bank.ts`; the sheet and card UI in `WordStudy.tsx`. Jumping into a document at a mark goes through `src/lib/anno-jump.ts` so callers don't drill props into DocPages.
- Public content pages (and future /studio) wrap in `.content-site` and use only its fixed `--cs-*` tokens from styles.css, so app skins never reach them; home data comes from `fetchHomeData(now)` in `src/lib/content-home.ts`, which takes a simulated "now" for staged previews.
- Pieces are visible by `content_items.release_at` (released when ≤ now); `scheduled_at`/`published_at` are legacy inputs kept for old screens.
- Studio (/studio, admin-only via has_role) has its own shell and fixed palette in `src/components/studio/ui.tsx` (no AppShell, no skins); old /admin content/collections routes redirect into it from `admin.tsx` beforeLoad.
- Piece bodies are TipTap JSON in `content_items.body_doc`; `PieceRenderer` (`src/components/content/PieceRenderer.tsx`) is the one renderer for editor preview, share links and public pages, and the Studio `BlockEditor` emits the same `pc-*` classes so writing matches reading. Legacy `body` text is converted on open and never overwritten.
- Studio status is derived, not stored: draft = status 'draft'; scheduled/live = status 'published' with release_at after/before now (`pieceStatus` in `src/lib/studio-checklist.ts`). Release times are entered in ET via `src/lib/et-time.ts`.
- Staged preview iframes the real public routes with `?at=&stage=&viewer=`; the home page passes these to `fetchHomeData(now, stageId)` and outlines `[data-piece-id]`. Share links use `preview_tokens` (hash only) resolved by the public `getPreviewByToken` server fn.
- Homepage picks live in page_content('home'): `featured_piece_id` and `new_this_month_ids` ("c:<id>" piece / "d:<id>" devotional, max 3), honored by `fetchHomeData`.
- Studio photos upload to the private content-thumbnails bucket and store a long-lived signed URL, because public buckets are blocked in this workspace.
- Unreleased content is locked in the database: content_items/devotional_days RLS only return released rows to non-admins, and `content_items_public` is an owner-run teaser view that nulls `body` before release_at — pages fetch bodies from the tables so "Coming [date]" is the only thing the public can see early.
- Release notifications (topic followers, series follows, reminders) are delivered by the hourly `deliver_release_notifications()` cron job at release_at; the insert/update trigger only notifies for pieces already released, so scheduling never notifies early.
- Inner content pages (`ArticlePage`, /series/$slug, /devotionals/$id/day/$n) share `PageFrame`/rails in `src/components/content/inner.tsx`, data helpers in `src/lib/content-pages.ts`, and ONE related-content server function `getRelated` (ordering rules in `src/lib/related.ts`); staged preview `?at=&viewer=` is honored via `useViewer` for admins only.
- Reader progress, series follows and reminders live in owner-only `content_progress` / `series_follows` / `release_reminders`; devotional journal responses live on content_progress rows and are mirrored into one Notes note per devotional (tag `devotional:<id>`).
- Comments live in `comments` (+ `comment_agrees`, `comment_flags`, threshold in `site_settings`); posting rules (signed-in + confirmed email, comments_enabled, one reply level, 5 per 10 min), counters, auto-hide and reply notifications are enforced by database triggers, and the public reads only through the owner-run `comments_public` view, which blanks hidden bodies except for the author/admins (`viewer_is_admin()`). UI: `src/components/content/Conversation.tsx`; moderation: /studio/comments.
- Clips live in the private `clips` bucket + `clips` table (admin-only RLS); readers get them only through `getReleasedClips` (released + captioned, 6h signed URLs) via `loadClips` in `src/lib/clips.ts`, and `ClipPlayer.tsx` is the one vertical player (series row, overlay, Clip block), so the release lock stays server-side.
- The series page body is `SeriesView` (`src/components/content/SeriesView.tsx`), shared by /series/$slug, series share links and the Studio builder's editable preview (`edit` prop), so the builder edits the real page.
