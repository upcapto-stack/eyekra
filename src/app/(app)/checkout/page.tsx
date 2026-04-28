'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { BottomNav } from '@/components/layout/BottomNav';
import { isMockLoggedIn } from '@/lib/mock-auth';
import { getCartItems, clearCart, type CartItem } from '@/lib/cart';
import { getProductsList, isProductInCollection, type Product } from '@/lib/products-data';
import { getLensesList } from '@/lib/lenses-data';
import { getLocation, type SavedLocation } from '@/lib/location';
import { getMockUser } from '@/lib/mock-auth';
import type { AppConfig, AppOfferRule } from '@/types/app-config';
import type { OrderItem } from '@/types/order';

function parsePrice(priceStr: string): number {
  return Number(priceStr.replace(/[^0-9.]/g, '')) || 0;
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

export default function CheckoutPage() {
  const router = useRouter();
  const [fromBuyNow, setFromBuyNow] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState<SavedLocation | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [appliedOfferRule, setAppliedOfferRule] = useState<AppOfferRule | null>(null);
  const [codeError, setCodeError] = useState('');
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setFromBuyNow(params.get('from') === 'buy-now');
    }
  }, []);

  useEffect(() => {
    if (!isMockLoggedIn()) {
      router.replace('/login');
      return;
    }
    const cartItems = getCartItems();
    setItems(fromBuyNow && cartItems.length > 0 ? cartItems.slice(-1) : cartItems);
    setDeliveryAddress(getLocation());
    fetch('/api/config').then((r) => (r.ok ? r.json() : null)).then((d) => d && setConfig(d)).catch(() => {});
  }, [router, fromBuyNow]);

  useEffect(() => {
    const onVisible = () => setDeliveryAddress(getLocation());
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const productList = getProductsList(config?.products);
  const lensList = getLensesList(config?.lenses);
  const productMap = new Map(productList.map((p) => [p.id, p]));
  const getLensPrice = useCallback(
    (lensId: string) => (lensId ? (lensList.find((l) => l.id === lensId)?.price ?? 0) : 0),
    [lensList],
  );
  const rows: Row[] = items
    .map((item) => ({ item, product: productMap.get(item.id) }))
    .filter((x): x is { item: CartItem; product: Product } => x.product != null);

  const getRowTotal = useCallback(
    (r: Row) => (parsePrice(r.product.price) + getLensPrice(r.item.lensId || '')) * r.item.quantity,
    [getLensPrice],
  );
  const getUnitPrice = useCallback((r: Row) => parsePrice(r.product.price) + getLensPrice(r.item.lensId || ''), [getLensPrice]);

  const frameSubtotal = rows.reduce((sum, { item, product }) => sum + parsePrice(product.price) * item.quantity, 0);
  const lensSubtotal = rows.reduce((sum, { item }) => sum + (item.lensId ? getLensPrice(item.lensId) * item.quantity : 0), 0);
  const subtotal = frameSubtotal + lensSubtotal;
  const totalCount = rows.reduce((sum, { item }) => sum + item.quantity, 0);

  const applicableRowsForRule = appliedOfferRule ? getApplicableRows(appliedOfferRule, rows, config) : [];
  const applicableTotalForRule = appliedOfferRule ? getApplicableTotal(appliedOfferRule, rows, subtotal, config, getRowTotal) : 0;
  const offerDiscount = appliedOfferRule ? getOfferDiscount(appliedOfferRule, applicableTotalForRule, applicableRowsForRule, getUnitPrice) : 0;
  const discount = offerDiscount;
  const total = Math.max(0, subtotal - discount);

  useEffect(() => {
    if (!config || rows.length === 0) return;
    if (appliedOfferRule) {
      const applicable = getApplicableTotal(appliedOfferRule, rows, subtotal, config, getRowTotal);
      const { valid } = validateOfferRule(appliedOfferRule, applicable, totalCount);
      if (!valid) setAppliedOfferRule(null);
    }
  }, [appliedOfferRule, config, getRowTotal, rows, subtotal, totalCount]);

  useEffect(() => {
    if (!config?.offerRules?.length || codeInput.trim() || appliedOfferRule || rows.length === 0) return;
    const autoRules = config.offerRules
      .filter((r) => !r.code?.trim())
      .map((r) => {
        const applicable = getApplicableTotal(r, rows, subtotal, config, getRowTotal);
        const validation = validateOfferRule(r, applicable, totalCount);
        return { rule: r, applicable, validation };
      })
      .filter((x) => x.validation.valid)
      .sort((a, b) => (b.rule.priority ?? 0) - (a.rule.priority ?? 0));
    if (autoRules.length) setAppliedOfferRule(autoRules[0].rule);
  }, [appliedOfferRule, codeInput, config, getRowTotal, rows, subtotal, totalCount]);

  const handleApplyCode = () => {
    setCodeError('');
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    const rule = config?.offerRules?.find((r) => r.code?.trim() && r.code.toUpperCase() === code);
    if (rule) {
      const applicable = getApplicableTotal(rule, rows, subtotal, config, getRowTotal);
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

  const handlePlaceOrder = async () => {
    if (!deliveryAddress) {
      setPlaceError('Please select a delivery address.');
      return;
    }
    setPlaceError('');
    setPlacing(true);
    try {
      const user = getMockUser();
      const orderItems: OrderItem[] = rows.map((r) => {
        const lensPrice = r.item.lensId ? getLensPrice(r.item.lensId) : 0;
        const lensName = r.item.lensId ? lensList.find((l) => l.id === r.item.lensId)?.name : undefined;
        const lineTotal = (parsePrice(r.product.price) + lensPrice) * r.item.quantity;
        return {
          productId: r.product.id,
          productName: r.product.name,
          productPrice: r.product.price,
          lensId: r.item.lensId,
          lensName,
          lensPrice: lensPrice || undefined,
          quantity: r.item.quantity,
          prescription: r.item.prescription,
          lineTotal,
        };
      });
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: { name: user.name, mobile: user.mobile, email: user.email },
          deliveryAddress,
          items: orderItems,
          subtotal,
          discount,
          total,
          offerApplied: appliedOfferRule ? (appliedOfferRule.name || appliedOfferRule.code || '') : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPlaceError(data.error || 'Failed to place order');
        setPlacing(false);
        return;
      }
      clearCart();
      router.push(`/orders/success?orderId=${encodeURIComponent(data.orderId || data.order?.id || '')}`);
    } catch {
      setPlaceError('Something went wrong. Please try again.');
      setPlacing(false);
    }
  };

  const availableCodes = (config?.offerRules ?? []).filter((r) => r.code?.trim()).map((r) => r.code!);

  if (rows.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-900 pb-20">
        <p className="text-slate-500 dark:text-slate-400">Your cart is empty.</p>
        <Link href="/products" className="mt-4 text-[#fe5001] font-semibold">Browse products</Link>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-900 pb-20">
      <header className="safe-top sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-3 py-2.5 flex items-center">
        <button type="button" onClick={() => router.back()} className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300" aria-label="Back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="flex-1 text-center text-slate-900 dark:text-slate-100 text-base font-bold">Checkout</h1>
        <span className="w-9" />
      </header>

      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full">
        <section className="mb-6">
          <h2 className="text-slate-900 dark:text-slate-100 font-bold text-sm mb-3">Order summary</h2>
          <ul className="space-y-3">
            {rows.map(({ item, product }) => {
              const lensPrice = item.lensId ? getLensPrice(item.lensId) : 0;
              const lineTotal = (parsePrice(product.price) + lensPrice) * item.quantity;
              return (
                <li key={item._entryIndex ?? product.id} className="flex gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="shrink-0 w-14 aspect-square rounded-lg bg-slate-200 dark:bg-slate-700" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{product.name}</p>
                    <p className="text-slate-600 dark:text-slate-400 text-xs mt-0.5">{product.price}</p>
                    {item.lensId && (
                      <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                        Lens: {item.lensId.replace(/-/g, ' ')} {lensPrice > 0 && `(+ ₹${lensPrice.toLocaleString('en-IN')})`}
                      </p>
                    )}
                    {item.prescription && <p className="text-slate-500 dark:text-slate-400 text-xs">Prescription: {item.prescription.type === 'upload' ? 'Uploaded' : 'Entered'}</p>}
                    <p className="text-[#fe5001] font-semibold text-sm mt-1">₹{lineTotal.toLocaleString('en-IN')}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-slate-900 dark:text-slate-100 font-bold text-sm mb-3">Offers</h2>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-4 space-y-3">
            {appliedOfferRule ? (
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-sm">
                <span>
                  Applied: <strong>{appliedOfferRule.name || appliedOfferRule.code || 'Offer'}</strong>
                  {discount > 0 && ` (−₹${discount.toLocaleString('en-IN')})`}
                </span>
                <button type="button" onClick={clearOffer} className="text-emerald-600 dark:text-emerald-400 font-medium">Remove</button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    placeholder="Offer code"
                    className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm uppercase"
                  />
                  <button type="button" onClick={handleApplyCode} className="px-4 py-2 rounded-lg bg-[#fe5001] text-white text-sm font-medium whitespace-nowrap">
                    Apply
                  </button>
                </div>
                {availableCodes.length > 0 && (
                  <p className="text-slate-500 dark:text-slate-400 text-xs">
                    Available: {availableCodes.slice(0, 8).join(', ')}{availableCodes.length > 8 ? '…' : ''}
                  </p>
                )}
              </>
            )}
            {codeError && <p className="text-red-600 dark:text-red-400 text-sm">{codeError}</p>}
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-slate-900 dark:text-slate-100 font-bold text-sm mb-3">Payment summary</h2>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-4 space-y-2">
            <div className="flex justify-between text-slate-600 dark:text-slate-400 text-sm">
              <span>Frames ({totalCount} item{totalCount !== 1 ? 's' : ''})</span>
              <span>₹{frameSubtotal.toLocaleString('en-IN')}</span>
            </div>
            {lensSubtotal > 0 && (
              <div className="flex justify-between text-slate-600 dark:text-slate-400 text-sm">
                <span>Lenses</span>
                <span>₹{lensSubtotal.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600 dark:text-slate-400 text-sm">
              <span>Subtotal</span>
              <span>₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 text-sm">
                <span>Discount</span>
                <span>−₹{discount.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-900 dark:text-slate-100 font-bold pt-2 border-t border-slate-200 dark:border-slate-600">
              <span>Total</span>
              <span>₹{total.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-slate-900 dark:text-slate-100 font-bold text-sm mb-3">Delivery address</h2>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 overflow-hidden">
            {deliveryAddress ? (
              <>
                <div className="p-4">
                  <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{deliveryAddress.displayName}</p>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mt-0.5">
                    {[deliveryAddress.flatNo, deliveryAddress.address].filter(Boolean).join(', ')}
                  </p>
                  {deliveryAddress.contact && <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">{deliveryAddress.contact}</p>}
                </div>
                <Link href="/addresses?from=checkout" className="block w-full py-2.5 text-center text-sm font-medium text-[#fe5001] border-t border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/50">
                  Change
                </Link>
              </>
            ) : (
              <Link href="/addresses?from=checkout" className="block p-4 text-slate-600 dark:text-slate-400 text-sm">
                Select or add address →
              </Link>
            )}
          </div>
        </section>

        {placeError && <p className="mb-4 text-red-600 dark:text-red-400 text-sm">{placeError}</p>}
        <button
          type="button"
          onClick={handlePlaceOrder}
          disabled={placing || !deliveryAddress}
          className="w-full py-3.5 rounded-xl bg-[#fe5001] text-white font-semibold text-sm disabled:opacity-50"
        >
          {placing ? 'Placing order…' : 'Place order'}
        </button>
      </main>

      <BottomNav />
    </div>
  );
}
