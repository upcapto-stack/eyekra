'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/Input';

export function PartnerSignUpView() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const errorCode = new URLSearchParams(window.location.search).get('error');
    if (errorCode === 'google_partner_only') setError('Google login is only allowed for partner accounts here.');
    else if (errorCode === 'google_not_configured') setError('Google sign up is not configured yet.');
    else if (errorCode?.startsWith('google_')) setError('Google sign up failed. Please try again.');
  }, []);

  const handleSignUp = async () => {
    if (!name.trim() || mobile.replace(/\D/g, '').length !== 10 || !email.trim() || password.length < 8) {
      setError('Please enter valid details for all fields');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/partner/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          mobile: mobile.replace(/\D/g, '').slice(-10),
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || 'Failed to create partner account');
        return;
      }
      router.replace('/partner');
    } catch {
      setError('Failed to create partner account');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = () => {
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
        <h1 className="text-slate-900 dark:text-slate-900 text-3xl font-bold mb-2">Partner Sign Up</h1>
        <p className="text-slate-600 text-sm mb-6">
          Register your partner profile to onboard with Eyekra.
        </p>

        <div className="mb-3">
          <Input
            type="text"
            placeholder="Partner / Store Name"
            autoComplete="organization"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <Input
            type="tel"
            placeholder="Mobile Number"
            autoComplete="tel"
            maxLength={10}
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <Input
            type="email"
            placeholder="Partner Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="mb-5">
          <Input
            type="password"
            placeholder="Create Password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="button" className="common-btn common-btn--primary w-full mb-3" onClick={handleSignUp} disabled={loading}>
          {loading ? 'Creating account...' : 'Create Partner Account'}
        </button>
        <button type="button" className="common-btn w-full mb-3" onClick={handleGoogleSignUp}>
          Sign up with Google
        </button>
        {error ? <p className="text-sm text-red-600 mb-5">{error}</p> : <div className="mb-5" />}

        <p className="text-center text-slate-600 text-sm">
          Already have a partner account?{' '}
          <Link href="/partner/login" className="text-brand font-semibold">
            Log in
          </Link>
        </p>
      </main>
    </div>
  );
}
