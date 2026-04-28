'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { isMockLoggedIn, setMockUser, setMockLoggedIn, syncSessionUser } from '@/lib/mock-auth';

const inputFieldClass =
  'bg-white dark:bg-white border-slate-300 dark:border-slate-400 text-slate-900 dark:text-slate-900 placeholder:text-slate-500 dark:placeholder:text-slate-500';

export function LoginFormView() {
  const router = useRouter();
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  useEffect(() => {
    void (async () => {
      const user = await syncSessionUser();
      if (user) {
        router.replace(user.role === 'ADMIN' || user.role === 'STAFF' ? '/admin' : '/home');
        return;
      }
      if (isMockLoggedIn()) router.replace('/home');
    })();
  }, [router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const errorCode = new URLSearchParams(window.location.search).get('error');
    if (errorCode === 'google_customer_only') setError('Google login is only allowed for customer accounts.');
    else if (errorCode === 'google_not_configured') setError('Google login is not configured yet.');
    else if (errorCode?.startsWith('google_')) setError('Google login failed. Please try again.');
  }, []);

  const handleGetOtp = async () => {
    const digits = mobile.replace(/\D/g, '').slice(-10);
    if (digits.length !== 10) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setError('');
    setLoadingOtp(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: digits, purpose: 'login' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Failed to send OTP');
        return;
      }
      setMockUser({ mobile: digits });
      router.push('/verify-otp');
    } catch {
      setError('Failed to send OTP');
    } finally {
      setLoadingOtp(false);
    }
  };

  const handleLoginWithGoogle = () => {
    setError('');
    window.location.href = '/api/auth/google/start?next=/home';
  };

  const handlePasswordLogin = async () => {
    const digits = mobile.replace(/\D/g, '').slice(-10);
    if (digits.length !== 10 || !password.trim()) {
      setError('Enter mobile number and password');
      return;
    }
    setError('');
    setLoadingPassword(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mobile: digits, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Login failed');
        return;
      }
      setMockUser(data.user);
      setMockLoggedIn();
      router.replace(data.user?.role === 'ADMIN' || data.user?.role === 'STAFF' ? '/admin' : '/home');
    } catch {
      setError('Login failed');
    } finally {
      setLoadingPassword(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-white">
      <header className="safe-top border-b border-slate-200 dark:border-slate-200 px-4 py-3 flex items-center justify-center bg-white dark:bg-white">
        <Link href="/" className="flex shrink-0">
          <Image
            src="/eyekra-login-logo.png"
            alt="eyekra"
            width={90}
            height={90}
            className="object-contain w-auto h-auto"
            style={{ width: 'auto', height: 'auto' }}
            priority
          />
        </Link>
      </header>

      <main className="flex-1 px-5 pt-6 pb-12 flex flex-col max-w-md mx-auto w-full">
        <h1 className="text-slate-900 dark:text-slate-900 text-2xl font-bold mb-6">
          Login
        </h1>

        <Input
          type="tel"
          placeholder="Enter Mobile Number"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          className={`${inputFieldClass} mb-3`}
          autoComplete="tel"
          maxLength={10}
        />

        <div className="relative mb-4">
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${inputFieldClass} pr-12`}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-500 p-1"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>

        <button
          type="button"
          onClick={handleGetOtp}
          disabled={loadingOtp}
          className="common-btn common-btn--primary w-full mb-4"
        >
          {loadingOtp ? 'Sending OTP...' : 'Get OTP'}
        </button>

        <button
          type="button"
          onClick={handlePasswordLogin}
          disabled={loadingPassword}
          className="common-btn w-full mb-2"
        >
          {loadingPassword ? 'Signing in...' : 'Login with Password'}
        </button>

        {error ? (
          <p className="text-sm text-red-600 dark:text-red-500 mb-2">{error}</p>
        ) : null}

        <p className="text-center text-slate-500 dark:text-slate-500 text-sm my-3">
          OR
        </p>

        <button
          type="button"
          onClick={handleLoginWithGoogle}
          className="common-btn w-full flex items-center justify-center gap-2"
        >
          <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center text-sm font-bold" aria-hidden>G</span>
          <span>Login with Google</span>
        </button>

        <p className="text-center text-slate-600 dark:text-slate-600 text-sm mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-brand font-semibold">
            Sign up
          </Link>
        </p>
      </main>
    </div>
  );
}
