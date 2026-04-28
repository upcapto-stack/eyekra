'use client';

import { AppScreen } from '@/components/layout/AppScreen';

export function HelpView() {
  return (
    <AppScreen title="Help & support" backHref="/account">
      <div className="space-y-3">
        <a href="mailto:support@eyekra.com" className="block p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
          <p className="font-semibold text-slate-900 dark:text-slate-100">Email us</p>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">support@eyekra.com</p>
        </a>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <p className="font-semibold text-slate-900 dark:text-slate-100">Call us</p>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">+91 1800-XXX-XXXX</p>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <p className="font-semibold text-slate-900 dark:text-slate-100">FAQs</p>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Orders, returns, eye tests</p>
        </div>
      </div>
    </AppScreen>
  );
}
