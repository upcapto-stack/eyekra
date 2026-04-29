'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { BottomNav } from '@/components/layout/BottomNav';
import { getCartItems, removeFromCartByIndex, removeAllFromCart, type CartItem } from '@/lib/cart';
import { getProductsList, isProductInCollection, type Product } from '@/lib/products-data';
import { getLensesList } from '@/lib/lenses-data';
import type { AppConfig, AppOfferRule } from '@/types/app-config';

function parsePrice(priceStr: string): number {
  const num = priceStr.replace(/[^0-9.]/g, '');
  return Number(num) || 0;
}

type Row = { item: CartItem; product: Product };

function getApplicableRows(rule: AppOfferRule, rows: Row[], config: AppConfig | null): Row[] {
  if (rule.appliesTo === 'entire_order') return rows;
  const ids = new Set(rule.appliesToIds ?? []);
  if (rule.appliesTo === 'product') return rows.filter((r) => ids.has(r.product.id));
  if (rule.appliesTo === 'category') return rows.filter((r) => ids.has(r.product.category));
  if (rule.appliesTo === 'collection' && config?.collections?.length) {
    const collectionIds = Array.from(ids);
    return rows.filter((r) => {
      for (const cid of collectionIds) {
        const col = config!.collections!.find((c) => c.id === cid);
        if (col && isProductInCollection(r.product, col)) return true;
      }
      return false;
    });
  }
  return rows;
}

function getApplicableTotal(rule: AppOfferRule, rows: Row[], subtotal: number, config: AppConfig | null, getRowTotal?: (r: Row) => number): number {
  if (rule.appliesTo === 'entire_order') return subtotal;
  const applicable = getApplicableRows(rule, rows, config);
  if (getRowTotal) return applicable.reduce((s, r) => s + getRowTotal(r), 0);
  return applicable.reduce((s, { item, product }) => s + parsePrice(product.price) * item.quantity, 0);
}

function validateOfferRule(rule: AppOfferRule, applicableTotal: number, totalQty: number): { valid: boolean; message?: string } {
  const now = new Date().toISOString().slice(0, 10);
  if (rule.validFrom && now < rule.validFrom) return { valid: false, message: 'Offer abhi valid nahi hai' };
  if (rule.validTo && now > rule.validTo) return { valid: false, message: 'Offer expire ho chuka hai' };
  if (rule.minOrderAmount != null && applicableTotal < rule.minOrderAmount) return { valid: false, message: `Min order ₹${rule.minOrderAmount}` };
  if (rule.minQuantity != null && totalQty < rule.minQuantity) return { valid: false, message: `Min ${rule.minQuantity} items` };
  if (rule.maxUses != null && (rule.usedCount ?? 0) >= rule.maxUses) return { valid: false, message: 'Offer limit khatam' };
  return { valid: true };
}

function getOfferDiscount(rule: AppOfferRule, applicableTotal: number, applicableRows: Row[], getUnitPrice?: (r: Row) => number): number {
  if (applicableTotal <= 0) return 0;
  if (rule.discountType === 'percent_off') return Math.round((applicableTotal * rule.value) / 100);
  if (rule.discountType === 'fixed_off') return Math.min(rule.value, applicableTotal);
  if (rule.discountType === 'free_shipping') return 0;
  if (rule.discountType === 'buy_x_get_y') {
    const x = rule.value || 1;
    const y = rule.valueSecondary ?? 1;
    const totalQty = applicableRows.reduce((s, r) => s + r.item.quantity, 0);
    const sets = Math.floor(totalQty / (x + y));
    if (sets === 0) return 0;
    const unitPrice = getUnitPrice ?? ((r: Row) => parsePrice(r.product.price));
    const sortedPrices = applicableRows.flatMap((r) => Array(r.item.quantity).fill(unitPrice(r))).sort((a, b) => a - b);
    const freeCount = sets * y;
    let discount = 0;
    for (let i = 0; i < freeCount && i < sortedPrices.length; i++) discount += sortedPrices[i];
    return Math.round(discount);
  }
  return 0;
}

export function CartView() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [appliedOfferRule, setAppliedOfferRule] = useState<AppOfferRule | null>(null);
  const [codeError, setCodeError] = useState('');

  const load = useCallback(() => {
    setItems(getCartItems());
  }, []);

  useEffect(() => {
    fetch('/api/config').then((r) => (r.ok ? r.json() : null)).then((d) => d && setConfig(d)).catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const productList = getProductsList(config?.products);
  const lensList = getLensesList(config?.lenses);
  const productMap = new Map(productList.map((p) => [p.id, p]));
  const getLensPrice = (lensId: string) => (lensId ? (lensList.find((l) => l.id === lensId)?.price ?? 0) : 0);
  const rows: Row[] = items
    .map((item) => ({ item, product: productMap.get(item.id) }))
    .filter((x): x is { item: CartItem; product: Product } => x.product != null);

  const getRowTotal = (r: Row) => (parsePrice(r.product.price) + getLensPrice(r.item.lensId || '')) * r.item.quantity;
  const getUnitPrice = (r: Row) => parsePrice(r.product.price) + getLensPrice(r.item.lensId || '');

  const subtotal = rows.reduce((sum, r) => sum + getRowTotal(r), 0);
  const totalCount = rows.reduce((sum, { item }) => sum + item.quantity, 0);

  const applicableRowsForRule = appliedOfferRule ? getApplicableRows(appliedOfferRule, rows, config) : [];
  const applicableTotalForRule = appliedOfferRule ? getApplicableTotal(appliedOfferRule, rows, subtotal, config, getRowTotal) : 0;
  const offerDiscount = appliedOfferRule ? getOfferDiscount(appliedOfferRule, applicableTotalForRule, applicableRowsForRule, getUnitPrice) : 0;
  const discount = offerDiscount;
  const total = Math.max(0, subtotal - discount);

  useEffect(() => {
    if (!config || rows.length === 0) return;
    if (appliedOfferRule) {
      const applicable = getApplicableTotal(appliedOfferRule, rows, subtotal, config);
      const { valid } = validateOfferRule(appliedOfferRule, applicable, totalCount);
      if (!valid) setAppliedOfferRule(null);
    }
  }, [appliedOfferRule, config, rows, subtotal, totalCount]);

  useEffect(() => {
    if (!config?.offerRules?.length || codeInput.trim() || appliedOfferRule || rows.length === 0) return;
    const autoRules = config.offerRules
      .filter((r) => !r.code?.trim())
      .map((r) => {
        const applicable = getApplicableTotal(r, rows, subtotal, config);
        const validation = validateOfferRule(r, applicable, totalCount);
        return { rule: r, applicable, validation };
      })
      .filter((x) => x.validation.valid)
      .sort((a, b) => (b.rule.priority ?? 0) - (a.rule.priority ?? 0));
    if (autoRules.length) setAppliedOfferRule(autoRules[0].rule);
  }, [appliedOfferRule, codeInput, config, rows, subtotal, totalCount]);

  const handleApplyCode = () => {
    setCodeError('');
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    const rule = config?.offerRules?.find((r) => r.code?.trim() && r.code.toUpperCase() === code);
    if (rule) {
      const applicable = getApplicableTotal(rule, rows, subtotal, config);
      const { valid, message } = validateOfferRule(rule, applicable, totalCount);
      if (!valid) {
        setCodeError(message ?? 'Invalid');
        return;
      }
      setAppliedOfferRule(rule);
      setCodeInput('');
      return;
    }
    setCodeError('Invalid offer code');
  };

  const clearOffer = () => setAppliedOfferRule(null);

  const handleRemoveOne = (item: CartItem) => {
    if (item._entryIndex != null) removeFromCartByIndex(item._entryIndex);
    else removeAllFromCart(item.id);
    load();
  };

  const handleRemoveAll = (id: string) => {
    removeAllFromCart(id);
    load();
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-900 pb-20">
      <header className="safe-top sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-3 py-2.5 flex items-center gap-3">
        <Link
          href="/products"
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          aria-label="Back"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="flex-1 text-center text-slate-900 dark:text-slate-100 text-lg font-bold">Cart</h1>
        <span className="w-9" aria-hidden />
      </header>

      <main className="flex-1 px-4 py-5 max-w-md mx-auto w-full">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-8 text-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-3">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <p className="text-slate-600 dark:text-slate-400 text-sm">Your cart is empty</p>
            <Link href="/products" className="mt-4 inline-flex common-btn common-btn--primary">
              Browse frames
            </Link>
          </div>
        ) : (
          <>
            <ul className="space-y-4">
              {rows.map(({ item, product }) => {
                const lensPrice = getLensPrice(item.lensId || '');
                const lineTotal = (parsePrice(product.price) + lensPrice) * item.quantity;
                return (
                <li key={item._entryIndex ?? product.id} className="flex gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden p-3">
                  <Link href={`/products/${product.id}`} className="shrink-0 w-20 aspect-square rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600" />
                  <div className="flex-1 min-w-0">
                    <Link href={`/products/${product.id}`}>
                      <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">{product.name}</p>
                    </Link>
                    <p className="text-slate-600 dark:text-slate-400 text-xs mt-0.5">{product.price}</p>
                    {item.lensId ? (
                      <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                        Lens: {item.lensId.replace(/-/g, ' ')} {lensPrice > 0 && `(+ ₹${lensPrice.toLocaleString('en-IN')})`}
                      </p>
                    ) : null}
                    {item.prescription && (
                      <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                        Prescription: {item.prescription.type === 'upload' ? 'Uploaded' : 'Entered'}
                      </p>
                    )}
                    <Link
                      href={`/products/${product.id}/lens`}
                      className="inline-block mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#fe5001] text-[#fe5001] hover:bg-[#fe5001]/10"
                    >
                      {item.lensId ? 'Change lens' : 'Select lens'}
                    </Link>
                    <p className="text-[#fe5001] font-semibold text-sm mt-1">₹{lineTotal.toLocaleString('en-IN')}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-slate-500 dark:text-slate-400 text-xs">Qty: {item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveOne(item)}
                        className="text-xs text-slate-500 dark:text-slate-400 underline hover:text-slate-700"
                      >
                        − 1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveOne(item)}
                        className="text-xs text-red-600 dark:text-red-400 underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
                );
              })}
            </ul>

            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
              {!appliedOfferRule ? (
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    placeholder="Offer code"
                    className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm uppercase"
                  />
                  <button type="button" onClick={handleApplyCode} className="inline-flex items-center justify-center text-center px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 text-sm font-medium">
                    Apply
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between mb-4 py-2 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-sm">
                  <span>
                    Applied: <strong>{appliedOfferRule.name || appliedOfferRule.code || 'Offer'}</strong>
                    {discount > 0 && ` (−₹${discount.toLocaleString('en-IN')})`}
                  </span>
                  <button type="button" onClick={clearOffer} className="text-emerald-600 dark:text-emerald-400 font-medium">Remove</button>
                </div>
              )}
              {codeError && <p className="text-red-600 dark:text-red-400 text-sm mb-2">{codeError}</p>}
              <div className="flex justify-between text-slate-600 dark:text-slate-400 text-sm">
                <span>Subtotal ({totalCount} items)</span>
                <span>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 text-sm mt-1">
                  <span>Discount</span>
                  <span>−₹{discount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-900 dark:text-slate-100 font-semibold mt-2 pt-2 border-t border-slate-200 dark:border-slate-600">
                <span>Total</span>
                <span>₹{total.toLocaleString('en-IN')}</span>
              </div>
              <Link
                href="/checkout"
                className="mt-4 block w-full py-3.5 rounded-xl bg-[#fe5001] text-white font-semibold text-sm text-center"
              >
                Proceed to checkout
              </Link>
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
