const STORAGE_KEY = 'eyekra-favourites';
let favouritesHydrated = false;

function getStoredIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((x): x is string => typeof x === 'string');
      }
    }
  } catch {
    // ignore
  }
  if (typeof window !== 'undefined' && !favouritesHydrated) {
    favouritesHydrated = true;
    void hydrateFavouritesFromServer();
  }
  return [];
}

function setStoredIds(ids: string[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    void syncFavouritesToServer(ids);
  }
}

async function hydrateFavouritesFromServer(): Promise<void> {
  try {
    const res = await fetch('/api/user/favourites', { credentials: 'include' });
    if (!res.ok) return;
    const data = (await res.json()) as { productIds?: string[] };
    if (Array.isArray(data.productIds)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.productIds));
      window.dispatchEvent(new Event('storage'));
    }
  } catch {
    // ignore
  }
}

async function syncFavouritesToServer(ids: string[]): Promise<void> {
  try {
    await fetch('/api/user/favourites', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ productIds: ids }),
    });
  } catch {
    // ignore
  }
}

export function getFavouriteIds(): string[] {
  return getStoredIds();
}

export function isFavourite(productId: string): boolean {
  return getStoredIds().includes(productId);
}

export function addFavourite(productId: string): void {
  const ids = getStoredIds();
  if (ids.includes(productId)) return;
  setStoredIds([...ids, productId]);
}

export function removeFavourite(productId: string): void {
  setStoredIds(getStoredIds().filter((id) => id !== productId));
}

export function toggleFavourite(productId: string): boolean {
  const ids = getStoredIds();
  const has = ids.includes(productId);
  if (has) {
    setStoredIds(ids.filter((id) => id !== productId));
    return false;
  }
  setStoredIds([...ids, productId]);
  return true;
}

export function getFavouritesCount(): number {
  return getStoredIds().length;
}
