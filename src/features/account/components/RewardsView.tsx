'use client';

import { AppScreen } from '@/components/layout/AppScreen';

export function RewardsView() {
  return (
    <AppScreen title="My rewards" backHref="/account">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-8 text-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 mx-auto text-amber-500 dark:text-amber-400 mb-3">
          <polygon points="12 2 15 9 22 9 17 14 18 22 12 18 6 22 7 14 2 9 9 9" />
        </svg>
        <p className="text-slate-600 dark:text-slate-400 text-sm">No rewards yet</p>
        <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">Earn rewards on orders and referrals</p>
      </div>
    </AppScreen>
  );
}
