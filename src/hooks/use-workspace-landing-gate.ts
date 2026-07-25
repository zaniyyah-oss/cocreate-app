import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";

const FLOOR_MS = 600;
const FADE_MS = 450;
const MOBILE_MAX = 1023; // mobile + tablet
const SESSION_KEY = "cocreate:home_redirect_done";
const DAY_KEY = "cocreate:last_active_day";

function localDay() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/**
 * Gates the Home page on mobile/tablet for the cold-start / new-day redirect
 * to the Workspace. Returns { gated, leaving } — while `gated` is true the
 * caller must render the branded loading screen instead of Home.
 */
export function useWorkspaceLandingGate() {
  const router = useRouter();
  const [gated, setGated] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const started = useRef(false);

  const run = useCallback(async () => {
    const startedAt = Date.now();
    try {
      await router.preloadRoute({ to: "/devotionals" });
    } catch {
      /* fall through — navigate anyway */
    }
    const wait = Math.max(0, FLOOR_MS - (Date.now() - startedAt));
    await new Promise((r) => setTimeout(r, wait));
    setLeaving(true);
    setTimeout(() => {
      router.navigate({ to: "/devotionals", replace: true });
    }, FADE_MS);
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
    setGated(true);
    void run();
  }, [run]);

  return { gated, leaving };
}
