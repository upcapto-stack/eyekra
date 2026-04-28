# Vercel Deployment Guide

This app is production-ready on Vercel with Postgres (Neon) and Google OAuth.

## 1) Required Environment Variables

Set these in `Vercel Project -> Settings -> Environment Variables`:

- `APP_BASE_URL` (example: `https://your-domain.vercel.app`)
- `DATABASE_URL` (Neon/Postgres connection string)
- `AUTH_SECRET` (long random secret)
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Do not expose secrets through `NEXT_PUBLIC_*` variables.

## 2) Build and Migration Behavior

`vercel.json` uses:

- `npm run vercel-build`

That command runs:

1. `prisma generate`
2. `prisma migrate deploy`
3. `next build`

This ensures schema migrations are applied before app startup.

## 3) Google OAuth Configuration

In Google Cloud Console -> OAuth client:

- Authorized JavaScript origins:
  - `https://your-domain.vercel.app`
- Authorized redirect URIs:
  - `https://your-domain.vercel.app/api/auth/google/callback`

If you use a custom domain, add both Vercel URL and custom domain callbacks.

## 4) Post-deploy Smoke Checklist

1. Open `/login`, run password + OTP + Google login.
2. Open `/api/auth/me` and confirm session user object after login.
3. Create order/booking and verify in DB.
4. Test admin login (`/admin/login`) and customer-only Google policy.
