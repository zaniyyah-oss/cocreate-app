/**
 * Native (Capacitor) runtime setup.
 *
 * Everything here is a no-op in the browser and on the server — the plugins are
 * only imported once we know we're inside the iOS/Android shell.
 */
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
  } catch {
    /* app plugin unavailable */
  }
}
