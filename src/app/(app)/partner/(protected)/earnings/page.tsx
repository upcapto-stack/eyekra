'use client';

import { useEffect, useState } from 'react';
import { PartnerShell } from '@/features/partner/components/PartnerShell';

export default function PartnerEarningsPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/partner/earnings', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => setData(json))
      .catch(() => setData(null));
  }, []);

  const totals = data?.totals ?? { base: 0, distance: 0, commission: 0, incentive: 0, total: 0 };
  const cards = [
    { label: 'Base', value: totals.base },
    { label: 'Distance', value: totals.distance },
    { label: 'Commission', value: totals.commission },
    { label: 'Incentive', value: totals.incentive },
  ];

  return (
    <PartnerShell title="Earnings" description="Live earning ledger across bookings and conversions.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {cards.map((c) => (
          <article key={c.label} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">{c.label}</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">₹{Number(c.value ?? 0).toFixed(2)}</p>
          </article>
        ))}
      </div>
      <article className="rounded-xl border border-[#fe5001]/30 bg-white dark:bg-slate-800 p-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">Total Earnings</p>
        <p className="text-2xl font-bold text-[#c93f00] mt-1">₹{Number(totals.total ?? 0).toFixed(2)}</p>
      </article>
    </PartnerShell>
  );
}
