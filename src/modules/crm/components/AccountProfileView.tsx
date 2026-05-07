'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { BottomNav } from '@/shared/components/layout/BottomNav';
import { getMockUser, setMockUser, clearMockAuth } from '@/shared/utils/mock-auth';

const OTP_LENGTH = 6;
const MOCK_OTP = '123456'; // For demo; in production verify via API

const MENU_ITEMS = [
  { label: 'My orders', href: '/orders', icon: 'document' },
  { label: 'Notifications', href: '/notifications', icon: 'notifications' },
  { label: 'Wallet', href: '/wallet', icon: 'wallet', comingSoon: true },
  { label: 'My rewards', href: '/rewards', icon: 'rewards' },
  { label: 'My favourites', href: '/favourites', icon: 'favourites' },
  { label: 'Manage addresses', href: '/addresses', icon: 'location' },
  { label: 'Settings', href: '/settings', icon: 'settings' },
  { label: 'About Eyekra', href: '/about', icon: 'about' },
] as const;

function MenuIcon({ type }: { type: (typeof MENU_ITEMS)[number]['icon'] }) {
  const c = 'w-5 h-5 text-slate-700 dark:text-slate-300 shrink-0';
  switch (type) {
    case 'document':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={c}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      );
    case 'wallet':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={c}>
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
          <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
      );
    case 'notifications':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={c}>
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
    case 'rewards':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={c}>
          <polygon points="12 2 15 9 22 9 17 14 18 22 12 18 6 22 7 14 2 9 9 9" />
          <path d="M12 6v6l4 2" />
        </svg>
      );
    case 'favourites':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={c}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      );
    case 'location':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={c}>
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      );
    case 'settings':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={c}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    case 'about':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={c}>
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="9" y1="9" x2="15" y2="9" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="12" y2="17" />
        </svg>
      );
    default:
      return null;
  }
}

export function AccountProfileView() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(getMockUser);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editError, setEditError] = useState('');
  const [editStep, setEditStep] = useState<'form' | 'otp'>('form');
  const [pendingProfile, setPendingProfile] = useState<{ name: string; email: string; mobile: string } | null>(null);
  const [otpSentTo, setOtpSentTo] = useState<'email' | 'mobile' | 'both' | null>(null);
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const refreshUser = useCallback(() => setUser(getMockUser()), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) setUser(getMockUser());
  }, [mounted]);

  const openEditModal = () => {
    const u = getMockUser();
    setEditName(u.name || '');
    setEditEmail(u.email || '');
    setEditMobile(u.mobile || '');
    setEditError('');
    setEditStep('form');
    setPendingProfile(null);
    setOtpSentTo(null);
    setOtp(Array(OTP_LENGTH).fill(''));
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditStep('form');
    setPendingProfile(null);
    setOtpSentTo(null);
  };

  const applyPendingProfile = useCallback(() => {
    if (!pendingProfile) return;
    setMockUser({
      name: pendingProfile.name || undefined,
      email: pendingProfile.email || undefined,
      mobile: pendingProfile.mobile || undefined,
    });
    refreshUser();
    closeEditModal();
  }, [pendingProfile, refreshUser]);

  const saveProfile = () => {
    setEditError('');
    const name = editName.trim();
    const mobile = editMobile.trim().replace(/\D/g, '').slice(0, 10);
    const email = editEmail.trim();
    if (!name) {
      setEditError('Name is required');
      return;
    }
    const current = getMockUser();
    const emailChanged = email !== (current.email || '');
    const mobileChanged = mobile !== (current.mobile || '');
    if (emailChanged || mobileChanged) {
      setPendingProfile({ name, email, mobile });
      setOtp(Array(OTP_LENGTH).fill(''));
      if (emailChanged && mobileChanged) setOtpSentTo('both');
      else if (emailChanged) setOtpSentTo('email');
      else setOtpSentTo('mobile');
      setEditStep('otp');
      return;
    }
    setMockUser({ name: name || undefined, email: email || undefined, mobile: mobile || undefined });
    refreshUser();
    closeEditModal();
  };

  const handleOtpChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = v;
    setOtp(next);
    if (v && index < OTP_LENGTH - 1) otpInputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
      const next = [...otp];
      next[index - 1] = '';
      setOtp(next);
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
    const next = [...otp];
    pasted.forEach((char, i) => { next[i] = char; });
    setOtp(next);
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    otpInputRefs.current[focusIdx]?.focus();
  };

  const verifyOtp = () => {
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      setEditError('Enter 6-digit OTP');
      return;
    }
    setEditError('');
    if (code !== MOCK_OTP) {
      setEditError('Invalid OTP. Use 123456 for demo.');
      return;
    }
    applyPendingProfile();
  };

  const otpComplete = otp.every((d) => d !== '');

  const displayPhone = user.mobile ? `+91 ${user.mobile}` : '';

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-900 pb-20">
      <header className="safe-top sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-3 py-2.5 flex items-center gap-3">
        <Link
          href="/home"
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          aria-label="Back to home"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="flex-1 text-lg font-bold text-slate-900 dark:text-slate-100 text-center">Account</h1>
        <span className="w-9" aria-hidden />
      </header>

      <main className="flex-1 px-4 py-5 max-w-md mx-auto w-full">
        {/* Profile header: name + phone + edit */}
        <div className="flex items-start justify-between gap-3 mb-6">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
              {user.name || 'Account'}
            </h2>
            {displayPhone && (
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-0.5">{displayPhone}</p>
            )}
          </div>
          <button
            type="button"
            onClick={openEditModal}
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            aria-label="Edit profile"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        </div>

        {/* Edit profile modal */}
        {showEditModal && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
            onClick={closeEditModal}
          >
            <div
              className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-600 shrink-0">
                <h3 className="text-slate-900 dark:text-slate-100 font-semibold text-lg">
                  {editStep === 'otp' ? 'Verify OTP' : 'Edit profile'}
                </h3>
                <button
                  type="button"
                  onClick={editStep === 'otp' ? () => { setEditStep('form'); setEditError(''); } : closeEditModal}
                  className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                  aria-label={editStep === 'otp' ? 'Back' : 'Close'}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    {editStep === 'otp' ? (
                      <path d="M19 12H5M12 19l-7-7 7-7" />
                    ) : (
                      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                    )}
                  </svg>
                </button>
              </div>

              {editStep === 'form' ? (
                <>
                  <div className="p-4 space-y-4">
                    {editError && (
                      <p className="text-red-600 dark:text-red-400 text-sm">{editError}</p>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Your name"
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-3 py-2.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-3 py-2.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mobile</label>
                      <input
                        type="tel"
                        value={editMobile}
                        onChange={(e) => setEditMobile(e.target.value)}
                        placeholder="10-digit number"
                        maxLength={10}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-3 py-2.5 text-sm"
                      />
                    </div>
                  </div>
                  <div className="p-4 pt-0 flex gap-2">
                    <button
                      type="button"
                      onClick={closeEditModal}
                      className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveProfile}
                      className="flex-1 py-2.5 rounded-xl bg-[#fe5001] text-white text-sm font-semibold hover:bg-[#e54800] transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-4">
                    {editError && (
                      <p className="text-red-600 dark:text-red-400 text-sm mb-3">{editError}</p>
                    )}
                    <p className="text-slate-600 dark:text-slate-400 text-sm text-center mb-4">
                      {otpSentTo === 'both' && 'We sent a 6-digit code to your new email and mobile.'}
                      {otpSentTo === 'email' && 'We sent a 6-digit code to your new email address.'}
                      {otpSentTo === 'mobile' && 'We sent a 6-digit code to your new mobile number.'}
                    </p>
                    <div className="flex justify-center gap-2 mb-6" onPaste={handleOtpPaste}>
                      {otp.map((digit, i) => (
                        <input
                          key={i}
                          ref={(el) => { otpInputRefs.current[i] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(i, e)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          className="w-11 h-12 text-center text-lg font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#fe5001] focus:border-transparent"
                        />
                      ))}
                    </div>
                    <p className="text-slate-500 dark:text-slate-500 text-xs text-center mb-4">
                      Demo: use <strong>123456</strong> to verify
                    </p>
                    <button
                      type="button"
                      onClick={verifyOtp}
                      disabled={!otpComplete}
                      className="w-full py-2.5 rounded-xl bg-[#fe5001] text-white text-sm font-semibold hover:bg-[#e54800] transition-colors disabled:opacity-50 disabled:pointer-events-none"
                    >
                      Verify & update
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Feature cards: Orders, Bookings, Help */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Link
            href="/orders"
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow transition-shadow"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7 text-slate-700 dark:text-slate-300">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 text-center leading-tight">
              My orders
            </span>
          </Link>
          <Link
            href="/bookings"
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow transition-shadow"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7 text-slate-700 dark:text-slate-300">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 text-center leading-tight">
              My bookings
            </span>
          </Link>
          <Link
            href="/help"
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow transition-shadow"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7 text-slate-700 dark:text-slate-300">
              <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
            </svg>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 text-center leading-tight">
              Help & support
            </span>
          </Link>
        </div>

        {/* Menu list */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden mb-5">
          {MENU_ITEMS.map((item, i) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3.5 text-slate-900 dark:text-slate-100 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${i > 0 ? 'border-t border-slate-100 dark:border-slate-700' : ''}`}
            >
              <MenuIcon type={item.icon} />
              <span className="flex-1">{item.label}</span>
              {'comingSoon' in item && item.comingSoon && (
                <span className="text-xs text-slate-400 dark:text-slate-500">Coming soon</span>
              )}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-slate-400 shrink-0">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          ))}
        </div>

        {/* Refer & earn card */}
        <div className="rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 border border-violet-200/50 dark:border-violet-800/50 p-4 mb-5">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Refer & earn ₹100</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Get ₹100 when your friend completes their first order
          </p>
          <button
            type="button"
            className="mt-3 w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors"
          >
            Refer now
          </button>
        </div>

        {/* Logout */}
        <button
          type="button"
          onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => undefined);
            clearMockAuth();
            router.replace('/login');
          }}
          className="w-full py-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-red-600 dark:text-red-400 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
        >
          Logout
        </button>

        <p className="text-center text-slate-400 dark:text-slate-500 text-xs mt-4">Version 1.0.0</p>
      </main>

      <BottomNav />
    </div>
  );
}
