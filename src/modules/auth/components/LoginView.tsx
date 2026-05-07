'use client';

import Image from 'next/image';
import Link from 'next/link';

export function LoginView() {
  const handleMockAction = () => {
    // Mock login – no navigation, no API
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-50">
      <header className="safe-top pt-6 pb-2 flex justify-center shrink-0">
        <Image
          src="/eyekra-login-logo.png"
          alt="eyekra"
          width={120}
          height={120}
          className="object-contain w-[120px] h-[120px]"
        />
      </header>

      <main className="flex-1 px-5 pt-4 pb-24 flex flex-col items-center max-w-md mx-auto w-full">
        <h2 className="text-slate-800 dark:text-slate-900 text-3xl font-bold text-center mb-2 w-full">
          Welcome to Eyekra
        </h2>
        <p className="text-slate-600 dark:text-slate-500 text-center text-sm mb-6 w-full">
          Eyewear made for your eyes. Try frames at home, book eye tests, and find your perfect fit.
        </p>

        <div className="rounded-2xl overflow-hidden mt-5 mb-8 aspect-[4/3] w-full max-h-56 bg-slate-100 dark:bg-slate-200/60 relative">
          <video
            src="/e1.mp4"
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted
            loop
            autoPlay
            aria-hidden
          />
        </div>

        <div className="grid grid-cols-2 gap-3 w-full">
          <button
            type="button"
            onClick={handleMockAction}
            className="common-btn w-full"
          >
            Log in
          </button>
          <Link href="/signup" className="common-btn common-btn--primary w-full">
            Sign Up
          </Link>
        </div>
      </main>
    </div>
  );
}
