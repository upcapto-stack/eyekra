'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { PartnerShell } from '@/features/partner/components/PartnerShell';

export default function PartnerPunchInPage() {
  const [deviceId, setDeviceId] = useState('');
  const [selfieUrl, setSelfieUrl] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [status, setStatus] = useState('');

  const submit = async () => {
    setStatus('Submitting...');
    const res = await fetch('/api/partner/attendance/punch-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        deviceId,
        selfieUrl,
        liveness: true,
        geo: { lat: Number(lat), lng: Number(lng) },
      }),
    });
    const data = await res.json().catch(() => ({}));
    setStatus(res.ok ? 'Punch-in successful' : data.error || 'Punch-in failed');
  };

  return (
    <PartnerShell title="Punch In" description="Validate geofence, selfie and device binding before shift start.">
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 space-y-3">
        <Input placeholder="Device ID" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} />
        <Input placeholder="Selfie URL" value={selfieUrl} onChange={(e) => setSelfieUrl(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Latitude" value={lat} onChange={(e) => setLat(e.target.value)} />
          <Input placeholder="Longitude" value={lng} onChange={(e) => setLng(e.target.value)} />
        </div>
        <button type="button" className="common-btn common-btn--primary w-full" onClick={submit}>
          Punch In
        </button>
        {status ? <p className="text-sm text-slate-600 dark:text-slate-300">{status}</p> : null}
      </div>
    </PartnerShell>
  );
}
