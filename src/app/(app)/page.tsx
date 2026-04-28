'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SplashScreen } from '@/features/splash';
import { isMockLoggedIn, syncSessionUser } from '@/lib/mock-auth';

const SPLASH_SEEN_KEY = 'eyekra-splash-seen';

export default function HomePage() {
  const [showSplash, setShowSplash] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    if (sessionStorage.getItem(SPLASH_SEEN_KEY)) {
      setShowSplash(false);
    }
  }, [mounted]);

  const handleSplashEnd = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SPLASH_SEEN_KEY, '1');
    }
    setShowSplash(false);
  }, []);

  useEffect(() => {
    if (showSplash) return;
    void (async () => {
      const user = await syncSessionUser();
      if (user) {
        router.replace(user.role === 'ADMIN' || user.role === 'STAFF' ? '/admin' : '/home');
      } else {
        router.replace(isMockLoggedIn() ? '/home' : '/login');
      }
    })();
  }, [showSplash, router]);

  if (showSplash) {
    return <SplashScreen onEnd={handleSplashEnd} />;
  }

  return null;
}
