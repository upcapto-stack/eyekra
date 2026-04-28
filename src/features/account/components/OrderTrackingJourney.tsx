'use client';

import type { Order } from '@/types/order';

const STEPS: { key: Order['status']; label: string; shortLabel: string }[] = [
  { key: 'pending', label: 'Order placed', shortLabel: 'Placed' },
  { key: 'confirmed', label: 'Order confirmed', shortLabel: 'Confirmed' },
  { key: 'in_lab', label: 'In lab', shortLabel: 'Lab' },
  { key: 'qc', label: 'QC', shortLabel: 'QC' },
  { key: 'ready', label: 'Ready for dispatch', shortLabel: 'Ready' },
  { key: 'shipped', label: 'Shipped', shortLabel: 'Shipped' },
  { key: 'delivered', label: 'Delivered', shortLabel: 'Delivered' },
];

const STATUS_ORDER: Order['status'][] = ['pending', 'confirmed', 'in_lab', 'qc', 'ready', 'shipped', 'delivered'];

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function stepIndex(s: Order['status']): number {
  const i = STATUS_ORDER.indexOf(s);
  return i >= 0 ? i : 0;
}

interface OrderTrackingJourneyProps {
  order: Order;
}

export function OrderTrackingJourney({ order }: OrderTrackingJourneyProps) {
  const currentIdx = order.status === 'cancelled' ? -1 : stepIndex(order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">Order tracking</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Order ID: <span className="font-mono">{order.id}</span>
        </p>
      </div>
      <div className="p-4">
        {isCancelled ? (
          <div className="flex items-center gap-3 py-2">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-red-600 dark:text-red-400">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Order cancelled</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">This order was cancelled.</p>
            </div>
          </div>
        ) : (
          <ul className="relative space-y-0">
            {/* vertical line */}
            <div
              className="absolute left-4 top-4 bottom-4 w-0.5 bg-slate-200 dark:bg-slate-600"
              aria-hidden
            />
            {STEPS.map((step, idx) => {
              const isDone = currentIdx > idx;
              const isCurrent = currentIdx === idx;
              const isPending = currentIdx < idx;
              const showDate = idx === 0 ? order.createdAt : (isDone ? 'Completed' : null);

              return (
                <li key={step.key} className="relative flex gap-4 pb-6 last:pb-0">
                  {/* circle */}
                  <div
                    className={`relative z-10 shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                      isDone
                        ? 'bg-[#fe5001] border-[#fe5001]'
                        : isCurrent
                          ? 'bg-white dark:bg-slate-800 border-[#fe5001]'
                          : 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {isDone ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-white">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : isCurrent ? (
                      <span className="w-2 h-2 rounded-full bg-[#fe5001]" />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p
                      className={`text-sm font-medium ${
                        isDone || isCurrent
                          ? 'text-slate-900 dark:text-white'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {step.label}
                      {isCurrent && (
                        <span className="ml-2 text-xs font-normal text-[#fe5001]">(Current)</span>
                      )}
                    </p>
                    {showDate && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {idx === 0 ? formatDate(order.createdAt) : showDate}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
