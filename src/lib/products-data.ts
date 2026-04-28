import type { AppCollection, CollectionCondition } from '@/types/app-config';

export type ProductCategory = 'eyeglasses' | 'sunglasses' | 'reading' | 'computer' | 'kids';
export type ProductShape = 'round' | 'oval' | 'square' | 'rectangle' | 'aviator' | 'cat-eye' | 'wayfarer' | 'geometric' | 'clubmaster';

/** Variant: solid colour, gradient, multi-colour, or pattern. Legacy: { name, hex } = solid. */
export type ColorVariant =
  | { name: string; hex: string }
  | { type: 'solid'; name: string; hex: string }
  | { type: 'gradient'; name: string; gradient: string }
  | { type: 'multi'; name: string; hexes: string[] }
  | { type: 'pattern'; name: string; pattern?: string };

export interface Product {
  id: string;
  name: string;
  brand?: string;
  price: string;
  originalPrice?: string;
  discount?: string;
  /** Category id from config (top-level or sub-category). Used for filtering e.g. /products?category=id */
  category: string;
  shape: ProductShape;
  newArrival?: boolean;
  topSeller?: boolean;
  rating?: number;
  reviewCount?: number;
  /** Product detail page (mobile) */
  material?: string;
  frameType?: string;
  lensWidth?: string;
  noseBridge?: string;
  templeLength?: string;
  description?: string;
  colors?: ColorVariant[];
}

export const MOCK_PRODUCTS: Product[] = [
  { id: '1', name: 'Classic Aviator', brand: 'Eyekra', price: '₹2,499', originalPrice: '₹3,499', discount: '30% off', category: 'sunglasses', shape: 'aviator', newArrival: true, topSeller: true, rating: 4.2, reviewCount: 128 },
  { id: '2', name: 'Round Metal', brand: 'Eyekra', price: '₹1,899', originalPrice: '₹2,299', discount: '17% off', category: 'eyeglasses', shape: 'round', newArrival: true, topSeller: true, rating: 4.5, reviewCount: 89, material: 'Metal', frameType: 'Full Frame', lensWidth: '52 mm', noseBridge: '16 mm', templeLength: '145 mm', description: 'Lightweight round metal frames for everyday wear. Classic design with a modern fit.', colors: [{ name: 'Black', hex: '#1a1a1a' }, { name: 'Silver', hex: '#c0c0c0' }, { name: 'Gold', hex: '#d4af37' }, { name: 'Gunmetal', hex: '#2c3539' }] },
  { id: '3', name: 'Wayfarer Pro', brand: 'Eyekra', price: '₹2,199', originalPrice: '₹3,299', discount: '40% off', category: 'sunglasses', shape: 'wayfarer', topSeller: true, rating: 4.0, reviewCount: 256 },
  { id: '4', name: 'Cat-Eye Elegance', brand: 'Eyekra', price: '₹1,699', category: 'eyeglasses', shape: 'cat-eye', newArrival: true, rating: 4.3, reviewCount: 67 },
  { id: '5', name: 'Rectangle Slim', brand: 'Eyekra', price: '₹1,999', category: 'eyeglasses', shape: 'rectangle', topSeller: true, rating: 4.1, reviewCount: 43 },
  { id: '6', name: 'Oval Vintage', brand: 'Eyekra', price: '₹2,299', category: 'eyeglasses', shape: 'oval', rating: 4.4, reviewCount: 112 },
  { id: '7', name: 'Square Edge', brand: 'Eyekra', price: '₹1,799', category: 'eyeglasses', shape: 'square', rating: 3.9, reviewCount: 34 },
  { id: '8', name: 'Blue Cut Pro', brand: 'Eyekra', price: '₹2,499', category: 'computer', shape: 'rectangle', newArrival: true, rating: 4.6, reviewCount: 201 },
  { id: '9', name: 'Reading Classic', brand: 'Eyekra', price: '₹999', category: 'reading', shape: 'oval', rating: 4.2, reviewCount: 89 },
  { id: '10', name: 'Kids Fun Frame', brand: 'Eyekra', price: '₹1,299', category: 'kids', shape: 'round', rating: 4.7, reviewCount: 56 },
  { id: '11', name: 'Clubmaster Style', brand: 'Eyekra', price: '₹2,699', category: 'sunglasses', shape: 'clubmaster', rating: 4.0, reviewCount: 78 },
  { id: '12', name: 'Geometric Bold', brand: 'Eyekra', price: '₹2,099', category: 'eyeglasses', shape: 'geometric', newArrival: true, rating: 4.3, reviewCount: 45 },
  { id: '13', name: 'Pilot Aviator', brand: 'Eyekra', price: '₹2,399', category: 'sunglasses', shape: 'aviator', rating: 4.1, reviewCount: 92 },
  { id: '14', name: 'Reader Comfort', brand: 'Eyekra', price: '₹1,199', category: 'reading', shape: 'rectangle', rating: 4.4, reviewCount: 134 },
  { id: '15', name: 'Screen Guard', brand: 'Eyekra', price: '₹1,899', category: 'computer', shape: 'wayfarer', rating: 4.5, reviewCount: 167 },
  { id: '16', name: 'Kids Aviator', brand: 'Eyekra', price: '₹999', category: 'kids', shape: 'aviator', rating: 4.8, reviewCount: 41 },
];

/**
 * Filters are auto-generated from product attributes (Data Layer). See docs/ARCHITECTURE.md.
 * @param productList If provided (e.g. from config), filter this list; otherwise use MOCK_PRODUCTS.
 */
export function filterProducts(
  opts: { category?: string; shape?: string; collection?: string },
  productList?: Product[]
): Product[] {
  const base = productList != null && productList.length > 0 ? [...productList] : [...MOCK_PRODUCTS];
  let list = base;
  if (opts.category) {
    list = list.filter((p) => p.category === opts.category);
  }
  if (opts.shape) {
    list = list.filter((p) => p.shape === opts.shape);
  }
  if (opts.collection === 'new-arrivals') {
    list = list.filter((p) => p.newArrival);
  }
  if (opts.collection === 'top-sellers') {
    list = list.filter((p) => p.topSeller);
  }
  return list;
}

/** Get the product list to use: config.products if present and non-empty, else MOCK_PRODUCTS. */
export function getProductsList(productsFromConfig: Product[] | undefined): Product[] {
  return productsFromConfig != null && productsFromConfig.length > 0 ? productsFromConfig : MOCK_PRODUCTS;
}

/** Resolve product IDs for a collection: manual = productIds; rule_based = from conditions (Marketing layer). */
export function getCollectionProductIds(collection: AppCollection, products: Product[]): string[] {
  if (collection.type === 'rule_based' && collection.conditions?.length) {
    return products.filter((p) => matchesConditions(p, collection.conditions!)).map((p) => p.id);
  }
  return collection.productIds ?? [];
}

/** Whether a product belongs to a collection (for cart offer applicability etc.). */
export function isProductInCollection(product: Product, collection: AppCollection): boolean {
  if (collection.type === 'rule_based' && collection.conditions?.length) {
    return matchesConditions(product, collection.conditions);
  }
  return (collection.productIds ?? []).includes(product.id);
}

function matchesConditions(product: Product, conditions: CollectionCondition[]): boolean {
  return conditions.every((c) => {
    const raw = (product as unknown as Record<string, unknown>)[c.attribute];
    const val = raw != null ? String(raw) : '';
    if (c.operator === 'eq') return val === String(c.value);
    if (c.operator === 'in') {
      const arr = Array.isArray(c.value) ? c.value : [c.value];
      return arr.some((v) => val === String(v));
    }
    if (c.operator === 'range' && Array.isArray(c.value) && c.value.length >= 2) {
      const num = parseInt(product.price.replace(/\D/g, ''), 10);
      const [lo, hi] = c.value as number[];
      return !Number.isNaN(num) && num >= lo && num <= hi;
    }
    return false;
  });
}

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  eyeglasses: 'Eyeglasses',
  sunglasses: 'Sunglasses',
  reading: 'Reading Glasses',
  computer: 'Computer Glasses',
  kids: 'Kids Glasses',
};

export const SHAPE_LABELS: Record<ProductShape, string> = {
  round: 'Round',
  oval: 'Oval',
  square: 'Square',
  rectangle: 'Rectangle',
  aviator: 'Aviator',
  'cat-eye': 'Cat-Eye',
  wayfarer: 'Wayfarer',
  geometric: 'Geometric',
  clubmaster: 'Clubmaster',
};
