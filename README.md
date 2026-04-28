# eyekra

Eyewear webapp for iOS and Android. Try frames at home, book eye tests, find your fit.

## Stack

- **Next.js 14** (App Router) – SSR, streaming, small client bundle
- **TypeScript** – type safety
- **Tailwind CSS** – utility-first, purged CSS for minimal payload

No heavy UI library; custom components keep the bundle light and performant.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command   | Description        |
|----------|--------------------|
| `npm run dev`   | Dev server (hot reload) |
| `npm run build` | Production build   |
| `npm run vercel-build` | Vercel build with Prisma migrate deploy |
| `npm run start` | Run production build |
| `npm run lint`  | Run ESLint         |

## Routes

| Path | Description |
|------|-------------|
| `/` | Home |
| `/frames` | Browse frames |
| `/try-at-home` | Try at home intro |
| `/face-shape` | Face shape detector |
| `/eye-test` | Book eye test |
| `/cart` | Cart |
| `/search` | Search |
| `/profile` | Profile |
| `/auth/login` | Login |
| `/auth/signup` | Sign up |
| `/auth/verify-otp` | OTP verification |

## PWA

`public/manifest.json` is configured for add-to-home-screen on iOS and Android. Safe-area insets are used for notched devices.

## Deployment

- Vercel deployment checklist: `docs/VERCEL_DEPLOYMENT.md`
- TWA release steps: `docs/TWA_RELEASE.md`
- Capacitor phase-2 plan: `docs/CAPACITOR_ROADMAP.md`
