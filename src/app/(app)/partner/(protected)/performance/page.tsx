'use client';

import { useEffect, useState } from 'react';
import { PartnerShell } from '@/features/partner/components/PartnerShell';

export default function PartnerPerformancePage() {
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    fetch('/api/partner/performance', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setMetrics(data?.metrics ?? null))
      .catch(() => setMetrics(null));
  }, []);

  const cards = [
    { label: 'Bookings', value: metrics?.bookingsCount ?? 0 },
    { label: 'Completed', value: metrics?.completedBookings ?? 0 },
    { label: 'Conversion %', value: metrics?.conversionRate ?? 0 },
    { label: 'Avg Order Value', value: metrics?.avgOrderValue ?? 0 },
  ];

  return (
    <PartnerShell title="Performance" description="Bookings efficiency, conversion and value indicators.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((card) => (
          <article key={card.label} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">{card.label}</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">{card.value}</p>
          </article>
        ))}
      </div>
    </PartnerShell>
  );
}
