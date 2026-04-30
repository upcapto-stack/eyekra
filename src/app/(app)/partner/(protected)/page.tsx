'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PartnerShell } from '@/features/partner/components/PartnerShell';

const quickActions = [
  { href: '/partner/bookings', label: 'Manage bookings', desc: 'Accept, reject and track field statuses' },
  { href: '/partner/attendance/punch-in', label: 'Punch in', desc: 'Start shift with geo + selfie check' },
  { href: '/partner/eye-test', label: 'Run eye test', desc: 'Capture and submit step-by-step test data' },
  { href: '/partner/commerce/order', label: 'Create order', desc: 'Frames + lenses + offers checkout' },
];

export default function PartnerHomePage() {
  const [bookingsCount, setBookingsCount] = useState(0);
  const [completedBookings, setCompletedBookings] = useState(0);
  const [earningsTotal, setEarningsTotal] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    fetch('/api/partner/bookings', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const bookings = Array.isArray(data?.bookings) ? data.bookings : [];
        setBookingsCount(bookings.length);
        setCompletedBookings(bookings.filter((b: { fieldStatus?: string }) => b.fieldStatus === 'COMPLETED').length);
      })
      .catch(() => {
        setBookingsCount(0);
        setCompletedBookings(0);
      });
    fetch('/api/partner/earnings', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setEarningsTotal(Number(data?.totals?.total ?? 0)))
      .catch(() => setEarningsTotal(0));
    fetch('/api/partner/notifications?limit=1', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUnreadNotifications(Number(data?.unreadCount ?? 0)))
      .catch(() => setUnreadNotifications(0));
  }, []);

  const kpis = useMemo(
    () => [
      { label: 'Assigned Bookings', value: String(bookingsCount), sub: 'Active field workload' },
      { label: 'Completed', value: String(completedBookings), sub: 'Finished consultations' },
      { label: 'Unread Alerts', value: String(unreadNotifications), sub: 'Reminders and payouts' },
      { label: 'Revenue', value: `₹${earningsTotal.toFixed(2)}`, sub: 'Live earning ledger' },
    ],
    [bookingsCount, completedBookings, earningsTotal, unreadNotifications]
  );

  return (
    <PartnerShell title="Partner Dashboard" description="Field-force, healthcare and commerce operations in one place.">
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5" aria-label="Partner KPI cards">
        {kpis.map((item) => (
          <article key={item.label} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{item.label}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{item.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.sub}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Quick actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {quickActions.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-[#fe5001]/40 hover:bg-[#fe5001]/5 transition-colors"
            >
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.label}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </PartnerShell>
  );
}
