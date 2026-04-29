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

```bash
npm run twa:build
```

Output includes signed artifacts for internal testing.

## 5) TWA Validation Checklist

- Open app and verify it loads production domain.
- Confirm login/session continuity.
- Confirm deep-link navigation and Android back behavior.
- Confirm Google auth callback returns to app correctly.

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
