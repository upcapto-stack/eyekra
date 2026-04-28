# TWA Release Guide (Fast APK/AAB)

This guide packages the deployed web app into Android using Bubblewrap.

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

Use:
- package id: `com.eyekra.app`
- launcher name: `eyekra`
- host: your production domain

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
