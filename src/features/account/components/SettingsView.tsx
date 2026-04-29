'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppScreen } from '@/components/layout/AppScreen';
import {
  getSettings,
  setNotifications,
  setTheme,
  setLanguage,
  type ThemeMode,
  type AppSettings,
} from '@/lib/settings';
import { ensurePushSubscription } from '@/lib/push-subscribe';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

const LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिंदी' },
];

export function SettingsView() {
  const [settings, setSettingsState] = useState<AppSettings>(getSettings);

  const syncFromStorage = useCallback(() => {
    setSettingsState(getSettings());
  }, []);

  useEffect(() => {
    syncFromStorage();
  }, [syncFromStorage]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'eyekra-settings') syncFromStorage();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [syncFromStorage]);

  return (
    <AppScreen title="Settings" backHref="/account">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden divide-y divide-slate-200 dark:divide-slate-700">
        {/* Notifications */}
        <div className="px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Notifications</p>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Order updates, offers & reminders</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.notifications}
            onClick={() => {
              const next = !settings.notifications;
              setNotifications(next);
              if (next) void ensurePushSubscription();
              setSettingsState((s) => ({ ...s, notifications: next }));
            }}
            aria-label={`Notifications ${settings.notifications ? 'on' : 'off'}`}
            className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${
              settings.notifications ? 'bg-[#fe5001]' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                settings.notifications ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Theme */}
        <div className="px-4 py-4">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Theme</p>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 mb-3">App appearance</p>
          <div className="flex gap-2 flex-wrap">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setTheme(opt.value);
                  setSettingsState((s) => ({ ...s, theme: opt.value }));
                }}
                className={`inline-flex items-center justify-center text-center min-h-[2.5rem] px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  settings.theme === opt.value
                    ? 'bg-[#c93f00] text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div className="px-4 py-4">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Language</p>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 mb-3">App language</p>
          <div className="flex gap-2 flex-wrap">
            {LANGUAGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setLanguage(opt.value);
                  setSettingsState((s) => ({ ...s, language: opt.value }));
                }}
                className={`inline-flex items-center justify-center text-center min-h-[2.5rem] px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  settings.language === opt.value
                    ? 'bg-[#c93f00] text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Privacy */}
        <div className="px-4 py-4">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Privacy</p>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Manage data & privacy preferences</p>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-2">
            Your data is stored locally on this device. To clear app data, clear site data in your browser settings.
          </p>
        </div>
      </div>

      <p className="text-slate-500 dark:text-slate-400 text-xs mt-4">Changes are saved automatically.</p>
    </AppScreen>
  );
}
