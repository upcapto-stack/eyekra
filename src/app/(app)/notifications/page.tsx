'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BottomNav } from '@/shared/components/layout/BottomNav';

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return iso;
  const sec = Math.max(1, Math.floor((Date.now() - d) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = () => {
    fetch('/api/notifications?limit=100', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { items: [], unreadCount: 0 }))
      .then((data) => {
        setItems(Array.isArray(data?.items) ? data.items : []);
        setUnreadCount(Number(data?.unreadCount) || 0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAllRead = () => {
    fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ all: true }),
    }).then(() => fetchNotifications());
  };

  const hasUnread = useMemo(() => unreadCount > 0, [unreadCount]);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-900 pb-20">
      <header className="safe-top sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-3 py-2.5 flex items-center gap-3">
        <Link href="/account" className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="flex-1 text-lg font-bold text-slate-900 dark:text-slate-100">Notifications</h1>
        <button
          type="button"
          onClick={markAllRead}
          disabled={!hasUnread}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#fe5001] text-white disabled:opacity-50"
        >
          Mark all read
        </button>
      </header>

      <main className="flex-1 px-3 py-4 max-w-md w-full mx-auto">
        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading notifications...</p>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-sm text-slate-500 dark:text-slate-400">
            No notifications yet.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((n) => (
              <div key={n.id} className={`rounded-xl border p-3 ${n.isRead ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800' : 'border-[#fe5001]/30 bg-[#fe5001]/5 dark:bg-[#fe5001]/10'}`}>
                <div className="flex items-start gap-2">
                  {!n.isRead && <span className="mt-1.5 w-2 h-2 rounded-full bg-[#fe5001]" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{n.title}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{n.message}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
