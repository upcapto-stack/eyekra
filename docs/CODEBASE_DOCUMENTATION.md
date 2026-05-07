# Eyekra – Complete Codebase Documentation

Yeh document **pure Eyekra codebase** ka overview hai: kya-kya ban chuka hai, structure, routes, types, APIs, aur features.

---

## 1. Project Overview

### 1.1 Kya hai Eyekra?

- **Customer app (mobile-first):** Glasses e-commerce + home eye test booking. Browse frames, cart + lens + prescription, checkout, order tracking; book home eye test, try-on frames, booking tracking; profile, addresses, favourites, orders, bookings.
- **Admin panel:** Categories (top-level + sub-categories), products (frames), lenses, attributes, tags, collections, offer rules, banners, cities; orders/bookings list + status/journey; dashboard.

### 1.2 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| UI | React 18, Tailwind CSS |
| Language | TypeScript |
| Data (current) | JSON files: `data/app-config.json`, `data/orders.json`, `data/bookings.json` |
| Auth (current) | Mock: sessionStorage (`eyekra-mock-logged-in`, `eyekra-mock-user`) |
| Client state | sessionStorage: cart, locations, favourites, try-on IDs |

### 1.3 Repo Structure (Important Paths)

```
src/
├── app/                    # Next.js App Router
│   ├── (app)/              # Customer app routes (home, products, cart, account, etc.)
│   ├── admin/              # Admin panel routes
│   ├── api/                 # API routes (config, orders, bookings, uploads)
│   ├── layout.tsx
│   └── globals.css
├── features/               # Feature-wise UI (auth, home, products, cart, account, eye-test, tryon)
├── components/             # Shared (layout, UI, ThemeProvider)
├── lib/                    # Business logic & data (cart, products-data, mock-auth, location, etc.)
└── types/                  # TypeScript types (app-config, order, booking, prescription)
docs/                       # FRONTEND_FLOWS_AND_BACKEND_SPEC.md, BACKEND_AND_FULL_DOCUMENTATION.md, this file
data/                       # JSON data (app-config, orders, bookings) – used by API routes
public/                     # Static assets (banners, category-icons, prescriptions)
```

---

## 2. Customer App – Routes & Pages

### 2.1 Entry & Auth

| Route | File | Description |
|-------|------|-------------|
| `/` | `app/(app)/page.tsx` | Root → splash/welcome |
| `/login` | `app/(app)/login/page.tsx` | Login (mock: mobile/password, Google, Mock login) |
| `/signup` | `app/(app)/signup/page.tsx` | Sign up |
| `/verify-otp` | `app/(app)/verify-otp/page.tsx` | OTP verification |

### 2.2 Main App (Bottom Nav: Home, Explore, Cart, Account)

| Route | File | Description |
|-------|------|-------------|
| `/home` | `app/(app)/home/page.tsx` | Home – banners, top categories, collections |
| `/products` | `app/(app)/products/page.tsx` | Product listing – filter by category/shape/collection, search |
| `/products/[id]` | `app/(app)/products/[id]/page.tsx` | Product detail – variants, Add to cart |
| `/products/[id]/lens` | `app/(app)/products/[id]/lens/page.tsx` | Lens selection + prescription (manual/upload) → Add to cart |
| `/cart` | `app/(app)/cart/page.tsx` | Cart view, checkout CTA |
| `/checkout` | `app/(app)/checkout/page.tsx` | Checkout – address, offer, place order → POST /api/orders |
| `/account` | `app/(app)/account/page.tsx` | Account – profile, My orders, My bookings, Help, Wallet, Favourites, Addresses, Settings, About |

### 2.3 Account Sub-pages

| Route | File | Description |
|-------|------|-------------|
| `/orders` | `app/(app)/orders/page.tsx` | My Orders list (GET /api/orders?email=...) |
| `/orders/[id]` | `app/(app)/orders/[id]/page.tsx` | Order detail + tracking journey |
| `/orders/success` | `app/(app)/orders/success/page.tsx` | Order success after checkout |
| `/bookings` | `app/(app)/bookings/page.tsx` | My Bookings list (GET /api/bookings?email=...) |
| `/bookings/[id]` | `app/(app)/bookings/[id]/page.tsx` | Booking detail + tracking journey |
| `/favourites` | `app/(app)/favourites/page.tsx` | Favourites (sessionStorage) |
| `/addresses` | `app/(app)/addresses/page.tsx` | Manage addresses (sessionStorage) |
| `/wallet` | `app/(app)/wallet/page.tsx` | Wallet (placeholder) |
| `/rewards` | `app/(app)/rewards/page.tsx` | My rewards |
| `/settings` | `app/(app)/settings/page.tsx` | Settings (theme, etc.) |
| `/help` | `app/(app)/help/page.tsx` | Help |
| `/about` | `app/(app)/about/page.tsx` | About Eyekra |

### 2.4 Home Eye Test & Try-on

| Route | File | Description |
|-------|------|-------------|
| `/home-eye-test` | `app/(app)/home-eye-test/page.tsx` | Home eye test flow – form, slot, try-on frames, Pay now → POST /api/bookings |
| `/tryon` | `app/(app)/tryon/page.tsx` | Try-on frame selector (max 3, saved in sessionStorage) |
| `/select-location` | `app/(app)/select-location/page.tsx` | Location picker |
| `/select-location/map` | `app/(app)/select-location/map/page.tsx` | Map location picker |

---

## 3. Admin Panel – Routes

| Route | File | Description |
|-------|------|-------------|
| `/admin/login` | `app/admin/login/page.tsx` | Admin login (cookie: admin_secret) |
| `/admin` | `app/admin/page.tsx` | Dashboard – stats, links to all admin pages |
| `/admin/orders` | `app/admin/orders/page.tsx` | Orders list + detail, status/journey update (PATCH /api/orders) |
| `/admin/bookings` | `app/admin/bookings/page.tsx` | Bookings list + detail, status/journey update (PATCH /api/bookings) |
| `/admin/categories` | `app/admin/categories/page.tsx` | Categories – create top-level, add sub-categories under each, edit/delete |
| `/admin/products` | `app/admin/products/page.tsx` | Frames (products) – Category + Sub-category dynamic from config, shape, variants (solid/gradient/multi/pattern) |
| `/admin/lenses` | `app/admin/lenses/page.tsx` | Lens options |
| `/admin/attributes` | `app/admin/attributes/page.tsx` | Attributes (e.g. category, shape options) |
| `/admin/collections` | `app/admin/collections/page.tsx` | Collections (manual / rule-based) |
| `/admin/offer-rules` | `app/admin/offer-rules/page.tsx` | Offer rules |
| `/admin/banners` | `app/admin/banners/page.tsx` | Home banners |
| `/admin/cities` | `app/admin/cities/page.tsx` | Eligible cities (location-specific banners) |

Admin layout: sidebar with all links; auth via cookie `admin_secret` (default `eyekra-admin-edit`, override with `ADMIN_SECRET` env).

---

## 4. API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/config` | None | Full AppConfig (banners, categories, products, lenses, orders/bookings list use, admin edit) |
| POST | `/api/config` | Admin | Save full AppConfig |
| GET | `/api/orders` | None | Query: `email`, `mobile`, `id` – customer filter or single order; admin gets all |
| POST | `/api/orders` | None | Create order (checkout) |
| PATCH | `/api/orders` | Admin | Update order status |
| GET | `/api/bookings` | None | Query: `email`, `mobile`, `id` – same pattern as orders |
| POST | `/api/bookings` | None | Create booking (home eye test Pay now) |
| PATCH | `/api/bookings` | Admin | Update booking status |
| POST | `/api/upload/banner` | Admin | Upload banner image |
| POST | `/api/upload/category-icon` | Admin | Upload category icon |
| POST | `/api/upload/prescription` | None | Upload prescription (lens flow) |

---

## 5. Data Models (Types)

### 5.1 AppConfig (`src/types/app-config.ts`)

- **banners:** `HomeBanner[]` – id, tag, title, sub, link, imageUrl, gradient, showOnlyInEligibleCities, sortOrder, etc.
- **eligibleCities:** `string[]`
- **categories:** `AppCategory[]` – id, label, sortOrder, iconUrl?, **parentId?** (sub-category)
- **collections:** `AppCollection[]` – id, label, type (manual | rule_based), productIds?, conditions?
- **offerRules:** `AppOfferRule[]`
- **products:** `Product[]` (frames)
- **lenses:** `LensOption[]`
- **attributes:** `AppAttribute[]`, **tags:** `AppTag[]`
- **stats:** { orderCount?, customerCount?, totalRevenue? } – `/api/config` GET pe live DB aggregates se fill hota hai (orders count, customer count, total revenue sum).
- **updatedAt:** string (ISO)

### 5.2 AppCategory

- **id, label, sortOrder, iconUrl?, parentId?** – agar `parentId` set hai to woh us id wali category ki sub-category hai. Home pe sirf top-level (!parentId) dikhte hain.

### 5.3 Product (`src/lib/products-data.ts`)

- **id, name, brand?, price, originalPrice?, discount?, category** (string – config category id, top-level ya sub), **shape**, newArrival?, topSeller?, rating?, reviewCount?, material?, frameType?, lensWidth?, noseBridge?, templeLength?, description?, **colors?** (ColorVariant[]).
- **ColorVariant:** solid | gradient | multi | pattern (type + name + hex/gradient/hexes/pattern).

### 5.4 Order (`src/types/order.ts`)

- **id, createdAt, status** (pending | confirmed | in_lab | qc | ready | shipped | delivered | cancelled), **customer** (name, mobile, email), **deliveryAddress** (SavedLocation), **items** (OrderItem[]), **subtotal, discount, total, offerApplied?**.

### 5.5 EyeTestBooking (`src/types/booking.ts`)

- **id, createdAt, status** (pending | confirmed | scheduled | out_for_visit | optometrist_reached | completed | cancelled), **customer**, **address**, **deliveryAddress?**, **preferredDate, preferredSlotId, slotLabel?**, **amount**, **patients?**, **tryonFrameIds?**.

### 5.6 PrescriptionData (`src/types/prescription.ts`)

- **Manual:** type 'manual', rightEye?, leftEye?, pd?
- **Upload:** type 'upload', fileUrl, fileName?

### 5.7 SavedLocation (`src/lib/location.ts`)

- **displayName, address, flatNo?, contact?**

---

## 6. Client-Side Storage (sessionStorage)

| Key | Purpose |
|-----|---------|
| eyekra-mock-logged-in | "1" when logged in |
| eyekra-mock-user | JSON: { name, mobile, email } |
| eyekra-cart-entries | CartEntry[] (productId, lensId?, prescription?) |
| eyekra-locations | { locations: SavedLocation[], selectedIndex } |
| eyekra-favourites | string[] (product IDs) |
| eyekra-tryon-ids | string[] (home try-on product IDs, max 3) |

---

## 7. Features (Code Organisation)

| Feature | Path | Main components / logic |
|---------|------|--------------------------|
| Auth | `features/auth/` | LoginView, LoginFormView, SignUpView, OtpVerifyView |
| Home | `features/home/` | HomeView, SelectLocationView, MapLocationPickerView |
| Products | `features/products/` | ProductListingView, ProductDetailView |
| Cart | `features/cart/` | CartView; lib/cart.ts (getCartItems, addToCart, etc.) |
| Account | `features/account/` | AccountProfileView, OrdersView, OrderTrackingJourney, BookingsView, BookingTrackingJourney, AddressesView, FavouritesView, SettingsView, WalletView, RewardsView, HelpView, AboutView |
| Eye test | `features/eye-test/` | HomeEyeTestFlow |
| Try-on | `features/tryon/` | TryonView; lib/tryon.ts |
| Splash | `features/splash/` | SplashScreen |

---

## 8. Lib Modules

| Module | Purpose |
|--------|---------|
| `lib/cart.ts` | Cart CRUD, getCartCount, getCartItems, addToCart, removeFromCart, clearCart |
| `lib/products-data.ts` | Product type, MOCK_PRODUCTS, filterProducts, getProductsList, getCollectionProductIds, CATEGORY_LABELS, SHAPE_LABELS |
| `lib/lenses-data.ts` | LensOption, lens options |
| `lib/mock-auth.ts` | isMockLoggedIn, getMockUser, setMockUser, setMockLoggedIn, clearMockAuth |
| `lib/location.ts` | SavedLocation, getLocation, getLocations, saveLocation, DEFAULT_LOCATION |
| `lib/favourites.ts` | getFavouriteIds, toggleFavourite |
| `lib/tryon.ts` | getTryonIds, setTryonIds, addTryonId, removeTryonId |
| `lib/eye-test-slots.ts` | Slots for home eye test |
| `lib/settings.ts` | Theme etc. |
| `lib/admin-attributes.ts` | getAttributeOptions, getAttributeOptionLabel (admin forms) |
| `lib/google-places.ts` | Address autocomplete |
| `lib/nominatim.ts` | Geocoding |

---

## 9. Key Flows (Short)

- **Config:** Har jagah `GET /api/config`; admin `POST /api/config`. Categories/products/lenses/banners/collections/offers sab isi se.
- **Categories:** Top-level + sub-category (parentId). Home pe sirf top-level; products filter by koi bhi category id (top ya sub). Admin categories: create category → "+ Sub-category" se uske andar sub add.
- **Products:** Admin products mein Category + Sub-category dropdowns config se dynamic; product.category = top-level id ya sub-category id.
- **Order:** Cart → Checkout → POST /api/orders → clearCart → Order success. My Orders: GET /api/orders?email=...; detail + Track/View.
- **Booking:** Home Eye Test → slot + try-on → Pay now → POST /api/bookings. My Bookings: GET /api/bookings?email=...; detail + Track.
- **Auth:** Abhi mock (sessionStorage). Orders/Bookings list customer email/mobile se filter.

---

## 10. Existing Docs

- **docs/FRONTEND_FLOWS_AND_BACKEND_SPEC.md** – Frontend flows, backend contract (config, orders, bookings, uploads), step-by-step.
- **docs/BACKEND_AND_FULL_DOCUMENTATION.md** – Software overview, API reference, data models, client storage, backend requirements.
- **docs/CODEBASE_DOCUMENTATION.md** – Yeh file: pure codebase ka structure, routes, types, features.

---

## 11. Commands

```bash
npm run dev    # Dev server (default port 3000; agar busy to 3007 etc.)
npm run build  # Production build
npm run start  # Start production server
npm run lint   # ESLint
```

---

*Last updated: codebase state at documentation creation. Categories with parentId (sub-categories), dynamic Category/Sub-category in admin products, order/booking journeys (admin + customer), and product variants (solid/gradient/multi/pattern) sab include hain.*
