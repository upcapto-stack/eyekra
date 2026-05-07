'use client';

import { useEffect } from 'react';
import { getSettings, applyTheme } from '@/core/config/settings';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const run = () => {
      const { theme } = getSettings();
      applyTheme(theme);
    };
    run();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = () => {
      const { theme } = getSettings();
      if (theme === 'system') applyTheme('system');
    };
    mq.addEventListener('change', onSystemChange);
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'eyekra-settings') run();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      mq.removeEventListener('change', onSystemChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return <>{children}</>;
}
