'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { EyeTestBooking } from '@/types/booking';
import type { AppConfig } from '@/types/app-config';
import { getProductsList } from '@/lib/products-data';
import type { Product } from '@/lib/products-data';

const getSecret = () =>
  document.cookie.split('; ').find((c) => c.startsWith('admin_secret='))?.split('=')[1] || '';

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

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

function formatMoney(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200',
  confirmed: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
  scheduled: 'bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-200',
  out_for_visit: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-200',
  optometrist_reached: 'bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-200',
  completed: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200',
  cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
};

/** Flow: Customer books → Admin receives → Assign nearby optometrist → Confirm (customer notified) → Out for visit → Optometrist reached (customer notified) → Test completed */
const BOOKING_JOURNEY: { key: EyeTestBooking['status']; label: string; hint?: string }[] = [
  { key: 'pending', label: 'Booked', hint: 'Customer placed booking' },
  { key: 'confirmed', label: 'Confirmed', hint: 'Optometrist assigned, customer notified' },
  { key: 'scheduled', label: 'Scheduled', hint: 'Date/time confirmed' },
  { key: 'out_for_visit', label: 'Out for visit', hint: 'Optometrist on the way' },
  { key: 'optometrist_reached', label: 'Optometrist reached', hint: 'Customer notified — at location' },
  { key: 'completed', label: 'Completed', hint: 'Test done successfully' },
];
const JOURNEY_ORDER: EyeTestBooking['status'][] = ['pending', 'confirmed', 'scheduled', 'out_for_visit', 'optometrist_reached', 'completed'];

function journeyIndex(s: EyeTestBooking['status']): number {
  const i = JOURNEY_ORDER.indexOf(s);
  return i >= 0 ? i : 0;
}

function statusLabel(s: EyeTestBooking['status']): string {
  const found = BOOKING_JOURNEY.find((st) => st.key === s);
  if (found) return found.label;
  return s === 'cancelled' ? 'Cancelled' : s.replace(/_/g, ' ');
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<EyeTestBooking[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<EyeTestBooking['status']>('pending');

  const productList = getProductsList(config?.products);

  const fetchBookings = () => {
    fetch('/api/bookings', {
      headers: { 'x-admin-secret': getSecret() },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setBookings(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setConfig(d))
      .catch(() => {});
  }, []);

  const updateBookingStatus = (bookingId: string, status: EyeTestBooking['status']) => {
    setUpdatingId(bookingId);
    fetch('/api/bookings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': getSecret() },
      body: JSON.stringify({ id: bookingId, status }),
    })
      .then((r) => {
        if (r.ok) return r.json();
        throw new Error('Update failed');
      })
      .then(({ booking }) => {
        setBookings((prev) => prev.map((b) => (b.id === booking.id ? booking : b)));
        setSelectedStatus(status);
      })
      .catch(() => {})
      .finally(() => setUpdatingId(null));
  };

  if (loading) {
    return (
      <div className="max-w-4xl">
        <p className="text-slate-500 dark:text-slate-400">Loading bookings…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Bookings</h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
        Flow: Customer books → you assign a nearby optometrist and confirm (customer gets &quot;Booking confirmed&quot;) → Out for visit → Optometrist reached (customer gets &quot;Optometrist reached&quot;) → Mark completed after successful test.
      </p>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        {bookings.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            No bookings yet. Bookings will appear here when customers book a home eye test.
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {bookings.map((booking) => (
              <div key={booking.id} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    if (expandedId === booking.id) setExpandedId(null);
                    else {
                      setExpandedId(booking.id);
                      setSelectedStatus(booking.status);
                    }
                  }}
                  className="w-full px-4 py-4 flex flex-wrap items-center gap-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">{booking.id}</span>
                  <span className="text-slate-600 dark:text-slate-400 text-sm">{formatDate(booking.createdAt)}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[booking.status] ?? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                    {statusLabel(booking.status)}
                  </span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{booking.customer.name}</span>
                  <span className="text-slate-500 dark:text-slate-400 text-sm">{booking.customer.mobile}</span>
                  <span className="text-slate-500 dark:text-slate-400 text-sm">{formatSlotDate(booking.preferredDate)}</span>
                  <span className="ml-auto font-semibold text-[#fe5001]">{formatMoney(booking.amount)}</span>
                  <span className="text-slate-400 dark:text-slate-500">
                    <svg className={`w-5 h-5 transition-transform ${expandedId === booking.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </span>
                </button>
                {expandedId === booking.id && (
                  <div className="px-4 pb-4 pt-0 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                    {/* Booking journey & update status */}
                    <div className="pt-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-3">Booking journey</h3>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {BOOKING_JOURNEY.map((step) => {
                          const currentIdx = booking.status === 'cancelled' ? -1 : journeyIndex(booking.status);
                          const isDone = currentIdx > JOURNEY_ORDER.indexOf(step.key);
                          const isCurrent = booking.status !== 'cancelled' && booking.status === step.key;
                          return (
                            <span
                              key={step.key}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
                                isCurrent
                                  ? 'bg-[#fe5001] text-white'
                                  : isDone
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {isDone && (
                                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <polyline points="20 6 9 17 4 12" strokeWidth="2" />
                                </svg>
                              )}
                              {step.label}
                            </span>
                          );
                        })}
                        {booking.status === 'cancelled' && (
                          <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200">
                            Cancelled
                          </span>
                        )}
                      </div>
                      {booking.status !== 'cancelled' && (
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="text-sm text-slate-600 dark:text-slate-400">Move to:</label>
                          <select
                            value={expandedId === booking.id ? selectedStatus : booking.status}
                            onChange={(e) => setSelectedStatus(e.target.value as EyeTestBooking['status'])}
                            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm px-3 py-2"
                          >
                            {BOOKING_JOURNEY.map((step) => (
                              <option key={step.key} value={step.key}>
                                {step.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={updatingId === booking.id || selectedStatus === booking.status}
                            onClick={() => updateBookingStatus(booking.id, selectedStatus)}
                            className="px-4 py-2 rounded-lg bg-[#fe5001] text-white text-sm font-medium hover:bg-[#fe5001]/90 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {updatingId === booking.id ? 'Updating…' : 'Update status'}
                          </button>
                          <button
                            type="button"
                            onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                            disabled={updatingId === booking.id}
                            className="px-4 py-2 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                          >
                            Cancel booking
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 pt-4">
                      <div>
                        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">Customer</h3>
                        <p className="text-slate-900 dark:text-white font-medium">{booking.customer.name}</p>
                        <p className="text-slate-600 dark:text-slate-400 text-sm">{booking.customer.mobile}</p>
                        <p className="text-slate-600 dark:text-slate-400 text-sm">{booking.customer.email}</p>
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">Visit</h3>
                        <p className="text-slate-900 dark:text-white text-sm">{formatSlotDate(booking.preferredDate)}</p>
                        <p className="text-slate-600 dark:text-slate-400 text-sm">{booking.slotLabel ?? booking.preferredSlotId}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">Address</h3>
                      <p className="text-slate-900 dark:text-white text-sm">{booking.address}</p>
                      {booking.deliveryAddress && (
                        <p className="text-slate-600 dark:text-slate-400 text-sm mt-0.5">
                          {[booking.deliveryAddress.flatNo, booking.deliveryAddress.address].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                    {booking.patients && booking.patients.length > 0 && (
                      <div className="mt-4">
                        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">Additional patients</h3>
                        <ul className="space-y-1">
                          {booking.patients.map((p, i) => (
                            <li key={i} className="text-slate-700 dark:text-slate-300 text-sm">
                              {p.name} {p.mobile ? `— ${p.mobile}` : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {booking.tryonFrameIds && booking.tryonFrameIds.length > 0 && (
                      <div className="mt-4">
                        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">Home try-on frames</h3>
                        <ul className="space-y-2">
                          {booking.tryonFrameIds
                            .map((id) => productList.find((p: Product) => p.id === id))
                            .filter((p): p is Product => p != null)
                            .map((product) => (
                              <li key={product.id}>
                                <Link
                                  href={`/products/${product.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium hover:border-[#fe5001]/40"
                                >
                                  <span className="w-10 h-10 rounded bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 shrink-0" />
                                  {product.name}
                                  <span className="text-slate-500 dark:text-slate-400 font-normal">({product.id})</span>
                                </Link>
                              </li>
                            ))}
                          {booking.tryonFrameIds.some((id) => !productList.find((p: Product) => p.id === id)) && (
                            <li className="text-slate-500 dark:text-slate-400 text-xs">
                              IDs not in catalog: {booking.tryonFrameIds.filter((id) => !productList.find((p: Product) => p.id === id)).join(', ')}
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">Amount: {formatMoney(booking.amount)}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
