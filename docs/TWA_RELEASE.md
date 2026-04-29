# TWA Release Guide (Fast APK/AAB)

This guide packages the deployed web app into Android using Bubblewrap.

**Status:** TWA for this product is **complete** — Bubblewrap project lives in `twa-android/` (host `eyekra.vercel.app`, package `com.upcapto.eyekra`), Digital Asset Links are served from `public/.well-known/assetlinks.json`, and release builds are produced locally from that folder. Remaining work is **store ops** (Play Console listing, signing policy in CI, staged rollouts), not wrapper setup.

## Prerequisites

- Deployed HTTPS app URL (for example `https://your-domain.vercel.app`)
- Java JDK 17+
- Android SDK + `ANDROID_HOME` configured
- Node.js + npm

## 1) Prepare Manifest URL

Set the manifest URL before initializing Bubblewrap:

```bash
export TWA_MANIFEST_URL="https://your-domain.vercel.app/manifest.webmanifest"
```

## 2) Initialize TWA Project

```bash
npm run twa:init
```

This creates `twa-manifest.json` and Android wrapper files.

Use (this repo’s shipped values):

- package id: `com.upcapto.eyekra`
- launcher name: `eyekra`
- host: production origin (e.g. `eyekra.vercel.app`)

## 3) Configure Digital Asset Links

Update `public/.well-known/assetlinks.json` with:
- your final Android package id
- release keystore SHA-256 fingerprint

Re-deploy web app after updating this file.

## 4) Build Android App

From the **repository root** (where `package.json` lives):

```bash
npm run twa:build
```

Bubblewrap uses your `twa-android/twa-manifest.json` signing config and writes **release** artifacts next to the Android project:

| Artifact | Typical path (after a successful build) |
|----------|----------------------------------------|
| Signed APK (install on phone) | `twa-android/app-release-signed.apk` |
| Play-style bundle | `twa-android/app-release-bundle.aab` |

Those paths are under **`twa-android/`** at the **same level** as `twa-manifest.json` and `gradlew`. They are **not** committed to git (see `.gitignore`); you only see them **on your machine after you build**.

**If you do not have an APK yet:** you must run the command above on a Mac/PC with **JDK 17+** and **Android SDK** (`ANDROID_HOME`) set up. If `npm run twa:build` fails, you can still sanity-check the wrapper with a **debug** APK from Gradle (unsigned release path; fine for dev smoke test):

```bash
cd twa-android && ./gradlew :app:assembleDebug
```

Debug APK path: **`twa-android/app/build/outputs/apk/debug/app-debug.apk`** (exists until you `clean`).

### Install the APK on your phone

1. Copy `app-release-signed.apk` or `app-debug.apk` to the device (USB, AirDrop, Drive, etc.).
2. On the phone: open the file → allow “Install unknown apps” for that source if Android asks.
3. Or with USB debugging: `adb install -r twa-android/app-release-signed.apk` (path from repo root).

### After you change icons or `manifest.webmanifest`

**Web / PWA (Add to Home Screen, Chrome install)**

1. Deploy the site so **`/manifest.webmanifest`** and **`/icons/icon-*.png`** on the server match your local changes.
2. On the phone, the old shortcut often **caches** the previous icon. Either remove the shortcut from the home screen, then open the site in the browser and add again — or in Chrome use **Site settings → Storage → Clear data** (or “Reset permissions”) for your origin, then revisit and **Install app** / **Add to Home Screen** again.

**Android TWA (APK / Play internal track)**

Launcher bitmaps live in **`twa-android/app/src/main/res/mipmap-*`**. Installing a build made **before** those files changed will still show the old icon.

1. From repo root: **`npm run twa:build`** (or your signed Gradle release pipeline).
2. Install the new **`twa-android/app-release-signed.apk`**, or upload a new **`app-release-bundle.aab`** to Play (bump **`versionCode`** in `twa-android/app/build.gradle` / `twa-manifest.json` when Play requires it).
3. Uninstall the old app first if Android refuses an in-place downgrade; otherwise `adb install -r` overwrites for sideload.

## 5) TWA Validation Checklist

Do these **on a real Android device** after installing the APK (or AAB via an internal Play track):

1. **Production domain** — Launch **eyekra** from the home screen; the in-app web content should be served from your real host (e.g. `eyekra.vercel.app`), not localhost.
2. **Login / session** — Sign in with password or OTP (and Google if you use it); close the app fully and reopen; you should still be logged in where your product expects it.
3. **Navigation** — Open a few screens, use the **system Back** button; you should not get stuck on a blank screen or kicked to the browser in a broken state (TWA should stay in the app shell).
4. **Google auth** — Start Google sign-in from the TWA; after choosing an account, you should return **into the app** (same task), not stranded in an external browser tab, and the session should match your `APP_BASE_URL` / OAuth redirect configuration.

### Troubleshooting: TWA opens but shows a Next.js “404” page

The wrapper loads **`https://<your-host>/`** (see `launchUrl` / `hostName` in the Android project). If that URL returns **Next’s built-in 404** in a normal browser too, the problem is the **web deployment**, not the APK.

1. On a desktop browser, open the same URL the TWA uses (e.g. `https://eyekra.vercel.app/`).
2. Optional: `curl -sI https://eyekra.vercel.app/ | grep x-matched-path` — you want **`x-matched-path: /`**, not **`/404`**.
3. **Fix:** trigger a fresh **production** deploy from the current repo (`vercel deploy --prod` or push to the branch Vercel builds). Stale deploys sometimes appear after bad builds (e.g. accidental **root-level** `app/` folder next to `src/app`, which confuses Next.js). Keep Android Bubblewrap output under **`twa-android/`** only.

After production serves `/` correctly, force-close the Android app and open it again (no need to rebuild the AAB for a pure web fix).

## 6) Google Play — first submission (store ops)

1. **Play Console** — Create the app, pick default language, short/full description, graphics (feature graphic, screenshots, hi-res icon).
2. **Signing** — Enable **Play App Signing** (recommended). You upload an AAB signed with your **upload key**; users receive builds signed with Google’s **app signing key**.
3. **Upload** — Create an **internal testing** release; upload the **AAB** from `npm run twa:build` (or your Gradle release output). Add testers by email or Google Group.
4. **Policies** — Complete **Data safety**, **Content rating** (questionnaire), **Target audience**, **News / ads** declarations, and link a public **Privacy policy** URL (HTTPS).
5. **Production** — After internal / closed validation, promote through **closed → open testing** if you use them, then **Production** with staged rollout if you prefer.

Official reference: [Google Play Console Help](https://support.google.com/googleplay/android-developer/).

## 7) Digital Asset Links after Play App Signing (critical)

`assetlinks.json` must list the **SHA-256 of the certificate that actually signs the APK/AAB users install**.

- **Before Play**, that was often your **local release keystore** fingerprint (what you used first).
- **After Play App Signing**, the signing certificate on end-user devices is Google’s **app signing key**, not your upload key.

**Action:** In Play Console → **Test and release** → **Setup** → **App integrity** (or **App signing**), copy the **SHA-256 certificate fingerprint** for the **App signing key**, add it to `public/.well-known/assetlinks.json` (you can keep multiple `sha256_cert_fingerprints` entries during migration), redeploy the **web** app, then verify with [Statement List Generator and Tester](https://developers.google.com/digital-asset-links/tools/generator) or Chrome’s Digital Asset Links state.

If asset links are wrong, Chrome may fall back to **Custom Tabs** instead of a verified TWA.

## 8) Version bumps for new store releases

1. Increase **`versionCode`** (integer, must always go up on Play) and **`versionName`** (user-visible string) in `twa-android/app/build.gradle` inside `defaultConfig`.
2. Keep **`twa-android/twa-manifest.json`** `appVersionCode` / `appVersionName` aligned if you still run Bubblewrap (`npm run twa:init` / `twa:build`) so local tooling matches Gradle.
3. Rebuild AAB, upload a new release in Play Console, and roll out.

## 9) CI — verify the Android project (no secrets)

Canonical workflow definition: **`docs/snippets/android-twa-ci.yml`**. Copy it to **`.github/workflows/android-twa.yml`** in your repo (or merge its contents). On pushes / PRs that touch `twa-android/`, it runs `./gradlew :app:assembleDebug` on Ubuntu with JDK 17 + Android SDK. That proves the wrapper **compiles**; it does **not** produce a signed release AAB.

**Note:** Some Git automation tokens cannot create workflow files on first push (missing `workflow` scope). If `git push` is rejected for `.github/workflows/*`, add the file via GitHub’s web UI or push from a credential that includes the **workflow** scope.

## 10) Optional — release AAB in GitHub Actions

For a commercial pipeline, store the upload keystore as a **GitHub Actions secret** (e.g. base64-encoded file) and inject `signingConfigs` in Gradle via environment variables or a committed `keystore.properties` template (gitignored values). Prefer **Play App Signing** so the upload key can be rotated without changing the app signing identity users trust. See [Android: sign your app](https://developer.android.com/studio/publish/app-signing).
