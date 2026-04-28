'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppScreen } from '@/components/layout/AppScreen';
import { getMockUser } from '@/lib/mock-auth';
import type { Order } from '@/types/order';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { dateStyle: 'medium' });
  } catch {
    return iso;
  }
}

function formatMoney(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_lab: 'In lab',
  qc: 'QC',
  ready: 'Ready',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export function OrdersView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getMockUser();
    const email = (user.email ?? '').trim();
    const mobile = (user.mobile ?? '').replace(/\D/g, '');
    if (!email && !mobile) {
      setLoading(false);
      return;
    }
    const q = email ? `email=${encodeURIComponent(email)}` : `mobile=${encodeURIComponent(mobile)}`;
    fetch(`/api/orders?${q}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setOrders(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AppScreen title="My orders" backHref="/account">
        <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">Loading orders…</div>
      </AppScreen>
    );
  }

  if (orders.length === 0) {
    return (
      <AppScreen title="My orders" backHref="/account">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-8 text-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-3">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <p className="text-slate-600 dark:text-slate-400 text-sm">No orders yet</p>
          <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">Your order history will appear here</p>
          <Link href="/products" className="mt-4 w-full flex justify-center items-center common-btn common-btn--primary">
            Browse frames
          </Link>
        </div>
      </AppScreen>
    );
  }

  return (
    <AppScreen title="My orders" backHref="/account">
      <div className="space-y-3 pb-6">
        {orders.map((order) => (
          <div
            key={order.id}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex gap-3"
          >
            <Link
              href={`/orders/${order.id}`}
              className="flex-1 min-w-0 hover:opacity-90 transition-opacity"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-semibold text-slate-900 dark:text-white text-sm">{order.id}</span>
                <span className="text-[#fe5001] font-semibold text-sm">{formatMoney(order.total)}</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">{formatDate(order.createdAt)}</p>
              <p className="text-slate-600 dark:text-slate-400 text-xs mt-0.5">{STATUS_LABELS[order.status] ?? order.status}</p>
              <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">
                {order.items.length} item{order.items.length !== 1 ? 's' : ''}
              </p>
            </Link>
            <Link
              href={`/orders/${order.id}`}
              className="shrink-0 self-center common-btn common-btn--primary text-sm py-2 px-4 whitespace-nowrap flex items-center justify-center text-center min-w-[7rem]"
            >
              {order.status === 'delivered' ? 'View order' : 'Track order'}
            </Link>
          </div>
        ))}
      </div>
    </AppScreen>
  );
}
