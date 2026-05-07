'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppScreen } from '@/shared/components/layout/AppScreen';
import { BookingTrackingJourney } from '@/modules/crm/components/BookingTrackingJourney';
import { getMockUser } from '@/shared/utils/mock-auth';
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

export default function BookingDetailPage() {
  const params = useParams();
  const bookingId = params.id as string;
  const [booking, setBooking] = useState<EyeTestBooking | null | undefined>(undefined);

  useEffect(() => {
    if (!bookingId) {
      setBooking(null);
      return;
    }
    const user = getMockUser();
    const email = (user.email ?? '').trim();
    const mobile = (user.mobile ?? '').replace(/\D/g, '');
    const q = email
      ? `email=${encodeURIComponent(email)}&id=${encodeURIComponent(bookingId)}`
      : `mobile=${encodeURIComponent(mobile)}&id=${encodeURIComponent(bookingId)}`;
    fetch(`/api/bookings?${q}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setBooking(data && typeof data === 'object' && data.id ? data : null);
      })
      .catch(() => setBooking(null));
  }, [bookingId]);

  if (booking === undefined) {
    return (
      <AppScreen title="Booking" backHref="/bookings">
        <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">Loading…</div>
      </AppScreen>
    );
  }

  if (booking === null) {
    return (
      <AppScreen title="Booking" backHref="/bookings">
        <div className="p-8 text-center text-slate-500 dark:text-slate-400">
          <p>Booking not found.</p>
          <Link href="/bookings" className="mt-4 inline-block text-[#fe5001] font-medium">Back to bookings</Link>
        </div>
      </AppScreen>
    );
  }

  return (
    <AppScreen title={booking.id} backHref="/bookings">
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Your booking reference</p>
          <p className="font-mono text-sm text-slate-900 dark:text-white break-all mt-0.5">{booking.id}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Eyekra partners and support use this same ID in their tools so your visit, eye test, and admin records stay in sync.
          </p>
        </div>
        <BookingTrackingJourney booking={booking} />
        <div className="flex items-center justify-between">
          <span className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium">
            {STATUS_LABELS[booking.status] ?? booking.status}
          </span>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-4">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">Visit</h3>
          <p className="text-slate-900 dark:text-white text-sm">{formatSlotDate(booking.preferredDate)}</p>
          <p className="text-slate-600 dark:text-slate-400 text-sm">{booking.slotLabel ?? booking.preferredSlotId}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-4">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">Address</h3>
          <p className="text-slate-900 dark:text-white text-sm">{booking.address}</p>
          {booking.deliveryAddress && (
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-0.5">
              {[booking.deliveryAddress.flatNo, booking.deliveryAddress.address].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
        <p className="text-[#fe5001] font-semibold">₹{booking.amount.toLocaleString('en-IN')}</p>
      </div>
    </AppScreen>
  );
}
