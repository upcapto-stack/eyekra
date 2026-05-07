'use client';

import { useEffect, useState } from 'react';
import { PartnerShell } from '@/modules/hrms/components/PartnerShell';

type WarehouseAssignment = {
  status: 'assigned' | 'coming_soon';
  city: string | null;
  warehouseName: string | null;
  warehouseAddress: string | null;
  assignedAt: string;
};

export default function PartnerPerformancePage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [assignment, setAssignment] = useState<WarehouseAssignment | null>(null);

  useEffect(() => {
    fetch('/api/partner/performance', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setMetrics(data?.metrics ?? null))
      .catch(() => setMetrics(null));

    fetch('/api/partner/warehouse', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setAssignment(data?.assignment ?? null))
      .catch(() => setAssignment(null));
  }, []);

  const cards = [
    { label: 'Bookings', value: metrics?.bookingsCount ?? 0 },
    { label: 'Completed', value: metrics?.completedBookings ?? 0 },
    { label: 'Conversion %', value: metrics?.conversionRate ?? 0 },
    { label: 'Avg Order Value', value: metrics?.avgOrderValue ?? 0 },
  ];

  return (
    <PartnerShell title="Performance" description="Bookings efficiency, conversion and value indicators.">
      {assignment?.status !== 'assigned' ? (
        <section className="rounded-3xl border border-[#fe5001]/30 bg-gradient-to-br from-[#fff5ef] via-[#fff1e9] to-[#ffe4d4] p-4 shadow-[0_14px_30px_rgba(254,80,1,0.14)] overflow-hidden relative">
          <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[#fe5001]/20 blur-2xl animate-pulse" />
          <div className="absolute -bottom-8 -left-10 h-24 w-24 rounded-full bg-[#fd8b4d]/20 blur-2xl animate-pulse" />
          <p className="inline-flex items-center rounded-full bg-white/75 border border-[#fe5001]/25 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#c6460b] mb-3">
            Performance access
          </p>
          <h2 className="text-xl font-bold text-[#8b2f07]">Coming soon in your city</h2>
          <p className="text-sm text-[#9f4a21] mt-2 max-w-md">
            We are expanding warehouse operations for your location. Once city coverage is enabled, your performance metrics will appear here automatically.
          </p>
          <div className="mt-4 flex items-center gap-2 text-sm text-[#a5552d]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#fe5001] animate-ping" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#fe5001]/75 animate-pulse" />
            <span className="font-semibold">City rollout in progress</span>
          </div>
          {assignment?.city && (
            <p className="text-xs text-[#9f4a21] mt-3">
              Detected city token: <span className="font-semibold">{assignment.city}</span>
            </p>
          )}
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-emerald-200/70 bg-emerald-50/80 dark:bg-emerald-900/20 p-3 mb-3">
            <p className="text-xs uppercase tracking-wide font-semibold text-emerald-700 dark:text-emerald-300">Assigned warehouse</p>
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100 mt-1">{assignment.warehouseName}</p>
            {assignment.warehouseAddress && (
              <p className="text-xs text-emerald-700/90 dark:text-emerald-300 mt-1">{assignment.warehouseAddress}</p>
            )}
          </section>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((card) => (
          <article key={card.label} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">{card.label}</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">{card.value}</p>
          </article>
        ))}
      </div>
        </>
      )}
    </PartnerShell>
  );
}
