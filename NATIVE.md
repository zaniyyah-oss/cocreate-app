# CoCreate native apps (iOS + Android)

CoCreate is server-rendered, so the native shells load the deployed site over
HTTPS rather than bundling a static export. `native-shell/` is only the offline
fallback page.

## Config

- `capacitor.config.ts` — app id `com.justcocreate.app`, name `CoCreate`,
  `server.url` = `https://justcocreate.com`.
- `ios/` and `android/` — generated native projects (commit them).
- `src/lib/native.ts` — status bar styling + Android back-button handling; no-op
  in the browser.

## Everyday workflow

```bash
bun run cap:sync        # copy config/plugins into ios + android
bun run cap:ios         # open Xcode   (macOS only)
bun run cap:android     # open Android Studio
```

Run `cap:sync` after any Capacitor plugin install or config change.

## Testing against a local dev server

Set `server.url` to your machine's LAN address (e.g. `http://192.168.1.20:8080`)
and set `cleartext: true` / `androidScheme: "http"`, then `bun run cap:sync`.
Revert to the production URL before building a release.

## Before store submission

- iOS: signing team + bundle id in Xcode, app icons/splash in
  `ios/App/App/Assets.xcassets`, privacy strings in `Info.plist`.
- Android: `applicationId` and version in `android/app/build.gradle`, icons in
  `android/app/src/main/res`, signing keystore for release builds.
- Both stores require an app privacy policy URL and store listing assets.

## Google sign-in on native

Google blocks OAuth inside embedded webviews, so native uses this flow
(`src/lib/native-auth.ts` + `src/lib/native.ts`):

1. Tapping "Continue with Google" opens `https://justcocreate.com/~oauth/initiate`
   in the system browser (SFSafariViewController / Chrome Custom Tabs) with
   `redirect_uri=https://justcocreate.com/auth/callback?native=1` — an HTTPS URL
   on the app's own domain, which is already allow-listed for OAuth redirects.
2. `/auth/callback` (route `src/routes/auth_.callback.tsx`) sees `native=1` and
   forwards the result to `com.justcocreate.app://auth/callback?...`.
3. The app receives it via Capacitor `appUrlOpen`, verifies the `state` value,
   sets the Supabase session, closes the browser, and lands on `/`.

The scheme `com.justcocreate.app` is registered in `ios/App/App/Info.plist`
(`CFBundleURLTypes`) and `android/app/src/main/AndroidManifest.xml`
(`VIEW` intent-filter with `android:host="auth"`). If the app id ever changes,
update the scheme in all three places plus `APP_URL_SCHEME`.

No extra redirect URIs need to be registered with the auth provider: every
OAuth redirect target is an HTTPS URL on `justcocreate.com`. Browser sign-in is
unchanged.
