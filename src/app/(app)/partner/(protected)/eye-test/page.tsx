'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { PartnerShell } from '@/features/partner/components/PartnerShell';

const steps = ['VISION', 'REFRACTION', 'IOP', 'COLOR_VISION', 'NOTES', 'REVIEW'] as const;

export default function PartnerEyeTestPage() {
  const [bookingId, setBookingId] = useState('');
  const [stepIndex, setStepIndex] = useState(0);
  const [payloadText, setPayloadText] = useState('{}');
  const [status, setStatus] = useState('');
  const currentStep = useMemo(() => steps[stepIndex], [stepIndex]);

  const saveStep = async () => {
    let parsed: unknown = {};
    try {
      parsed = JSON.parse(payloadText || '{}');
    } catch {
      setStatus('Payload must be valid JSON');
      return;
    }
    setStatus('Saving...');
    const res = await fetch('/api/partner/eye-test/save-step', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ bookingId, step: currentStep, payload: parsed }),
    });
    const data = await res.json().catch(() => ({}));
    setStatus(res.ok ? `${currentStep} saved` : data.error || 'Save failed');
  };

  const submit = async () => {
    setStatus('Submitting...');
    const res = await fetch('/api/partner/eye-test/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ bookingId }),
    });
    const data = await res.json().catch(() => ({}));
    setStatus(res.ok ? 'Eye test submitted and locked.' : data.error || 'Submit failed');
  };

  return (
    <PartnerShell title="Eye Test Session" description="Multi-step capture with auto-save and final lock.">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
        <Input placeholder="Booking ID" value={bookingId} onChange={(e) => setBookingId(e.target.value)} />
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {steps.map((step, idx) => (
            <button
              key={step}
              type="button"
              onClick={() => setStepIndex(idx)}
              className={`px-3 py-1.5 rounded-full text-xs ${idx === stepIndex ? 'bg-[#fe5001] text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200'}`}
            >
              {step}
            </button>
          ))}
        </div>
        <textarea
          className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-sm min-h-[180px] font-mono"
          value={payloadText}
          onChange={(e) => setPayloadText(e.target.value)}
          placeholder='{"rightEye": "...", "leftEye": "..."}'
        />
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="common-btn common-btn--primary w-full" onClick={saveStep}>
            Save Step
          </button>
          <button type="button" className="common-btn w-full" onClick={submit}>
            Final Submit
          </button>
        </div>
        {status ? <p className="text-sm text-slate-600 dark:text-slate-300">{status}</p> : null}
      </div>
    </PartnerShell>
  );
}
