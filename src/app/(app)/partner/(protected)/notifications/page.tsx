'use client';

import { useEffect, useState } from 'react';
import { PartnerShell } from '@/features/partner/components/PartnerShell';

export default function PartnerNotificationsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    fetch('/api/partner/notifications', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setRows(Array.isArray(data?.notifications) ? data.notifications : []);
        setUnread(Number(data?.unreadCount ?? 0));
      })
      .catch(() => {
        setRows([]);
        setUnread(0);
      });
  }, []);

  return (
    <PartnerShell title="Notifications" description={`Unread: ${unread}`}>
      <div className="space-y-3">
        {rows.map((n) => (
          <article key={n.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{n.title}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{n.message}</p>
          </article>
        ))}
        {rows.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">No notifications yet.</p> : null}
      </div>
    </PartnerShell>
  );
}
