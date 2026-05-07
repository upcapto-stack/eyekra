'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getProductsList, SHAPE_LABELS, type Product, type ColorVariant } from '@/shared/utils/products-data';
import { addToTryon, TRYON_MAX_FRAMES } from '@/shared/utils/tryon';
import { addToCart, getCartCount } from '@/shared/utils/cart';
import { isFavourite, toggleFavourite } from '@/shared/utils/favourites';
import { getProductReviews, addReview, updateReview, type ProductReview } from '@/shared/utils/reviews';
import type { AppConfig } from '@/types/app-config';

function CollapseSection({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-200 dark:border-slate-700 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 py-4 px-4 text-left"
      >
        <span className="text-slate-500 dark:text-slate-400 shrink-0 w-5 h-5 flex items-center justify-center">{icon}</span>
        <span className="flex-1 min-w-0 font-medium text-slate-900 dark:text-slate-100">{title}</span>
        <span className="shrink-0 w-5 h-5 flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`w-5 h-5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      {open && <div className="pb-4 pl-12 pr-4 text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{children}</div>}
    </div>
  );
}

function StarRating({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' }) {
  const v = Math.min(5, Math.max(0, value));
  const cls = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';
  return (
    <div className="flex gap-0.5 items-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className={`${cls} ${i <= v ? 'text-amber-500' : 'text-slate-200 dark:text-slate-600'}`}
          fill="currentColor"
        >
          <polygon points="12 2 15 9 22 9 17 14 18 22 12 18 6 22 7 14 2 9 9 9" />
        </svg>
      ))}
    </div>
  );
}

export function ProductDetailView({ productId }: { productId: string }) {
  const router = useRouter();
  const [config, setConfig] = useState<AppConfig | null>(null);
  useEffect(() => {
    fetch('/api/config').then((r) => (r.ok ? r.json() : null)).then((d) => d && setConfig(d)).catch(() => {});
  }, []);
  const productList = getProductsList(config?.products);
  const product = useMemo(() => (productId ? productList.find((p) => p.id === productId) ?? null : null), [productId, productList]);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    if (productId) setLiked(isFavourite(productId));
  }, [productId]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formRating, setFormRating] = useState(5);
  const [formComment, setFormComment] = useState('');

  const loadReviews = useCallback(() => {
    setReviews(getProductReviews(productId));
  }, [productId]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    setCartCount(getCartCount());
  }, []);

  const alsoLikedProducts = useMemo(() => {
    if (!product) return [];
    return productList.filter((p) => p.id !== product.id).slice(0, 8);
  }, [product, productList]);

  if (!product) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex flex-col items-center justify-center p-4">
        <p className="text-slate-500 dark:text-slate-400">Product not found.</p>
        <Link href="/products" className="mt-4 text-[#fe5001] font-semibold">Back to Products</Link>
      </div>
    );
  }

  const brand = product.brand || 'Eyekra';
  const material = product.material || 'Acetate';
  const frameType = product.frameType || 'Full Frame';
  const lensWidth = product.lensWidth || '—';
  const noseBridge = product.noseBridge || '—';
  const templeLength = product.templeLength || '—';
  const colors: ColorVariant[] = product.colors?.length ? product.colors : [{ name: 'Default', hex: '#1a1a1a' }];

  function getVariantSwatchStyle(c: ColorVariant): React.CSSProperties {
    if ('type' in c) {
      if (c.type === 'gradient') return { background: c.gradient };
      if (c.type === 'multi' && c.hexes.length > 0) return c.hexes.length === 1 ? { backgroundColor: c.hexes[0] } : {};
      if (c.type === 'pattern') return { background: 'linear-gradient(135deg, #78716c 0%, #a8a29e 50%, #57534e 100%)' };
      if (c.type === 'solid') return { backgroundColor: c.hex };
    }
    return { backgroundColor: ('hex' in c ? c.hex : '#1a1a1a') };
  }
  function getVariantDisplayName(c: ColorVariant): string {
    if ('type' in c) return c.name;
    return ('name' in c ? c.name : 'Default');
  }
  function isMultiVariant(c: ColorVariant): boolean {
    return 'type' in c && c.type === 'multi' && c.hexes && c.hexes.length > 0;
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-900 pb-8">
      {/* Header: back (left) | Product (center) */}
      <header className="safe-top sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-3 py-2.5 flex items-center">
        <Link
          href="/products"
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          aria-label="Back"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="flex-1 text-center text-slate-900 dark:text-slate-100 text-base font-bold">Product</h1>
        <Link
          href="/cart"
          className="relative shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          aria-label={`Cart, ${cartCount} items`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          {cartCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#fe5001] text-white text-xs font-bold flex items-center justify-center">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </Link>
      </header>

      <main className="flex-1">
        {/* Image with heart on top-right */}
        <div className="relative aspect-square max-w-md mx-auto bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600">
          <button
            type="button"
            onClick={() => {
              if (productId) {
                setLiked(toggleFavourite(productId));
              }
            }}
            className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full flex items-center justify-center bg-white/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 shadow-md"
            aria-label={liked ? 'Remove from favourites' : 'Add to favourites'}
          >
            <svg viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className={`w-5 h-5 ${liked ? 'text-rose-500' : ''}`}>
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </div>

        {/* Details card */}
        <div className="px-4 -mt-2 rounded-t-2xl bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 pt-5 pb-6">
          <p className="text-slate-500 dark:text-slate-400 text-sm">{brand}</p>
          <h2 className="text-slate-900 dark:text-slate-100 text-xl font-bold mt-0.5">{product.name}</h2>

          {/* Price */}
          <div className="flex items-center gap-2 flex-wrap mt-2">
            {product.originalPrice && (
              <span className="text-slate-400 dark:text-slate-500 text-sm line-through">{product.originalPrice}</span>
            )}
            <span className="text-slate-900 dark:text-slate-100 text-lg font-bold">{product.price}</span>
            {product.discount && (
              <span className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold px-2 py-0.5 rounded">
                Sale
              </span>
            )}
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1.5 underline decoration-dotted">
            Shipping calculated at checkout
          </p>

          {/* Color / Variant */}
          <div className="mt-4">
            <p className="text-slate-700 dark:text-slate-300 text-sm font-medium">
              Colour: {colors[selectedColorIndex] ? getVariantDisplayName(colors[selectedColorIndex]) : '—'}
            </p>
            <div className="flex gap-2 mt-2 flex-wrap">
              {colors.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedColorIndex(i)}
                  className={`w-8 h-8 rounded-full border-2 transition-colors shrink-0 overflow-hidden ${
                    selectedColorIndex === i
                      ? 'border-[#fe5001] ring-2 ring-[#fe5001]/20'
                      : 'border-slate-300 dark:border-slate-600 hover:border-slate-400'
                  }`}
                  style={getVariantSwatchStyle(c)}
                  aria-label={getVariantDisplayName(c)}
                >
                  {isMultiVariant(c) && (c as { type: 'multi'; name: string; hexes: string[] }).hexes.length > 1 && (
                    <span className="block w-full h-full flex" aria-hidden>
                      {(c as { type: 'multi'; hexes: string[] }).hexes.slice(0, 3).map((hex, j) => (
                        <span key={j} className="flex-1" style={{ backgroundColor: hex }} />
                      ))}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* CTAs */}
          <div className="mt-5 space-y-2">
            <Link
              href={`/products/${product.id}/lens`}
              className="block w-full py-3.5 rounded-xl bg-[#fe5001] text-white font-semibold text-sm flex items-center justify-center text-center"
            >
              Select Lenses and Purchase
            </Link>
            <button
              type="button"
              onClick={() => {
                addToCart(product.id);
                setCartCount(getCartCount());
              }}
              className="w-full py-3 rounded-xl border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold text-sm flex items-center justify-center"
            >
              Add to cart
            </button>
            <button
              type="button"
              onClick={() => {
                const added = addToTryon(product.id);
                if (added) router.push('/tryon');
                else alert(`Home try-on limit reached (${TRYON_MAX_FRAMES} frames). Remove a frame from Home Try-on to add this one.`);
              }}
              className="w-full py-3 rounded-xl border-2 border-[#fe5001] text-[#fe5001] font-semibold text-sm flex items-center justify-center bg-[#fe5001]/5 dark:bg-[#fe5001]/10"
            >
              Add to Home Try-on
            </button>
          </div>

          {/* Key measurements */}
          <div className="mt-6 grid grid-cols-3 gap-4 py-4 border-y border-slate-100 dark:border-slate-800">
            <div className="text-center">
              <div className="w-10 h-10 mx-auto flex items-center justify-center text-slate-500 dark:text-slate-400 mb-1">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8">
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="12" r="3" />
                  <path d="M9 12h6" />
                </svg>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs">Lens Width</p>
              <p className="text-slate-900 dark:text-slate-100 text-sm font-semibold">{lensWidth}</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 mx-auto flex items-center justify-center text-slate-500 dark:text-slate-400 mb-1">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8">
                  <path d="M12 4v4M8 8l4 4 4-4" />
                  <path d="M6 14h12" />
                </svg>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs">Nose Bridge</p>
              <p className="text-slate-900 dark:text-slate-100 text-sm font-semibold">{noseBridge}</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 mx-auto flex items-center justify-center text-slate-500 dark:text-slate-400 mb-1">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8">
                  <path d="M4 12h16M4 12l4-4M4 12l4 4" />
                </svg>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs">Temple Length</p>
              <p className="text-slate-900 dark:text-slate-100 text-sm font-semibold">{templeLength}</p>
            </div>
          </div>

          {/* Specs list */}
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex gap-2">
              <span className="text-slate-400 dark:text-slate-500">Type:</span>
              <span className="text-slate-900 dark:text-slate-100">{frameType}</span>
            </li>
            <li className="flex gap-2">
              <span className="text-slate-400 dark:text-slate-500">Material:</span>
              <span className="text-slate-900 dark:text-slate-100">{material}</span>
            </li>
            <li className="flex gap-2">
              <span className="text-slate-400 dark:text-slate-500">Frame Shape:</span>
              <span className="text-slate-900 dark:text-slate-100">{SHAPE_LABELS[product.shape]}</span>
            </li>
            <li className="flex gap-2">
              <span className="text-slate-400 dark:text-slate-500">Net Quantity:</span>
              <span className="text-slate-900 dark:text-slate-100">1</span>
            </li>
            <li className="flex gap-2">
              <span className="text-slate-400 dark:text-slate-500">Product:</span>
              <span className="text-slate-900 dark:text-slate-100">Eyeglasses</span>
            </li>
            <li className="flex gap-2">
              <span className="text-slate-400 dark:text-slate-500">Gender:</span>
              <span className="text-slate-900 dark:text-slate-100">Unisex</span>
            </li>
          </ul>

          {/* Collapsible sections */}
          <div className="mt-6 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <CollapseSection
              title="Description"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              }
            >
              {product.description || `${product.name} by ${brand}. ${SHAPE_LABELS[product.shape]} shape, ${material} frame.`}
            </CollapseSection>
            <CollapseSection
              title="Shape"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                </svg>
              }
            >
              {SHAPE_LABELS[product.shape]} frame shape. Suits most face types.
            </CollapseSection>
            <CollapseSection
              title="Material"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              }
            >
              Frame material: {material}. Durable and comfortable for daily wear.
            </CollapseSection>
            <CollapseSection
              title="Frame Type"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
              }
            >
              {frameType}. Full frame provides full lens coverage and a classic look.
            </CollapseSection>
            <CollapseSection
              title="How To Measure?"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path d="M21 21H3M6 21V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14" />
                  <path d="M10 11h4" />
                </svg>
              }
            >
              Lens width is the horizontal width of the lens. Nose bridge is the distance between the two lenses. Temple length is the arm length from hinge to tip. Measure your current frames or use our virtual try-on.
            </CollapseSection>
            <CollapseSection
              title="Compatible Lenses"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              }
            >
              Single vision, bifocal, and blue-cut lenses available. Select at checkout.
            </CollapseSection>
          </div>

          {/* Customer Reviews */}
          <section className="mt-8">
            <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold">Customer Reviews</h3>
            {reviews.length > 0 && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <StarRating value={reviews.reduce((s, r) => s + r.rating, 0) / reviews.length} />
                <span className="text-slate-600 dark:text-slate-400 text-sm">
                  {reviews.length} review{reviews.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {showReviewForm && (
              <div className="mt-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                <h4 className="text-slate-900 dark:text-slate-100 font-medium text-sm">
                  {editingReviewId ? 'Edit review' : 'Write a review'}
                </h4>
                <input
                  type="text"
                  placeholder="Your name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
                />
                <div>
                  <p className="text-slate-600 dark:text-slate-400 text-xs mb-1">Rating</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setFormRating(i)}
                        className="p-0.5 rounded focus:ring-2 ring-[#fe5001]"
                        aria-label={`${i} star${i > 1 ? 's' : ''}`}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className={`w-8 h-8 ${i <= formRating ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'}`}
                          fill="currentColor"
                        >
                          <polygon points="12 2 15 9 22 9 17 14 18 22 12 18 6 22 7 14 2 9 9 9" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  placeholder="Your review..."
                  value={formComment}
                  onChange={(e) => setFormComment(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm resize-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (editingReviewId) {
                        updateReview(productId, editingReviewId, {
                          authorName: formName,
                          rating: formRating,
                          comment: formComment,
                        });
                        setEditingReviewId(null);
                      } else {
                        addReview(productId, { authorName: formName, rating: formRating, comment: formComment });
                      }
                      setFormName('');
                      setFormRating(5);
                      setFormComment('');
                      setShowReviewForm(false);
                      loadReviews();
                    }}
                    className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
                  >
                    {editingReviewId ? 'Update' : 'Submit'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowReviewForm(false);
                      setEditingReviewId(null);
                      setFormName('');
                      setFormRating(5);
                      setFormComment('');
                    }}
                    className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {!showReviewForm && (
              <div className="flex justify-center mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingReviewId(null);
                    setFormName('');
                    setFormRating(5);
                    setFormComment('');
                    setShowReviewForm(true);
                  }}
                  className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
                >
                  Write a review
                </button>
              </div>
            )}

            {reviews.length > 0 && (
              <ul className="mt-6 space-y-4">
                {reviews.map((r) => (
                  <li key={r.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{r.authorName}</p>
                        <StarRating value={r.rating} size="sm" />
                        {r.comment && <p className="text-slate-600 dark:text-slate-400 text-sm mt-1.5 whitespace-pre-wrap">{r.comment}</p>}
                        <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                          {new Date(r.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                          {r.updatedAt && ' (edited)'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFormName(r.authorName);
                          setFormRating(r.rating);
                          setFormComment(r.comment);
                          setEditingReviewId(r.id);
                          setShowReviewForm(true);
                        }}
                        className="shrink-0 px-2 py-1 rounded text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        Edit
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {reviews.length === 0 && !showReviewForm && (
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Be the first to write a review</p>
            )}
          </section>

          {/* People who liked this also liked - carousel */}
          {alsoLikedProducts.length > 0 && (
            <section className="mt-8" aria-label="People who liked this also liked">
              <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold mb-3">People who liked this also liked</h3>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2">
                {alsoLikedProducts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/products/${p.id}`}
                    className="shrink-0 w-36 flex flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden hover:border-[#fe5001]/50 transition-colors"
                  >
                    <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600" />
                    <div className="p-2.5">
                      <p className="text-slate-900 dark:text-slate-100 font-medium text-sm truncate">{p.name}</p>
                      <p className="text-[#fe5001] font-semibold text-sm mt-0.5">{p.price}</p>
                      {p.originalPrice && (
                        <p className="text-slate-400 dark:text-slate-500 text-xs line-through">{p.originalPrice}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
