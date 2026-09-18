# Add Notion-style toggle blocks

## What will change
- Add a collapsible toggle block to the full workspace rich-text editor.
- Place **Toggle** in the existing **Insert** menu, alongside Callout, Table, Image, and Link card.
- Give each toggle a clickable disclosure arrow and an editable summary line.
- Let the expanded area contain normal rich text, including paragraphs, headings, lists, links, highlights, images, tables, callouts, and nested toggles.
- Preserve Tab / Shift-Tab indentation inside the toggle, using the editor’s current indentation behavior.

## Expected behavior
- Choosing **Insert → Toggle** creates an open toggle at the cursor and puts the caret in its summary.
- Clicking its arrow opens or closes the content without deleting or changing it.
- Enter from the summary moves into the toggle body; users can continue formatting there with the same toolbar.
- Saved notes retain the toggle structure and its open/closed state when reopened.
- Existing notes remain unchanged and continue to load normally.

## Technical details
- Add a dedicated TipTap toggle node with a React node view for the interactive arrow, summary, and nested block content.
- Register the node in `WorkspaceEditor`, add its toolbar command and icon, and include toggle wrappers in the indentation extension.
- Add shared toggle styling to the workspace editor stylesheet so workspace notes, Notes, and Read focus views render consistently.
- Validate insertion, formatting, indentation, persistence, collapse/expand behavior, and desktop/mobile layout in the live preview.
