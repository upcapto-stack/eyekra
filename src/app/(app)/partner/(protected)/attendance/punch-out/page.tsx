'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { PartnerShell } from '@/features/partner/components/PartnerShell';

export default function PartnerPunchOutPage() {
  const [selfieUrl, setSelfieUrl] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [status, setStatus] = useState('');

  const submit = async () => {
    setStatus('Submitting...');
    const res = await fetch('/api/partner/attendance/punch-out', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        selfieUrl,
        liveness: true,
        geo: { lat: Number(lat), lng: Number(lng) },
      }),
    });
    const data = await res.json().catch(() => ({}));
    setStatus(res.ok ? 'Punch-out successful' : data.error || 'Punch-out failed');
  };

  return (
    <PartnerShell title="Punch Out" description="Complete shift closure with return checklist and liveness.">
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 space-y-3">
        <Input placeholder="Selfie URL" value={selfieUrl} onChange={(e) => setSelfieUrl(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Latitude" value={lat} onChange={(e) => setLat(e.target.value)} />
          <Input placeholder="Longitude" value={lng} onChange={(e) => setLng(e.target.value)} />
        </div>
        <button type="button" className="common-btn common-btn--primary w-full" onClick={submit}>
          Punch Out
        </button>
        {status ? <p className="text-sm text-slate-600 dark:text-slate-300">{status}</p> : null}
      </div>
    </PartnerShell>
  );
}
