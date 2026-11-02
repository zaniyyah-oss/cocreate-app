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
