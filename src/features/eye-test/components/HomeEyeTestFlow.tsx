'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { AddressAutocompleteInput } from '@/components/ui/AddressAutocompleteInput';
import { getMockUser } from '@/lib/mock-auth';
import {
  getLocation,
  getLocations,
  getSelectedIndex,
  setLocation,
  setLocations,
  setSelectedLocationIndex,
  addLocation,
  updateLocationAtIndex,
  removeLocationAtIndex,
  type SavedLocation,
} from '@/lib/location';
import { reverseGeocode } from '@/lib/google-places';
import { filterProducts, getProductsList, type Product } from '@/lib/products-data';
import type { AppConfig } from '@/types/app-config';
import { getSlotsForDate } from '@/lib/eye-test-slots';
import { getTryonIds, removeFromTryon, TRYON_MAX_FRAMES } from '@/lib/tryon';
import { useEffect, useCallback } from 'react';

const inputClass =
  'bg-white dark:bg-white border-slate-300 dark:border-slate-400 text-slate-900 dark:text-slate-900 placeholder:text-slate-500';

type Step = 1 | 2 | 3 | 4 | 5 | 6; // 1=Intro, 2=Cart, 3=Details, 4=Date, 5=Confirm, 6=Success

interface FormData {
  name: string;
  mobile: string;
  email: string;
  address: string;
  preferredDate: string;
  preferredSlotId: string;
}

interface Patient {
  name: string;
  mobile: string;
}

export function HomeEyeTestFlow() {
  const router = useRouter();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>({
    name: '',
    mobile: '',
    email: '',
    address: '',
    preferredDate: '',
    preferredSlotId: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [savedLocation, setSavedLocation] = useState<SavedLocation>(() => getLocation());
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showFullPolicy, setShowFullPolicy] = useState(false);
  const [recommendationIndex, setRecommendationIndex] = useState(0);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [editingPatientIndex, setEditingPatientIndex] = useState<number | null>(null);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [addMemberForm, setAddMemberForm] = useState<Patient>({ name: '', mobile: '' });
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [tryonIds, setTryonIds] = useState<string[]>([]);

  const syncTryonIds = useCallback(() => setTryonIds(getTryonIds()), []);

  useEffect(() => {
    fetch('/api/config').then((r) => (r.ok ? r.json() : null)).then((d) => d && setConfig(d)).catch(() => {});
  }, []);

  useEffect(() => {
    if (step === 5) syncTryonIds();
  }, [step, syncTryonIds]);

  useEffect(() => {
    const onVisible = () => {
      if (step === 5) syncTryonIds();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [step, syncTryonIds]);

  const productList = getProductsList(config?.products);
  const topSellers = filterProducts({ collection: 'top-sellers' }, productList);

  useEffect(() => {
    if (step === 2) setSavedLocation(getLocation());
  }, [step]);

  useEffect(() => {
    if (step === 2 && topSellers.length > 0) {
      const t = setInterval(() => {
        setRecommendationIndex((i) => (i + 1) % topSellers.length);
      }, 3000);
      return () => clearInterval(t);
    }
  }, [step, topSellers.length]);

  useEffect(() => {
    if (step === 4) {
      const user = getMockUser();
      const loc = getLocation();
      setSavedLocation(loc);
      setForm((f) => ({
        ...f,
        name: user.name || f.name,
        mobile: user.mobile || f.mobile,
        email: user.email || f.email,
        address: loc.address || f.address,
      }));
      setPatients([]);
      setEditingPatientIndex(null);
      setShowAddMemberForm(false);
    }
  }, [step]);

  const update = (key: keyof FormData, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };

  const validateStep4 = (): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.mobile.trim()) e.mobile = 'Mobile is required';
    else if (!/^[6-9]\d{9}$/.test(form.mobile.replace(/\D/g, ''))) e.mobile = 'Enter a valid 10-digit number';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.address.trim()) e.address = 'Address is required';
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return false;
    }
    for (const p of patients) {
      if (!p.name.trim()) {
        setErrors((prev) => ({ ...prev, address: 'Family member name is required' }));
        return false;
      }
      if (!p.mobile.trim()) {
        setErrors((prev) => ({ ...prev, address: 'Family member mobile is required' }));
        return false;
      }
      if (!/^[6-9]\d{9}$/.test(p.mobile.replace(/\D/g, ''))) {
        setErrors((prev) => ({ ...prev, address: 'Valid 10-digit mobile for family member' }));
        return false;
      }
    }
    setErrors({});
    return true;
  };

  const openAddMemberForm = () => {
    setAddMemberForm({ name: '', mobile: '' });
    setShowAddMemberForm(true);
    setEditingPatientIndex(null);
  };

  const submitAddMember = () => {
    const name = addMemberForm.name.trim();
    const mobile = addMemberForm.mobile.replace(/\D/g, '');
    if (!name) {
      setErrors((e) => ({ ...e, address: 'Name is required' }));
      return;
    }
    if (!addMemberForm.mobile.trim()) {
      setErrors((e) => ({ ...e, address: 'Mobile is required' }));
      return;
    }
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setErrors((e) => ({ ...e, address: 'Enter a valid 10-digit mobile number' }));
      return;
    }
    setErrors((e) => ({ ...e, address: '' }));
    setPatients((p) => [...p, { name, mobile: addMemberForm.mobile.trim() }]);
    setAddMemberForm({ name: '', mobile: '' });
    setShowAddMemberForm(false);
  };

  const updatePatient = (index: number, field: 'name' | 'mobile', value: string) => {
    setPatients((p) => {
      const next = [...p];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removePatient = (index: number) => {
    setPatients((p) => p.filter((_, i) => i !== index));
    setEditingPatientIndex((i) => (i === index ? null : i != null && i > index ? i - 1 : i));
  };

  const handleNext = () => {
    if (step === 1) setStep(2);
    else if (step === 2) setStep(3); // ₹99 page → Calendar + slot
    else if (step === 3) setStep(4); // Calendar+slot → Details (date/slot saved on Continue)
    else if (step === 4 && validateStep4()) setStep(5); // Details → Summary
  };

  const [confirming, setConfirming] = useState(false);
  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const slotLabel = getSlotsForDate(form.preferredDate).find((s) => s.id === form.preferredSlotId)?.label;
      const addressStr = savedLocation.flatNo ? `${savedLocation.flatNo}, ${form.address}` : form.address;
      const amount = 99 * (1 + patients.length) - couponDiscount;
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: { name: form.name.trim(), mobile: form.mobile.trim(), email: form.email.trim() },
          address: addressStr,
          deliveryAddress: savedLocation,
          preferredDate: form.preferredDate,
          preferredSlotId: form.preferredSlotId,
          slotLabel,
          amount: Math.max(0, amount),
          patients: patients.length ? patients : undefined,
          tryonFrameIds: tryonIds.length ? tryonIds : undefined,
        }),
      });
      if (res.ok) setStep(6);
      else setConfirming(false);
    } catch {
      setConfirming(false);
    }
  };

  if (step === 6) {
    return (
      <div className="min-h-screen flex flex-col bg-white dark:bg-slate-900">
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-6">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8 text-emerald-600 dark:text-emerald-400">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Booking requested</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 max-w-sm">
            We&apos;ll call you on {form.mobile} to confirm your slot. Our team will visit you for a free eye check-up at your doorstep.
          </p>
          <Link href="/home" className="common-btn common-btn--primary">
            Back to Home
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-50 dark:bg-slate-900">
      {step !== 1 && (
        <header className="safe-top sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setStep((s) => (s - 1) as Step)}
            className="p-2 -ml-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Back"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {step === 2 ? (
            <>
              <div className="flex-1 flex justify-center">
                <Image
                  src="/eyekra-login-logo.png"
                  alt="eyekra"
                  width={140}
                  height={140}
                  className="object-contain w-auto h-12"
                  style={{ width: 'auto', height: '3rem' }}
                />
              </div>
              <span className="w-9 shrink-0" aria-hidden />
            </>
          ) : (
            <h1 className="flex-1 text-slate-900 dark:text-slate-100 text-lg font-bold">
              Home Eye Test
            </h1>
          )}
          {step !== 2 && <span className="text-slate-400 text-sm">Step {step - 1}/4</span>}
        </header>
      )}

      <main className={`flex-1 px-4 flex flex-col ${step === 1 ? 'pt-4 safe-top pb-10' : 'py-6 pb-10'}`}>
        {step === 1 && (
          <div className="flex-1 flex flex-col min-h-0 max-w-md mx-auto w-full">
            <div className="flex-1 overflow-y-auto flex flex-col items-center pb-28">
              <Link
                href="/home"
                className="self-start p-2 -ml-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 mb-4"
                aria-label="Back"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link href="/home" className="shrink-0 mb-8">
                <Image
                  src="/eyekra-login-logo.png"
                  alt="eyekra"
                  width={120}
                  height={120}
                  className="object-contain w-auto h-14"
                  style={{ width: 'auto', height: '3.5rem' }}
                />
              </Link>
              <p className="text-slate-700 dark:text-slate-300 text-center text-lg font-semibold mb-2">
                Free eye test at your doorstep
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-center text-sm mb-8">
                Our optometrist visits you. No commitment, no charges.
              </p>
              <div className="flex-1 flex items-center justify-center w-full max-w-[280px] aspect-square min-h-[200px]">
                <svg viewBox="0 0 200 200" fill="none" className="w-full h-full text-slate-300 dark:text-slate-600" aria-hidden>
                  <circle cx="100" cy="100" r="85" stroke="currentColor" strokeWidth="2" />
                  <circle cx="100" cy="85" r="25" stroke="currentColor" strokeWidth="2" />
                  <circle cx="100" cy="85" r="8" fill="currentColor" />
                  <path d="M70 120 Q100 140 130 120" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <rect x="75" y="155" width="50" height="8" rx="2" fill="currentColor" opacity="0.5" />
                  <path d="M60 100 L50 100 M150 100 L140 100" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M100 55 L100 45" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="100" cy="100" r="45" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
                </svg>
              </div>
            </div>
            <div className="fixed bottom-0 left-0 right-0 z-10 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-4 py-3 safe-bottom">
              <div className="max-w-md mx-auto">
                <button type="button" onClick={handleNext} className="common-btn common-btn--primary w-full py-3">
                  Get started
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: ₹99 banner page with address + Select slot */}
        {step === 2 && (
          <div className="flex-1 flex flex-col min-h-0 max-w-md mx-auto w-full">
            <div className="flex-1 overflow-y-auto pb-44">
              <section className="mb-5">
                <div className="rounded-2xl overflow-hidden bg-gradient-to-r from-[#fe5001] to-[#e54800] p-5 text-white shadow-lg">
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <h2 className="font-bold text-lg text-white">Free eye test at home</h2>
                      <ul className="mt-2 text-white/90 text-sm space-y-1">
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                          Full eye check-up at your doorstep
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                          Prescription on the spot
                        </li>
                      </ul>
                    </div>
                    <p className="text-white font-bold text-xl shrink-0">₹99</p>
                  </div>
                </div>
              </section>

              <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700/50 p-4 mb-5">
                <p className="text-slate-800 dark:text-slate-200 text-sm font-medium">
                  Like our service? Buy glasses from us and this eye test will be <span className="font-bold text-[#fe5001]">free</span>.
                </p>
              </div>

              <section className="mb-5" aria-label="Home try-on recommendation">
                <h3 className="text-slate-900 dark:text-slate-100 font-semibold text-sm mb-3">Home try-on recommendation</h3>
                <p className="text-slate-600 dark:text-slate-400 text-xs mb-3">
                  Get frames delivered at home to try before you buy. Free trial, no commitment.
                </p>
                {topSellers.length > 0 ? (
                  <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800">
                    <div
                      className="flex transition-transform duration-500 ease-out"
                      style={{ transform: `translateX(-${recommendationIndex * 100}%)` }}
                    >
                      {topSellers.map((product) => (
                        <Link
                          key={product.id}
                          href={`/products/${product.id}`}
                          className="shrink-0 w-full flex flex-col"
                        >
                          <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center relative">
                            {product.discount && (
                              <span className="absolute top-2 left-2 bg-[#fe5001] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                                {product.discount}
                              </span>
                            )}
                          </div>
                          <div className="p-3 border-t border-slate-200 dark:border-slate-600">
                            <p className="text-slate-900 dark:text-slate-100 font-semibold text-sm truncate">{product.name}</p>
                            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{product.price}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                    <div className="flex justify-center gap-1.5 py-2">
                      {topSellers.map((_, i) => (
                        <span
                          key={i}
                          className={`h-1.5 rounded-full transition-all ${i === recommendationIndex ? 'w-4 bg-[#fe5001]' : 'w-1.5 bg-slate-300 dark:bg-slate-600'}`}
                          aria-hidden
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <Link
                    href="/products"
                    className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-slate-100 font-medium text-sm hover:border-[#fe5001]/50 transition-colors"
                  >
                    <span>Browse frames for home try-on</span>
                    <span className="text-[#fe5001]">→</span>
                  </Link>
                )}
              </section>

              <section className="mb-5" aria-label="Payment summary">
                <h3 className="text-slate-900 dark:text-slate-100 font-semibold text-sm mb-3">Payment summary</h3>
                <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 overflow-hidden">
                  <div className="flex justify-between items-center px-4 py-3 border-b border-slate-200 dark:border-slate-600">
                    <span className="text-slate-600 dark:text-slate-400 text-sm">Home eye test</span>
                    <span className="text-slate-900 dark:text-slate-100 font-medium text-sm">₹99</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-slate-900 dark:text-slate-100 font-semibold text-sm">Total</span>
                    <span className="text-slate-900 dark:text-slate-100 font-bold text-base">₹99</span>
                  </div>
                </div>
              </section>

              <section className="mb-5" aria-label="Cancellation policy">
                <h3 className="text-slate-900 dark:text-slate-100 font-semibold text-sm mb-2">Cancellation policy</h3>
                <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
                  <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                    You can cancel or reschedule your home eye test free of charge up to 12 hours before the scheduled slot. Cancellations within 12 hours may be subject to a fee. If you purchase glasses from us after the test, the ₹99 test fee will be waived.
                  </p>
                  {showFullPolicy && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 text-xs leading-relaxed space-y-2">
                      <p><strong className="text-slate-700 dark:text-slate-300">Free cancellation:</strong> Cancel or reschedule at least 12 hours before your slot — no charges.</p>
                      <p><strong className="text-slate-700 dark:text-slate-300">Late cancellation:</strong> Cancellation or reschedule within 12 hours of the slot may incur a fee of up to ₹99.</p>
                      <p><strong className="text-slate-700 dark:text-slate-300">No-show:</strong> If our optometrist visits and you are not available, the full fee may be charged.</p>
                      <p><strong className="text-slate-700 dark:text-slate-300">Refund:</strong> If eligible, refunds are processed within 5–7 business days to the original payment method.</p>
                      <p><strong className="text-slate-700 dark:text-slate-300">Glasses purchase:</strong> If you buy glasses from Eyekra after the test, the ₹99 eye test fee is waived automatically.</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowFullPolicy((v) => !v)}
                    className="mt-3 text-[#fe5001] font-semibold text-xs hover:underline focus:outline-none focus:underline"
                  >
                    {showFullPolicy ? 'Show less' : 'Read full policy'}
                  </button>
                </div>
              </section>
            </div>
            <div className="fixed bottom-0 left-0 right-0 z-10 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-4 pt-3 pb-3 safe-bottom">
              <div className="max-w-md mx-auto space-y-3">
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
                  <span className="text-slate-500 dark:text-slate-400 shrink-0" aria-hidden>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">{savedLocation.displayName}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs truncate">
                      {savedLocation.flatNo ? `${savedLocation.flatNo}, ${savedLocation.address}` : savedLocation.address}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLocationModal(true)}
                    className="shrink-0 p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    aria-label="Edit address"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                </div>
                <button type="button" onClick={handleNext} className="common-btn common-btn--primary w-full py-3 text-base">
                  Select slot
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Calendar + slot selection → Continue */}
        {step === 3 && (
          <div className="flex-1 flex flex-col min-h-0 max-w-md mx-auto w-full">
            <div className="flex-1 overflow-y-auto pb-28">
              <section className="mb-5" aria-label="Select date">
                <h3 className="text-slate-900 dark:text-slate-100 font-semibold text-sm mb-3">Select date</h3>
                <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-600">
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarMonth((m) => {
                          const d = new Date(m.year, m.month - 1);
                          return { year: d.getFullYear(), month: d.getMonth() };
                        })
                      }
                      className="p-2 -m-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      aria-label="Previous month"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                        <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <span className="text-slate-900 dark:text-slate-100 font-semibold text-sm">
                      {new Date(calendarMonth.year, calendarMonth.month).toLocaleDateString('en-IN', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarMonth((m) => {
                          const d = new Date(m.year, m.month + 1);
                          return { year: d.getFullYear(), month: d.getMonth() };
                        })
                      }
                      className="p-2 -m-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      aria-label="Next month"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                        <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                  <div className="p-3">
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <span key={day} className="text-slate-500 dark:text-slate-400 text-[10px] font-medium py-1">
                          {day}
                        </span>
                      ))}
                      {(() => {
                        const { year, month } = calendarMonth;
                        const first = new Date(year, month, 1);
                        const last = new Date(year, month + 1, 0);
                        const startPad = first.getDay();
                        const daysInMonth = last.getDate();
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const cells: (number | null)[] = [];
                        for (let i = 0; i < startPad; i++) cells.push(null);
                        for (let d = 1; d <= daysInMonth; d++) cells.push(d);
                        return cells.map((d, i) => {
                          if (d === null) return <span key={`e-${i}`} className="py-2" />;
                          const date = new Date(year, month, d);
                          const isPast = date < today;
                          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                          const isSelected = selectedDate === dateStr;
                          return (
                            <button
                              key={d}
                              type="button"
                              disabled={isPast}
                              onClick={() => {
                                setSelectedDate(dateStr);
                                setSelectedSlotId('');
                              }}
                              className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                                isPast
                                  ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                  : isSelected
                                    ? 'bg-[#fe5001] text-white'
                                    : 'text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700'
                              }`}
                            >
                              {d}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              </section>

              <section className="mb-5" aria-label="Select slot">
                <h3 className="text-slate-900 dark:text-slate-100 font-semibold text-sm mb-3">Select slot</h3>
                {selectedDate ? (
                  <p className="text-slate-500 dark:text-slate-400 text-xs mb-2">
                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-IN', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                ) : null}
                <div className="grid grid-cols-2 gap-2">
                  {(selectedDate ? getSlotsForDate(selectedDate) : []).map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setSelectedSlotId(slot.id)}
                      className={`py-3 px-4 rounded-xl border text-sm font-medium transition-colors ${
                        selectedSlotId === slot.id
                          ? 'border-[#fe5001] bg-[#fe5001]/10 text-[#fe5001]'
                          : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:border-[#fe5001]/50'
                      }`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
                {selectedDate && getSlotsForDate(selectedDate).length === 0 && (
                  <p className="text-slate-500 dark:text-slate-400 text-sm">No slots available for this date.</p>
                )}
              </section>
            </div>
            <div className="fixed bottom-0 left-0 right-0 z-10 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-4 py-3 safe-bottom">
              <div className="max-w-md mx-auto">
                <button
                  type="button"
                  disabled={!selectedDate || !selectedSlotId}
                  onClick={() => {
                    setForm((f) => ({ ...f, preferredDate: selectedDate, preferredSlotId: selectedSlotId }));
                    handleNext();
                  }}
                  className="common-btn common-btn--primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="max-w-md mx-auto w-full pb-8">
            <h2 className="text-slate-900 dark:text-slate-100 font-semibold mb-4">Your details</h2>

            <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 p-4 mb-5 space-y-3">
              <p className="text-slate-700 dark:text-slate-200 text-sm">
                <span className="text-slate-500 dark:text-slate-400 text-xs block">Name</span>
                {form.name || '—'}
              </p>
              <p className="text-slate-700 dark:text-slate-200 text-sm">
                <span className="text-slate-500 dark:text-slate-400 text-xs block">Mobile</span>
                {form.mobile || '—'}
              </p>
              <p className="text-slate-700 dark:text-slate-200 text-sm">
                <span className="text-slate-500 dark:text-slate-400 text-xs block">Email</span>
                {form.email || '—'}
              </p>
              <div className="flex items-start justify-between gap-2">
                <p className="text-slate-700 dark:text-slate-200 text-sm min-w-0">
                  <span className="text-slate-500 dark:text-slate-400 text-xs block">Address</span>
                  {savedLocation.flatNo ? `${savedLocation.flatNo}, ${savedLocation.address}` : form.address || '—'}
                </p>
                <button
                  type="button"
                  onClick={() => setShowLocationModal(true)}
                  className="shrink-0 px-2 py-1 rounded-lg bg-amber-500 text-slate-900 text-xs font-semibold hover:bg-amber-400"
                >
                  Change
                </button>
              </div>
            </div>

            <section className="mb-5">
              <h3 className="text-slate-900 dark:text-slate-100 font-semibold text-sm mb-3">Add family members</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs mb-3">Optional. Add others (e.g. brother) who also want the eye test.</p>
              <div className="space-y-3">
                {patients.map((patient, index) => (
                  <div
                    key={index}
                    className="relative rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4 pr-12"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removePatient(index);
                      }}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600"
                      aria-label="Remove"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                        <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <div className="flex items-center justify-end gap-1 mb-2">
                      <button
                        type="button"
                        onClick={() => setEditingPatientIndex((i) => (i === index ? null : index))}
                        className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                        aria-label="Edit"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    </div>
                    {editingPatientIndex === index ? (
                      <div className="space-y-3">
                        <Input
                          placeholder="Name"
                          value={patient.name}
                          onChange={(e) => updatePatient(index, 'name', e.target.value)}
                          className={inputClass}
                        />
                        <Input
                          type="tel"
                          placeholder="Mobile number"
                          value={patient.mobile}
                          onChange={(e) => updatePatient(index, 'mobile', e.target.value)}
                          maxLength={10}
                          className={inputClass}
                        />
                        <button
                          type="button"
                          onClick={() => setEditingPatientIndex(null)}
                          className="text-xs font-medium text-[#fe5001]"
                        >
                          Done
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1 text-sm">
                        <p className="text-slate-900 dark:text-slate-100">{patient.name || '—'}</p>
                        <p className="text-slate-600 dark:text-slate-400">{patient.mobile || '—'}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {showAddMemberForm ? (
                <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4 space-y-3">
                  <p className="text-slate-700 dark:text-slate-200 text-sm font-medium">New family member</p>
                  <Input
                    placeholder="Name"
                    value={addMemberForm.name}
                    onChange={(e) => setAddMemberForm((f) => ({ ...f, name: e.target.value }))}
                    className={inputClass}
                  />
                  <Input
                    type="tel"
                    placeholder="Mobile number"
                    value={addMemberForm.mobile}
                    onChange={(e) => setAddMemberForm((f) => ({ ...f, mobile: e.target.value }))}
                    maxLength={10}
                    className={inputClass}
                  />
                  {errors.address && <p className="text-red-500 text-xs">{errors.address}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddMemberForm(false);
                        setAddMemberForm({ name: '', mobile: '' });
                        setErrors((e) => ({ ...e, address: '' }));
                      }}
                      className="common-btn flex-1"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={submitAddMember}
                      className="common-btn common-btn--primary flex-1"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openAddMemberForm}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 text-sm font-medium hover:border-[#fe5001] hover:text-[#fe5001] transition-colors"
                >
                  <span className="text-lg" aria-hidden>+</span>
                  Add family member
                </button>
              )}
            </section>

            <button type="button" onClick={handleNext} className="common-btn common-btn--primary w-full">
              Next
            </button>
          </div>
        )}

        {(step === 2 || step === 4) && showLocationModal && (
          <SavedAddressModal
            onProceed={() => {
              setSavedLocation(getLocation());
              if (step === 4) setForm((f) => ({ ...f, address: getLocation().address }));
              setShowLocationModal(false);
            }}
            onClose={() => setShowLocationModal(false)}
          />
        )}

        {step === 5 && (
          <div className="max-w-md mx-auto w-full pb-8">
            <h2 className="text-slate-900 dark:text-slate-100 font-semibold mb-4">Summary</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Review your booking details and pay.</p>

            <div className="rounded-xl border border-slate-200 dark:border-slate-600 p-4 space-y-3 mb-4">
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">Email:</span> {form.email}
              </p>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">Address:</span> {savedLocation.flatNo ? `${savedLocation.flatNo}, ${form.address}` : form.address}
              </p>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">Date:</span>{' '}
                {form.preferredDate
                  ? new Date(form.preferredDate + 'T12:00:00').toLocaleDateString('en-IN', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—'}
              </p>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">Slot:</span>{' '}
                {form.preferredSlotId
                  ? getSlotsForDate(form.preferredDate).find((s) => s.id === form.preferredSlotId)?.label ?? form.preferredSlotId
                  : '—'}
              </p>
            </div>

            {/* Selected home try-on frames (linked with Home Try-on) */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden mb-4">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Selected home try-on frames</span>
                {tryonIds.length > 0 && (
                  <span className="text-slate-500 dark:text-slate-400 text-xs">{tryonIds.length}/{TRYON_MAX_FRAMES}</span>
                )}
              </div>
              <div className="p-3">
                <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-1">
                  {tryonIds
                    .map((id) => productList.find((p) => p.id === id))
                    .filter((p): p is Product => p != null)
                    .map((product) => (
                      <div
                        key={product.id}
                        className="shrink-0 w-28 rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden bg-white dark:bg-slate-800"
                      >
                        <Link href={`/products/${product.id}`} className="block aspect-square bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600" />
                        <div className="p-2">
                          <p className="text-slate-900 dark:text-slate-100 text-xs font-medium truncate">{product.name}</p>
                          <button
                            type="button"
                            onClick={() => {
                              removeFromTryon(product.id);
                              syncTryonIds();
                            }}
                            className="text-red-600 dark:text-red-400 text-[10px] font-medium mt-0.5"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  {tryonIds.length < TRYON_MAX_FRAMES && (
                    <Link
                      href="/tryon"
                      className="shrink-0 w-28 h-full min-h-[120px] rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center gap-1 bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 hover:border-[#fe5001] hover:text-[#fe5001] transition-colors"
                    >
                      <span className="text-2xl font-light leading-none" aria-hidden>+</span>
                      <span className="text-xs font-medium">Add frame</span>
                    </Link>
                  )}
                </div>
                {tryonIds.length === 0 && (
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Add frames from Home Try-on to get them delivered with your eye test.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden mb-4">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50">
                <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Booking (cart)</span>
              </div>
              <ul className="divide-y divide-slate-200 dark:divide-slate-600">
                <li className="flex justify-between items-center px-4 py-3">
                  <div>
                    <p className="text-slate-900 dark:text-slate-100 text-sm font-medium">You: {form.name || '—'}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs">{form.mobile || '—'}</p>
                  </div>
                  <span className="text-slate-900 dark:text-slate-100 font-medium text-sm">₹99</span>
                </li>
                {patients.map((p, i) => (
                  <li key={i} className="flex justify-between items-center px-4 py-3">
                    <div>
                      <p className="text-slate-900 dark:text-slate-100 text-sm font-medium">Family member: {p.name || '—'}</p>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">{p.mobile || '—'}</p>
                    </div>
                    <span className="text-slate-900 dark:text-slate-100 font-medium text-sm">₹99</span>
                  </li>
                ))}
              </ul>
              <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">₹{99 * (1 + patients.length)}</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-600 p-4 mb-6">
              <p className="text-slate-700 dark:text-slate-200 text-sm font-medium mb-2">Coupon code</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className={`${inputClass} flex-1`}
                  disabled={!!appliedCoupon}
                />
                <button
                  type="button"
                  onClick={() => {
                    const code = couponCode.trim().toUpperCase();
                    if (!code) return;
                    if (appliedCoupon) {
                      setAppliedCoupon(null);
                      setCouponDiscount(0);
                      setCouponCode('');
                      return;
                    }
                    if (code === 'EYEKRA10') {
                      const subtotal = 99 * (1 + patients.length);
                      setCouponDiscount(Math.min(10, Math.floor(subtotal * 0.1)));
                      setAppliedCoupon(code);
                    } else {
                      setAppliedCoupon(null);
                      setCouponDiscount(0);
                    }
                  }}
                  className="common-btn common-btn--primary shrink-0"
                >
                  {appliedCoupon ? 'Remove' : 'Apply'}
                </button>
              </div>
              {appliedCoupon && (
                <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-2">
                  Applied: {appliedCoupon} (−₹{couponDiscount})
                </p>
              )}
            </div>

            <div className="flex justify-between items-center mb-6 text-base font-semibold text-slate-900 dark:text-slate-100">
              <span>Total</span>
              <span>₹{99 * (1 + patients.length) - couponDiscount}</span>
            </div>

            <button type="button" onClick={handleConfirm} disabled={confirming} className="common-btn common-btn--primary w-full py-3 text-base disabled:opacity-50">
              {confirming ? 'Booking…' : 'Pay now'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function SavedAddressModal({
  onProceed,
  onClose,
}: {
  onProceed: () => void;
  onClose: () => void;
}) {
  const [locations, setLocationsState] = useState<SavedLocation[]>(() => getLocations());
  const [selectedIndex, setSelectedIndexState] = useState(() => getSelectedIndex());
  const [mode, setMode] = useState<'list' | 'add' | 'edit'>('list');
  const [editIndex, setEditIndex] = useState<number>(0);
  const [form, setForm] = useState<SavedLocation>({ displayName: '', address: '', flatNo: '', contact: '' });
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);

  const syncFromStorage = () => {
    setLocationsState(getLocations());
    setSelectedIndexState(getSelectedIndex());
  };

  const handleProceed = () => {
    setSelectedLocationIndex(selectedIndex);
    onProceed();
  };

  const handleAddAnother = () => {
    setForm({ displayName: '', address: '', flatNo: '', contact: '' });
    setMode('add');
  };

  const handleEdit = (index: number) => {
    const loc = locations[index];
    setEditIndex(index);
    setForm({ ...loc, contact: loc.contact ?? '', flatNo: loc.flatNo ?? '' });
    setMode('edit');
  };

  const handleSaveAddress = () => {
    if (!form.displayName.trim() || !form.address.trim()) return;
    const loc: SavedLocation = {
      displayName: form.displayName.trim(),
      address: form.address.trim(),
      flatNo: form.flatNo?.trim() || undefined,
      contact: form.contact?.trim() || undefined,
    };
    if (mode === 'add') {
      addLocation(loc);
      syncFromStorage();
      setSelectedIndexState(getLocations().length - 1);
    } else {
      updateLocationAtIndex(editIndex, loc);
      syncFromStorage();
    }
    setMode('list');
  };

  const handleDelete = (index: number) => {
    removeLocationAtIndex(index);
    syncFromStorage();
    setMode('list');
  };

  if (mode === 'add' || mode === 'edit') {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setMode('list')}>
        <div
          className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-600 shrink-0">
            <h3 className="text-slate-900 dark:text-slate-100 font-semibold text-lg">
              {mode === 'add' ? 'Add address' : 'Edit address'}
            </h3>
            <button
              type="button"
              onClick={() => setMode('list')}
              className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <div className="p-4 flex-1">
            <div className="rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center gap-3 px-4 py-3 mb-4">
              <span className="text-slate-500 dark:text-slate-400 shrink-0" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                </svg>
              </span>
              <AddressAutocompleteInput
                value={form.address}
                onChange={(address) => setForm((f) => ({ ...f, address }))}
                placeholder="Search for your location/society/apartment..."
                className="flex-1 min-w-0 bg-transparent border-0 py-0 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 text-sm focus:ring-0 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      const { latitude, longitude } = pos.coords;
                      reverseGeocode(latitude, longitude, (address) => {
                        setForm((f) => ({ ...f, address }));
                      });
                    },
                    () => setForm((f) => ({ ...f, address: f.address || 'Could not get location' }))
                  );
                }
              }}
              className="w-full flex items-center gap-3 py-3 text-[#fe5001] font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl -mx-1 px-1"
            >
              <span className="shrink-0" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" strokeLinecap="round" />
                </svg>
              </span>
              Use current location
            </button>
            <div className="space-y-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
              <input
                type="text"
                placeholder="Name (e.g. Home, Office)"
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700 px-4 py-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 text-sm"
              />
              <input
                type="text"
                placeholder="Flat, House no., Building, Company, Apartment"
                value={form.flatNo ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, flatNo: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700 px-4 py-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 text-sm"
              />
              <input
                type="text"
                placeholder="Contact no. (optional)"
                value={form.contact ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700 px-4 py-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 text-sm"
              />
            </div>
          </div>
          <div className="p-4 border-t border-slate-200 dark:border-slate-600 shrink-0">
            <button
              type="button"
              onClick={handleSaveAddress}
              className="common-btn common-btn--primary w-full"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-600 shrink-0">
          <h3 className="text-slate-900 dark:text-slate-100 font-semibold text-lg">Saved address</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -m-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <button
            type="button"
            onClick={handleAddAnother}
            className="w-full flex items-center gap-3 py-3 text-slate-700 dark:text-slate-300 font-medium text-sm border-b border-slate-200 dark:border-slate-600"
          >
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#fe5001]/10 text-[#fe5001]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">+</svg>
            </span>
            Add another address
          </button>
          <div className="mt-2 space-y-1">
            {locations.map((loc, i) => (
              <div
                key={i}
                className="flex items-start gap-3 py-3 border-b border-slate-100 dark:border-slate-700 last:border-0"
              >
                <button
                  type="button"
                  onClick={() => setSelectedIndexState(i)}
                  className={`shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#fe5001]/30 ${selectedIndex === i ? 'border-[#fe5001]' : 'border-slate-300 dark:border-slate-500'}`}
                  aria-label={`Select ${loc.displayName}`}
                >
                  {selectedIndex === i && <span className="w-2.5 h-2.5 rounded-full bg-[#fe5001]" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{loc.displayName}</p>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 line-clamp-2">
                    {loc.flatNo ? `${loc.flatNo}, ${loc.address}` : loc.address}
                  </p>
                  {loc.contact && (
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{loc.contact}</p>
                  )}
                </div>
                <div className="relative shrink-0">
                  <button
                    type="button"
                    className="p-2 -m-2 text-slate-400 hover:text-slate-600 rounded-lg"
                    aria-label="Options"
                    aria-expanded={openMenuIndex === i}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuIndex(openMenuIndex === i ? null : i);
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <circle cx="12" cy="5" r="1.5" />
                      <circle cx="12" cy="12" r="1.5" />
                      <circle cx="12" cy="19" r="1.5" />
                    </svg>
                  </button>
                  {openMenuIndex === i && (
                    <>
                      <div
                        className="fixed inset-0 z-0"
                        aria-hidden
                        onClick={() => setOpenMenuIndex(null)}
                      />
                      <div className="absolute right-0 top-full mt-1 py-1 bg-white dark:bg-slate-700 rounded-lg shadow-lg border border-slate-200 dark:border-slate-600 min-w-[100px] z-20">
                        <button
                          type="button"
                          onClick={() => { handleEdit(i); setOpenMenuIndex(null); }}
                          className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => { handleDelete(i); setOpenMenuIndex(null); }}
                          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-slate-100 dark:hover:bg-slate-600"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-slate-200 dark:border-slate-600 shrink-0 safe-bottom">
          <button
            type="button"
            onClick={handleProceed}
            className="common-btn common-btn--primary w-full py-3 text-base"
          >
            Proceed
          </button>
        </div>
      </div>
    </div>
  );
}
