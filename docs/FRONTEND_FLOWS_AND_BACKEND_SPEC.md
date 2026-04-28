# Eyekra – Frontend Flows & Backend Spec (Detailed)

Yeh document **frontend ke hisab se** likha gaya hai: har flow step-by-step, frontend kya call karta hai, backend ko **exactly** kya return karna chahiye, aur kya logic rakhni chahiye taaki frontend sahi kaam kare.

---

## 1. Config Flow (Saari jagah use hota hai)

### 1.1 Kab kab config fetch hota hai

| Page / Feature | Kab | Kya karta hai |
|----------------|-----|----------------|
| Home | Mount | `GET /api/config` → banners, categories, collections, eligibleCities use karta hai |
| Products listing | Mount | `GET /api/config` → products, categories, collections (filter/listing) |
| Product detail | Mount | `GET /api/config` → products (product by id), lenses (optional) |
| Product → Lens page | Mount | `GET /api/config` → products, lenses |
| Cart | Mount | `GET /api/config` → products, lenses (price resolve), offer rules |
| Checkout | Mount | `GET /api/config` → products, lenses, offer rules |
| Favourites | Mount | `GET /api/config` → products (names/images) |
| Home Eye Test | Mount | `GET /api/config` → products (try-on list) |
| My Bookings | Mount | `GET /api/config` → products (tryonFrameIds resolve) |
| Admin (sab pages) | Mount | `GET /api/config` → full config edit/save |

### 1.2 Backend contract – GET /api/config

- **Method:** GET  
- **Auth:** None  
- **Response:** 200, body = **pure AppConfig object** (JSON).  
- **Required fields (min):**  
  - `banners` – array (can empty [])  
  - `eligibleCities` – array (can [])  
  - `categories` – array  
  - `collections` – array  
  - `offerRules` – array  
  - `updatedAt` – string (ISO date)  

- **Optional but frontend use karta hai:**  
  - `products` – frames list; agar missing/empty to frontend **mock products** use karta hai (16 items).  
  - `lenses` – lens options; agar missing/empty to frontend **built-in lens list** use karta hai.  
  - `attributes`, `tags` – admin forms ke liye.  
  - `stats` – `{ orderCount?, customerCount?, totalRevenue? }` dashboard ke liye.  

- **Error:** Agar 404/500 ya invalid JSON to frontend config = null set karta hai; products/lenses fallback se chal jate hain.  
- **Logic:** Backend ko config DB/se storage se padh ke ek hi JSON object return karna hai; frontend **koi pagination nahi** karta, ek hi call mein sab leta hai.

---

## 2. Login / User Identity Flow (Abhi mock)

### 2.1 Frontend behaviour (current)

- **Login:** User mobile/password ya “Login with Google” ya “Mock login” click karta hai.  
  - Mock: `setMockUser({ name, mobile, email })` + `setMockLoggedIn()` → sessionStorage.  
  - Phir `router.replace('/home')`.  
- **Protected routes:** Checkout, Account, Orders, Bookings, Addresses, etc. pe `isMockLoggedIn()` check; false ho to redirect `/login`.  
- **User identity:** Har jagah `getMockUser()` se `name`, `mobile`, `email` milta hai.  
  - Orders/Bookings list & detail: **email ya mobile** use hota hai query params mein (`?email=...` ya `?mobile=...`).  
  - Frontend **mobile ko digits-only** bhejta hai: `(user.mobile ?? '').replace(/\D/g, '')`.  
  - **Email** lowercase nahi bhejta (backend agar case-insensitive chahiye to khud normalize kare).

### 2.2 Backend ke liye (jab real auth loge)

- Login/signup API se **session ya JWT** return karo.  
- Frontend ko change karna padega:  
  - Orders/Bookings APIs ko call karte waqt **auth header** (Bearer token / cookie) bhejna.  
  - Backend **token se user resolve** kare aur usi user ki orders/bookings return kare; optional: query `?email=` / `?mobile=` backward compatibility ke liye rakh sakte ho.  
- Abhi backend **customer identity sirf request body/query se** leta hai (email/mobile); auth header optional hai.

---

## 3. Orders Flow (End-to-end)

### 3.1 Cart → Checkout (frontend)

- Cart **sessionStorage** mein hai (`eyekra-cart-entries`).  
- Checkout page:  
  1. `isMockLoggedIn()` false → redirect `/login`.  
  2. `getCartItems()` + `getLocation()` + `GET /api/config`.  
  3. Rows = cart items + product/lens resolve from config.  
  4. Subtotal/discount/total **frontend pe hi** calculate (offer rules bhi frontend apply karta hai).  
  5. “Place order” pe **sirf ek hi API** call: `POST /api/orders`.

### 3.2 POST /api/orders – Exact contract

**Request:**

- Method: POST  
- Headers: `Content-Type: application/json`  
- Body (frontend exactly ye bhejta hai):

```json
{
  "customer": { "name": "...", "mobile": "...", "email": "..." },
  "deliveryAddress": {
    "displayName": "Home",
    "address": "Sector 18, Noida, ...",
    "flatNo": "...",
    "contact": "..."
  },
  "items": [
    {
      "productId": "1",
      "productName": "Round Metal",
      "productPrice": "₹1,899",
      "lensId": "blue-cut",
      "lensName": "Blue Cut",
      "lensPrice": 1499,
      "quantity": 1,
      "prescription": { "type": "manual", "rightEye": {...}, "leftEye": {...} }
      OR
      "prescription": { "type": "upload", "fileUrl": "/prescriptions/rx-xxx.png", "fileName": "rx.jpg" },
      "lineTotal": 3398
    }
  ],
  "subtotal": 3398,
  "discount": 0,
  "total": 3398,
  "offerApplied": "OFFER10"
}
```

**Backend must:**

- Validate: `customer`, `deliveryAddress`, `items` (array, length ≥ 1) present.  
- `id`, `createdAt`, `status` body mein optional; backend generate kare to:  
  - `id` – unique (e.g. `ORD-<timestamp>-<random>`).  
  - `createdAt` – ISO string.  
  - `status` – `"pending"`.  
- Response **200** with body: `{ "orderId": "<id>", "order": <full Order object> }`.  
- Frontend **sirf ye use karta hai:** `data.orderId` ya `data.order?.id` → success page pe redirect:  
  `router.push(\`/orders/success?orderId=${data.orderId || data.order?.id}\`)`  
  aur `clearCart()` call karta hai.  
- Agar **non-2xx:** frontend `res.json()` se `data.error` dikhata hai; body mein `error: "message"` hona chahiye.

### 3.3 My Orders list

- **Request:** `GET /api/orders?email=<user.email>` **ya** `GET /api/orders?mobile=<user.mobile>` (digits only).  
- **Expected response:** 200, body = **array of Order** `Order[]`.  
- Frontend:  
  - `r.ok ? r.json() : []` → agar 401/404/500 to empty array.  
  - `Array.isArray(data) ? data : []` → safe.  
- Backend: Customer identity = query `email` ya `mobile`; dono bheje to bhi chalega (frontend abhi ek hi bhejta hai).  
- **Auth:** Frontend auth header nahi bhejta; backend sirf query se filter karta hai. Real backend mein token se user resolve karke usi ka email/mobile use karna better hai.

### 3.4 Order detail (/orders/[id])

- **Request:** `GET /api/orders?email=<email>&id=<orderId>` **ya** `?mobile=<mobile>&id=<orderId>`.  
- **Expected response:** 200, body = **single Order object ya null**.  
- Frontend:  
  - `order = data && typeof data === 'object' && data.id ? data : null`  
  - null → “Order not found” dikhata hai.  
- Backend: Same customer filter (email/mobile) + `id` match; agar koi order na mile to `null` return karo (array nahi).

### 3.5 Admin – Orders list & status update

- **List:** `GET /api/orders` with header `x-admin-secret: <secret>` (ya cookie `admin_secret`).  
  - Response: 200, body = **saari orders** (array).  
- **Single (admin):** Same GET with `?id=<orderId>` → single order ya null.  
- **Update status:** `PATCH /api/orders`  
  - Body: `{ "id": "<orderId>", "status": "<status>" }`  
  - Valid status: `pending` | `confirmed` | `in_lab` | `qc` | `ready` | `shipped` | `delivered` | `cancelled`  
  - Response: 200, `{ "order": <updated Order> }`.  
- Frontend admin list/detail in state update karta hai updated order se.

---

## 4. Bookings Flow (End-to-end)

### 4.1 Home Eye Test → Booking create

- User: Intro → Cart (try-on frames) → Details (name, mobile, email, address) → Date → Slot → Summary → “Pay now”.  
- **No payment gateway** – “Pay now” = sirf booking create.  
- **POST /api/bookings** body (frontend exactly ye bhejta hai):

```json
{
  "customer": { "name": "...", "mobile": "...", "email": "..." },
  "address": "flatNo, address ya sirf address",
  "deliveryAddress": { "displayName", "flatNo", "address", "contact" },
  "preferredDate": "YYYY-MM-DD",
  "preferredSlotId": "s1",
  "slotLabel": "9:00 AM - 10:00 AM",
  "amount": 99,
  "patients": [ { "name": "...", "mobile": "..." } ],
  "tryonFrameIds": [ "1", "2" ]
}
```

**Backend must:**

- Validate: `customer.mobile`, `preferredDate`, `preferredSlotId` required.  
- Generate `id` (e.g. `EYE-xxx`), `createdAt`, `status: "pending"`.  
- Response 200: `{ "bookingId": "<id>", "booking": <full EyeTestBooking> }`.  
- Frontend: `if (res.ok) setStep(6)` (success screen); else button re-enable.  
- Frontend **response body parse nahi karta** success case mein; sirf `res.ok` dekhta hai.  
- Error: non-2xx pe frontend `setConfirming(false)` karta hai; body mein `error` optional.

### 4.2 My Bookings list

- **Request:** `GET /api/bookings?email=<email>` ya `?mobile=<mobile>`.  
- **Response:** 200, body = **array of EyeTestBooking**.  
- Frontend: same as orders – `r.ok ? r.json() : []`, then `Array.isArray(data) ? data : []`.  
- Phir config fetch karta hai (`GET /api/config`) taaki `tryonFrameIds` ko product names se resolve kare.

### 4.3 Booking detail (/bookings/[id])

- **Request:** `GET /api/bookings?email=<email>&id=<bookingId>` ya `?mobile=<mobile>&id=<bookingId>`.  
- **Response:** 200, body = **single EyeTestBooking ya null**.  
- Frontend: `booking = data && typeof data === 'object' && data.id ? data : null`.

### 4.4 Admin – Bookings list & status update

- **List:** `GET /api/bookings` + admin secret → 200, array of all bookings.  
- **PATCH /api/bookings:** Body `{ "id": "<id>", "status": "<status>" }`.  
  - Valid status: `pending` | `confirmed` | `scheduled` | `out_for_visit` | `optometrist_reached` | `completed` | `cancelled`  
- Response: 200, `{ "booking": <updated booking> }`.

---

## 5. Upload Flows

### 5.1 Banner (admin)

- **Request:** POST `/api/upload/banner`, header `x-admin-secret`, body `multipart/form-data`, field name **`file`**.  
- **Expected:** 200, `{ "url": "/banners/1234-abc.png" }`.  
- Frontend: `if (res.ok && data.url)` → banner object mein `imageUrl: data.url` set karta hai.  
- Backend: file type/size validate karo; save karke **public URL** return karo (same origin ya CDN).

### 5.2 Category icon (admin)

- **Request:** POST `/api/upload/category-icon`, admin secret, form-data field **`file`**.  
- **Expected:** 200, `{ "url": "/category-icons/xxx.webp" }`.  
- Frontend category form mein `iconUrl: data.url` set karta hai.

### 5.3 Prescription (customer, lens page)

- **Request:** POST `/api/upload/prescription`, **no auth**, form-data field **`file`**.  
- **Expected:** 200, `{ "url": "/prescriptions/rx-xxx.png", "fileName": "original.jpg" }`.  
- Frontend: `setPrescription({ type: 'upload', fileUrl: data.url, fileName: data.fileName })`.  
- Backend: size/type validate; URL aisa ho jo order save hone ke baad bhi accessible rahe (prescription order item mein `fileUrl` save hota hai).

---

## 6. Admin Config Save (POST /api/config)

- **Request:** POST `/api/config`, header `x-admin-secret`, body = **pure AppConfig** (same shape as GET).  
- Frontend admin har entity (banners, categories, products, lenses, …) edit karke **ek saath full config** POST karta hai (e.g. categories page: config fetch → edit → full config POST).  
- **Backend must:**  
  - Validate: `banners` (array), `eligibleCities` (array) present.  
  - Baaki arrays default karo agar missing: categories, collections, offerRules, products, lenses, attributes, tags.  
  - `updatedAt = new Date().toISOString()` set karo.  
  - Response 200: saved config (same object).  
- Frontend expect karta hai ki save ke baad same structure mile; koi extra field/pagination nahi.

---

## 7. Flow Summary Table (Frontend → Backend)

| Flow | Frontend action | API | Backend must return / do |
|------|------------------|-----|---------------------------|
| App load (home, products, cart, …) | GET config | GET /api/config | 200, full AppConfig JSON |
| Place order | POST order | POST /api/orders | 200, { orderId, order }; 4xx/5xx + error message |
| My orders | GET by user | GET /api/orders?email=… or ?mobile=… | 200, Order[] |
| Order detail | GET one | GET /api/orders?email=…&id=… | 200, Order or null |
| Admin orders | GET all / PATCH | GET /api/orders (admin), PATCH /api/orders | GET: Order[]; PATCH: { order } |
| Book eye test | POST booking | POST /api/bookings | 200, { bookingId, booking } |
| My bookings | GET by user | GET /api/bookings?email=… or ?mobile=… | 200, EyeTestBooking[] |
| Booking detail | GET one | GET /api/bookings?email=…&id=… | 200, EyeTestBooking or null |
| Admin bookings | GET all / PATCH | GET/PATCH /api/bookings (admin) | GET: array; PATCH: { booking } |
| Admin config save | POST full config | POST /api/config (admin) | 200, saved AppConfig |
| Banner / icon upload | POST file | POST /api/upload/banner, /category-icon (admin) | 200, { url } |
| Prescription upload | POST file | POST /api/upload/prescription | 200, { url, fileName? } |

---

## 8. Backend Logic Rules (Frontend ke hisab se)

1. **Customer identity (orders/bookings):**  
   - List/detail ke liye frontend **ya to `email` ya `mobile`** bhejta hai (dono kabhi ek saath bhi ho sakte hain).  
   - Backend filter: order/booking jahan `customer.email` (trim, lowercase) = query email **ya** `customer.mobile` (digits only) = query mobile.  
   - Agar email/mobile dono missing (aur admin nahi) to 401 Unauthorized (frontend empty array handle karta hai).

2. **Single resource by id:**  
   - `?id=xyz` + customer filter → exactly **ek** order/booking return karo (object) ya **null**.  
   - Array mat bhejo jab `id` diya ho (frontend `data.id` check karta hai).

3. **Order/Booking IDs:**  
   - Frontend generate nahi karta (optional body mein bhej sakta hai); backend **unique id** generate kare.  
   - Format frontend assume nahi karta; sirf `orderId` / `order.id` ya `bookingId` / `booking.id` use karta hai success/redirect/list mein.

4. **Amounts:**  
   - Sab amounts **number** (INR). Order: subtotal, discount, total, lineTotal. Booking: amount.  
   - Frontend checkout pe discount khud calculate karke bhejta hai; backend ko same numbers store karna hai (optional: backend verify kare).

5. **Prescription in order item:**  
   - Either `{ type: 'manual', rightEye, leftEye, pd }` ya `{ type: 'upload', fileUrl, fileName }`.  
   - Backend as-is store kare (JSON); fileUrl ko serve karna backend/static hosting ka kaam hai.

6. **Slots (eye test):**  
   - Abhi frontend **static list** use karta hai (`eye-test-slots.ts`).  
   - Agar backend slots API doge (e.g. GET /api/eye-test/slots?date=YYYY-MM-DD) to frontend ko change karke wahi call use karna padega.

---

## 9. Error Handling (Frontend expectations)

- **Orders POST:** Non-2xx → frontend `data.error` show karta hai; body mein `{ "error": "message" }` hona chahiye.  
- **Bookings POST:** Non-2xx → frontend sirf button re-enable karta hai (error message optional).  
- **GET orders/bookings (list):** 401/500 → frontend empty array treat karta hai.  
- **GET order/booking (single):** 200 + null body ya 404 → frontend “not found”.  
- **Config:** 404/500 → config = null; products/lenses fallback se chalenge.  
- **Upload:** Non-2xx → frontend `data.error` ya generic “Upload failed” dikhata hai.

---

## 10. Checklist – Backend banaate waqt

- [ ] GET /api/config – same AppConfig shape, products/lenses optional but recommended.  
- [ ] POST /api/config – admin only; full body accept, updatedAt set, same object return.  
- [ ] POST /api/orders – customer, deliveryAddress, items (min 1); return orderId + order.  
- [ ] GET /api/orders – customer: ?email or ?mobile (filter); admin: no filter (all); ?id for single (object or null).  
- [ ] PATCH /api/orders – admin; id + status; return { order }.  
- [ ] POST /api/bookings – customer.mobile, preferredDate, preferredSlotId required; return bookingId + booking.  
- [ ] GET /api/bookings – same pattern as orders (email/mobile, admin all, ?id for one).  
- [ ] PATCH /api/bookings – admin; id + status; return { booking }.  
- [ ] Upload APIs – multipart field `file`; response `{ url }` (prescription: url + fileName optional).  
- [ ] Customer filter: email (trim, lowercase) / mobile (digits only) match.  
- [ ] Single resource: when ?id= present, return one object or null, not array.

Is doc ko follow karke jo backend banaoge, current frontend **bina code change** ke (sirf API base URL/env se) sahi chalega. Agar auth add karoge to frontend mein sirf token bhejna + optional query params rakhna hoga.
