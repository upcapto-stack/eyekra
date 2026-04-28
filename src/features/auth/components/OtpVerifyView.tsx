'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, KeyboardEvent, ChangeEvent } from 'react';
import { isMockLoggedIn, setMockLoggedIn, setMockUser, getMockUser, syncSessionUser } from '@/lib/mock-auth';

const OTP_LENGTH = 6;
const inputFieldClass =
  'w-11 h-12 text-center text-lg font-semibold rounded-lg border border-slate-300 dark:border-slate-400 bg-white dark:bg-white text-slate-900 dark:text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent';

export function OtpVerifyView() {
  const router = useRouter();
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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

  const handleChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = v;
    setOtp(next);
    if (v && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const next = [...otp];
      next[index - 1] = '';
      setOtp(next);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
    const next = [...otp];
    pasted.forEach((char, i) => {
      next[i] = char;
    });
    setOtp(next);
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIdx]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) return;
    setLoading(true);
    setError('');
    try {
      const localUser = getMockUser();
      const signupRaw = sessionStorage.getItem('eyekra-signup-payload');
      const signupPayload = signupRaw ? JSON.parse(signupRaw) as { name?: string; email?: string; password?: string; purpose?: string } : null;
      const purpose = signupPayload?.purpose === 'signup' ? 'signup' : 'login';

      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          mobile: localUser.mobile,
          code,
          purpose,
          name: signupPayload?.name || localUser.name,
          email: signupPayload?.email || localUser.email,
          password: signupPayload?.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'OTP verification failed');
        return;
      }
      setMockUser(data.user);
      setMockLoggedIn();
      sessionStorage.removeItem('eyekra-signup-payload');
      router.replace(data.user?.role === 'ADMIN' || data.user?.role === 'STAFF' ? '/admin' : '/home');
    } catch {
      setError('OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const isComplete = otp.every((d) => d !== '');

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-white">
      <header className="safe-top bg-white dark:bg-white border-b border-slate-200 dark:border-slate-200 px-4 py-3 flex items-center justify-between">
        <Link href="/signup" className="text-slate-700 dark:text-slate-700 text-sm font-semibold" aria-label="Back">
          Back
        </Link>
        <Image
          src="/eyekra-login-logo.png"
          alt="eyekra"
          width={80}
          height={80}
          className="object-contain w-auto h-auto"
          style={{ width: 'auto', height: 'auto' }}
        />
        <span className="w-8" />
      </header>

      <main className="flex-1 px-5 pt-8 pb-12 flex flex-col items-center bg-white dark:bg-white">
        <div className="w-full max-w-sm bg-white dark:bg-white rounded-2xl shadow-lg p-6 border border-slate-200 dark:border-slate-200">
          <p className="text-slate-600 dark:text-slate-600 text-sm text-center mb-6">
            Enter the 6-digit code sent to your mobile number
          </p>

          <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={inputFieldClass}
                aria-label={`Digit ${i + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleVerify}
            disabled={!isComplete || loading}
            className="common-btn common-btn--primary w-full mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
          {error ? <p className="text-sm text-red-600 dark:text-red-500 text-center mb-4">{error}</p> : null}

          <p className="text-center text-slate-500 dark:text-slate-500 text-sm">
            Didn&apos;t receive the code?{' '}
            <button type="button" className="text-brand font-semibold">
              Resend OTP
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
