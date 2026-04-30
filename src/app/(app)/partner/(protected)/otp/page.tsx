'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { PartnerShell } from '@/features/partner/components/PartnerShell';

export default function PartnerOtpPage() {
  const [bookingId, setBookingId] = useState('');
  const [otp, setOtp] = useState('');
  const [status, setStatus] = useState('');

  const verify = async () => {
    setStatus('Verifying...');
    const res = await fetch(`/api/partner/bookings/${bookingId}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ otp }),
    });
    const data = await res.json().catch(() => ({}));
    setStatus(res.ok ? 'OTP verified, session can start.' : data.error || 'Failed');
  };

  return (
    <PartnerShell title="OTP Verification" description="Verify customer OTP before session activation.">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
        <Input placeholder="Booking ID" value={bookingId} onChange={(e) => setBookingId(e.target.value)} />
        <Input placeholder="6 digit OTP" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} />
        <button type="button" className="common-btn common-btn--primary w-full" onClick={verify}>
          Verify OTP
        </button>
        {status ? <p className="text-sm text-slate-600 dark:text-slate-300">{status}</p> : null}
      </div>
    </PartnerShell>
  );
}
