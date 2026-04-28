# Eyekra – Full Software & Backend Documentation

This document describes the complete Eyekra frontend application and provides detailed specifications so you can build a proper backend (database, APIs, auth, file storage) that replaces the current file-based and client-only behaviour.

---

## 1. Software Overview

### 1.1 What is Eyekra?

Eyekra is a **glasses e-commerce + home eye test booking** app:

- **Customer app (mobile-first):** Browse frames, add to cart with lens + prescription, checkout, track orders; book home eye test, select try-on frames, track booking; manage profile, addresses, favourites, orders, bookings.
- **Admin panel:** Manage categories, products (frames), lenses, attributes, tags, collections, offer rules, banners, cities; view and update orders and bookings (status/journey); dashboard stats.

### 1.2 Tech Stack (Current)

| Layer | Technology |
|-------|------------|
| Framework | Next.js (App Router) |
| UI | React, Tailwind CSS |
| Language | TypeScript |
| Data (current) | JSON files: `data/app-config.json`, `data/orders.json`, `data/bookings.json` |
| Auth (current) | Mock: sessionStorage (`eyekra-mock-logged-in`, `eyekra-mock-user`) |
| Client state | sessionStorage: cart, locations, favourites, try-on IDs, theme |
| Uploads | Files written to `public/banners/`, `public/category-icons/`, `public/prescriptions/` |

### 1.3 High-Level Data Flow

```
Customer flow:
  Home → Products → Product Detail → Lens Selection (+ prescription) → Cart → Checkout
    → POST /api/orders → clearCart() → Order success

  Home → Home Eye Test → Form + Slot + Try-on frames → Pay now
    → POST /api/bookings → Booking success

  Account → My Orders → GET /api/orders?email=... → List → /orders/:id (tracking)
  Account → My Bookings → GET /api/bookings?email=... → List → /bookings/:id (tracking)

Admin flow:
  Login (cookie: admin_secret) → Dashboard, Orders, Bookings, Categories, Products, Lenses,
  Attributes, Collections, Offer rules, Banners, Cities
  All config: GET/POST /api/config (admin secret)
  Orders: GET/PATCH /api/orders (admin)
  Bookings: GET/PATCH /api/bookings (admin)
  Uploads: POST /api/upload/banner, /api/upload/category-icon (admin), POST /api/upload/prescription (public)
```

---

## 2. API Reference (Current Contract)

Base URL is the same origin (e.g. `https://yourapp.com`). All APIs return JSON.

### 2.1 Authentication (Current)

- **Customer:** No real auth. Frontend uses `getMockUser()` from sessionStorage (name, mobile, email). For orders/bookings list and detail, frontend sends `?email=...` or `?mobile=...` derived from this mock user.
- **Admin:** Header `x-admin-secret: <secret>` or cookie `admin_secret=<secret>`. Default secret in code: `eyekra-admin-edit` (override with `ADMIN_SECRET` env).

---

### 2.2 GET /api/config

- **Auth:** None.
- **Response:** Full `AppConfig` (see §3.1).
- **Usage:** Home, products, cart, checkout, lens page, favourites, bookings, admin panels.

---

### 2.3 POST /api/config

- **Auth:** Admin (x-admin-secret or cookie).
- **Body:** Full `AppConfig` (see §3.1). Must include at least `banners[]`, `eligibleCities[]`; other arrays default if missing.
- **Response:** Saved `AppConfig` (with `updatedAt` set).
- **Usage:** Admin saves categories, products, lenses, collections, offer rules, banners, cities, attributes, tags, stats.

---

### 2.4 GET /api/orders

- **Auth:**  
  - **Admin:** no query required; returns all orders.  
  - **Customer:** must send `email` and/or `mobile` (query); returns only that customer’s orders.
- **Query:**  
  - `email` (optional): filter by customer email (lowercase).  
  - `mobile` (optional): filter by customer mobile (digits only).  
  - `id` (optional): return single order or null.
- **Response:**  
  - With `id`: single `Order` or `null`.  
  - Without `id`: array of `Order[]`.
- **Usage:** My Orders list, order detail, admin orders list.

---

### 2.5 POST /api/orders

- **Auth:** None (customer placing order).
- **Body:** Order payload (see §3.2). Required: `customer`, `deliveryAddress`, `items[]` (non-empty). Optional: `id`, `createdAt`, `status`; server can generate id and timestamps.
- **Response:** `{ orderId: string, order: Order }`.
- **Usage:** Checkout “Place order”.

---

### 2.6 PATCH /api/orders

- **Auth:** Admin.
- **Body:** `{ id?: string, status: Order['status'] }` or pass `id` in query.
- **Response:** `{ order: Order }`.
- **Valid statuses:** `pending` | `confirmed` | `in_lab` | `qc` | `ready` | `shipped` | `delivered` | `cancelled`.
- **Usage:** Admin order journey (update status).

---

### 2.7 GET /api/bookings

- **Auth:**  
  - **Admin:** no query; returns all bookings.  
  - **Customer:** must send `email` and/or `mobile`; returns only that customer’s bookings.
- **Query:** `email`, `mobile`, `id` (same idea as orders).
- **Response:** Single `EyeTestBooking` or `EyeTestBooking[]`.
- **Usage:** My Bookings list, booking detail, admin bookings list.

---

### 2.8 POST /api/bookings

- **Auth:** None.
- **Body:** Booking payload (see §3.3). Required: `customer.mobile`, `preferredDate`, `preferredSlotId`. Optional: rest; server can set `id`, `createdAt`, `status`.
- **Response:** `{ bookingId: string, booking: EyeTestBooking }`.
- **Usage:** Home eye test flow “Pay now”.

---

### 2.9 PATCH /api/bookings

- **Auth:** Admin.
- **Body:** `{ id?: string, status: EyeTestBooking['status'] }`.
- **Response:** `{ booking: EyeTestBooking }`.
- **Valid statuses:** `pending` | `confirmed` | `scheduled` | `out_for_visit` | `optometrist_reached` | `completed` | `cancelled`.
- **Usage:** Admin booking journey.

---

### 2.10 POST /api/upload/banner

- **Auth:** Admin.
- **Body:** `multipart/form-data`, field name `file`. Image: JPEG, PNG, WebP, GIF; max 3MB.
- **Response:** `{ url: string }` (e.g. `/banners/1234567890-abc.png`).
- **Usage:** Admin banners – upload image for a banner.

---

### 2.11 POST /api/upload/category-icon

- **Auth:** Admin.
- **Body:** `multipart/form-data`, field `file`. PNG, WebP, SVG, JPEG; max 512KB.
- **Response:** `{ url: string }` (e.g. `/category-icons/1234567890-xyz.webp`).
- **Usage:** Admin categories – icon for category.

---

### 2.12 POST /api/upload/prescription

- **Auth:** None.
- **Body:** `multipart/form-data`, field `file`. JPEG, PNG, WebP, GIF, PDF; max 5MB.
- **Response:** `{ url: string, fileName?: string }`.
- **Usage:** Lens selection page – user uploads prescription; URL is stored in cart/order as `PrescriptionData` (upload type).

---

## 3. Data Models (TypeScript / JSON)

### 3.1 AppConfig

Used by GET/POST /api/config. Structure (see `src/types/app-config.ts`):

- **banners:** `HomeBanner[]` – id, tag, title, sub, extra?, gradient?, backgroundColor?, imageUrl?, width?, aspectRatio?, link, offerRuleId?, showOnlyInEligibleCities, sortOrder, tagSize?, titleSize?, subSize?, extraSize?, textColor?
- **eligibleCities:** `string[]` – city name substrings (lowercase) for location-specific banners.
- **categories:** `AppCategory[]` – id, label, sortOrder, iconUrl?
- **collections:** `AppCollection[]` – id, label, sortOrder, type?: 'manual'|'rule_based', productIds?, conditions?, badge?, subtitle?, imageUrl?, link?
- **offerRules:** `AppOfferRule[]` – id, name, description?, discountType, value, valueSecondary?, appliesTo, appliesToIds?, minOrderAmount?, minQuantity?, firstOrderOnly?, code?, validFrom?, validTo?, maxUses?, usedCount?, priority?, sortOrder?
- **products:** `Product[]` (see §3.4) – frames catalog.
- **lenses:** `LensOption[]` (see §3.5) – lens options.
- **attributes:** `AppAttribute[]` – key, label, description?, example?, type?, options?
- **tags:** `AppTag[]` – id, label.
- **stats:** `{ orderCount?, customerCount?, totalRevenue? }`
- **updatedAt:** string (ISO)

### 3.2 Order

- **id:** string (e.g. `ORD-xxx-xxx`)
- **createdAt:** string (ISO)
- **status:** `pending` | `confirmed` | `in_lab` | `qc` | `ready` | `shipped` | `delivered` | `cancelled`
- **customer:** `{ name, mobile, email }`
- **deliveryAddress:** SavedLocation (see §3.6)
- **items:** OrderItem[]
  - productId, productName, productPrice, lensId?, lensName?, lensPrice?, quantity, prescription?, lineTotal (number, INR)
- **subtotal:** number (INR)
- **discount:** number (INR)
- **total:** number (INR)
- **offerApplied?:** string

### 3.3 EyeTestBooking

- **id:** string (e.g. `EYE-xxx-xxx`)
- **createdAt:** string (ISO)
- **status:** `pending` | `confirmed` | `scheduled` | `out_for_visit` | `optometrist_reached` | `completed` | `cancelled`
- **customer:** `{ name, mobile, email }`
- **address:** string (full address text)
- **deliveryAddress?:** SavedLocation (displayName, flatNo, address, contact)
- **preferredDate:** string (YYYY-MM-DD)
- **preferredSlotId:** string
- **slotLabel?:** string (e.g. "9:00 AM - 10:00 AM")
- **amount:** number (INR)
- **patients?:** `{ name, mobile }[]`
- **tryonFrameIds?:** string[] (product IDs for home try-on)

### 3.4 Product (Frame)

- id, name, brand?, price (string, e.g. "₹2,499"), originalPrice?, discount?, category, shape, newArrival?, topSeller?, rating?, reviewCount?, material?, frameType?, lensWidth?, noseBridge?, templeLength?, description?, colors?: { name, hex }[]
- **category:** eyeglasses | sunglasses | reading | computer | kids
- **shape:** round | oval | square | rectangle | aviator | cat-eye | wayfarer | geometric | clubmaster

### 3.5 LensOption

- id, name, shortDesc, description, whoIsItFor, price (number), lensTypeCategory, useCases[], blueCut?, type, badge?

### 3.6 SavedLocation

- **displayName:** string (e.g. "Home", "Office")
- **address:** string (full address)
- **flatNo?:** string
- **contact?:** string

### 3.7 PrescriptionData

- **Manual:** `{ type: 'manual', rightEye?: EyePrescription, leftEye?: EyePrescription, pd?: string }`
- **Upload:** `{ type: 'upload', fileUrl: string, fileName?: string }`
- EyePrescription: sph?, cyl?, axis?, add?

### 3.8 MockUser (current “logged-in” user)

- **name, mobile, email** – stored in sessionStorage; used to call GET /api/orders and GET /api/bookings with ?email= or ?mobile=.

---

## 4. Client-Side Storage (sessionStorage)

| Key | Purpose |
|-----|--------|
| eyekra-mock-logged-in | "1" when “logged in” |
| eyekra-mock-user | JSON: { name, mobile, email } |
| eyekra-cart-entries | JSON: CartEntry[] (productId, lensId?, prescription?) |
| eyekra-locations | JSON: { locations: SavedLocation[], selectedIndex } |
| eyekra-favourites | JSON: string[] (product IDs) |
| eyekra-tryon-ids | JSON: string[] (product IDs for home try-on, max 3) |
| (theme) | Dark/light – may be in settings or localStorage |

Backend will replace mock auth with real login (JWT/session); cart/favourites/locations can stay client-only or be synced to backend per product requirements.

---

## 5. Feature-by-Feature: What Backend Must Provide

### 5.1 App config (storefront + admin)

- **GET /api/config** – Return full config (banners, cities, categories, collections, offer rules, products, lenses, attributes, tags, stats). Can be cached.
- **POST /api/config** – Admin replaces full config (or you split into smaller endpoints per entity). Ensure `updatedAt` and validation.
- **Backend:** Store config in DB (normalized tables) or single JSON/document; products and lenses as proper tables recommended.

### 5.2 Orders

- **POST /api/orders** – Create order; validate customer, deliveryAddress, items; compute subtotal/discount/total if you want server-side validation; generate id; store; optionally clear cart server-side if cart is on server.
- **GET /api/orders** – For customer: filter by email or mobile (from auth). For admin: return all. Support ?id= for single order.
- **PATCH /api/orders** – Admin only; update status; valid values: pending, confirmed, in_lab, qc, ready, shipped, delivered, cancelled.
- **Backend:** orders table; order_items table; link to customer (or keep customer as JSON snapshot). Consider idempotency for POST (e.g. idempotency key).

### 5.3 Bookings

- **POST /api/bookings** – Create booking; validate customer.mobile, preferredDate, preferredSlotId; generate id; store.
- **GET /api/bookings** – Same pattern as orders (customer by email/mobile, admin all, ?id= for one).
- **PATCH /api/bookings** – Admin only; update status (pending → confirmed → scheduled → out_for_visit → optometrist_reached → completed | cancelled).
- **Backend:** bookings table; optional: slots/availability table if you want to drive slots from backend (frontend currently uses static slots from `eye-test-slots.ts`).

### 5.4 File uploads

- **Banner / category icon:** Admin auth; validate type/size; store file (local disk, S3, or CDN); return public URL. Frontend expects `{ url }`.
- **Prescription:** No auth; validate type/size; store file; return `{ url, fileName? }`. Consider rate limit and virus scan in production.
- **Backend:** Object storage (S3, GCS) or dedicated file server; DB can store only URL in orders/config.

### 5.5 Authentication (to replace mock)

- **Customer:** Login/signup (e.g. mobile OTP or email/password). Return session cookie or JWT. Frontend will send session/JWT on requests; backend resolves current user and uses their email/mobile for GET orders and GET bookings.
- **Admin:** Keep secret-based auth or replace with proper admin login (session/JWT). All admin routes must check this.

---

## 6. Backend Implementation Guide

### 6.1 Recommended stack

- **API:** Node (Express/Fastify) or keep Next.js API routes and call a separate service.
- **DB:** PostgreSQL (or MySQL). Use for: users (if you add real auth), orders, order_items, bookings, config entities (categories, products, lenses, collections, offer_rules, banners, etc.).
- **Files:** S3-compatible storage (AWS S3, MinIO, Cloudflare R2) for banners, category icons, prescriptions; store only URLs in DB.
- **Cache:** Redis (optional) for GET /api/config and product list.

### 6.2 Suggested DB schema (high level)

- **users** – id, name, mobile, email, created_at, etc. (when you add real auth).
- **orders** – id, user_id (nullable for now), customer (JSONB or columns), delivery_address (JSONB), subtotal, discount, total, offer_applied, status, created_at.
- **order_items** – id, order_id, product_id, product_name, product_price, lens_id, lens_name, lens_price, quantity, prescription (JSONB), line_total.
- **bookings** – id, customer (JSONB), address, delivery_address (JSONB), preferred_date, preferred_slot_id, slot_label, amount, patients (JSONB), tryon_frame_ids (JSONB), status, created_at.
- **categories** – id, label, sort_order, icon_url.
- **products** – full product fields (id, name, brand, price, category, shape, …); or store in JSONB if flexible.
- **lenses** – id, name, short_desc, description, who_is_it_for, price, lens_type_category, use_cases (JSONB), type, badge, etc.
- **collections** – id, label, sort_order, type, product_ids (JSONB), conditions (JSONB), badge, subtitle, image_url, link.
- **offer_rules** – id, name, discount_type, value, applies_to, applies_to_ids (JSONB), min_order_amount, code, valid_from, valid_to, priority, etc.
- **banners** – id, tag, title, sub, link, image_url, show_only_in_eligible_cities, sort_order, etc.
- **config_meta** – updated_at, stats (JSONB) if you keep a single “config” view.

Normalize as needed (e.g. categories, products, lenses in separate tables and assemble AppConfig in API).

### 6.3 API contract (keep same for frontend)

- Keep the same URL paths and request/response shapes described in §2 so the existing frontend keeps working.
- Replace only the implementation (read/write from DB and storage instead of JSON files).
- For customer-scoped GET orders/bookings, get email/mobile from JWT/session instead of query params if you add real auth; you can still accept ?email= and ?mobile= for backward compatibility during migration.

### 6.4 Environment variables

- **ADMIN_SECRET** – Admin API and upload auth (already used in app).
- **DATABASE_URL** – For your DB.
- **STORAGE_* or S3_*** – For file uploads (bucket, region, keys if needed).
- **JWT_SECRET** or **SESSION_SECRET** – When you add real auth.

### 6.5 Eye test slots (optional backend)

- Frontend currently uses `getSlotsForDate(date)` from `src/lib/eye-test-slots.ts` (static list). Optional: add **GET /api/eye-test/slots?date=YYYY-MM-DD** returning `{ slots: { id, label, startTime, endTime }[] }` and use it in the app to drive availability by date/optometrist.

---

## 7. Frontend Structure (Reference)

```
src/
├── app/
│   ├── (app)/                    # Customer app routes
│   │   ├── home, products, cart, checkout, orders, bookings, account, ...
│   │   ├── home-eye-test/        # Eye test booking flow
│   │   └── login, signup, verify-otp
│   ├── admin/                    # Admin panel routes
│   │   ├── orders, bookings, categories, products, lenses, attributes,
│   │   ├── collections, offer-rules, banners, cities
│   │   └── login
│   └── api/                      # API routes (to be backed by your backend)
│       ├── config, orders, bookings
│       └── upload/banner, upload/category-icon, upload/prescription
├── features/
│   ├── account/   # OrdersView, BookingsView, OrderTrackingJourney, BookingTrackingJourney, ...
│   ├── auth/      # Login, SignUp, OTP verify (mock)
│   ├── cart/      # CartView
│   ├── eye-test/  # HomeEyeTestFlow
│   ├── home/      # HomeView, SelectLocationView
│   ├── products/  # ProductListingView, ProductDetailView
│   └── tryon/     # TryonView (home try-on frame selection)
├── lib/           # cart, location, mock-auth, products-data, lenses-data, eye-test-slots, ...
└── types/         # order, booking, app-config, prescription
```

---

## 8. Order & Booking Journeys (for backend logic)

### 8.1 Order status flow

1. **pending** – Order placed.
2. **confirmed** – Confirmed by admin/system.
3. **in_lab** – In lab.
4. **qc** – Quality check.
5. **ready** – Ready for dispatch.
6. **shipped** – Dispatched.
7. **delivered** – Delivered.
8. **cancelled** – Can be set at any time.

### 8.2 Booking status flow

1. **pending** – Customer booked.
2. **confirmed** – Optometrist assigned; customer notified (your notification layer).
3. **scheduled** – Date/time confirmed.
4. **out_for_visit** – Optometrist on the way.
5. **optometrist_reached** – At customer location; customer notified.
6. **completed** – Test done.
7. **cancelled** – Can be set at any time.

---

## 9. Summary Checklist for Backend

- [ ] **Config:** GET/POST /api/config with full AppConfig; store categories, products, lenses, collections, offer rules, banners, cities, attributes, tags, stats.
- [ ] **Orders:** POST (create), GET (list by customer or admin, single by id), PATCH (admin status update); persist orders and items.
- [ ] **Bookings:** POST (create), GET (list by customer or admin, single by id), PATCH (admin status update); persist bookings.
- [ ] **Uploads:** Banner (admin), category-icon (admin), prescription (public); return URL; store files in object storage.
- [ ] **Auth:** Replace mock user with real customer login; optional admin login; use session/JWT for customer-scoped GET orders/bookings.
- [ ] **Slots (optional):** GET /api/eye-test/slots?date= for dynamic slots.
- [ ] **Notifications (optional):** Trigger SMS/email/push when order or booking status changes (e.g. confirmed, optometrist_reached).

This document and the existing `docs/ARCHITECTURE.md` (Structure → Category, Data → Attributes, Marketing → Collections, Pricing → Offers, Display → Banners) together give you the full picture to build a production backend that matches the current frontend.
