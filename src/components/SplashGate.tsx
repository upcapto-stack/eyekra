'use client';

import { useEffect, useState } from 'react';
import { SplashScreen } from '@/features/splash/components/SplashScreen';

const SPLASH_DURATION_MS = 1800;
const SPLASH_SEEN_KEY = 'eyekra-splash-seen';

export function SplashGate({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const splashSeen = sessionStorage.getItem(SPLASH_SEEN_KEY);
    if (splashSeen) {
      setShowSplash(false);
      return;
    }

    const t = setTimeout(() => {
      sessionStorage.setItem(SPLASH_SEEN_KEY, '1');
      setShowSplash(false);
    }, SPLASH_DURATION_MS);

    return () => clearTimeout(t);
  }, []);

  if (showSplash) {
    return (
      <SplashScreen
        onEnd={() => {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(SPLASH_SEEN_KEY, '1');
          }
          setShowSplash(false);
        }}
      />
    );
  }
  return <>{children}</>;
}
