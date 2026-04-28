'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BottomNav } from '@/components/layout/BottomNav';

export default function OrderSuccessPage() {
  const [orderId, setOrderId] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setOrderId(params.get('orderId') || '');
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-900 pb-20">
      <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-slate-900 dark:text-white text-center">Order successful!</h1>
      <p className="text-slate-600 dark:text-slate-400 text-sm mt-2 text-center">
        Thank you for your order. We will process it shortly.
      </p>
      {orderId && (
        <p className="text-slate-500 dark:text-slate-500 text-xs mt-2 font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded">
          Order ID: {orderId}
        </p>
      )}
      <div className="flex flex-col sm:flex-row gap-3 mt-8 w-full max-w-xs">
        <Link
          href="/orders"
          className="py-3 rounded-xl bg-[#fe5001] text-white font-semibold text-sm text-center"
        >
          View my orders
        </Link>
        <Link
          href="/home"
          className="py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold text-sm text-center"
        >
          Continue shopping
        </Link>
      </div>
      <BottomNav />
    </div>
  );
}
