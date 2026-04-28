'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { isMockLoggedIn, setMockUser, syncSessionUser } from '@/lib/mock-auth';

const inputFieldClass =
  'bg-white dark:bg-white border-slate-300 dark:border-slate-400 text-slate-900 dark:text-slate-900 placeholder:text-slate-500 dark:placeholder:text-slate-500';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_REGEX = /^[6-9]\d{9}$/;

function validateName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return 'Name is required';
  if (trimmed.length < 2) return 'Name must be at least 2 characters';
  return '';
}

function validateMobile(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return 'Mobile number is required';
  if (digits.length !== 10) return 'Enter a valid 10-digit mobile number';
  if (!MOBILE_REGEX.test(digits)) return 'Enter a valid Indian mobile number';
  return '';
}

function validateEmail(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return 'Email is required';
  if (!EMAIL_REGEX.test(trimmed)) return 'Enter a valid email address';
  return '';
}

function validatePassword(value: string): string {
  if (!value) return 'Password is required';
  if (value.length < 8) return 'Password must be at least 8 characters';
  return '';
}

export function SignUpView() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    void (async () => {
      const user = await syncSessionUser();
      if (user) {
        router.replace('/home');
        return;
      }
      if (isMockLoggedIn()) router.replace('/home');
    })();
  }, [router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const errorCode = new URLSearchParams(window.location.search).get('error');
    if (errorCode === 'google_customer_only') setServerError('Google login is only allowed for customer accounts.');
    else if (errorCode === 'google_not_configured') setServerError('Google login is not configured yet.');
    else if (errorCode?.startsWith('google_')) setServerError('Google sign up failed. Please try again.');
  }, []);

  const handleBlur = (field: string) => {
    let msg = '';
    switch (field) {
      case 'name':
        msg = validateName(name);
        break;
      case 'mobile':
        msg = validateMobile(mobile);
        break;
      case 'email':
        msg = validateEmail(email);
        break;
      case 'password':
        msg = validatePassword(password);
        break;
    }
    setErrors((e) => ({ ...e, [field]: msg }));
  };

  const handleSignUp = async () => {
    const nameErr = validateName(name);
    const mobileErr = validateMobile(mobile);
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);

    setErrors({
      name: nameErr,
      mobile: mobileErr,
      email: emailErr,
      password: passwordErr,
    });

    if (nameErr || mobileErr || emailErr || passwordErr) return;

    const payload = {
      name: name.trim(),
      mobile: mobile.replace(/\D/g, '').slice(-10),
      email: email.trim().toLowerCase(),
      password,
      purpose: 'signup',
    };

    setLoading(true);
    setServerError('');
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data?.error || 'Failed to send OTP');
        return;
      }
      setMockUser({ name: payload.name, mobile: payload.mobile, email: payload.email });
      sessionStorage.setItem('eyekra-signup-payload', JSON.stringify(payload));
      router.push('/verify-otp');
    } catch {
      setServerError('Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-50">
      <header className="safe-top pt-6 pb-2 flex justify-center shrink-0">
        <Link href="/">
          <Image
            src="/eyekra-login-logo.png"
            alt="eyekra"
            width={120}
            height={120}
            className="object-contain w-auto h-auto"
            style={{ width: 'auto', height: 'auto' }}
          />
        </Link>
      </header>

      <main className="flex-1 px-5 pt-4 pb-12 flex flex-col max-w-md mx-auto w-full">
        <h2 className="text-slate-800 dark:text-slate-900 text-3xl font-bold mb-6 w-full">
          Sign Up
        </h2>

        <div className="mb-3">
          <Input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => handleBlur('name')}
            className={`${inputFieldClass} w-full ${errors.name ? 'border-red-500 dark:border-red-500' : ''}`}
            autoComplete="name"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
          )}
        </div>

        <div className="mb-3">
          <Input
            type="tel"
            placeholder="Mobile Number (10 digits)"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            onBlur={() => handleBlur('mobile')}
            className={`${inputFieldClass} w-full ${errors.mobile ? 'border-red-500 dark:border-red-500' : ''}`}
            autoComplete="tel"
            maxLength={10}
          />
          {errors.mobile && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.mobile}</p>
          )}
        </div>

        <div className="mb-3">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => handleBlur('email')}
            className={`${inputFieldClass} w-full ${errors.email ? 'border-red-500 dark:border-red-500' : ''}`}
            autoComplete="email"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
          )}
        </div>

        <div className="mb-6">
          <Input
            type="password"
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => handleBlur('password')}
            className={`${inputFieldClass} w-full ${errors.password ? 'border-red-500 dark:border-red-500' : ''}`}
            autoComplete="new-password"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>
          )}
        </div>

        <button
          type="button"
          onClick={handleSignUp}
          disabled={loading}
          className="common-btn common-btn--primary w-full mb-4"
        >
          {loading ? 'Sending OTP...' : 'Sign Up'}
        </button>

        {serverError ? <p className="text-sm text-red-600 dark:text-red-500 mb-4">{serverError}</p> : null}

        <button
          type="button"
          onClick={() => {
            setServerError('');
            window.location.href = '/api/auth/google/start?next=/home';
          }}
          className="common-btn w-full mb-6"
        >
          Sign up with Google
        </button>

        <p className="text-center text-slate-600 dark:text-slate-400 text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-brand font-semibold">
            Log in
          </Link>
        </p>
      </main>
    </div>
  );
}
