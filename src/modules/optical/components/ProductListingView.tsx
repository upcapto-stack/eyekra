'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  filterProducts,
  getCollectionProductIds,
  getProductsList,
  CATEGORY_LABELS,
  SHAPE_LABELS,
  type Product,
  type ProductShape,
} from '@/shared/utils/products-data';
import { addToCart, getCartCount } from '@/shared/utils/cart';
import { getFavouriteIds, toggleFavourite } from '@/shared/utils/favourites';
import { getLocation, DEFAULT_LOCATION } from '@/shared/utils/location';
import { useEffect, useRef, useState } from 'react';
import type { AppConfig } from '@/types/app-config';

const CATEGORY_IDS = ['eyeglasses', 'sunglasses', 'reading', 'computer', 'kids'] as const;
const SHAPE_IDS = ['round', 'oval', 'square', 'rectangle', 'aviator', 'cat-eye', 'wayfarer', 'geometric', 'clubmaster'] as const;

function getCategoryLabelFromConfig(config: AppConfig | null | undefined, categoryId: string): string {
  const fromConfig = (config?.categories ?? []).find((c) => c.id === categoryId)?.label;
  if (fromConfig) return fromConfig;
  return (CATEGORY_LABELS as Record<string, string>)[categoryId] ?? categoryId;
}

function getTopLevelCategoryIds(config: AppConfig | null | undefined): string[] {
  const list = config?.categories ?? [];
  const top = list.filter((c) => !c.parentId).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  if (top.length > 0) return top.map((c) => c.id);
  return [...CATEGORY_IDS];
}

function ProductCard({
  product,
  isFavourite,
  onWishlist,
  onCartUpdate,
}: {
  product: Product;
  isFavourite: boolean;
  onWishlist: (id: string) => void;
  onCartUpdate: () => void;
}) {
  return (
    <div className="rounded-xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 shadow-sm">
      <Link href={`/products/${product.id}`} className="block relative">
        <div className="aspect-[3/4] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 relative">
          {product.newArrival && (
            <span className="absolute top-2 left-2 bg-[#fe5001] text-white text-[10px] font-bold px-2 py-0.5 rounded">
              NEW
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onWishlist(product.id);
            }}
            className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white/90 dark:bg-slate-800/90 shadow flex items-center justify-center text-slate-600 dark:text-slate-300"
            aria-label={isFavourite ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <svg viewBox="0 0 24 24" fill={isFavourite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-rose-500">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </div>
      </Link>
      <div className="p-2.5">
        <p className="text-slate-500 dark:text-slate-400 text-xs font-medium truncate">{product.brand ?? 'Eyekra'}</p>
        <Link href={`/products/${product.id}`}>
          <p className="text-slate-900 dark:text-slate-100 font-medium text-sm mt-0.5 line-clamp-2 leading-tight hover:text-[#fe5001]">
            {product.name}
          </p>
        </Link>
        {(product.rating != null || product.reviewCount != null) && (
          <span className="inline-flex items-center gap-1 mt-1.5 bg-emerald-100 dark:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold px-1.5 py-0.5 rounded">
            {product.rating?.toFixed(1) ?? '—'} · {product.reviewCount ?? 0} reviews
          </span>
        )}
        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
          <span className="text-slate-900 dark:text-slate-100 font-semibold text-sm">{product.price}</span>
          {product.originalPrice && (
            <>
              <span className="text-slate-400 text-xs line-through">{product.originalPrice}</span>
              {product.discount && (
                <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">{product.discount}</span>
              )}
            </>
          )}
        </div>
        <div className="mt-2 flex gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              addToCart(product.id);
              onCartUpdate();
            }}
            className="flex-1 py-2 rounded-lg bg-[#fe5001] text-white text-xs font-semibold"
          >
            Add to cart
          </button>
          <Link
            href={`/products/${product.id}`}
            className="flex-1 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-xs font-semibold text-center"
          >
            Buy now
          </Link>
        </div>
      </div>
    </div>
  );
}

function getPageTitle(params: { category?: string; shape?: string; collection?: string }, config?: AppConfig | null): string {
  if (params.collection && config?.collections?.length) {
    const col = config.collections.find((c) => c.id === params.collection);
    if (col?.label) return col.label;
  }
  if (params.collection === 'new-arrivals') return 'New Arrivals';
  if (params.collection === 'top-sellers') return 'Top Sellers';
  if (params.category) return getCategoryLabelFromConfig(config, params.category);
  if (params.shape && SHAPE_LABELS[params.shape as ProductShape]) {
    return `${SHAPE_LABELS[params.shape as ProductShape]} Frames`;
  }
  return 'All Frames';
}


function buildProductsUrl(params: { category?: string; shape?: string; collection?: string }) {
  const search = new URLSearchParams();
  if (params.category) search.set('category', params.category);
  if (params.shape) search.set('shape', params.shape);
  if (params.collection) search.set('collection', params.collection);
  const q = search.toString();
  return q ? `/products?${q}` : '/products';
}

function AddressBar() {
  const [location, setLocation] = useState(() => DEFAULT_LOCATION);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setLocation(getLocation());
    setMounted(true);
  }, []);
  useEffect(() => {
    if (!mounted) return;
    const sync = () => setLocation(getLocation());
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, [mounted]);
  const display = [location.displayName, location.flatNo, location.address].filter(Boolean).join(' · ');
  return (
    <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
      <span className="text-slate-500 dark:text-slate-400 shrink-0" aria-hidden>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      </span>
      <span className="min-w-0 flex-1 text-slate-700 dark:text-slate-300 text-sm truncate">
        {display || 'Select location'}
      </span>
      <Link
        href="/select-location?returnTo=/products"
        className="shrink-0 px-3 py-1.5 rounded-md bg-amber-500 text-slate-900 text-xs font-semibold hover:bg-amber-400"
      >
        Change
      </Link>
    </div>
  );
}

export function ProductListingView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get('category') ?? undefined;
  const shape = searchParams.get('shape') ?? undefined;
  const collection = searchParams.get('collection') ?? undefined;
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [sortBy, setSortBy] = useState<'relevance' | 'price-low' | 'price-high'>('relevance');
  const [showSort, setShowSort] = useState(false);
  const [showCategory, setShowCategory] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterShape, setFilterShape] = useState<string>(shape ?? '');
  const [filterNewOnly, setFilterNewOnly] = useState(collection === 'new-arrivals');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setConfig(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (searchExpanded) searchInputRef.current?.focus();
  }, [searchExpanded]);

  const productList = getProductsList(config?.products);
  const searchLower = searchQuery.trim().toLowerCase();
  let products: Product[];
  if (searchLower) {
    products = filterProducts({}, productList);
  } else if (collection && config?.collections?.length) {
    const col = config.collections.find((c) => c.id === collection);
    if (col) {
      const ids = getCollectionProductIds(col, productList);
      if (ids.length) {
        const idSet = new Set(ids);
        products = productList.filter((p) => idSet.has(p.id));
      } else {
        products = filterProducts({ category, shape, collection }, productList);
      }
    } else {
      products = filterProducts({ category, shape, collection }, productList);
    }
  } else {
    products = filterProducts({ category, shape, collection }, productList);
  }
  if (searchLower) {
    products = products.filter((p) => {
      const name = (p.name ?? '').toLowerCase();
      const brand = (p.brand ?? 'Eyekra').toLowerCase();
      const catLabel = getCategoryLabelFromConfig(config, p.category).toLowerCase();
      const shapeLabel = (SHAPE_LABELS[p.shape] ?? '').toLowerCase();
      return (
        name.includes(searchLower) ||
        brand.includes(searchLower) ||
        catLabel.includes(searchLower) ||
        shapeLabel.includes(searchLower)
      );
    });
  }
  if (sortBy === 'price-low') {
    products = [...products].sort((a, b) => parseInt(a.price.replace(/\D/g, ''), 10) - parseInt(b.price.replace(/\D/g, ''), 10));
  } else if (sortBy === 'price-high') {
    products = [...products].sort((a, b) => parseInt(b.price.replace(/\D/g, ''), 10) - parseInt(a.price.replace(/\D/g, ''), 10));
  }

  const title = getPageTitle({ category, shape, collection }, config);

  const [cartCount, setCartCount] = useState(0);
  const [favouriteIds, setFavouriteIds] = useState<string[]>([]);

  useEffect(() => {
    setCartCount(getCartCount());
  }, []);

  useEffect(() => {
    setFavouriteIds(getFavouriteIds());
  }, []);

  useEffect(() => {
    const onVisible = () => setFavouriteIds(getFavouriteIds());
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const handleWishlist = (id: string) => {
    toggleFavourite(id);
    setFavouriteIds(getFavouriteIds());
  };

  const handleCategorySelect = (cat: string) => {
    setShowCategory(false);
    router.push(buildProductsUrl({ category: cat || undefined, shape, collection }));
  };

  const handleApplyFilters = () => {
    setShowFilters(false);
    router.push(
      buildProductsUrl({
        category,
        shape: filterShape || undefined,
        collection: filterNewOnly ? 'new-arrivals' : undefined,
      })
    );
  };

  const openFilters = () => {
    setFilterShape(shape ?? '');
    setFilterNewOnly(collection === 'new-arrivals');
    setShowFilters(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 pb-24">
      {/* Top bar: back + title + count, search, wishlist, cart */}
      <header className="safe-top sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <div className="px-3 py-2 flex items-center gap-2">
          <Link
            href="/home"
            className="shrink-0 p-2 -ml-1 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Back"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          {searchExpanded ? (
            <>
              <div className="flex-1 min-w-0 flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-slate-400 shrink-0">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search all products..."
                  className="flex-1 min-w-0 bg-transparent border-none outline-none text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400"
                  aria-label="Search products"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearchExpanded(false);
                  setSearchQuery('');
                }}
                className="shrink-0 p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close search"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </>
          ) : (
            <>
              <h1 className="flex-1 text-center text-slate-900 dark:text-slate-100 text-base font-semibold truncate">
                {title}
              </h1>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap hidden sm:inline">
                  {products.length}/{productList.length}
                </span>
                <button
                  type="button"
                  onClick={() => setSearchExpanded(true)}
                  className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Search"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </button>
                <Link href="/favourites" className="relative p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Favourites">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  {favouriteIds.length > 0 && (
                    <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] px-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                      {favouriteIds.length > 99 ? '99+' : favouriteIds.length}
                    </span>
                  )}
                </Link>
                <Link
                  href="/cart"
                  className="relative p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"
                  aria-label={`Cart, ${cartCount} items`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                  </svg>
                  {cartCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#fe5001] text-white text-[10px] font-bold flex items-center justify-center leading-none">
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </Link>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Address / location bar */}
      <AddressBar />

      <main className="flex-1 px-3 py-4">
        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400">No frames in this category yet.</p>
            <Link href="/home" className="inline-block mt-4 text-[#fe5001] font-semibold text-sm">
              Back to Home
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isFavourite={favouriteIds.includes(product.id)}
                onWishlist={handleWishlist}
                onCartUpdate={() => setCartCount(getCartCount())}
              />
            ))}
          </div>
        )}
      </main>

      {/* Bottom sticky: Sort by, Category, Filters */}
      <nav className="fixed bottom-0 left-0 right-0 safe-bottom z-20 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex items-center justify-around gap-2 py-3 px-4">
        <button
          type="button"
          onClick={() => { setShowCategory(false); setShowFilters(false); setShowSort(!showSort); }}
          className="flex-1 flex items-center justify-center gap-1.5 text-slate-600 dark:text-slate-300 text-xs font-medium py-3 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 min-w-0"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 shrink-0">
            <path d="M4 6h16M4 12h10M4 18h16" />
          </svg>
          <span className="truncate">SORT BY {sortBy === 'relevance' ? 'Relevance' : sortBy === 'price-low' ? 'Price: Low' : 'Price: High'}</span>
        </button>
        <button
          type="button"
          onClick={() => { setShowSort(false); setShowFilters(false); setShowCategory(!showCategory); }}
          className="flex-1 flex items-center justify-center gap-1.5 text-slate-600 dark:text-slate-300 text-xs font-medium py-3 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 min-w-0"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 shrink-0">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
          </svg>
          CATEGORY
        </button>
        <button
          type="button"
          onClick={() => { setShowSort(false); setShowCategory(false); openFilters(); }}
          className="flex-1 flex items-center justify-center gap-1.5 text-slate-600 dark:text-slate-300 text-xs font-medium py-3 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 min-w-0"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 shrink-0">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          FILTERS
        </button>
      </nav>

      {/* Sort overlay */}
      {showSort && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowSort(false)}>
          <div
            className="absolute bottom-20 left-4 right-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600 p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mb-3">Sort by</p>
            {(['relevance', 'price-low', 'price-high'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  setSortBy(opt);
                  setShowSort(false);
                }}
                className={`block w-full text-left py-2.5 px-3 rounded-lg text-sm ${
                  sortBy === opt ? 'bg-[#fe5001]/20 text-[#fe5001] font-semibold' : 'text-slate-700 dark:text-slate-200'
                }`}
              >
                {opt === 'relevance' ? 'Relevance' : opt === 'price-low' ? 'Price: Low to High' : 'Price: High to Low'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category overlay */}
      {showCategory && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowCategory(false)}>
          <div
            className="absolute bottom-20 left-4 right-4 max-h-[70vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600 p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mb-3">Category</p>
            <button
              type="button"
              onClick={() => handleCategorySelect('')}
              className={`block w-full text-left py-2.5 px-3 rounded-lg text-sm ${!category ? 'bg-[#fe5001]/20 text-[#fe5001] font-semibold' : 'text-slate-700 dark:text-slate-200'}`}
            >
              All Frames
            </button>
            {(config ? getTopLevelCategoryIds(config) : [...CATEGORY_IDS]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => handleCategorySelect(id)}
                className={`block w-full text-left py-2.5 px-3 rounded-lg text-sm mt-1 ${
                  category === id ? 'bg-[#fe5001]/20 text-[#fe5001] font-semibold' : 'text-slate-700 dark:text-slate-200'
                }`}
              >
                {getCategoryLabelFromConfig(config, id)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters overlay */}
      {showFilters && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowFilters(false)}>
          <div
            className="absolute bottom-20 left-4 right-4 max-h-[70vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600 p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mb-2">Frame shape</p>
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                type="button"
                onClick={() => setFilterShape('')}
                className={`py-1.5 px-3 rounded-lg text-xs font-medium ${!filterShape ? 'bg-[#fe5001] text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
              >
                All
              </button>
              {SHAPE_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilterShape(filterShape === id ? '' : id)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-medium ${
                    filterShape === id ? 'bg-[#fe5001] text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {SHAPE_LABELS[id as ProductShape]}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={filterNewOnly}
                onChange={(e) => setFilterNewOnly(e.target.checked)}
                className="w-4 h-4 rounded border-slate-400 text-[#fe5001] focus:ring-[#fe5001]"
              />
              <span className="text-slate-700 dark:text-slate-200 text-sm">New arrivals only</span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="flex-1 py-2.5 rounded-lg text-slate-600 dark:text-slate-300 text-sm font-medium bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyFilters}
                className="flex-1 py-2.5 rounded-lg text-white text-sm font-semibold bg-[#fe5001] hover:bg-[#e54800]"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
