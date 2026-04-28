'use client';

import { AppScreen } from '@/components/layout/AppScreen';

export function AboutView() {
  return (
    <AppScreen title="About Eyekra" backHref="/account">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Eyewear made for your eyes</h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-2 leading-relaxed">
          Try frames at home, book eye tests, and find your perfect fit. Eyekra brings quality eyewear and eye care to your doorstep.
        </p>
        <p className="text-slate-500 dark:text-slate-500 text-xs mt-4">Version 1.0.0</p>
      </div>
    </AppScreen>
  );
}
