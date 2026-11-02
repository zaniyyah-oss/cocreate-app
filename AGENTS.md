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
- Day entries are resolved through one shared find-or-create promise per date (`resolveEntryForDate` in devotionals.$id.tsx); never insert a day's devotional_entries row directly, so concurrent saves can't create duplicates.
- The Read page (`StudyLibrary`) and the Workspace widget share the `["workspace-items", userId]` query and `WorkspaceSection` (`mode="studies"` on Read), so a study's open/filed state is one source of truth.
