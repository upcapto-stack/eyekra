'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Input } from '@/shared/components/ui/Input';

export function PartnerLoginView() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const errorCode = new URLSearchParams(window.location.search).get('error');
    if (errorCode === 'google_partner_only') setError('Google login is only allowed for partner accounts here.');
    else if (errorCode === 'role_required') setError('Please login with a partner account to continue.');
    else if (errorCode === 'google_not_configured') setError('Google login is not configured yet.');
    else if (errorCode?.startsWith('google_')) setError('Google login failed. Please try again.');
  }, []);

  const handleLogin = async () => {
    const trimmed = identifier.trim();
    if (!trimmed || !password) {
      setError('Email/mobile and password are required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/partner/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identifier: trimmed, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || 'Failed to login');
        return;
      }
      router.replace('/partner');
    } catch {
      setError('Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setError('');
    window.location.href = '/api/partner/auth/google/start?next=/partner';
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-50">
      <header className="safe-top pt-6 pb-2 flex justify-center shrink-0">
        <div className="flex flex-col items-center gap-2">
          <Image
            src="/eyekra-login-logo.png"
            alt="Eyekra Partner"
            width={120}
            height={120}
            className="object-contain w-[120px] h-[120px]"
          />
          <span className="inline-flex items-center justify-center rounded-full bg-[#fe5001]/10 text-[#c93f00] px-4 py-1 text-xs font-semibold tracking-wide uppercase">
            Partner
          </span>
        </div>
      </header>

      <main className="flex-1 px-5 pt-4 pb-12 flex flex-col max-w-md mx-auto w-full">
        <h1 className="text-slate-900 dark:text-slate-900 text-3xl font-bold mb-2">Partner Login</h1>
        <p className="text-slate-600 text-sm mb-6">
          Sign in to manage partner leads, orders, and service operations.
        </p>

        <div className="mb-3">
          <Input
            type="text"
            placeholder="Partner Email or Mobile"
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </div>
        <div className="mb-5">
          <Input
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="button" className="common-btn common-btn--primary w-full mb-3" onClick={handleLogin} disabled={loading}>
          {loading ? 'Signing in...' : 'Log in as Partner'}
        </button>
        <button type="button" onClick={handleGoogleLogin} className="common-btn w-full mb-3">
          Continue with Google
        </button>
        {error ? <p className="text-sm text-red-600 mb-5">{error}</p> : <div className="mb-5" />}

        <p className="text-center text-slate-600 text-sm">
          New partner?{' '}
          <Link href="/partner/signup" className="text-brand font-semibold">
            Create partner account
          </Link>
        </p>
      </main>
    </div>
  );
}
