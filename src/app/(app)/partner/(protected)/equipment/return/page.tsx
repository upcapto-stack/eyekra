'use client';

import { useState } from 'react';
import { Input } from '@/shared/components/ui/Input';
import { PartnerShell } from '@/modules/hrms/components/PartnerShell';

export default function PartnerEquipmentReturnPage() {
  const [equipmentId, setEquipmentId] = useState('');
  const [checklist, setChecklist] = useState('');
  const [status, setStatus] = useState('');

  const submit = async () => {
    setStatus('Submitting...');
    const res = await fetch('/api/partner/equipment/return', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        equipmentId,
        checklist: checklist
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setStatus(res.ok ? 'Equipment returned.' : data.error || 'Failed');
  };

  return (
    <PartnerShell title="Return Equipment" description="Submit return checklist at shift closure.">
      <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 space-y-3">
        <Input placeholder="Equipment ID" value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)} />
        <Input placeholder="Checklist (comma separated)" value={checklist} onChange={(e) => setChecklist(e.target.value)} />
        <button type="button" className="common-btn common-btn--primary w-full" onClick={submit}>
          Submit Return
        </button>
        {status ? <p className="text-sm text-slate-600 dark:text-slate-300">{status}</p> : null}
      </div>
    </PartnerShell>
  );
}
