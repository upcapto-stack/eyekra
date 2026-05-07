'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Bell, Briefcase, Clock3, LayoutDashboard, ScanEye, Wallet, Wrench, X, ChevronRight } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/partner', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/partner/bookings', label: 'Bookings', icon: Briefcase },
  { href: '/partner/eye-test', label: 'Eye test', icon: ScanEye },
  { href: '/partner/attendance/history', label: 'Attendance', icon: Clock3 },
  { href: '/partner/equipment/assigned', label: 'Equipment', icon: Wrench },
  { href: '/partner/earnings', label: 'Earnings', icon: Wallet },
];

export function PartnerShell({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<{ name: string; photoUrl: string | null; mobile?: string; email?: string | null } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const user = data?.user as { name?: string; photoUrl?: string | null; mobile?: string; email?: string | null } | undefined;
        if (!user?.name) return;
        setProfile({
          name: user.name,
          photoUrl: user.photoUrl ?? null,
          mobile: user.mobile,
          email: user.email ?? null,
        });
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isSidebarOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isSidebarOpen]);

  const normalizedName = (profile?.name ?? '').toLowerCase();
  const inferredGender: 'male' | 'female' =
    /\b(ms|mrs|miss|madam|lady|she|her)\b/.test(normalizedName) ? 'female' : 'male';

  const fallbackAvatar =
    inferredGender === 'female' ? (
      <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="femaleBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f9a8d4" />
            <stop offset="100%" stopColor="#c4b5fd" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="20" fill="url(#femaleBg)" />
        <circle cx="20" cy="15.5" r="6.2" fill="#f6d0b8" />
        <path d="M11.8 15.7c0-4.7 3.7-8.5 8.2-8.5s8.2 3.8 8.2 8.5v4.3h-1.9v-4.1c0-3.5-2.8-6.3-6.3-6.3s-6.3 2.8-6.3 6.3v4.1h-1.9z" fill="#1e293b" />
        <path d="M8.8 35.2c0-5.8 4.8-10.5 11.2-10.5 6.4 0 11.2 4.7 11.2 10.5H8.8z" fill="#7c3aed" />
        <circle cx="11.2" cy="21.3" r="2.8" fill="#1e293b" />
        <circle cx="28.8" cy="21.3" r="2.8" fill="#1e293b" />
      </svg>
    ) : (
      <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="maleBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="20" fill="url(#maleBg)" />
        <circle cx="20" cy="15.4" r="6.3" fill="#f6d0b8" />
        <path d="M12 14.8c0-4.4 3.6-7.9 8-7.9 2.8 0 4.4 0.9 6.5 2.6l-1.5 1.9c-1.4-1.2-2.8-2.1-5.1-2.1-3.1 0-5.7 2.5-5.7 5.5v1.1H12v-1.1z" fill="#1e293b" />
        <path d="M8.6 35.2c0-5.7 4.6-10.2 11.4-10.2 6.8 0 11.4 4.5 11.4 10.2H8.6z" fill="#2563eb" />
        <rect x="14.2" y="10.2" width="11.6" height="2.3" rx="1.15" fill="#1e293b" />
      </svg>
    );

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <header className="safe-top sticky top-0 z-30 border-b border-slate-200/70 dark:border-slate-800/70 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation"
              className="h-10 w-10 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden flex items-center justify-center"
              onClick={() => setIsSidebarOpen(true)}
            >
              {profile?.photoUrl ? (
                <Image src={profile.photoUrl} alt={profile.name || 'Profile'} width={40} height={40} className="h-full w-full object-cover" />
              ) : (
                fallbackAvatar
              )}
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Image src="/eyekra-login-logo.png" alt="Eyekra" width={28} height={28} className="h-7 w-7 object-contain" />
                <p className="text-base uppercase tracking-[0.24em] font-bold text-[#fe5001]">Partner</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5">
              <span className="h-7 w-7 rounded-full overflow-hidden shrink-0">
                {profile?.photoUrl ? (
                  <Image src={profile.photoUrl} alt={profile.name || 'Profile'} width={28} height={28} className="h-full w-full object-cover" />
                ) : (
                  fallbackAvatar
                )}
              </span>
              <div className="leading-tight">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{profile?.name ?? 'Partner User'}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">{profile?.mobile ?? profile?.email ?? 'Profile details'}</p>
              </div>
            </div>
            <Link
              href="/partner/notifications"
              aria-label="Open notifications"
              className="h-10 w-10 flex items-center justify-center text-slate-700 dark:text-slate-200"
            >
              <Bell className="h-5 w-5" />
            </Link>
            {actions ? <div className="shrink-0">{actions}</div> : null}
          </div>
        </div>
      </header>

      {isSidebarOpen ? (
        <div className="fixed inset-0 z-40" role="presentation">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-[3px]"
            onClick={() => setIsSidebarOpen(false)}
          />
          <aside className="absolute left-2 top-2 bottom-2 w-[310px] max-w-[90vw] rounded-3xl border border-white/35 dark:border-slate-700/60 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl p-4 shadow-[0_20px_55px_rgba(15,23,42,0.28)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Image src="/eyekra-login-logo.png" alt="Eyekra" width={32} height={32} className="h-8 w-8 object-contain" />
              <p className="text-lg uppercase tracking-[0.28em] font-bold text-[#fe5001]">Partner</p>
              </div>
              <button
                type="button"
                aria-label="Close navigation"
                className="h-8 w-8 rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-white/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200"
                onClick={() => setIsSidebarOpen(false)}
              >
                <X className="h-4 w-4 mx-auto" />
              </button>
            </div>
            <button
              type="button"
              className="w-full mb-3 rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/60 dark:bg-slate-800/60 px-3 py-2.5 text-left"
            >
              <div className="flex items-center gap-2.5">
                <span className="h-10 w-10 rounded-full overflow-hidden shrink-0">
                  {profile?.photoUrl ? (
                    <Image src={profile.photoUrl} alt={profile.name || 'Profile'} width={40} height={40} className="h-full w-full object-cover" />
                  ) : (
                    fallbackAvatar
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{profile?.name ?? 'Partner User'}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{profile?.mobile ?? profile?.email ?? 'Profile details'}</p>
                </div>
              </div>
            </button>
            <div className="space-y-2">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={`drawer-${item.href}`}
                    href={item.href}
                    className={`flex items-center justify-between rounded-2xl px-3 py-3 text-sm font-semibold transition-all ${
                      active
                        ? 'bg-[#fe5001] text-white shadow-[0_10px_22px_rgba(254,80,1,0.35)]'
                        : 'bg-white/55 dark:bg-slate-800/55 text-slate-700 dark:text-slate-200 border border-white/40 dark:border-slate-700/50'
                    }`}
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className={`h-7 w-7 rounded-xl flex items-center justify-center ${active ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700'}`}>
                        <Icon className={`h-4 w-4 ${active ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`} />
                      </span>
                      {item.label}
                    </span>
                    <ChevronRight className={`h-4 w-4 ${active ? 'text-white/90' : 'text-slate-400 dark:text-slate-500'}`} />
                  </Link>
                );
              })}
            </div>
          </aside>
        </div>
      ) : null}

      <div className="max-w-7xl mx-auto w-full">
        <main className="px-4 py-5 pb-28">
          <div className="mb-4">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
            {description ? <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p> : null}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
