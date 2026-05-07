'use client';

import Image from 'next/image';

const WELCOME_SEEN_KEY = 'eyekra-welcome-seen';

export function markWelcomeSeen() {
  if (typeof window !== 'undefined') {
    localStorage.setItem(WELCOME_SEEN_KEY, '1');
  }
}

interface WelcomeViewProps {
  onContinueToHome?: () => void;
}

export function WelcomeView({ onContinueToHome }: WelcomeViewProps) {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-50">
      <header className="safe-top pt-6 pb-2 flex justify-center">
        <Image
          src="/eyekra-logo.png"
          alt="eyekra"
          width={120}
          height={120}
          className="object-contain w-auto h-auto"
          style={{ width: 'auto', height: 'auto' }}
        />
      </header>

      <main className="flex-1 px-5 pt-4 pb-24">
        <h2 className="text-slate-800 dark:text-slate-900 text-2xl font-bold text-center mb-2">
          Welcome to Eyekra
        </h2>
        <p className="text-slate-600 dark:text-slate-600 text-center text-sm mb-6 max-w-sm mx-auto">
          Eyewear made for your eyes. Try frames at home, book eye tests, and find your perfect fit.
        </p>

        <div className="rounded-2xl bg-slate-100 dark:bg-slate-200/80 aspect-[4/3] max-h-56 flex items-center justify-center mb-6 overflow-hidden">
          <svg
            viewBox="0 0 200 120"
            className="w-full h-full object-contain p-4"
            aria-hidden
          >
            <ellipse cx="100" cy="65" rx="55" ry="45" fill="#e2e8f0" />
            <circle cx="75" cy="58" r="12" fill="#94a3b8" opacity="0.6" />
            <circle cx="125" cy="58" r="12" fill="#94a3b8" opacity="0.6" />
            <path d="M63 58 L87 58 M113 58 L137 58" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
            <rect x="70" y="75" width="60" height="8" rx="4" fill="#fb923c" opacity="0.8" />
            <circle cx="55" cy="40" r="8" fill="#f97316" opacity="0.5" />
            <circle cx="145" cy="42" r="10" fill="#f97316" opacity="0.4" />
          </svg>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <button
            type="button"
            onClick={markWelcomeSeen}
            className="w-full flex items-center justify-center rounded-xl bg-white text-brand font-semibold py-3.5 text-center border-2 border-brand hover:bg-orange-50 transition-colors"
          >
            Log in
          </button>
          <button
            type="button"
            onClick={markWelcomeSeen}
            className="w-full flex items-center justify-center rounded-xl bg-brand text-white font-semibold py-3.5 text-center hover:bg-brand-dark transition-colors"
          >
            Sign Up
          </button>
        </div>
        {onContinueToHome && (
          <button
            type="button"
            onClick={() => {
              markWelcomeSeen();
              onContinueToHome();
            }}
            className="w-full flex items-center justify-center text-slate-600 dark:text-slate-500 text-sm font-medium py-2 text-center"
          >
            Continue without account
          </button>
        )}
      </main>
    </div>
  );
}
