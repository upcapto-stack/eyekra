'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PartnerShell } from '@/modules/hrms/components/PartnerShell';

type Booking = {
  id: string;
  customerName: string;
  preferredDate: string;
  amount: number;
  fieldStatus: string;
  assignedPartnerId?: string | null;
};

export default function PartnerBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [status, setStatus] = useState('');

  const refresh = () => {
    fetch('/api/partner/bookings', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setBookings(Array.isArray(data?.bookings) ? data.bookings : []))
      .catch(() => setBookings([]));
  };

  useEffect(() => {
    refresh();
  }, []);

  const takeAction = async (id: string, action: 'accept' | 'reject') => {
    setStatus('Updating...');
    const res = await fetch(`/api/partner/bookings/${id}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: action === 'reject' ? JSON.stringify({ reason: 'Partner unavailable for slot' }) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    setStatus(res.ok ? `Booking ${action}ed` : data.error || 'Action failed');
    refresh();
  };

  return (
    <PartnerShell title="Bookings" description="Assigned and unassigned field jobs with lifecycle control.">
      {status ? <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">{status}</p> : null}
      <div className="space-y-3">
        {bookings.map((b) => (
          <article key={b.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{b.customerName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{b.id}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {b.preferredDate} · ₹{b.amount}
                </p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-[#fe5001]/10 text-[#c93f00]">{b.fieldStatus}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/partner/bookings/${b.id}`} className="common-btn">
                Open
              </Link>
              <Link href={`/partner/eye-test?bookingId=${encodeURIComponent(b.id)}`} className="common-btn common-btn--primary">
                Eye test
              </Link>
              {!b.assignedPartnerId ? (
                <button type="button" className="common-btn common-btn--primary" onClick={() => takeAction(b.id, 'accept')}>
                  Accept
                </button>
              ) : null}
              {b.fieldStatus === 'ASSIGNED' || b.fieldStatus === 'ACCEPTED' ? (
                <button type="button" className="common-btn" onClick={() => takeAction(b.id, 'reject')}>
                  Reject
                </button>
              ) : null}
            </div>
          </article>
        ))}
        {bookings.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No bookings available.</p>
        ) : null}
      </div>
    </PartnerShell>
  );
}
