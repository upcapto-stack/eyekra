'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { BottomNav } from '@/components/layout/BottomNav';
import { getTryonIds, removeFromTryon, TRYON_MAX_FRAMES } from '@/lib/tryon';
import { getProductsList, type Product } from '@/lib/products-data';
import type { AppConfig } from '@/types/app-config';

export function TryonView() {
  const router = useRouter();
  const [productIds, setProductIds] = useState<string[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);

  const loadIds = useCallback(() => {
    setProductIds(getTryonIds());
  }, []);

  useEffect(() => {
    fetch('/api/config').then((r) => (r.ok ? r.json() : null)).then((d) => d && setConfig(d)).catch(() => {});
  }, []);

  useEffect(() => {
    loadIds();
  }, [loadIds]);

  const productList = getProductsList(config?.products);
  const products = productIds
    .map((id) => productList.find((p) => p.id === id))
    .filter((p): p is Product => p != null);

  const handleRemove = (id: string) => {
    removeFromTryon(id);
    setProductIds(getTryonIds());
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-900 pb-20">
      <header className="safe-top sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-3 py-2.5 flex items-center gap-3">
        <Link
          href="/home"
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          aria-label="Back"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="flex-1 text-lg font-bold text-slate-900 dark:text-slate-100 text-center">Home Try-on</h1>
        <span className="w-9" aria-hidden />
      </header>

      <main className="flex-1 px-4 py-5 max-w-md mx-auto w-full">
        <div className="flex items-center justify-between mb-4">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Frames you added for home try-on. Remove any you don’t want.
          </p>
          {products.length > 0 && (
            <span className="text-slate-600 dark:text-slate-300 text-sm font-medium shrink-0">
              {products.length}/{TRYON_MAX_FRAMES}
            </span>
          )}
        </div>

        {products.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-8 text-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-3">
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="12" r="3" />
              <path d="M9 12h6" />
            </svg>
            <p className="text-slate-600 dark:text-slate-400 text-sm">No frames added yet</p>
            <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">Add frames from product pages to try at home</p>
            <Link href="/products" className="mt-4 inline-flex common-btn common-btn--primary">
              Browse frames
            </Link>
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {products.map((product) => (
                <li
                  key={product.id}
                  className="flex gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden"
                >
                  <Link href={`/products/${product.id}`} className="shrink-0 w-24 aspect-square bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600" />
                  <div className="flex-1 min-w-0 py-3 pr-3 flex flex-col justify-center">
                    <Link href={`/products/${product.id}`} className="block">
                      <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">{product.name}</p>
                      <p className="text-[#fe5001] font-semibold text-sm mt-0.5">{product.price}</p>
                    </Link>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(product.id)}
                    className="shrink-0 self-center mr-3 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            {products.length < TRYON_MAX_FRAMES && (
              <Link
                href="/products"
                className="mt-4 flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-[#fe5001] hover:text-[#fe5001] transition-colors text-sm font-medium"
              >
                <span className="text-xl leading-none" aria-hidden>+</span>
                Add more frames (up to {TRYON_MAX_FRAMES})
              </Link>
            )}
          </>
        )}

        {products.length > 0 && (
          <Link
            href="/home-eye-test"
            className="mt-6 w-full flex items-center justify-center py-3.5 rounded-xl bg-[#fe5001] text-white font-semibold text-sm"
          >
            Proceed to book try-on
          </Link>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
