import type { PrescriptionData } from '@/types/prescription';

const CART_ENTRIES_KEY = 'eyekra-cart-entries';
let cartHydrated = false;

export interface CartEntry {
  productId: string;
  lensId?: string;
  prescription?: PrescriptionData;
}

function getStoredEntries(): CartEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(CART_ENTRIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (x): x is CartEntry =>
            x != null && typeof x === 'object' && typeof (x as CartEntry).productId === 'string'
        );
      }
    }
    const legacy = sessionStorage.getItem('eyekra-cart-ids');
    if (legacy) {
      const ids = JSON.parse(legacy) as unknown;
      if (Array.isArray(ids)) {
        const entries: CartEntry[] = (ids as string[]).filter((x) => typeof x === 'string').map((id) => ({ productId: id }));
        setStoredEntries(entries);
        sessionStorage.removeItem('eyekra-cart-ids');
        return entries;
      }
    }
  } catch {
    // ignore
  }
  if (typeof window !== 'undefined' && !cartHydrated) {
    cartHydrated = true;
    void hydrateCartFromServer();
  }
  return [];
}

function setStoredEntries(entries: CartEntry[]): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(CART_ENTRIES_KEY, JSON.stringify(entries));
    void syncCartToServer(entries);
  }
}

async function hydrateCartFromServer(): Promise<void> {
  try {
    const res = await fetch('/api/user/cart', { credentials: 'include' });
    if (!res.ok) return;
    const data = (await res.json()) as { items?: Array<{ metadata?: CartEntry; productId?: string; lensId?: string; }> };
    const entries = (data.items ?? [])
      .map((item) => item.metadata ?? { productId: item.productId ?? '', lensId: item.lensId })
      .filter((entry) => entry.productId);
    if (entries.length > 0) {
      sessionStorage.setItem(CART_ENTRIES_KEY, JSON.stringify(entries));
      window.dispatchEvent(new Event('storage'));
    }
  } catch {
    // ignore
  }
}

async function syncCartToServer(entries: CartEntry[]): Promise<void> {
  try {
    await fetch('/api/user/cart', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        items: entries.map((entry) => ({
          ...entry,
          productName: '',
          productPrice: '',
          quantity: 1,
          lineTotal: 0,
        })),
      }),
    });
  } catch {
    // ignore
  }
}

export interface CartItem {
  id: string;
  quantity: number;
  lensId?: string;
  prescription?: PrescriptionData;
  /** Internal: index for remove */
  _entryIndex?: number;
}

export function getCartItems(): CartItem[] {
  const entries = getStoredEntries();
  return entries.map((e, i) => ({
    id: e.productId,
    quantity: 1,
    lensId: e.lensId,
    prescription: e.prescription,
    _entryIndex: i,
  }));
}

export function getCartCount(): number {
  return getStoredEntries().length;
}

export function addToCart(productId: string, options?: { lensId?: string; prescription?: PrescriptionData }): void {
  const entries = getStoredEntries();
  if (options?.lensId != null) {
    const idx = entries.findIndex((e) => e.productId === productId && e.lensId == null);
    if (idx !== -1) {
      entries[idx] = { ...entries[idx], lensId: options.lensId, prescription: options.prescription };
      setStoredEntries(entries);
      return;
    }
  }
  entries.push({
    productId,
    lensId: options?.lensId,
    prescription: options?.prescription,
  });
  setStoredEntries(entries);
}

/** Remove one cart entry by its index (from CartItem._entryIndex). */
export function removeFromCartByIndex(entryIndex: number): void {
  const entries = getStoredEntries();
  if (entryIndex < 0 || entryIndex >= entries.length) return;
  setStoredEntries(entries.filter((_, i) => i !== entryIndex));
}

/** Remove one occurrence of productId (first match). Kept for backward compat. */
export function removeFromCart(productId: string): void {
  const entries = getStoredEntries();
  const idx = entries.findIndex((e) => e.productId === productId);
  if (idx === -1) return;
  setStoredEntries(entries.filter((_, i) => i !== idx));
}

export function removeAllFromCart(productId: string): void {
  setStoredEntries(getStoredEntries().filter((e) => e.productId !== productId));
}

/** Clear entire cart (e.g. after order placed). */
export function clearCart(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(CART_ENTRIES_KEY, '[]');
  }
}
