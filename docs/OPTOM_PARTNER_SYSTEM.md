# Eyekra Optom Partner System

This document captures the integrated partner module implementation added to the existing Next.js + Prisma architecture.

## 1) New Module Folder Structure

```text
src/
  app/
    (app)/
      partner/
        (protected)/
          layout.tsx
          page.tsx
          attendance/
            history/page.tsx
            punch-in/page.tsx
            punch-out/page.tsx
          bookings/
            page.tsx
            [id]/page.tsx
          commerce/
            frames/page.tsx
            lens-recommendation/page.tsx
            offers/page.tsx
            order/page.tsx
          equipment/
            assigned/page.tsx
            damage-report/page.tsx
            return/page.tsx
          earnings/page.tsx
          eye-test/page.tsx
          notifications/page.tsx
          otp/page.tsx
          performance/page.tsx
          tracking/page.tsx
    api/
      partner/
        attendance/
          history/route.ts
          punch-in/route.ts
          punch-out/route.ts
        bookings/
          route.ts
          [id]/
            route.ts
            accept/route.ts
            reject/route.ts
            status-update/route.ts
            verify-otp/route.ts
        commerce
          (implemented as frames/lenses/offers/orders endpoints)
        earnings/route.ts
        equipment/
          assigned/route.ts
          checkout/route.ts
          report-damage/route.ts
          return/route.ts
        eye-test/
          save-step/route.ts
          submit/route.ts
        frames/route.ts
        lenses/recommendation/route.ts
        notifications/route.ts
        offers/route.ts
        orders/route.ts
        performance/route.ts
        tracking/
          start/route.ts
          stop/route.ts
  features/
    partner/
      components/
        PartnerShell.tsx
  lib/
    server/
      partner/
        auth.ts
        booking-state.ts
        earnings.ts
```

## 2) Backend Models + Routes + Controllers

The system uses Next Route Handlers (not Express controllers). Data is persisted with Prisma models in `prisma/schema.prisma`.

### Added Prisma enums
- `PartnerShiftState`
- `BookingFieldStatus`
- `EquipmentEventType`
- `EyeTestStep`

### Added Prisma models
- `AttendanceLog`
- `PartnerDeviceBinding`
- `EquipmentItem`
- `EquipmentAssignment`
- `EquipmentEvent`
- `EquipmentDamageReport`
- `BookingEvent`
- `JourneyTracking`
- `EyeTestSession`
- `EyeTestStepData`
- `PartnerEarningLedger`

### Extended existing models
- `Booking` (field lifecycle + partner assignment metadata)
- `Order` (eye-test linkage + partner earning relation)
- `User` (relations for partner modules)

### Migration
- `prisma/migrations/20260430124000_add_optom_partner_system/migration.sql`

## 3) Frontend Pages + Components

Partner pages are mobile-first and reuse existing UI style/tokens (`common-btn`, Tailwind palette, existing `Input` component).

Key frontend implementation:
- Protected partner area with role guard (`STAFF`/`ADMIN`)
- Dashboard, attendance flows, equipment flows, booking flows, OTP verification, journey tracking
- Eye-test multi-step autosave/submit UI
- Commerce flow screens (frames, lens recommendation, offers, order)
- Earnings/performance dashboards and notifications feed

## 4) Navigation Integration

- Shared partner shell navigation via `PartnerShell`
- Guarded layout at `src/app/(app)/partner/(protected)/layout.tsx`
- Auth routes remain:
  - `/partner/login`
  - `/partner/signup`

## 5) Required ENV Variables

Added partner-specific optional defaults in `.env.example`:
- `PARTNER_GEOFENCE_RADIUS_METERS`
- `PARTNER_AUDIO_BUCKET`
- `PARTNER_INCENTIVE_PER_COMPLETED_BOOKING`
- `PARTNER_INCENTIVE_DISTANCE_PER_KM`

## 6) Migration Notes

- Prisma client must be regenerated after schema change:
  - `npx prisma generate`
- Apply migration in DB environment:
  - `npx prisma migrate deploy`
- If local DB is offline, migration SQL remains available under `prisma/migrations/...` for deployment time.
