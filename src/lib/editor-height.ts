/**
 * Shared guards for the per-device editor heights we persist under `de-h:*`.
 *
 * Those heights are meant to remember a height the *user* dragged. Editors are
 * also stretched programmatically — focus mode makes them fill the screen, and
 * the workspace column-alignment effect sets an explicit height — and if those
 * stretched heights get saved they come back in the normal 3-column view and
 * blow the columns up to thousands of pixels.
 */

/** Largest height we're willing to save or restore for an inline editor. */
export function maxEditorHeight(): number {
  if (typeof window === "undefined") return 600;
  return Math.min(700, Math.round(window.innerHeight * 0.6));
}

/** Clamp a restored value; returns null when nothing sensible is stored. */
export function clampSavedHeight(raw: string | null): number | null {
  if (!raw) return null;
  const n = parseFloat(raw);
  if (!Number.isFinite(n) || n <= 20) return null;
  return Math.min(n, maxEditorHeight());
}

/** True when a measured height came from the user, not from a stretch. */
export function isUserResize(el: HTMLElement, h: number): boolean {
  if (h > maxEditorHeight()) return false;
  // Alignment effect writes `height` with !important; focus mode adds .is-full.
  if (el.style.getPropertyPriority("height") === "important") return false;
  if (el.closest(".de-block.is-full")) return false;
  return true;
}
