# Capacitor Phase-2 Roadmap

Use this after TWA release when native features are required.

## Target Outcome

Maintain current Next.js web app while introducing Android native capabilities
incrementally through Capacitor.

## Stage 1: Wrapper Baseline

1. Install Capacitor packages:
   - `npm i @capacitor/core`
   - `npm i -D @capacitor/cli`
2. Initialize project:
   - `npx cap init eyekra com.eyekra.app`
3. Prefer hosted URL mode initially (lowest risk):
   - point Android shell to production web URL

## Stage 2: Android App Setup

1. Add Android platform:
   - `npx cap add android`
2. Open Android Studio:
   - `npx cap open android`
3. Configure app id/signing/intent filters.

## Stage 3: Native Feature Adoption

Add plugins only when needed:
- Camera
- Push notifications
- File picker/share
- Biometric unlock

Keep web parity by gating native-only UX with capability checks.

## Stage 4: Release Pipeline

1. Define CI build for Android debug/release.
2. Add E2E smoke checks for:
   - login/google callback
   - checkout/bookings core flows
3. Compare metrics against TWA:
   - startup time
   - package size
   - crash-free sessions

## Migration Guardrails

- Keep one source-of-truth business logic in Next.js APIs.
- Avoid duplicating auth/data flows in native code.
- Roll out native features behind flags to reduce risk.
