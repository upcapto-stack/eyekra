'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/shared/components/ui/Input';
import { PartnerShell } from '@/modules/hrms/components/PartnerShell';

export default function PartnerFramesPage() {
  const [query, setQuery] = useState('');
  const [frames, setFrames] = useState<any[]>([]);

  useEffect(() => {
    const url = query ? `/api/partner/frames?q=${encodeURIComponent(query)}` : '/api/partner/frames';
    fetch(url, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setFrames(Array.isArray(data?.frames) ? data.frames : []))
      .catch(() => setFrames([]));
  }, [query]);

  return (
    <PartnerShell title="Frames Catalogue" description="Browse physical + full frames with filters.">
      <div className="mb-3">
        <Input placeholder="Search frames..." value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {frames.map((f, i) => (
          <article key={`${f.id ?? i}`} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{f.name ?? 'Frame'}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{f.price ?? '—'}</p>
          </article>
        ))}
      </div>
    </PartnerShell>
  );
}
