'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const NAV_ITEMS = [
  { href: '/partner', label: 'Dashboard' },
  { href: '/partner/bookings', label: 'Bookings' },
  { href: '/partner/attendance/history', label: 'Attendance' },
  { href: '/partner/equipment/assigned', label: 'Equipment' },
  { href: '/partner/earnings', label: 'Earnings' },
];

export function PartnerShell({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="safe-top sticky top-0 z-20 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide font-semibold text-[#c93f00]">Eyekra Partner</p>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h1>
            {description ? <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p> : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
        <nav className="max-w-6xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                  active
                    ? 'bg-[#fe5001] text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-5 pb-24">{children}</main>
    </div>
  );
}
