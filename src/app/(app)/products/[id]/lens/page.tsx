'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { getProductsList } from '@/lib/products-data';
import {
  LENS_TYPE_CATEGORIES,
  getLensesByCategory,
  getLensesList,
  getRecommendedLens,
  type LensOption,
  type LensQuizAnswers,
  type LensTypeCategory,
} from '@/lib/lenses-data';
import type { AppConfig } from '@/types/app-config';
import { addToCart, getCartCount } from '@/lib/cart';
import { BottomNav } from '@/components/layout/BottomNav';
import type { PrescriptionData, ManualPrescription } from '@/types/prescription';

const USE_OPTIONS: { value: LensQuizAnswers['primaryUse']; label: string }[] = [
  { value: 'reading', label: 'Reading' },
  { value: 'computer', label: 'Computer / screens' },
  { value: 'driving', label: 'Driving' },
  { value: 'all', label: 'All-purpose' },
];

function LensTypeIcon({ id }: { id: LensTypeCategory }) {
  if (id === 'single_vision') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-slate-600 dark:text-slate-400">
        <ellipse cx="12" cy="12" rx="6" ry="8" />
      </svg>
    );
  }
  if (id === 'bifocal_progressive') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-slate-600 dark:text-slate-400">
        <path d="M2 12h4M18 12h4M6 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0z" />
        <path d="M6 8v8M18 8v8" />
      </svg>
    );
  }
  if (id === 'zero_power') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-slate-600 dark:text-slate-400">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-slate-600 dark:text-slate-400">
      <ellipse cx="12" cy="12" rx="6" ry="8" />
      <path d="M6 6l12 18M18 6L6 18" />
    </svg>
  );
}

export default function LensSelectionPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const [config, setConfig] = useState<AppConfig | null>(null);

  const [step, setStep] = useState<'lens_type' | 'quiz' | 'result'>('lens_type');
  const [selectedLensType, setSelectedLensType] = useState<LensTypeCategory | null>(null);
  const [answers, setAnswers] = useState<LensQuizAnswers>({
    primaryUse: 'all',
    longScreenTime: 'no',
    needPower: 'yes',
  });
  const [selectedLens, setSelectedLens] = useState<LensOption | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [prescription, setPrescription] = useState<PrescriptionData | null>(null);
  const [prescriptionMode, setPrescriptionMode] = useState<'none' | 'manual' | 'upload'>('none');
  const [manualRx, setManualRx] = useState<ManualPrescription>({
    type: 'manual',
    rightEye: {},
    leftEye: {},
    pd: '',
  });
  const [uploadingRx, setUploadingRx] = useState(false);
  const [uploadRxError, setUploadRxError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setCartCount(getCartCount()), []);
  useEffect(() => {
    fetch('/api/config').then((r) => (r.ok ? r.json() : null)).then((d) => d && setConfig(d)).catch(() => {});
  }, []);

  const productList = getProductsList(config?.products);
  const lensList = getLensesList(config?.lenses);
  const product = productList.find((p) => p.id === productId);

  const lensesInCategory = selectedLensType ? getLensesByCategory(selectedLensType, lensList) : [];
  const recommended = selectedLensType ? getRecommendedLens(answers, selectedLensType, lensList) : null;

  const handleLensTypeContinue = () => {
    if (!selectedLensType) return;
    if (selectedLensType === 'single_vision' || selectedLensType === 'bifocal_progressive') {
      setStep('quiz');
    } else {
      setStep('result');
    }
  };

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-900">
        <p className="text-slate-500 dark:text-slate-400">Product not found.</p>
        <Link href="/products" className="mt-4 text-[#fe5001] font-semibold">Back to Products</Link>
      </div>
    );
  }

  const chosenLens = selectedLens ?? recommended;
  const lensPrice = chosenLens ? chosenLens.price : 0;
  const framePriceNum = parseInt(product.price.replace(/\D/g, ''), 10) || 0;
  const totalPrice = framePriceNum + lensPrice;

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-900 pb-20">
      <header className="safe-top sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-3 py-2.5 flex items-center gap-3">
        {step === 'lens_type' ? (
          <Link
            href={`/products/${productId}`}
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            aria-label="Back"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (step === 'quiz') setStep('lens_type');
              else if (step === 'result' && selectedLensType && (selectedLensType === 'single_vision' || selectedLensType === 'bifocal_progressive')) setStep('quiz');
              else setStep('lens_type');
            }}
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            aria-label="Back"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <h1 className="flex-1 text-center text-slate-900 dark:text-slate-100 text-base font-bold">
          {step === 'lens_type' && 'Select Lens Type'}
          {step === 'quiz' && 'Choose your lens'}
          {step === 'result' && 'Select lens'}
        </h1>
        <Link href="/cart" className="relative shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300" aria-label={`Cart, ${cartCount} items`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          {cartCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#fe5001] text-white text-xs font-bold flex items-center justify-center">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </Link>
      </header>

      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full">
        {step === 'lens_type' && (
          <div className="space-y-4">
            {LENS_TYPE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedLensType(cat.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-colors ${
                  selectedLensType === cat.id
                    ? 'border-[#fe5001] bg-[#fe5001]/5 dark:bg-[#fe5001]/10'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <span className="shrink-0 w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                  <LensTypeIcon id={cat.id} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{cat.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{cat.description}</p>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 shrink-0 text-slate-400">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ))}
            <button
              type="button"
              onClick={handleLensTypeContinue}
              disabled={!selectedLensType}
              className="w-full py-3.5 rounded-xl bg-[#fe5001] text-white font-semibold text-sm disabled:opacity-50 disabled:pointer-events-none mt-6"
            >
              Continue
            </button>
          </div>
        )}

        {step === 'quiz' && selectedLensType && (
          <div className="space-y-8">
            <p className="text-slate-600 dark:text-slate-400 text-sm text-center">
              Answer 2 quick questions so we can recommend the right lens within {LENS_TYPE_CATEGORIES.find((c) => c.id === selectedLensType)?.name}.
            </p>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50/50 dark:bg-slate-800/30">
              <p className="text-slate-900 dark:text-slate-100 font-semibold text-sm mb-3">1. What’s your primary use?</p>
              <div className="flex flex-wrap gap-2">
                {USE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAnswers((a) => ({ ...a, primaryUse: opt.value }))}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium ${
                      answers.primaryUse === opt.value ? 'bg-[#fe5001] text-white' : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50/50 dark:bg-slate-800/30">
              <p className="text-slate-900 dark:text-slate-100 font-semibold text-sm mb-3">2. Do you spend long hours on screens?</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setAnswers((a) => ({ ...a, longScreenTime: 'yes' }))}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium ${
                    answers.longScreenTime === 'yes' ? 'bg-[#fe5001] text-white' : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setAnswers((a) => ({ ...a, longScreenTime: 'no' }))}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium ${
                    answers.longScreenTime === 'no' ? 'bg-[#fe5001] text-white' : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  No
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStep('result')}
              className="w-full py-3.5 rounded-xl bg-[#fe5001] text-white font-semibold text-sm"
            >
              See my recommendation
            </button>
          </div>
        )}

        {step === 'result' && selectedLensType && recommended && lensesInCategory.length > 0 && (
          <>
            <section className="mb-6">
              <h2 className="text-slate-900 dark:text-slate-100 font-bold text-sm mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">✓</span>
                Recommended for you
              </h2>
              <div
                className={`rounded-xl border-2 p-4 ${
                  selectedLens?.id === recommended.id || !selectedLens
                    ? 'border-[#fe5001] bg-[#fe5001]/5 dark:bg-[#fe5001]/10'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    {recommended.badge && (
                      <span className="text-[10px] font-bold uppercase text-[#fe5001] bg-[#fe5001]/10 dark:bg-[#fe5001]/20 px-2 py-0.5 rounded">
                        {recommended.badge}
                      </span>
                    )}
                    <h3 className="text-slate-900 dark:text-slate-100 font-semibold mt-1">{recommended.name}</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-xs mt-0.5">{recommended.shortDesc}</p>
                    <p className="text-slate-500 dark:text-slate-500 text-xs mt-2 leading-relaxed">
                      <span className="font-medium text-slate-600 dark:text-slate-400">Who it’s for:</span> {recommended.whoIsItFor}
                    </p>
                    <p className="text-slate-900 dark:text-slate-100 font-bold mt-2">
                      {recommended.price === 0 ? 'Free' : `+ ₹${recommended.price.toLocaleString('en-IN')}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedLens(selectedLens?.id === recommended.id ? null : recommended)}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium ${
                      selectedLens?.id === recommended.id || !selectedLens ? 'bg-[#fe5001] text-white' : 'border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {selectedLens?.id === recommended.id ? 'Selected' : 'Select'}
                  </button>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-slate-900 dark:text-slate-100 font-bold text-sm mb-3">
                All {LENS_TYPE_CATEGORIES.find((c) => c.id === selectedLensType)?.name} options
              </h2>
              <ul className="space-y-2">
                {lensesInCategory.filter((l) => l.id !== recommended.id).map((lens) => (
                  <li
                    key={lens.id}
                    className={`rounded-xl border-2 p-4 ${
                      selectedLens?.id === lens.id ? 'border-[#fe5001] bg-[#fe5001]/5 dark:bg-[#fe5001]/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        {lens.badge && (
                          <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                            {lens.badge}
                          </span>
                        )}
                        <h3 className="text-slate-900 dark:text-slate-100 font-semibold text-sm mt-1">{lens.name}</h3>
                        <p className="text-slate-600 dark:text-slate-400 text-xs mt-0.5">{lens.shortDesc}</p>
                        <p className="text-slate-500 dark:text-slate-500 text-xs mt-2 leading-relaxed">
                          <span className="font-medium text-slate-600 dark:text-slate-400">Who it’s for:</span> {lens.whoIsItFor}
                        </p>
                        <p className="text-slate-900 dark:text-slate-100 font-bold text-sm mt-2">
                          {lens.price === 0 ? 'Free' : `+ ₹${lens.price.toLocaleString('en-IN')}`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedLens(selectedLens?.id === lens.id ? null : lens)}
                        className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium ${
                          selectedLens?.id === lens.id ? 'bg-[#fe5001] text-white' : 'border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {selectedLens?.id === lens.id ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* Prescription (optional) – saved with order */}
            <section className="mt-6 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <h2 className="text-slate-900 dark:text-slate-100 font-bold text-sm px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                Add prescription (optional)
              </h2>
              <div className="p-4">
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => { setPrescriptionMode('none'); setPrescription(null); setUploadRxError(''); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium ${prescriptionMode === 'none' ? 'bg-[#fe5001] text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                  >
                    Skip
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPrescriptionMode('manual'); setPrescription(null); setUploadRxError(''); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium ${prescriptionMode === 'manual' ? 'bg-[#fe5001] text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                  >
                    Enter
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPrescriptionMode('upload'); setPrescription(null); setUploadRxError(''); fileInputRef.current?.click(); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium ${prescriptionMode === 'upload' ? 'bg-[#fe5001] text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                  >
                    Upload
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadingRx(true);
                    setUploadRxError('');
                    try {
                      const form = new FormData();
                      form.append('file', file);
                      const res = await fetch('/api/upload/prescription', { method: 'POST', body: form });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || 'Upload failed');
                      setPrescription({ type: 'upload', fileUrl: data.url, fileName: data.fileName });
                      setPrescriptionMode('upload');
                    } catch (err) {
                      setUploadRxError(err instanceof Error ? err.message : 'Upload failed');
                    } finally {
                      setUploadingRx(false);
                      e.target.value = '';
                    }
                  }}
                />
                {prescriptionMode === 'manual' && (
                  <div className="space-y-3 text-sm">
                    <p className="text-slate-500 dark:text-slate-400 text-xs">Enter values from your prescription (optional fields).</p>
                    <div className="grid grid-cols-2 gap-2">
                      <span className="col-span-2 font-medium text-slate-700 dark:text-slate-300">Right eye (OD)</span>
                      <input placeholder="SPH" value={manualRx.rightEye?.sph ?? ''} onChange={(e) => setManualRx((r) => ({ ...r, rightEye: { ...r.rightEye, sph: e.target.value } }))} className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-xs" />
                      <input placeholder="CYL" value={manualRx.rightEye?.cyl ?? ''} onChange={(e) => setManualRx((r) => ({ ...r, rightEye: { ...r.rightEye, cyl: e.target.value } }))} className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-xs" />
                      <input placeholder="Axis" value={manualRx.rightEye?.axis ?? ''} onChange={(e) => setManualRx((r) => ({ ...r, rightEye: { ...r.rightEye, axis: e.target.value } }))} className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-xs" />
                      <input placeholder="Add" value={manualRx.rightEye?.add ?? ''} onChange={(e) => setManualRx((r) => ({ ...r, rightEye: { ...r.rightEye, add: e.target.value } }))} className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-xs" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <span className="col-span-2 font-medium text-slate-700 dark:text-slate-300">Left eye (OS)</span>
                      <input placeholder="SPH" value={manualRx.leftEye?.sph ?? ''} onChange={(e) => setManualRx((r) => ({ ...r, leftEye: { ...r.leftEye, sph: e.target.value } }))} className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-xs" />
                      <input placeholder="CYL" value={manualRx.leftEye?.cyl ?? ''} onChange={(e) => setManualRx((r) => ({ ...r, leftEye: { ...r.leftEye, cyl: e.target.value } }))} className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-xs" />
                      <input placeholder="Axis" value={manualRx.leftEye?.axis ?? ''} onChange={(e) => setManualRx((r) => ({ ...r, leftEye: { ...r.leftEye, axis: e.target.value } }))} className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-xs" />
                      <input placeholder="Add" value={manualRx.leftEye?.add ?? ''} onChange={(e) => setManualRx((r) => ({ ...r, leftEye: { ...r.leftEye, add: e.target.value } }))} className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-xs" />
                    </div>
                    <input placeholder="PD (mm)" value={manualRx.pd ?? ''} onChange={(e) => setManualRx((r) => ({ ...r, pd: e.target.value }))} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-xs" />
                    <button type="button" onClick={() => setPrescription(manualRx)} className="w-full py-2 rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 text-sm font-medium">Save prescription</button>
                  </div>
                )}
                {prescriptionMode === 'upload' && (
                  <div className="space-y-2">
                    {uploadingRx && <p className="text-slate-500 dark:text-slate-400 text-xs">Uploading…</p>}
                    {uploadRxError && <p className="text-red-600 dark:text-red-400 text-xs">{uploadRxError}</p>}
                    {prescription?.type === 'upload' && <p className="text-emerald-600 dark:text-emerald-400 text-xs">✓ Prescription uploaded. It will be saved with your order.</p>}
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full py-2 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 text-sm">Choose file (image or PDF)</button>
                  </div>
                )}
              </div>
            </section>

            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
              {(() => {
                const resolvedLens = chosenLens ?? recommended;
                return (
                  <>
              <div className="flex justify-between text-slate-600 dark:text-slate-400 text-sm">
                <span>Frame: {product.name}</span>
                <span>{product.price}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400 text-sm mt-1">
                <span>Lens: {resolvedLens.name}</span>
                <span>{resolvedLens.price === 0 ? 'Free' : `₹${resolvedLens.price.toLocaleString('en-IN')}`}</span>
              </div>
              {prescription && <div className="flex justify-between text-slate-600 dark:text-slate-400 text-sm mt-1"><span>Prescription</span><span>Added</span></div>}
              <div className="flex justify-between text-slate-900 dark:text-slate-100 font-bold mt-2 pt-2 border-t border-slate-200 dark:border-slate-600">
                <span>Total</span>
                <span>₹{totalPrice.toLocaleString('en-IN')}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  addToCart(productId, { lensId: resolvedLens.id, prescription: prescription ?? undefined });
                  setCartCount(getCartCount());
                  router.push('/checkout?from=buy-now');
                }}
                className="mt-4 w-full py-3.5 rounded-xl bg-[#fe5001] text-white font-semibold text-sm"
              >
                Proceed to checkout
              </button>
                  </>
                );
              })()}
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
