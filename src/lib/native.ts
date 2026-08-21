/**
 * Native (Capacitor) runtime setup.
 *
 * Everything here is a no-op in the browser and on the server — the plugins are
 * only imported once we know we're inside the iOS/Android shell.
 */
import { supabase } from "@/integrations/supabase/client";
import { NATIVE_OAUTH_STATE_KEY } from "@/lib/native-auth";

/**
 * Handles `com.justcocreate.app://auth/callback?...` deep links produced by the
 * web callback page after Google sign-in in the system browser.
 */
async function handleAuthDeepLink(url: string): Promise<boolean> {
  if (!/auth\/callback/.test(url)) return false;

  const parsed = new URL(url.replace(/^[a-zA-Z0-9.+-]+:\/\//, "https://"));
  const params = new URLSearchParams(parsed.search);
  new URLSearchParams(parsed.hash.replace(/^#/, "")).forEach((v, k) => {
    if (!params.has(k)) params.set(k, v);
  });

  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.close();
  } catch {
    /* browser already closed */
  }

  const expectedState = sessionStorage.getItem(NATIVE_OAUTH_STATE_KEY);
  sessionStorage.removeItem(NATIVE_OAUTH_STATE_KEY);
  const state = params.get("state");
  if (expectedState && state && state !== expectedState) {
    console.error("[native-auth] OAuth state mismatch — ignoring callback");
    return true;
  }

  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (!access_token || !refresh_token) {
    console.error("[native-auth] Sign-in failed:", params.get("error_description") ?? params.get("error"));
    return true;
  }

  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) {
    console.error("[native-auth] Could not set session:", error.message);
    return true;
  }

  window.location.replace("/");
  return true;
}

export async function initNativeShell(): Promise<void> {
  if (typeof window === "undefined") return;

  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) return;

  document.documentElement.dataset["nativePlatform"] = Capacitor.getPlatform();

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Light });
    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setBackgroundColor({ color: "#181A4D" });
    }
  } catch {
    /* status bar unavailable */
  }

  try {
    const { App } = await import("@capacitor/app");

    // Android hardware back button: go back in history, otherwise exit.
    App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) window.history.back();
      else App.exitApp();
    });

    // OAuth (and any other) deep links back into the app.
    App.addListener("appUrlOpen", ({ url }) => {
      void handleAuthDeepLink(url);
    });

    // Cold start via deep link.
    const launch = await App.getLaunchUrl();
    if (launch?.url) void handleAuthDeepLink(launch.url);
  } catch {
    /* app plugin unavailable */
  }
}
