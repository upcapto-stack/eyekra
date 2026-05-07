'use client';

import { useState } from 'react';
import { Input } from '@/shared/components/ui/Input';
import { PartnerShell } from '@/modules/hrms/components/PartnerShell';

export default function PartnerDamageReportPage() {
  const [equipmentId, setEquipmentId] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [note, setNote] = useState('');
  const [severity, setSeverity] = useState('MEDIUM');
  const [status, setStatus] = useState('');

  const submit = async () => {
    setStatus('Submitting...');
    const res = await fetch('/api/partner/equipment/report-damage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ equipmentId, photoUrl, note, severity }),
    });
    const data = await res.json().catch(() => ({}));
    setStatus(res.ok ? 'Damage report saved.' : data.error || 'Failed');
  };

  return (
    <PartnerShell title="Damage Report" description="Report item damage with photo and notes.">
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 space-y-3">
        <Input placeholder="Equipment ID" value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)} />
        <Input placeholder="Damage Photo URL" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} />
        <Input placeholder="Severity (LOW/MEDIUM/HIGH)" value={severity} onChange={(e) => setSeverity(e.target.value.toUpperCase())} />
        <textarea
          className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-sm"
          placeholder="Damage note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
        />
        <button type="button" className="common-btn common-btn--primary w-full" onClick={submit}>
          Submit Damage Report
        </button>
        {status ? <p className="text-sm text-slate-600 dark:text-slate-300">{status}</p> : null}
      </div>
    </PartnerShell>
  );
}
