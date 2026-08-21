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
- Google OAuth: add the native redirect scheme / app-bound domain so sign-in
  returns to the app.
- Both stores require an app privacy policy URL and store listing assets.
