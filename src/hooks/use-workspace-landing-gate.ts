import { useCallback, useLayoutEffect, useRef } from "react";
import { useRouter } from "@tanstack/react-router";
import { fadeOutBrandLoader, showBrandLoader } from "@/lib/brand-loader-store";

const FLOOR_MS = 900; // minimum time the loader stays up
const FADE_MS = 450;
const MAX_MS = 9000; // hard cap so we never trap the user behind the loader
const POLL_MS = 80;
const SETTLE_MS = 250; // extra beat after the workspace paints
const MOBILE_MAX = 1023; // mobile + tablet
const SESSION_KEY = "cocreate:home_redirect_done";
const DAY_KEY = "cocreate:last_active_day";

function localDay() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** The workspace has actually painted (not a skeleton, not an empty shell). */
function workspaceReady() {
  const el = document.querySelector<HTMLElement>(".de-shell-inner");
  if (!el) return false;
  if (el.querySelector(".de-skel")) return false;
  return el.offsetHeight > 240;
}

/**
 * Gates the Home page on mobile/tablet for the cold-start / new-day redirect
 * to the Workspace. The loader itself is rendered globally (see
 * GlobalBrandLoader) so it stays on screen through the navigation and only
 * fades once the workspace is genuinely rendered.
 */
export function useWorkspaceLandingGate() {
  const router = useRouter();
  const started = useRef(false);

  const run = useCallback(async () => {
    const startedAt = Date.now();

    // Warm the destination, then navigate while the loader still covers.
    try {
      await router.preloadRoute({ to: "/devotionals" });
    } catch {
      /* navigate anyway */
    }
    router.navigate({ to: "/devotionals", replace: true });

    // Wait for the workspace to actually be on screen (with a floor + cap).
    await new Promise<void>((resolve) => {
      const tick = () => {
        const elapsed = Date.now() - startedAt;
        if (elapsed >= MAX_MS) return resolve();
        if (elapsed >= FLOOR_MS && workspaceReady()) {
          setTimeout(resolve, SETTLE_MS);
          return;
        }
        setTimeout(tick, POLL_MS);
      };
      tick();
    });

    // One more frame so layout/fonts settle before the cross-fade.
    requestAnimationFrame(() => fadeOutBrandLoader(FADE_MS));
  }, [router]);

  // useLayoutEffect: decide before the browser paints Home.
  useLayoutEffect(() => {
    if (typeof window === "undefined" || started.current) return;
    if (window.innerWidth > MOBILE_MAX) return;

    const coldStart = !window.sessionStorage.getItem(SESSION_KEY);
    const today = localDay();
    const newDay = window.localStorage.getItem(DAY_KEY) !== today;
    if (!coldStart && !newDay) return;

    started.current = true;
    window.sessionStorage.setItem(SESSION_KEY, "1");
    window.localStorage.setItem(DAY_KEY, today);
    showBrandLoader();
    void run();
  }, [run]);

  // `gated` keeps Home from painting underneath during the hand-off.
  return { gated: started.current, leaving: false };
}
