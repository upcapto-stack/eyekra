'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PartnerShell } from '@/modules/hrms/components/PartnerShell';

type AssignedItem = {
  assignmentId: string;
  equipmentId: string;
  name: string;
  sku: string;
  category: string | null;
  assignedAt: string;
};

export default function PartnerEquipmentAssignedPage() {
  const [items, setItems] = useState<AssignedItem[]>([]);

  useEffect(() => {
    fetch('/api/partner/equipment/assigned', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setItems(Array.isArray(data?.items) ? data.items : []))
      .catch(() => setItems([]));
  }, []);

  return (
    <PartnerShell
      title="Assigned Equipment"
      description="Daily checklist and active allocations."
      actions={
        <Link href="/partner/equipment/damage-report" className="common-btn">
          Report damage
        </Link>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((item) => (
          <article key={item.assignmentId} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">SKU: {item.sku}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Assigned: {new Date(item.assignedAt).toLocaleString()}</p>
          </article>
        ))}
        {items.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No active equipment assignments.</p>
        ) : null}
      </div>
    </PartnerShell>
  );
}
