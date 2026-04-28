'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppScreen } from '@/components/layout/AppScreen';
import { getMockUser } from '@/lib/mock-auth';
import { getProductsList } from '@/lib/products-data';
import type { Product } from '@/lib/products-data';
import type { AppConfig } from '@/types/app-config';
import type { EyeTestBooking } from '@/types/booking';

function formatSlotDate(dateStr: string): string {
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Booking confirmed',
  scheduled: 'Scheduled',
  out_for_visit: 'Out for visit',
  optometrist_reached: 'Optometrist reached',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function BookingsView() {
  const [bookings, setBookings] = useState<EyeTestBooking[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const productList = getProductsList(config?.products);

  useEffect(() => {
    const user = getMockUser();
    const email = (user.email ?? '').trim();
    const mobile = (user.mobile ?? '').replace(/\D/g, '');
    if (!email && !mobile) {
      setLoading(false);
      return;
    }
    const q = email ? `email=${encodeURIComponent(email)}` : `mobile=${encodeURIComponent(mobile)}`;
    fetch(`/api/bookings?${q}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setBookings(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setConfig(d))
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <AppScreen title="My bookings" backHref="/account">
        <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">Loading bookings…</div>
      </AppScreen>
    );
  }

  if (bookings.length === 0) {
    return (
      <AppScreen title="My bookings" backHref="/account">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7 text-slate-500 dark:text-slate-400">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm">No eye test bookings yet</p>
          <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">Book a free home eye test and they will appear here</p>
          <Link href="/home-eye-test" className="mt-4 w-full flex justify-center items-center common-btn common-btn--primary">
            Book eye test
          </Link>
        </div>
      </AppScreen>
    );
  }

  return (
    <AppScreen title="My bookings" backHref="/account">
      <div className="space-y-3 pb-6">
        {bookings.map((b) => (
          <div
            key={b.id}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex gap-3"
          >
            <Link href={`/bookings/${b.id}`} className="flex-1 min-w-0 hover:opacity-90 transition-opacity">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-semibold text-slate-900 dark:text-white text-sm">{b.id}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                  b.status === 'pending' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200' :
                  b.status === 'confirmed' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' :
                  b.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200' :
                  'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {STATUS_LABELS[b.status] ?? b.status}
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">Home eye test</p>
              <p className="text-slate-700 dark:text-slate-300 text-sm mt-0.5">{formatSlotDate(b.preferredDate)}</p>
              <p className="text-slate-500 dark:text-slate-500 text-xs mt-0.5">{b.slotLabel ?? b.preferredSlotId}</p>
              <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">{b.address || (b.deliveryAddress ? [b.deliveryAddress.flatNo, b.deliveryAddress.address].filter(Boolean).join(', ') : '')}</p>
              {b.tryonFrameIds && b.tryonFrameIds.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-600">
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">Home try-on frames</p>
                  <div className="flex flex-wrap gap-1.5">
                    {b.tryonFrameIds
                      .map((id) => productList.find((p: Product) => p.id === id))
                      .filter((p): p is Product => p != null)
                      .map((product) => (
                        <Link
                          key={product.id}
                          href={`/products/${product.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-[#fe5001]/10 hover:text-[#fe5001]"
                        >
                          <span className="w-5 h-5 rounded bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-500 shrink-0" />
                          {product.name}
                        </Link>
                      ))}
                    {b.tryonFrameIds.some((id) => !productList.find((p: Product) => p.id === id)) &&
                      b.tryonFrameIds.filter((id) => !productList.find((p: Product) => p.id === id)).length > 0 && (
                        <span className="text-slate-400 dark:text-slate-500 text-xs">
                          +{b.tryonFrameIds.filter((id) => !productList.find((p: Product) => p.id === id)).length} frame(s)
                        </span>
                      )}
                  </div>
                </div>
              )}
              <p className="text-[#fe5001] font-semibold text-sm mt-2">₹{b.amount.toLocaleString('en-IN')}</p>
            </Link>
            <Link
              href={`/bookings/${b.id}`}
              className="shrink-0 self-center common-btn common-btn--primary text-sm py-2 px-4 whitespace-nowrap flex items-center justify-center text-center min-w-[7rem]"
            >
              {b.status === 'completed' ? 'View' : 'Track'}
            </Link>
          </div>
        ))}
      </div>
    </AppScreen>
  );
}
