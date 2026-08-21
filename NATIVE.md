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

The code-side prep is done (privacy strings, encryption flag, signing config).
The remaining steps are done on your Mac — you need Xcode for iOS and Android
Studio for Android.

### 0. Prerequisites you already have

- [x] Apple Developer account ($99/yr) — enrolled
- [x] Google Play Console account ($25 one-time) — enrolled
- [x] Capacitor native projects generated (`ios/` + `android/`)
- [x] iOS privacy strings + `ITSAppUsesNonExemptEncryption` in `Info.plist`
- [x] Android release signing config in `build.gradle` (reads `keystore.properties`)
- [x] App icons (1024×1024 for iOS, mipmap set for Android)
- [x] Google sign-in deep-link flow (`com.justcocreate.app://auth/callback`)

### 1. Generate the Android release keystore

On your Mac, run this in the `android/` directory:

```bash
keytool -genkey -v -keystore cocreate.keystore -alias cocreate \
  -keyalg RSA -keysize 2048 -validity 10000
```

Enter a strong password (save it — you'll need it for every update). Then create
`android/keystore.properties`:

```properties
storeFile=../cocreate.keystore
storePassword=<your-password>
keyAlias=cocreate
keyPassword=<your-password>
```

Both files are gitignored. **Back up the keystore** — if you lose it you cannot
update the app on Google Play.

### 2. iOS — open in Xcode and configure signing

```bash
bun run cap:sync
bun run cap:ios      # opens Xcode
```

In Xcode:
1. Select the **App** target → **Signing & Capabilities** tab.
2. Check **Automatically manage signing**.
3. Select your **Team** (your Apple Developer account).
4. Xcode creates the provisioning profile automatically once your team is
   selected and the bundle ID `com.justcocreate.app` is claimed.
5. Set **Version** (`MARKETING_VERSION`) to `1.0` and **Build**
   (`CURRENT_PROJECT_VERSION`) to `1` in the General tab.
6. Plug in an iPhone, select it as the run destination, and press **Run** (⌘R)
   to test on device.

### 3. Android — open in Android Studio and test

```bash
bun run cap:sync
bun run cap:android   # opens Android Studio
```

In Android Studio:
1. Plug in an Android device (USB debugging enabled) or start an emulator.
2. Press **Run** (▶) to test on device.
3. For a release build: **Build → Generate Signed Bundle / APK → APK**,
   select the keystore you created in step 1.

### 4. Capture store screenshots

Both stores require screenshots. The easiest path:
- **iOS**: In Xcode with a device connected, run the app and press ⌘S in the
  simulator, or use Xcode's screenshot feature. You need at least one
  6.7" (iPhone 15 Pro Max) and one 6.5" set. iPad screenshots are optional.
- **Android**: Run on an emulator/device and use Android Studio's screenshot
  button (the camera icon in the Logcat panel). Google Play requires at least
  one phone screenshot set.

Take screenshots of: Home page, Read workspace, devotional focus mode,
calendar, notes page — your most visually compelling screens.

### 5. Write a privacy policy

Both stores require a publicly accessible privacy policy URL. Since your
site is at justcocreate.com, create a `/privacy` page. Cover:
- What data you collect (email, devotional content, notes, calendar events)
- How you use it (personal spiritual growth tool)
- Third-party services (Supabase for auth/database, Google for sign-in)
- Data retention and deletion policy
- Contact email

### 6. Create the App Store Connect listing (iOS)

1. Go to [App Store Connect](https://appstoreconnect.apple.com).
2. **My Apps → + → New App**. Platform: iOS. Name: CoCreate. Primary language:
   English. Bundle ID: `com.justcocreate.app` (should auto-populate from your
   provisioning profile). SKU: anything unique.
3. Fill in:
   - **Privacy Policy URL**: your `https://justcocreate.com/privacy` page.
   - **App Review Information**: notes for the reviewer — mention that the app
     requires an account; provide a demo login if possible.
   - **App Review Notes**: "This app is a Christian devotional tool. Users can
     sign in with email or Google. To test: create an account or use [demo
     credentials]."
4. Upload screenshots, write your description and keywords.
5. In Xcode: **Product → Archive**, then upload the archive to App Store
   Connect. Submit for review.

### 7. Create the Google Play Console listing (Android)

1. Go to [Google Play Console](https://play.google.com/console).
2. **Create app**. App name: CoCreate. Default language: English. Free or paid.
3. **Setup → App integrity**: Upload your release keystore (or let Play
   App Signing handle it — Google will re-sign with their key; your keystore
   is the upload key).
4. **Store presence → Main store listing**: add screenshots, icon (512×512),
   feature graphic (1024×500), description, category (Lifestyle or Education).
5. **Policy and programs → App content**: complete the privacy policy URL,
   data safety form, and content rating questionnaire.
6. **Release → Production → Create release**: upload your signed APK/AAB,
   add release notes, and submit for review.

### 8. Review timeline

- **Apple**: 1–3 days for first review. Common rejections: missing demo
  login, broken sign-in flow, or "minimal functionality" (make sure the
  reviewer can experience the app fully).
- **Google**: 1–7 days for first review. Common rejections: data safety form
  mismatches, missing privacy policy, or login issues.

### Checklist (print this)

```
[ ] Android keystore generated + keystore.properties created
[ ] iOS signing configured in Xcode (team selected, profile auto-created)
[ ] Tested on a real iPhone (Google sign-in works, deep link returns to app)
[ ] Tested on a real Android device (Google sign-in works, deep link returns)
[ ] Screenshots captured for both platforms
[ ] Privacy policy page published at /privacy
[ ] App Store Connect listing created + screenshots uploaded
[ ] Google Play Console listing created + data safety form completed
[ ] iOS archive uploaded + submitted for review
[ ] Android AAB uploaded + submitted for review
```

### What's already done in code

| Item | Status |
|------|--------|
| Capacitor iOS + Android projects | ✅ Generated |
| App ID `com.justcocreate.app` | ✅ Configured |
| iOS privacy strings (camera, photo library) | ✅ In `Info.plist` |
| iOS `ITSAppUsesNonExemptEncryption` | ✅ Set to `false` |
| iOS deep-link scheme | ✅ Registered in `Info.plist` |
| Android signing config | ✅ In `build.gradle` (needs `keystore.properties`) |
| Android deep-link intent-filter | ✅ In `AndroidManifest.xml` |
| Google sign-in (system browser handoff) | ✅ `src/lib/native-auth.ts` |
| App icons (1024×1024 iOS, mipmap Android) | ✅ Generated |
| Splash screens | ✅ Both platforms |
| `keystore.properties` gitignored | ✅ |

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
