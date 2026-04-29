const STORAGE_KEY = 'eyekra-settings';
const SESSION_HINT_KEY = 'eyekra-session-hint';
let settingsHydrated = false;

export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppSettings {
  notifications: boolean;
  theme: ThemeMode;
  language: string;
}

const defaults: AppSettings = {
  notifications: true,
  theme: 'system',
  language: 'en',
};

function getStored(): AppSettings {
  if (typeof window === 'undefined') return { ...defaults };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      return {
        notifications: parsed.notifications ?? defaults.notifications,
        theme: (parsed.theme as ThemeMode) ?? defaults.theme,
        language: parsed.language ?? defaults.language,
      };
    }
  } catch {
    // ignore
  }
  if (typeof window !== 'undefined' && !settingsHydrated) {
    settingsHydrated = true;
    void hydrateSettingsFromServer();
  }
  return { ...defaults };
}

function setStored(settings: AppSettings): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    void syncSettingsToServer(settings);
  }
}

async function hydrateSettingsFromServer(): Promise<void> {
  if (typeof window !== 'undefined' && !localStorage.getItem(SESSION_HINT_KEY)) return;
  try {
    const res = await fetch('/api/user/settings', { credentials: 'include' });
    if (!res.ok) return;
    const data = (await res.json()) as { settings?: { theme?: ThemeMode; language?: string; metadata?: { notifications?: boolean } } };
    if (!data.settings) return;
    const next: AppSettings = {
      notifications: data.settings.metadata?.notifications ?? defaults.notifications,
      theme: data.settings.theme ?? defaults.theme,
      language: data.settings.language ?? defaults.language,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    applyTheme(next.theme);
    window.dispatchEvent(new Event('storage'));
  } catch {
    // ignore
  }
}

async function syncSettingsToServer(settings: AppSettings): Promise<void> {
  if (typeof window !== 'undefined' && !localStorage.getItem(SESSION_HINT_KEY)) return;
  try {
    await fetch('/api/user/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        theme: settings.theme,
        language: settings.language,
        metadata: { notifications: settings.notifications },
      }),
    });
  } catch {
    // ignore
  }
}

export function getSettings(): AppSettings {
  return getStored();
}

export function setSettings(update: Partial<AppSettings>): void {
  const current = getStored();
  setStored({ ...current, ...update });
}

export function setNotifications(on: boolean): void {
  setSettings({ notifications: on });
}

export function setTheme(theme: ThemeMode): void {
  setSettings({ theme });
  applyTheme(theme);
}

export function setLanguage(lang: string): void {
  setSettings({ language: lang });
}

/** Call on app load and when theme setting changes. */
export function applyTheme(theme: ThemeMode): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'light') {
    root.classList.remove('dark');
  } else if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (dark) root.classList.add('dark');
    else root.classList.remove('dark');
  }
}
