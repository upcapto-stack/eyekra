'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AppScreen } from '@/shared/components/layout/AppScreen';
import { getFavouriteIds, removeFavourite } from '@/shared/utils/favourites';
import { getProductsList, type Product } from '@/shared/utils/products-data';
import type { AppConfig } from '@/types/app-config';

export function FavouritesView() {
  const [favouriteIds, setFavouriteIds] = useState<string[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);

  const load = useCallback(() => {
    setFavouriteIds(getFavouriteIds());
  }, []);

  useEffect(() => {
    fetch('/api/config').then((r) => (r.ok ? r.json() : null)).then((d) => d && setConfig(d)).catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onVisible = () => setFavouriteIds(getFavouriteIds());
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const productList = getProductsList(config?.products);
  const products = favouriteIds
    .map((id) => productList.find((p) => p.id === id))
    .filter((p): p is Product => p != null);

  const handleRemove = (productId: string) => {
    removeFavourite(productId);
    setFavouriteIds(getFavouriteIds());
  };

  if (products.length === 0) {
    return (
      <AppScreen title="My favourites" backHref="/account">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-8 text-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 mx-auto text-rose-400 dark:text-rose-500 mb-3">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <p className="text-slate-600 dark:text-slate-400 text-sm">No favourites yet</p>
          <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">Save frames you love for later</p>
          <Link href="/products" className="mt-4 w-full flex justify-center items-center common-btn common-btn--primary">
            Explore frames
          </Link>
        </div>
      </AppScreen>
    );
  }

  return (
    <AppScreen title="My favourites" backHref="/account">
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">{products.length} saved</p>
      <ul className="space-y-3">
        {products.map((product) => (
          <li
            key={product.id}
            className="flex gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden p-3"
          >
            <Link href={`/products/${product.id}`} className="shrink-0 w-20 aspect-square rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600" />
            <div className="flex-1 min-w-0">
              <Link href={`/products/${product.id}`}>
                <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">{product.name}</p>
              </Link>
              <p className="text-[#fe5001] font-semibold text-sm mt-0.5">{product.price}</p>
              <button
                type="button"
                onClick={() => handleRemove(product.id)}
                className="mt-2 text-xs text-slate-500 dark:text-slate-400 underline hover:text-rose-600 dark:hover:text-rose-400"
              >
                Remove from favourites
              </button>
            </div>
            <button
              type="button"
              onClick={() => handleRemove(product.id)}
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
              aria-label="Remove from favourites"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
      <Link href="/products" className="mt-6 w-full flex justify-center items-center common-btn common-btn--primary">
        Explore more frames
      </Link>
    </AppScreen>
  );
}
