'use client';

import { useEffect, useState } from 'react';
import { PartnerShell } from '@/features/partner/components/PartnerShell';

export default function PartnerOffersPage() {
  const [offers, setOffers] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/partner/offers', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setOffers(Array.isArray(data?.offers) ? data.offers : []))
      .catch(() => setOffers([]));
  }, []);

  return (
    <PartnerShell title="Offers Engine" description="Available offer rules and clubbing references.">
      <div className="space-y-3">
        {offers.map((offer, idx) => (
          <article key={offer?.id ?? idx} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{offer?.name ?? offer?.id ?? `Offer ${idx + 1}`}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{offer?.description ?? 'No description'}</p>
          </article>
        ))}
        {offers.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">No offers available.</p> : null}
      </div>
    </PartnerShell>
  );
}
