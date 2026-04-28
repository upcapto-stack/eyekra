'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppScreen } from '@/components/layout/AppScreen';
import { OrderTrackingJourney } from '@/features/account/components/OrderTrackingJourney';
import { getMockUser } from '@/lib/mock-auth';
import type { Order } from '@/types/order';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
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

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  const [order, setOrder] = useState<Order | null | undefined>(undefined);

  useEffect(() => {
    if (!orderId) {
      setOrder(null);
      return;
    }
    const user = getMockUser();
    const email = (user.email ?? '').trim();
    const mobile = (user.mobile ?? '').replace(/\D/g, '');
    const q = email
      ? `email=${encodeURIComponent(email)}&id=${encodeURIComponent(orderId)}`
      : `mobile=${encodeURIComponent(mobile)}&id=${encodeURIComponent(orderId)}`;
    fetch(`/api/orders?${q}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setOrder(data && typeof data === 'object' && data.id ? data : null);
      })
      .catch(() => setOrder(null));
  }, [orderId]);

  if (order === undefined) {
    return (
      <AppScreen title="Order" backHref="/orders">
        <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">Loading…</div>
      </AppScreen>
    );
  }

  if (order === null) {
    return (
      <AppScreen title="Order" backHref="/orders">
        <div className="p-8 text-center text-slate-500 dark:text-slate-400">
          <p>Order not found.</p>
          <Link href="/orders" className="mt-4 inline-block text-[#fe5001] font-medium">Back to orders</Link>
        </div>
      </AppScreen>
    );
  }

  return (
    <AppScreen title={order.id} backHref="/orders">
      <div className="space-y-4">
        <OrderTrackingJourney order={order} />
        <div className="flex items-center justify-between">
          <span className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium">{STATUS_LABELS[order.status] ?? order.status}</span>
          <span className="text-slate-500 dark:text-slate-400 text-xs">{formatDate(order.createdAt)}</span>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-4">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">Delivery address</h3>
          <p className="text-slate-900 dark:text-white font-medium">{order.deliveryAddress.displayName}</p>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-0.5">
            {[order.deliveryAddress.flatNo, order.deliveryAddress.address].filter(Boolean).join(', ')}
          </p>
          {order.deliveryAddress.contact && <p className="text-slate-500 dark:text-slate-500 text-sm mt-0.5">{order.deliveryAddress.contact}</p>}
        </div>
        <div>
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">Items</h3>
          <ul className="space-y-2">
            {order.items.map((item, idx) => (
              <li key={idx} className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <p className="font-medium text-slate-900 dark:text-white">{item.productName}</p>
                <p className="text-slate-600 dark:text-slate-400 text-sm">{item.productPrice} × {item.quantity}</p>
                {item.lensName && <p className="text-slate-500 dark:text-slate-500 text-sm">Lens: {item.lensName} {item.lensPrice != null ? `(+ ${formatMoney(item.lensPrice)})` : ''}</p>}
                <p className="text-[#fe5001] font-semibold text-sm mt-1">{formatMoney(item.lineTotal)}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-1 text-sm">
          <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>Subtotal</span><span>{formatMoney(order.subtotal)}</span></div>
          {order.discount > 0 && <div className="flex justify-between text-emerald-600 dark:text-emerald-400"><span>Discount</span><span>−{formatMoney(order.discount)}</span></div>}
          {order.offerApplied && <p className="text-slate-500 dark:text-slate-500 text-xs">Offer: {order.offerApplied}</p>}
          <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-600"><span>Total</span><span>{formatMoney(order.total)}</span></div>
        </div>
      </div>
    </AppScreen>
  );
}
