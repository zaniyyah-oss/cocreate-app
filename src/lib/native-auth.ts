/**
 * Google sign-in that works both in the browser and inside the Capacitor
 * iOS/Android shells.
 *
 * Why the native path is different: Google refuses OAuth requests coming from
 * an embedded webview (`disallowed_useragent`). So on native we open the Lovable
 * OAuth broker in the system browser (SFSafariViewController / Chrome Custom
 * Tabs), let it redirect back to our own allow-listed HTTPS callback page, and
 * that page hands the tokens back to the app through the app's URL scheme.
 *
 * Nothing here changes web behaviour — in a normal browser we call the standard
 * Lovable helper.
 */
import { lovable } from "@/integrations/lovable";

export const APP_URL_SCHEME = "com.justcocreate.app";
/** Public, allow-listed HTTPS page the OAuth broker is allowed to return to. */
export const WEB_CALLBACK_PATH = "/auth/callback";

export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

function randomState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const NATIVE_OAUTH_STATE_KEY = "cocreate.native_oauth_state";

/**
 * Starts Google sign-in.
 * Returns `{ error }` on failure. On success either the session is already set
 * (web popup flow) or the flow continues out-of-process (redirect / native).
 */
export async function signInWithGoogle(): Promise<{ error: Error | null; pending?: boolean }> {
  if (!isNativeApp()) {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) return { error: result.error };
    return { error: null, pending: Boolean(result.redirected) };
  }

  try {
    const { Browser } = await import("@capacitor/browser");
    const state = randomState();
    sessionStorage.setItem(NATIVE_OAUTH_STATE_KEY, state);

    const callback = new URL(WEB_CALLBACK_PATH, window.location.origin);
    callback.searchParams.set("native", "1");

    const params = new URLSearchParams({
      provider: "google",
      redirect_uri: callback.toString(),
      state,
      prompt: "select_account",
    });

    await Browser.open({
      url: `${window.location.origin}/~oauth/initiate?${params.toString()}`,
      presentationStyle: "popover",
    });
    return { error: null, pending: true };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}
