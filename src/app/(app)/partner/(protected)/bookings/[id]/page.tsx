'use client';

import { useEffect, useState } from 'react';
import { PartnerShell } from '@/features/partner/components/PartnerShell';

const FLOW = ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'OTP_VERIFIED', 'SESSION_ACTIVE', 'COMPLETED'] as const;

export default function PartnerBookingDetailPage({ params }: { params: { id: string } }) {
  const [booking, setBooking] = useState<any>(null);
  const [status, setStatus] = useState('');

  const refresh = () => {
    fetch(`/api/partner/bookings/${params.id}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setBooking(data?.booking ?? null))
      .catch(() => setBooking(null));
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const progress = async (nextStatus: string) => {
    setStatus('Updating...');
    const res = await fetch(`/api/partner/bookings/${params.id}/status-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status: nextStatus }),
    });
    const data = await res.json().catch(() => ({}));
    setStatus(res.ok ? `${nextStatus} updated` : data.error || 'Failed');
    refresh();
  };

  if (!booking) {
    return (
      <PartnerShell title="Booking Detail">
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading booking...</p>
      </PartnerShell>
    );
  }

  return (
    <PartnerShell title={`Booking ${booking.id}`} description="Status progression with timeline events.">
      {status ? <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">{status}</p> : null}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 mb-4">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{booking.customerName}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{booking.address}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Current status: {booking.fieldStatus}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
        {FLOW.map((s) => (
          <button key={s} type="button" className="common-btn" onClick={() => progress(s)}>
            {s}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Events</h3>
        <ul className="space-y-2">
          {(booking.events ?? []).map((e: any) => (
            <li key={e.id} className="text-xs text-slate-600 dark:text-slate-300 border-l-2 border-[#fe5001]/40 pl-3">
              {e.toStatus} · {new Date(e.createdAt).toLocaleString()}
            </li>
          ))}
        </ul>
      </div>
    </PartnerShell>
  );
}
