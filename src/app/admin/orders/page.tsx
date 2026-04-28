'use client';

import { useEffect, useState } from 'react';
import type { Order } from '@/types/order';

const getSecret = () =>
  document.cookie.split('; ').find((c) => c.startsWith('admin_secret='))?.split('=')[1] || '';

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function formatMoney(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200',
  confirmed: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
  in_lab: 'bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-200',
  qc: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-200',
  ready: 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200',
  shipped: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200',
  delivered: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200',
  cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
};

const ORDER_JOURNEY: { key: Order['status']; label: string }[] = [
  { key: 'pending', label: 'Order placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'in_lab', label: 'In lab' },
  { key: 'qc', label: 'QC' },
  { key: 'ready', label: 'Ready / Labeling' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
];
const JOURNEY_ORDER: Order['status'][] = ['pending', 'confirmed', 'in_lab', 'qc', 'ready', 'shipped', 'delivered'];

function journeyIndex(s: Order['status']): number {
  const i = JOURNEY_ORDER.indexOf(s);
  return i >= 0 ? i : 0;
}

function statusLabel(s: Order['status']): string {
  const found = ORDER_JOURNEY.find((st) => st.key === s);
  if (found) return found.label;
  return s === 'cancelled' ? 'Cancelled' : s.replace(/_/g, ' ');
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<Order['status']>('pending');

  const fetchOrders = () => {
    fetch('/api/orders', {
      headers: { 'x-admin-secret': getSecret() },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setOrders(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    setUpdatingId(orderId);
    fetch('/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': getSecret() },
      body: JSON.stringify({ id: orderId, status }),
    })
      .then((r) => {
        if (r.ok) return r.json();
        throw new Error('Update failed');
      })
      .then(({ order }) => {
        setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
        setSelectedStatus(status);
      })
      .catch(() => {})
      .finally(() => setUpdatingId(null));
  };

  if (loading) {
    return (
      <div className="max-w-4xl">
        <p className="text-slate-500 dark:text-slate-400">Loading orders…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Orders</h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
        All orders placed from checkout. Click a row to see full details — items, lens, prescription, address, payment summary.
      </p>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        {orders.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            No orders yet. Orders will appear here when customers place orders from checkout.
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {orders.map((order) => (
              <div key={order.id} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                  if (expandedId === order.id) setExpandedId(null);
                  else {
                    setExpandedId(order.id);
                    setSelectedStatus(order.status);
                  }
                }}
                  className="w-full px-4 py-4 flex flex-wrap items-center gap-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">{order.id}</span>
                  <span className="text-slate-600 dark:text-slate-400 text-sm">{formatDate(order.createdAt)}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[order.status] ?? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                    {statusLabel(order.status)}
                  </span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{order.customer.name}</span>
                  <span className="text-slate-500 dark:text-slate-400 text-sm">{order.customer.mobile}</span>
                  <span className="ml-auto font-semibold text-[#fe5001]">{formatMoney(order.total)}</span>
                  <span className="text-slate-400 dark:text-slate-500">
                    <svg className={`w-5 h-5 transition-transform ${expandedId === order.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </span>
                </button>
                {expandedId === order.id && (
                  <div className="px-4 pb-4 pt-0 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                    {/* Order journey & update status */}
                    <div className="pt-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-3">Order journey</h3>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {ORDER_JOURNEY.map((step, idx) => {
                          const currentIdx = order.status === 'cancelled' ? -1 : journeyIndex(order.status);
                          const isDone = currentIdx > idx;
                          const isCurrent = order.status !== 'cancelled' && order.status === step.key;
                          return (
                            <span
                              key={step.key}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
                                isCurrent
                                  ? 'bg-[#fe5001] text-white'
                                  : isDone
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {isDone && (
                                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <polyline points="20 6 9 17 4 12" strokeWidth="2" />
                                </svg>
                              )}
                              {step.label}
                            </span>
                          );
                        })}
                        {order.status === 'cancelled' && (
                          <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200">
                            Cancelled
                          </span>
                        )}
                      </div>
                      {order.status !== 'cancelled' && (
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="text-sm text-slate-600 dark:text-slate-400">Move to:</label>
                          <select
                            value={expandedId === order.id ? selectedStatus : order.status}
                            onChange={(e) => setSelectedStatus(e.target.value as Order['status'])}
                            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm px-3 py-2"
                          >
                            {ORDER_JOURNEY.map((step) => (
                              <option key={step.key} value={step.key}>
                                {step.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={updatingId === order.id || selectedStatus === order.status}
                            onClick={() => updateOrderStatus(order.id, selectedStatus)}
                            className="px-4 py-2 rounded-lg bg-[#fe5001] text-white text-sm font-medium hover:bg-[#fe5001]/90 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {updatingId === order.id ? 'Updating…' : 'Update status'}
                          </button>
                          <button
                            type="button"
                            onClick={() => updateOrderStatus(order.id, 'cancelled')}
                            disabled={updatingId === order.id}
                            className="px-4 py-2 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                          >
                            Cancel order
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 pt-4">
                      <div>
                        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">Customer</h3>
                        <p className="text-slate-900 dark:text-white font-medium">{order.customer.name}</p>
                        <p className="text-slate-600 dark:text-slate-400 text-sm">{order.customer.mobile}</p>
                        <p className="text-slate-600 dark:text-slate-400 text-sm">{order.customer.email}</p>
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">Delivery address</h3>
                        <p className="text-slate-900 dark:text-white text-sm">{order.deliveryAddress.displayName}</p>
                        <p className="text-slate-600 dark:text-slate-400 text-sm">
                          {[order.deliveryAddress.flatNo, order.deliveryAddress.address].filter(Boolean).join(', ')}
                        </p>
                        {order.deliveryAddress.contact && <p className="text-slate-500 dark:text-slate-500 text-sm">{order.deliveryAddress.contact}</p>}
                      </div>
                    </div>
                    <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mt-4 mb-2">Items</h3>
                    <ul className="space-y-2">
                      {order.items.map((item, idx) => (
                        <li key={idx} className="flex flex-wrap items-baseline justify-between gap-2 p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">{item.productName}</p>
                            <p className="text-slate-600 dark:text-slate-400 text-sm">{item.productPrice} × {item.quantity}</p>
                            {item.lensName && <p className="text-slate-500 dark:text-slate-500 text-sm">Lens: {item.lensName} {item.lensPrice != null ? `(+ ${formatMoney(item.lensPrice)})` : ''}</p>}
                            {item.prescription && <p className="text-slate-500 dark:text-slate-500 text-xs">Prescription: {item.prescription.type === 'upload' ? 'Uploaded' : 'Entered'}</p>}
                          </div>
                          <span className="font-semibold text-slate-900 dark:text-white">{formatMoney(item.lineTotal)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-1 text-sm">
                      <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>Subtotal</span><span>{formatMoney(order.subtotal)}</span></div>
                      {order.discount > 0 && <div className="flex justify-between text-emerald-600 dark:text-emerald-400"><span>Discount</span><span>−{formatMoney(order.discount)}</span></div>}
                      {order.offerApplied && <p className="text-slate-500 dark:text-slate-500 text-xs">Offer: {order.offerApplied}</p>}
                      <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-2"><span>Total</span><span>{formatMoney(order.total)}</span></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
