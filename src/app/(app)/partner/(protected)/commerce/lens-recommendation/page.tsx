'use client';

import { useState } from 'react';
import { Input } from '@/shared/components/ui/Input';
import { PartnerShell } from '@/modules/hrms/components/PartnerShell';

export default function PartnerLensRecommendationPage() {
  const [spherical, setSpherical] = useState('');
  const [cylindrical, setCylindrical] = useState('');
  const [result, setResult] = useState<{ recommendationType?: string; lenses?: any[] } | null>(null);

  const recommend = async () => {
    const params = new URLSearchParams({
      spherical: spherical || '0',
      cylindrical: cylindrical || '0',
    });
    const res = await fetch(`/api/partner/lenses/recommendation?${params.toString()}`, { credentials: 'include' });
    const data = await res.json().catch(() => null);
    setResult(data);
  };

  return (
    <PartnerShell title="Lens Recommendation" description="Prescription-based lens suggestions.">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Spherical" value={spherical} onChange={(e) => setSpherical(e.target.value)} />
          <Input placeholder="Cylindrical" value={cylindrical} onChange={(e) => setCylindrical(e.target.value)} />
        </div>
        <button type="button" className="common-btn common-btn--primary w-full" onClick={recommend}>
          Get Recommendation
        </button>
        {result?.recommendationType ? (
          <div className="text-sm text-slate-700 dark:text-slate-200">
            <p>
              Recommendation Type: <span className="font-semibold">{result.recommendationType}</span>
            </p>
            <ul className="mt-2 list-disc pl-5 text-xs">
              {(result.lenses ?? []).map((lens, idx) => (
                <li key={idx}>{lens?.name ?? lens?.id ?? 'Lens'}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </PartnerShell>
  );
}
