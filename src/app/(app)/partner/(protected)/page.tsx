'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Bell, ClipboardCheck, Eye, IndianRupee, ScanEye, Truck, Zap } from 'lucide-react';
import { PartnerShell } from '@/modules/hrms/components/PartnerShell';

const DAILY_QUOTES = [
  'Every visit you complete improves someone’s vision and confidence.',
  'Small consistent actions create big wins by end of day.',
  'Stay sharp, stay kind, and your performance will follow.',
  'Great service is your superpower - use it in every booking.',
  'Discipline in the field turns into growth in earnings.',
  'One more focused task can change your entire day.',
  'You are not just delivering service, you are building trust.',
];

const quickActions = [
  { href: '/partner/bookings', label: 'Manage bookings', desc: 'Accept, reject and track field statuses', badge: 'Ops', icon: ClipboardCheck },
  { href: '/partner/attendance/punch-in', label: 'Punch in', desc: 'Start shift with geo + selfie check', badge: 'Shift', icon: Truck },
  { href: '/partner/eye-test', label: 'Run eye test', desc: 'Capture and submit step-by-step test data', badge: 'Care', icon: ScanEye },
  { href: '/partner/commerce/order', label: 'Create order', desc: 'Frames + lenses + offers checkout', badge: 'Sales', icon: Eye },
];

export default function PartnerHomePage() {
  const [partnerName, setPartnerName] = useState('Partner');
  const [bookingsCount, setBookingsCount] = useState(0);
  const [completedBookings, setCompletedBookings] = useState(0);
  const [earningsTotal, setEarningsTotal] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const rawName = String(data?.user?.name ?? '').trim();
        if (!rawName) return;
        setPartnerName(rawName);
      })
      .catch(() => undefined);
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
    fetch('/api/partner/attendance/history?limit=1', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const latest = Array.isArray(data?.records) ? data.records[0] : null;
        setIsOnline(Boolean(latest && latest.shiftState === 'READY' && !latest.punchOutAt));
      })
      .catch(() => setIsOnline(false));
  }, []);

  const greetingName = useMemo(() => partnerName.split(' ')[0] || partnerName, [partnerName]);
  const todayQuote = useMemo(() => {
    const now = new Date();
    const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    return DAILY_QUOTES[seed % DAILY_QUOTES.length];
  }, []);

  const level = Math.max(1, Math.floor(completedBookings / 5) + 1);
  const xpInCycle = completedBookings % 5;
  const xpPercent = Math.min(100, (xpInCycle / 5) * 100);
  const xpRemaining = xpInCycle === 0 ? 5 : 5 - xpInCycle;

  const attendanceQuickAction = isOnline
    ? { href: '/partner/attendance/punch-out', label: 'Punch out', desc: 'End shift and go offline', badge: 'Shift', icon: Truck }
    : { href: '/partner/attendance/punch-in', label: 'Punch in', desc: 'Start shift with geo + selfie check', badge: 'Shift', icon: Truck };
  const dynamicQuickActions = [quickActions[0], attendanceQuickAction, quickActions[2], quickActions[3]];

  const kpis = useMemo(
    () => [
      { label: 'Assigned', value: String(bookingsCount), sub: 'Active field workload', icon: ClipboardCheck },
      { label: 'Completed', value: String(completedBookings), sub: 'Finished visits', icon: Eye },
      { label: 'Alerts', value: String(unreadNotifications), sub: 'Unread notifications', icon: Bell },
      { label: 'Earnings', value: `₹${earningsTotal.toFixed(0)}`, sub: 'Today performance', icon: IndianRupee },
    ],
    [bookingsCount, completedBookings, earningsTotal, unreadNotifications]
  );

  return (
    <PartnerShell
      title={`Hello, ${greetingName}`}
      description={todayQuote}
      actions={
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{isOnline ? 'Online' : 'Offline'}</span>
          <span
            className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
              isOnline ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
            }`}
            aria-label={`Partner is ${isOnline ? 'online' : 'offline'}`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                isOnline ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </span>
        </div>
      }
    >
      <section className="mb-5 rounded-3xl p-[1px] bg-gradient-to-br from-[#fe5001] via-[#ff7b3d] to-[#ffb286] shadow-[0_24px_50px_rgba(254,80,1,0.25)]">
        <div className="rounded-3xl bg-gradient-to-br from-[#fe5001] via-[#ff6a1f] to-[#ff8a3d] px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">Level {level}</p>
              <p className="text-[11px] text-orange-50/90 mt-0.5">
                {xpRemaining} visit{xpRemaining === 1 ? '' : 's'} to level {level + 1}
              </p>
            </div>
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white border border-white/30 shadow-[0_10px_22px_rgba(0,0,0,0.12)]">
              <Zap className="h-4 w-4" />
            </span>
          </div>

          <div className="mt-4 rounded-2xl border border-white/30 bg-white/12 backdrop-blur-sm p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] uppercase tracking-wide text-orange-50/90">Level Progress</p>
              <p className="text-xs font-semibold text-white">Lv. {level}</p>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-white/20 overflow-hidden">
              <div className="h-full rounded-full bg-white" style={{ width: `${xpPercent}%` }} />
            </div>
            <p className="text-[11px] text-orange-50/95 mt-2">
              {xpRemaining} more completion{xpRemaining === 1 ? '' : 's'} to next level
            </p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-white/30 bg-white/12 backdrop-blur-sm p-3">
              <p className="text-[11px] uppercase tracking-wide text-orange-50/90">Streak</p>
              <p className="text-sm font-semibold text-white mt-1">{Math.max(1, completedBookings)} day streak</p>
            </div>
            <div className="rounded-2xl border border-white/30 bg-white/12 backdrop-blur-sm p-3">
              <p className="text-[11px] uppercase tracking-wide text-orange-50/90">Today Target</p>
              <p className="text-sm font-semibold text-white mt-1">
                {Math.min(completedBookings, 5)}/5 visits
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <span className="inline-flex min-h-[2.25rem] items-center justify-center rounded-full border border-white/35 bg-white/12 px-2.5 py-1 text-center text-[11px] font-semibold leading-tight text-white">
              {isOnline ? 'Online Warrior' : 'Go Online'}
            </span>
            <span className="inline-flex min-h-[2.25rem] items-center justify-center rounded-full border border-white/35 bg-white/12 px-2.5 py-1 text-center text-[11px] font-semibold leading-tight text-white">
              {bookingsCount > 0 ? 'Queue Keeper' : 'No Queue'}
            </span>
            <span className="inline-flex min-h-[2.25rem] items-center justify-center rounded-full border border-white/35 bg-white/12 px-2.5 py-1 text-center text-[11px] font-semibold leading-tight text-white">
              {earningsTotal > 0 ? 'Revenue Runner' : 'First Sale Pending'}
            </span>
            <span className="inline-flex min-h-[2.25rem] items-center justify-center rounded-full border border-white/35 bg-white/12 px-2.5 py-1 text-center text-[11px] font-semibold leading-tight text-white">
              {unreadNotifications === 0 ? 'Alert Zero' : `${unreadNotifications} Alerts`}
            </span>
          </div>

          <div className="mt-3 rounded-2xl border border-white/30 bg-white/12 backdrop-blur-sm p-3">
            <p className="text-[11px] uppercase tracking-wide text-orange-50/90">Current Status</p>
            <p className="text-sm font-semibold text-white mt-1">
              {isOnline ? 'Live and ready for next booking' : 'Offline - punch in to continue your streak'}
            </p>
            <p className="text-[11px] text-orange-50/95 mt-1">Queue: {bookingsCount} | Earnings: ₹{earningsTotal.toFixed(0)}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 mb-5" aria-label="Partner KPI cards">
        {kpis.map((item) => (
          <article
            key={item.label}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-[0_10px_22px_rgba(15,23,42,0.08)]"
          >
            <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <item.icon className="h-4 w-4" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{item.label}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{item.value}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{item.sub}</p>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-[0_10px_22px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Quick actions</h2>
          <Link href="/partner/notifications" className="text-xs font-semibold text-[#fe5001]">
            View alerts
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {dynamicQuickActions.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 p-3.5 transition-all hover:border-[#fe5001]/40 hover:bg-[#fe5001]/5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                    <item.icon className="h-4 w-4" />
                  </span>
                  <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.desc}</p>
                  </div>
                </div>
                <span className="rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-1 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                  {item.badge}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </PartnerShell>
  );
}
