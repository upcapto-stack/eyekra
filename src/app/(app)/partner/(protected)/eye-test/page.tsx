'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Input } from '@/shared/components/ui/Input';
import { PartnerShell } from '@/modules/hrms/components/PartnerShell';
import { PartnerEyeTestPrescriptionSheet } from '@/modules/hrms/components/PartnerEyeTestPrescriptionSheet';

function PartnerEyeTestPageInner() {
  const searchParams = useSearchParams();
  const fromQuery = searchParams.get('bookingId')?.trim() ?? '';
  const [bookingId, setBookingId] = useState(fromQuery);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (fromQuery) setBookingId(fromQuery);
  }, [fromQuery]);

  return (
    <PartnerShell title="Eye test session" description="Prescription sheet entry — save each step, then final submit.">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Booking</p>
          <Input placeholder="Booking ID (or open from Bookings / admin link)" value={bookingId} onChange={(e) => setBookingId(e.target.value)} />
        </div>
        <PartnerEyeTestPrescriptionSheet bookingId={bookingId} onStatus={setStatus} />
        {status ? <p className="text-sm text-slate-600 dark:text-slate-300">{status}</p> : null}
      </div>
    </PartnerShell>
  );
}

export default function PartnerEyeTestPage() {
  return (
    <Suspense
      fallback={
        <PartnerShell title="Eye test session" description="Loading…">
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
        </PartnerShell>
      }
    >
      <PartnerEyeTestPageInner />
    </Suspense>
  );
}
