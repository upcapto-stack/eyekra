# Eyekra App Architecture

This document describes the **core philosophy** and **layer-based architecture** used across the app. The goal is a clean, scalable structure that stays simple for non-technical users.

---

## 1. Core Philosophy

**Structure → Category | Data → Attributes | Marketing → Collections | Pricing → Offers | Display → Banners**

| Layer | Entity | Purpose |
|-------|--------|---------|
| **Structure** | Category | Navigation and primary grouping. Stable, simple, rarely changed. (e.g. Eyeglasses, Sunglasses, Contact Lenses) |
| **Data** | Product Attributes | All product differentiation: filters, SEO, smart collections. No rigid type tables—attributes drive everything. |
| **Marketing** | Collections | Group products for campaigns. **Manual** (admin-selected) or **Rule-Based** (auto-populated by conditions). |
| **Pricing** | Offers | Rule-based discounts. Apply at Product, Category, Collection, or **Global** level. Priority logic: only the highest applicable discount applies. |
| **Display** | Banners | Marketing display only. Redirect to **Product**, **Category**, **Collection**, or **URL**. Banners do **not** store product lists. |

---

## 2. Structure Layer – Category

- Categories are used **only for navigation and primary grouping**.
- They are stable, simple, and rarely changed.
- Examples: Eyeglasses, Sunglasses, Contact Lenses, Reading, Computer, Kids.
- Stored in `AppConfig.categories`. Slug/ID is derived from label (non-technical friendly).
- Used in: Home “Top Categories”, product listing `?category=id`, and as an **offer target** (Pricing layer).

---

## 3. Data Layer – Product Attributes

- **All product differentiation is handled through attributes**, not rigid type tables.
- Attributes power:
  - **Filters** (auto-generated; no manual filter creation).
  - **SEO** (e.g. category, brand, frame type).
  - **Smart / rule-based collections** (e.g. “category = sunglasses”, “brand = X”).
- Example attributes: **Frame Type**, **Gender**, **Color**, **Brand**, **Price Range**, **Shape**, **Category**.
- Product data lives in the product model (e.g. `category`, `shape`, `brand`, `frameType`, `material`, etc.). Filters are **derived from this data**; there is no separate “filter config” table.

---

## 4. Marketing Layer – Collections

- Collections **group products for marketing**.
- Two modes:
  - **Manual**: Admin selects product IDs. Stored as `productIds` on the collection.
  - **Rule-Based**: Collection is auto-populated using **conditions** (e.g. category = X, attribute Y = Z, price range). Stored as `conditions`; product list is computed at runtime.
- Used for: listing pages (`/products?collection=id`), offer rules (Pricing layer), and banners (link to a collection).
- Collections do **not** define pricing; they only define “which products are in this set”.

---

## 5. Pricing Layer – Offers

- **Offers are rule-based** and can apply at:
  - **Product** (specific product IDs)
  - **Category** (category IDs)
  - **Collection** (collection IDs)
  - **Global** (entire order; `appliesTo: 'entire_order'`)
- **Priority logic**: When multiple offers could apply, only the **highest-priority** applicable offer is applied (e.g. `priority` field, higher = wins).
- Stored in `AppConfig.offerRules`. Legacy `coupons` remain for backward compatibility; **offer rules are the preferred mechanism**.

---

## 6. Display Layer – Banners

- Banners are for **marketing display only**.
- They **only redirect** to:
  - Product (e.g. `/products/123`)
  - Category (e.g. `/products?category=eyeglasses`)
  - Collection (e.g. `/products?collection=new-arrivals`)
  - Or any **URL** (e.g. `/home`, `/home-eye-test`)
- Banners **do not store product lists**. They store: copy, image, link, optional offer/coupon to show (“Use code X”).

---

## 7. Filters System

- **Filters are auto-generated from product attributes** (e.g. Frame Type, Gender, Color, Brand, Price Range, Shape, Category).
- **No manual filter creation** is required: the UI builds filter options from the same attributes that define products.
- Filter state is reflected in the URL (e.g. `?category=eyeglasses&shape=round`) so that sharing and SEO stay consistent.

---

## 8. Multi-Tenant Scalability

- Each entity can include an optional **`tenantId`** for isolation (e.g. `AppConfig`, banners, categories, collections, offer rules).
- The system is designed to support **multiple stores, franchises, or enterprise setups** without structural redesign: all layer entities are tenant-scoped when `tenantId` is present.
- Current app may use a single default tenant; the field is reserved for future multi-tenant use.

---

## 9. Final Architecture Summary

```
Structure  → Category          (navigation, grouping)
Data       → Attributes       (product fields → filters, SEO, smart collections)
Marketing  → Collections      (Manual or Rule-Based product grouping)
Pricing    → Offers           (rule-based; Product / Category / Collection / Global; priority)
Display    → Banners          (redirect to Product / Category / Collection / URL only)
```

This keeps the architecture **clean, scalable, and simple** for non-technical users.
