'use client';

import { useState } from 'react';
import { Input } from '@/shared/components/ui/Input';
import { PartnerShell } from '@/modules/hrms/components/PartnerShell';

export default function PartnerTrackingPage() {
  const [bookingId, setBookingId] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [status, setStatus] = useState('');

  const start = async () => {
    setStatus('Starting...');
    const res = await fetch('/api/partner/tracking/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ bookingId, gpsPath: [{ lat: 0, lng: 0 }] }),
    });
    const data = await res.json().catch(() => ({}));
    setStatus(res.ok ? 'Tracking started (audio auto within 50m)' : data.error || 'Failed');
  };

  const stop = async () => {
    setStatus('Stopping...');
    const res = await fetch('/api/partner/tracking/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ bookingId, audioUrl, gpsPath: [{ lat: 0, lng: 0 }, { lat: 0.001, lng: 0.001 }] }),
    });
    const data = await res.json().catch(() => ({}));
    setStatus(res.ok ? `Tracking stopped (distance ${data.distanceKm ?? 0} km)` : data.error || 'Failed');
  };

  return (
    <PartnerShell title="Journey Tracking" description="GPS path and auto-audio tracking (no manual recording controls).">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
        <Input placeholder="Booking ID" value={bookingId} onChange={(e) => setBookingId(e.target.value)} />
        <Input placeholder="Audio URL (on stop)" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="common-btn common-btn--primary w-full" onClick={start}>
            Start Journey
          </button>
          <button type="button" className="common-btn w-full" onClick={stop}>
            Stop Journey
          </button>
        </div>
        {status ? <p className="text-sm text-slate-600 dark:text-slate-300">{status}</p> : null}
      </div>
    </PartnerShell>
  );
}
