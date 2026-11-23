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
- Word bank: `word_studies` holds terms; each place a word is studied is a kind='word' `doc_annotations` row with `word_study_id` (deleting a word only unlinks). Matching/suggestions live in `src/lib/word-bank.ts`; the sheet and card UI in `WordStudy.tsx`. Jumping into a document at a mark goes through `src/lib/anno-jump.ts` so callers don't drill props into DocPages.
- Public content pages (and future /studio) wrap in `.content-site` and use only its fixed `--cs-*` tokens from styles.css, so app skins never reach them; home data comes from `fetchHomeData(now)` in `src/lib/content-home.ts`, which takes a simulated "now" for staged previews.
- Pieces are visible by `content_items.release_at` (released when ≤ now); `scheduled_at`/`published_at` are legacy inputs kept for old screens.
