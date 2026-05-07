/**
 * App config types – editable from admin panel.
 * Aligns with docs/ARCHITECTURE.md: Structure→Category, Data→Attributes, Marketing→Collections, Pricing→Offers, Display→Banners.
 */
import type { Product } from '@/shared/utils/products-data';
import type { LensOption } from '@/shared/utils/lenses-data';

/** Tailwind text size class for banner copy */
export type BannerTextSize = 'text-xs' | 'text-sm' | 'text-base' | 'text-lg' | 'text-xl' | 'text-2xl' | 'text-3xl';

/** Display layer: banners only redirect to Product, Category, Collection, or URL. They do not store product lists. */
export interface HomeBanner {
  id: string;
  /** Optional: multi-tenant isolation */
  tenantId?: string;
  /** Small label above title (e.g. "Eyekra Frame Fest") */
  tag: string;
  title: string;
  sub: string;
  extra?: string;
  /** Tailwind gradient classes, e.g. "from-violet-600 to-purple-700" */
  gradient?: string;
  /** Solid background color (hex). Used when no gradient; ignored when imageUrl set */
  backgroundColor?: string;
  /** If set, use this image instead of gradient (URL or /banners/xyz.png) */
  imageUrl?: string;
  /** Display size: width in px or "full" */
  width?: number | 'full';
  /** Aspect ratio for image banner, e.g. "16/9" or "3/2" – keeps image from distorting on all devices */
  aspectRatio?: string;
  /** Link on click: Product (/products/:id), Category (/products?category=id), Collection (/products?collection=id), or any URL */
  link: string;
  /** Optional: link to offer rule (show rule.code on banner) */
  offerRuleId?: string;
  /** If true, banner only shows when user's city is in eligibleCities */
  showOnlyInEligibleCities: boolean;
  sortOrder: number;
  /** Custom text sizes (Create banner). Tailwind classes. */
  tagSize?: BannerTextSize | string;
  titleSize?: BannerTextSize | string;
  subSize?: BannerTextSize | string;
  extraSize?: BannerTextSize | string;
  /** Text color for Create banner. Tailwind, e.g. "text-white", "text-slate-900" */
  textColor?: string;
}

/** Structure layer: navigation and primary grouping. Stable, simple, rarely changed. */
export interface AppCategory {
  id: string;
  tenantId?: string;
  label: string;
  sortOrder: number;
  /** Optional: custom icon image URL (e.g. /category-icons/xyz.png). Square recommended 128×128 px. */
  iconUrl?: string;
  /** If set, this category is a sub-category of the category with this id. */
  parentId?: string;
}

/** Marketing layer: collections group products. Manual = admin-selected productIds; Rule-Based = auto from conditions. */
export type CollectionType = 'manual' | 'rule_based';

/** Condition for rule-based collections (e.g. category = X, attribute = Y). Product list computed at runtime. */
export interface CollectionCondition {
  /** Attribute key, e.g. "category", "shape", "brand" */
  attribute: string;
  /** Operator: "eq" | "in" | "range" etc. */
  operator: 'eq' | 'in' | 'range';
  /** Value(s). For range: [min, max] */
  value: string | string[] | number[];
}

export interface AppCollection {
  id: string;
  tenantId?: string;
  label: string;
  sortOrder: number;
  /** manual = use productIds; rule_based = use conditions to compute product list */
  type?: CollectionType;
  /** For manual collections: admin-selected product IDs */
  productIds?: string[];
  /** For rule-based collections: conditions to auto-include products */
  conditions?: CollectionCondition[];
  badge?: string;
  subtitle?: string;
  imageUrl?: string;
  link?: string;
}

/** Data layer: configurable attributes. Used in Frames form (category, shape, etc.), Collections conditions, filters. */
export type AttributeType = 'text' | 'select' | 'boolean';

export interface AppAttributeOption {
  id: string;
  label: string;
}

export interface AppAttribute {
  key: string;
  label: string;
  description?: string;
  example?: string;
  type?: AttributeType;
  /** For type "select": allowed values. Used in product form dropdowns and collection conditions. */
  options?: AppAttributeOption[];
}

/** Reusable tags/badges (e.g. New, Bestseller). Used in collections badge, product badges, etc. */
export interface AppTag {
  id: string;
  label: string;
}

export interface PartnerWarehouseCoverage {
  id: string;
  /** Lowercase city token, e.g. "noida" */
  city: string;
  warehouseName: string;
  warehouseAddress?: string;
  isActive?: boolean;
}

/** Pricing layer: rule-based offers. Apply to Product, Category, Collection, or Global (entire_order). Priority = highest wins. */
export type OfferDiscountType = 'percent_off' | 'fixed_off' | 'buy_x_get_y' | 'free_shipping';
/** entire_order = Global level; collection/product/category = specific targets */
export type OfferAppliesTo = 'entire_order' | 'collection' | 'product' | 'category';

export interface AppOfferRule {
  id: string;
  tenantId?: string;
  name: string;
  description?: string;
  discountType: OfferDiscountType;
  value: number;
  valueSecondary?: number;
  appliesTo: OfferAppliesTo;
  appliesToIds?: string[];
  minOrderAmount?: number;
  minQuantity?: number;
  firstOrderOnly?: boolean;
  code?: string;
  validFrom?: string;
  validTo?: string;
  maxUses?: number;
  usedCount?: number;
  priority?: number;
  sortOrder?: number;
}

export interface AppConfig {
  /** Optional: multi-tenant isolation */
  tenantId?: string;
  banners: HomeBanner[];
  /** City name substrings (lowercase) – users in these cities see location-specific banners */
  eligibleCities: string[];
  /** Structure layer – Top Categories, /products?category=id */
  categories: AppCategory[];
  /** Marketing layer – /products?collection=id, offer targets */
  collections: AppCollection[];
  /** Pricing layer – rule-based offers; Product/Category/Collection/Global, priority */
  offerRules: AppOfferRule[];
  /** Data: frame products. If empty/absent, app uses built-in mock products. */
  products?: Product[];
  /** Data: lens options. If empty/absent, app uses built-in lens options. */
  lenses?: LensOption[];
  /** Data layer: attribute definitions (category, shape, etc.). Drives admin form dropdowns and collection conditions. */
  attributes?: AppAttribute[];
  /** Reusable tags/badges for collections, products, etc. */
  tags?: AppTag[];
  /** Partner routing map: city -> warehouse assignment */
  partnerWarehouseCoverage?: PartnerWarehouseCoverage[];
  /** Dashboard stats returned by /api/config (live order/customer/revenue aggregates) */
  stats?: {
    orderCount?: number;
    customerCount?: number;
    totalRevenue?: number;
  };
  updatedAt: string;
}
