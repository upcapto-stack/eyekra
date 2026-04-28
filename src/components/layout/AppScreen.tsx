'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';
import { BottomNav } from '@/components/layout/BottomNav';

interface AppScreenProps {
  title: string;
  backHref?: string;
  /** When true, back button and Save flow use router.back() to return to previous page */
  backToPrevious?: boolean;
  children: ReactNode;
}

export function AppScreen({ title, backHref = '/account', backToPrevious, children }: AppScreenProps) {
  const router = useRouter();

  const backButtonClass =
    'shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors';

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-900 pb-20">
      <header className="safe-top sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-3 py-2.5 flex items-center gap-3">
        {backToPrevious ? (
          <button type="button" onClick={() => router.back()} className={backButtonClass} aria-label="Back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
        ) : (
          <Link href={backHref} className={backButtonClass} aria-label="Back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
        )}
        <h1 className="flex-1 text-lg font-bold text-slate-900 dark:text-slate-100 text-center">{title}</h1>
        <span className="w-9" aria-hidden />
      </header>
      <main className="flex-1 px-4 py-5 max-w-md mx-auto w-full">{children}</main>
      <BottomNav />
    </div>
  );
}
