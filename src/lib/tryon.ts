const TRYON_IDS_KEY = 'eyekra-tryon-ids';
let tryonHydrated = false;

export const TRYON_MAX_FRAMES = 10;

function getStoredIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(TRYON_IDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === 'string');
    }
  } catch {
    // ignore
  }
  if (typeof window !== 'undefined' && !tryonHydrated) {
    tryonHydrated = true;
    void hydrateTryonFromServer();
  }
  return [];
}

function setStoredIds(ids: string[]): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(TRYON_IDS_KEY, JSON.stringify(ids));
    void syncTryonToServer(ids);
  }
}

async function hydrateTryonFromServer(): Promise<void> {
  try {
    const res = await fetch('/api/user/tryon', { credentials: 'include' });
    if (!res.ok) return;
    const data = (await res.json()) as { productIds?: string[] };
    if (Array.isArray(data.productIds)) {
      sessionStorage.setItem(TRYON_IDS_KEY, JSON.stringify(data.productIds));
      window.dispatchEvent(new Event('storage'));
    }
  } catch {
    // ignore
  }
}

async function syncTryonToServer(ids: string[]): Promise<void> {
  try {
    await fetch('/api/user/tryon', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ productIds: ids }),
    });
  } catch {
    // ignore
  }
}

export function getTryonIds(): string[] {
  return getStoredIds();
}

export function addToTryon(productId: string): boolean {
  const ids = getStoredIds();
  if (ids.includes(productId)) return true;
  if (ids.length >= TRYON_MAX_FRAMES) return false;
  setStoredIds([...ids, productId]);
  return true;
}

export function removeFromTryon(productId: string): void {
  setStoredIds(getStoredIds().filter((id) => id !== productId));
}

export function isInTryon(productId: string): boolean {
  return getStoredIds().includes(productId);
}
