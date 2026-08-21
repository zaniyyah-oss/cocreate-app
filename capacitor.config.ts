import type { CapacitorConfig } from "@capacitor/cli";

/**
 * CoCreate native shell configuration.
 *
 * CoCreate is a server-rendered app (TanStack Start + server functions), so the
 * native apps load the deployed web build over HTTPS instead of bundling a
 * static export. `native-shell/` is only a fallback page shown if the device is
 * offline before the remote URL loads.
 *
 * Point `server.url` at a local dev server (e.g. http://192.168.1.20:8080) while
 * developing on a device, and back at production before submitting a build.
 */
const config: CapacitorConfig = {
  appId: "com.justcocreate.app",
  appName: "CoCreate",
  webDir: "native-shell",
  server: {
    url: "https://justcocreate.com",
    hostname: "justcocreate.com",
    androidScheme: "https",
    cleartext: false,
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#eee9d9",
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    backgroundColor: "#eee9d9",
    allowMixedContent: false,
  },
  plugins: {
    Keyboard: {
      resize: "native",
о      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#181A4D",
    },
  },
};

export default config;
