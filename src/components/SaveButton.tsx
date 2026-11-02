import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { saveForLater, removeSaved, useInvalidateUpNext } from "@/lib/up-next";

const CSS = `
.svb{display:inline-flex;align-items:center;gap:5px;border:1px solid rgba(24,26,77,0.16);background:#fff;color:#181A4D;border-radius:999px;padding:4px 10px;font-family:'Poppins',sans-serif;font-size:11.5px;font-weight:700;cursor:pointer;line-height:1.2;}
.svb:hover{border-color:#181A4D;}
.svb.on{background:#DCE07A;border-color:#DCE07A;}
.svb svg{width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}
.svb.on svg{fill:currentColor;}
.svb.dark{background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.28);color:#fff;}
.svb.dark.on{background:#DCE07A;color:#181A4D;border-color:#DCE07A;}
`;

/** Small "Save" bookmark that adds a content item to Up next. Safe to place inside a card link. */
export function SaveButton({
  contentId, userId, savedId, dark,
}: { contentId: string; userId: string | null | undefined; savedId?: string | null; dark?: boolean }) {
  const navigate = useNavigate();
  const invalidate = useInvalidateUpNext();
  const [busy, setBusy] = useState(false);
  const on = !!savedId;
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <button
        type="button"
        className={`svb${on ? " on" : ""}${dark ? " dark" : ""}`}
        aria-pressed={on}
        aria-label={on ? "Saved to Up next" : "Save to Up next"}
        disabled={busy}
        onClick={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!userId) { navigate({ to: "/auth" }); return; }
          setBusy(true);
          try {
            if (on) { await removeSaved(savedId!); toast.success("Removed from Up next"); }
            else { await saveForLater(userId, contentId); toast.success("Saved to Up next"); }
            invalidate();
          } catch (err: any) {
            toast.error(err?.message ?? "Could not save this.");
          } finally { setBusy(false); }
        }}
      >
        <svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4V3z" /></svg>
        {on ? "Saved" : "Save"}
      </button>
    </>
  );
}
