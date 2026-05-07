'use client';

import { useEffect } from 'react';
import Image from 'next/image';

const SPLASH_DURATION_MS = 1800;

interface SplashScreenProps {
  onEnd: () => void;
}

export function SplashScreen({ onEnd }: SplashScreenProps) {
  useEffect(() => {
    const t = setTimeout(onEnd, SPLASH_DURATION_MS);
    return () => clearTimeout(t);
  }, [onEnd]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-brand safe-top safe-bottom"
      aria-label="Loading eyekra"
    >
      <Image
        src="/eyekra-logo.png"
        alt="eyekra"
        width={180}
        height={180}
        className="object-contain max-w-[180px] max-h-[180px] w-auto h-auto"
        style={{ width: 'auto', height: 'auto' }}
        priority
      />
    </div>
  );
}
