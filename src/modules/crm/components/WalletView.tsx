'use client';

import { AppScreen } from '@/shared/components/layout/AppScreen';

export function WalletView() {
  return (
    <AppScreen title="Wallet" backHref="/account">
      <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20 p-8 text-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 mx-auto text-amber-500 dark:text-amber-400 mb-3">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
          <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Coming soon</h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Wallet & payments will be available here</p>
      </div>
    </AppScreen>
  );
}
