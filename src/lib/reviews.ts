const STORAGE_KEY = 'eyekra-product-reviews';
let reviewsHydrated = false;

export interface ProductReview {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt?: string;
}

function getStored(): Record<string, ProductReview[]> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (parsed && typeof parsed === 'object') {
        const out: Record<string, ProductReview[]> = {};
        for (const [key, val] of Object.entries(parsed)) {
          if (Array.isArray(val)) {
            out[key] = val.filter(
              (x): x is ProductReview =>
                x != null &&
                typeof x === 'object' &&
                typeof (x as ProductReview).id === 'string' &&
                typeof (x as ProductReview).authorName === 'string' &&
                typeof (x as ProductReview).rating === 'number' &&
                typeof (x as ProductReview).comment === 'string' &&
                typeof (x as ProductReview).createdAt === 'string'
            );
          }
        }
        return out;
      }
    }
  } catch {
    // ignore
  }
  if (typeof window !== 'undefined' && !reviewsHydrated) {
    reviewsHydrated = true;
    void hydrateReviewsFromServer();
  }
  return {};
}

function setStored(data: Record<string, ProductReview[]>): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    void syncReviewsToServer(data);
  }
}

async function hydrateReviewsFromServer(): Promise<void> {
  try {
    const res = await fetch('/api/user/reviews', { credentials: 'include' });
    if (!res.ok) return;
    const data = (await res.json()) as { reviews?: Array<Record<string, unknown>> };
    const grouped: Record<string, ProductReview[]> = {};
    for (const review of data.reviews ?? []) {
      const productId = String(review.productId ?? '');
      if (!productId) continue;
      if (!grouped[productId]) grouped[productId] = [];
      grouped[productId].push({
        id: String(review.id ?? ''),
        authorName: 'You',
        rating: Number(review.rating ?? 0),
        comment: String(review.body ?? ''),
        createdAt: String(review.createdAt ?? new Date().toISOString()),
        updatedAt: review.updatedAt ? String(review.updatedAt) : undefined,
      });
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(grouped));
    window.dispatchEvent(new Event('storage'));
  } catch {
    // ignore
  }
}

async function syncReviewsToServer(data: Record<string, ProductReview[]>): Promise<void> {
  const flattened = Object.entries(data).flatMap(([productId, reviews]) =>
    reviews.map((review) => ({
      productId,
      rating: review.rating,
      title: null,
      body: review.comment,
    }))
  );
  try {
    await fetch('/api/user/reviews', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ reviews: flattened }),
    });
  } catch {
    // ignore
  }
}

export function getProductReviews(productId: string): ProductReview[] {
  const data = getStored();
  const list = data[productId] ?? [];
  return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function addReview(
  productId: string,
  review: { authorName: string; rating: number; comment: string }
): ProductReview {
  const data = getStored();
  const list = data[productId] ?? [];
  const id = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();
  const newReview: ProductReview = {
    id,
    authorName: review.authorName.trim() || 'Anonymous',
    rating: Math.min(5, Math.max(1, Math.round(review.rating))),
    comment: review.comment.trim() || '',
    createdAt: now,
  };
  data[productId] = [...list, newReview];
  setStored(data);
  return newReview;
}

export function updateReview(
  productId: string,
  reviewId: string,
  updates: { authorName?: string; rating?: number; comment?: string }
): ProductReview | null {
  const data = getStored();
  const list = data[productId] ?? [];
  const idx = list.findIndex((r) => r.id === reviewId);
  if (idx === -1) return null;
  const now = new Date().toISOString();
  const updated: ProductReview = {
    ...list[idx],
    ...(updates.authorName != null && { authorName: updates.authorName.trim() || 'Anonymous' }),
    ...(updates.rating != null && { rating: Math.min(5, Math.max(1, Math.round(updates.rating))) }),
    ...(updates.comment != null && { comment: updates.comment.trim() }),
    updatedAt: now,
  };
  data[productId] = list.map((r, i) => (i === idx ? updated : r));
  setStored(data);
  return updated;
}

export function deleteReview(productId: string, reviewId: string): boolean {
  const data = getStored();
  const list = data[productId] ?? [];
  const filtered = list.filter((r) => r.id !== reviewId);
  if (filtered.length === list.length) return false;
  data[productId] = filtered;
  setStored(data);
  return true;
}
