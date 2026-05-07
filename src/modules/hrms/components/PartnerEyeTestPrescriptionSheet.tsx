'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Input } from '@/shared/components/ui/Input';

/** Tab order follows the prescription sheet; step names match Prisma `EyeTestStep`. */
const STEPS = ['NOTES', 'VISION', 'REFRACTION', 'IOP', 'COLOR_VISION', 'REVIEW'] as const;
export type PartnerEyeTestStep = (typeof STEPS)[number];

type RxRow = { sph: string; cyl: string; axis: string };

export type PrescriptionSheetState = {
  patientName: string;
  examDate: string;
  distanceVA: { re: string; le: string };
  nearVA: { re: string; le: string };
  concerns: {
    headacheFace: boolean;
    watering: boolean;
    redness: boolean;
    difficultyNearVision: boolean;
  };
  history: {
    pgpSince: string;
    thyroid: string;
    dm: string;
    htn: string;
  };
  objective: { re: RxRow; le: RxRow };
  subjective: { re: RxRow; le: RxRow };
  final: { re: RxRow; le: RxRow };
  iop: { re: string; le: string };
  colorVisionNotes: string;
};

const emptyRow = (): RxRow => ({ sph: '', cyl: '', axis: '' });

export const defaultPrescriptionSheet = (): PrescriptionSheetState => ({
  patientName: '',
  examDate: '',
  distanceVA: { re: '', le: '' },
  nearVA: { re: '', le: '' },
  concerns: {
    headacheFace: false,
    watering: false,
    redness: false,
    difficultyNearVision: false,
  },
  history: { pgpSince: '', thyroid: '', dm: '', htn: '' },
  objective: { re: emptyRow(), le: emptyRow() },
  subjective: { re: emptyRow(), le: emptyRow() },
  final: { re: emptyRow(), le: emptyRow() },
  iop: { re: '', le: '' },
  colorVisionNotes: '',
});

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function displayAddressFromBooking(b: { address?: string; deliveryAddress?: unknown }): string {
  const primary = String(b.address ?? '').trim();
  if (primary) return primary;
  const da = b.deliveryAddress;
  if (!isRecord(da)) return '';
  const pick = (...keys: string[]) =>
    keys.map((k) => (typeof da[k] === 'string' ? String(da[k]).trim() : '')).filter(Boolean);
  const joined = pick('formatted', 'fullAddress', 'line1', 'address', 'street', 'city', 'state', 'pincode', 'postalCode').join(', ');
  return joined.trim();
}

function normalizeDateInput(raw: string): string {
  const s = raw.trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return '';
}

function parseRx(val: unknown): RxRow {
  if (!isRecord(val)) return emptyRow();
  return {
    sph: String(val.sph ?? ''),
    cyl: String(val.cyl ?? ''),
    axis: String(val.axis ?? ''),
  };
}

function mergeEyeTestPayload(prev: PrescriptionSheetState, step: string, raw: unknown): PrescriptionSheetState {
  if (!isRecord(raw)) return prev;
  let next = { ...prev };

  const patient = raw.patient;
  if (isRecord(patient)) {
    if (typeof patient.name === 'string' && patient.name.trim()) next = { ...next, patientName: patient.name.trim() };
    const d = typeof patient.date === 'string' ? normalizeDateInput(patient.date) : '';
    if (d) next = { ...next, examDate: d };
  }

  if (step === 'VISION' || step === 'REVIEW') {
    if (isRecord(raw.distanceVA)) {
      next = {
        ...next,
        distanceVA: {
          re: String(raw.distanceVA.re ?? next.distanceVA.re),
          le: String(raw.distanceVA.le ?? next.distanceVA.le),
        },
      };
    }
    if (isRecord(raw.nearVA)) {
      next = {
        ...next,
        nearVA: {
          re: String(raw.nearVA.re ?? next.nearVA.re),
          le: String(raw.nearVA.le ?? next.nearVA.le),
        },
      };
    }
    const c = raw.concerns;
    if (isRecord(c)) {
      next = {
        ...next,
        concerns: {
          headacheFace: Boolean(c.headacheFace ?? next.concerns.headacheFace),
          watering: Boolean(c.watering ?? next.concerns.watering),
          redness: Boolean(c.redness ?? next.concerns.redness),
          difficultyNearVision: Boolean(c.difficultyNearVision ?? next.concerns.difficultyNearVision),
        },
      };
    }
  }

  if (step === 'NOTES' || step === 'REVIEW') {
    const h = raw.history;
    if (isRecord(h)) {
      next = {
        ...next,
        history: {
          pgpSince: String(h.pgpSince ?? next.history.pgpSince),
          thyroid: String(h.thyroid ?? next.history.thyroid),
          dm: String(h.dm ?? next.history.dm),
          htn: String(h.htn ?? next.history.htn),
        },
      };
    }
  }

  if (step === 'REFRACTION' || step === 'REVIEW') {
    const obj = raw.objective;
    if (isRecord(obj)) {
      next = {
        ...next,
        objective: { re: parseRx(obj.re), le: parseRx(obj.le) },
      };
    }
    const sub = raw.subjectiveAcceptance;
    if (isRecord(sub)) {
      next = {
        ...next,
        subjective: { re: parseRx(sub.re), le: parseRx(sub.le) },
      };
    }
    const fin = raw.finalPrescription;
    if (isRecord(fin)) {
      next = {
        ...next,
        final: { re: parseRx(fin.re), le: parseRx(fin.le) },
      };
    }
  }

  if (step === 'IOP' || step === 'REVIEW') {
    const iop = raw.iop;
    if (isRecord(iop)) {
      next = {
        ...next,
        iop: {
          re: String(iop.re ?? next.iop.re),
          le: String(iop.le ?? next.iop.le),
        },
      };
    }
  }

  if (step === 'COLOR_VISION' || step === 'REVIEW') {
    if (typeof raw.notes === 'string') next = { ...next, colorVisionNotes: raw.notes };
    if (typeof raw.colorVisionNotes === 'string') next = { ...next, colorVisionNotes: raw.colorVisionNotes };
  }

  return next;
}

function sheetFromBookingAndSteps(
  booking: {
    customerName?: string;
    preferredDate?: string;
    patients?: unknown;
    address?: string;
    deliveryAddress?: unknown;
  },
  steps: Array<{ step: string; payload: unknown }>,
): PrescriptionSheetState {
  let sheet = defaultPrescriptionSheet();
  const nameFromBooking = String(booking.customerName ?? '').trim();
  if (nameFromBooking) sheet = { ...sheet, patientName: nameFromBooking };
  const dateFromBooking = normalizeDateInput(String(booking.preferredDate ?? ''));
  if (dateFromBooking) sheet = { ...sheet, examDate: dateFromBooking };

  const patients = booking.patients;
  if (Array.isArray(patients) && patients.length > 0) {
    const first = patients[0];
    if (isRecord(first) && typeof first.name === 'string' && first.name.trim()) {
      sheet = { ...sheet, patientName: first.name.trim() };
    }
  }

  const rank = (s: string) => {
    const i = STEPS.indexOf(s as PartnerEyeTestStep);
    return i === -1 ? 99 : i;
  };
  const sorted = [...steps].sort((a, b) => rank(a.step) - rank(b.step));
  for (const row of sorted) {
    sheet = mergeEyeTestPayload(sheet, row.step, row.payload);
  }
  return sheet;
}

function payloadForStep(step: PartnerEyeTestStep, sheet: PrescriptionSheetState): Record<string, unknown> {
  switch (step) {
    case 'VISION':
      return {
        sheet: 'Eye Prescription — Visual acuity & concerns',
        patient: { name: sheet.patientName, date: sheet.examDate },
        distanceVA: sheet.distanceVA,
        nearVA: sheet.nearVA,
        concerns: sheet.concerns,
      };
    case 'NOTES':
      return {
        sheet: 'Eye Prescription — Patient & history',
        patient: { name: sheet.patientName, date: sheet.examDate },
        history: sheet.history,
      };
    case 'REFRACTION':
      return {
        sheet: 'Eye Prescription — Refraction',
        objective: sheet.objective,
        subjectiveAcceptance: sheet.subjective,
        finalPrescription: sheet.final,
      };
    case 'IOP':
      return { sheet: 'Eye Prescription — IOP', iop: sheet.iop };
    case 'COLOR_VISION':
      return { sheet: 'Eye Prescription — Colour vision', notes: sheet.colorVisionNotes };
    case 'REVIEW':
      return {
        sheet: 'Eye Prescription — Review snapshot',
        patient: { name: sheet.patientName, date: sheet.examDate },
        distanceVA: sheet.distanceVA,
        nearVA: sheet.nearVA,
        concerns: sheet.concerns,
        history: sheet.history,
        objective: sheet.objective,
        subjectiveAcceptance: sheet.subjective,
        finalPrescription: sheet.final,
        iop: sheet.iop,
        colorVisionNotes: sheet.colorVisionNotes,
      };
    default:
      return {};
  }
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{children}</p>;
}

function RxTable({
  title,
  re,
  le,
  onChangeRe,
  onChangeLe,
}: {
  title: string;
  re: RxRow;
  le: RxRow;
  onChangeRe: (row: RxRow) => void;
  onChangeLe: (row: RxRow) => void;
}) {
  const cell = 'rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5 text-sm w-full';
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40 p-3 space-y-2">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
      <div className="grid grid-cols-[minmax(0,0.9fr)_1fr_1fr_1fr] gap-1.5 text-[10px] font-semibold uppercase text-slate-500 text-center">
        <span className="text-left pl-1">Eye</span>
        <span>SPH</span>
        <span>CYL</span>
        <span>Axis</span>
      </div>
      {(['re', 'le'] as const).map((eye) => {
        const row = eye === 're' ? re : le;
        const set = eye === 're' ? onChangeRe : onChangeLe;
        const label = eye === 're' ? 'RE' : 'LE';
        return (
          <div key={eye} className="grid grid-cols-[minmax(0,0.9fr)_1fr_1fr_1fr] gap-1.5 items-center">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 pl-1">{label}</span>
            <input className={cell} value={row.sph} onChange={(e) => set({ ...row, sph: e.target.value })} />
            <input className={cell} value={row.cyl} onChange={(e) => set({ ...row, cyl: e.target.value })} />
            <input className={cell} value={row.axis} onChange={(e) => set({ ...row, axis: e.target.value })} />
          </div>
        );
      })}
    </div>
  );
}

export function PartnerEyeTestPrescriptionSheet({
  bookingId,
  onStatus,
}: {
  bookingId: string;
  onStatus: (message: string) => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [sheet, setSheet] = useState<PrescriptionSheetState>(defaultPrescriptionSheet);
  const [bookingMeta, setBookingMeta] = useState<{ mobile: string; address: string } | null>(null);
  const currentStep = STEPS[stepIndex];

  useEffect(() => {
    const id = bookingId.trim();
    if (!id) {
      setSheet(defaultPrescriptionSheet());
      setBookingMeta(null);
      return;
    }
    const t = window.setTimeout(async () => {
      onStatus('Loading booking…');
      try {
        const res = await fetch(`/api/partner/bookings/${encodeURIComponent(id)}`, { credentials: 'include' });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          booking?: {
            customerName?: string;
            customerMobile?: string;
            preferredDate?: string;
            patients?: unknown;
            address?: string;
            deliveryAddress?: unknown;
            eyeTestSession?: { steps?: Array<{ step: string; payload: unknown }> } | null;
          };
        };
        if (!res.ok) {
          setBookingMeta(null);
          onStatus(data.error || 'Could not load booking');
          return;
        }
        const b = data.booking;
        if (!b) {
          setBookingMeta(null);
          onStatus('Booking not found');
          return;
        }
        const steps = b.eyeTestSession?.steps ?? [];
        setSheet(sheetFromBookingAndSteps(b, steps));
        const mobile = String(b.customerMobile ?? '').trim();
        const address = displayAddressFromBooking(b);
        setBookingMeta({ mobile, address });
        onStatus(
          steps.length > 0 ? 'Loaded booking and saved eye-test steps.' : 'Loaded booking — start entering the sheet.',
        );
      } catch {
        setBookingMeta(null);
        onStatus('Network error loading booking');
      }
    }, 450);
    return () => window.clearTimeout(t);
  }, [bookingId, onStatus]);

  const payload = useMemo(() => payloadForStep(currentStep, sheet), [currentStep, sheet]);

  const saveStep = useCallback(async () => {
    if (!bookingId.trim()) {
      onStatus('Enter booking ID first');
      return;
    }
    onStatus('Saving...');
    const res = await fetch('/api/partner/eye-test/save-step', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ bookingId: bookingId.trim(), step: currentStep, payload }),
    });
    const data = await res.json().catch(() => ({}));
    onStatus(res.ok ? `${currentStep} saved` : (data as { error?: string }).error || 'Save failed');
  }, [bookingId, currentStep, onStatus, payload]);

  const submit = useCallback(async () => {
    if (!bookingId.trim()) {
      onStatus('Enter booking ID first');
      return;
    }
    onStatus('Submitting...');
    const res = await fetch('/api/partner/eye-test/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ bookingId: bookingId.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    onStatus(res.ok ? 'Eye test submitted and locked.' : (data as { error?: string }).error || 'Submit failed');
  }, [bookingId, onStatus]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-[#fe5001]/5 dark:bg-[#fe5001]/10 px-3 py-2">
        <p className="text-xs font-semibold text-[#b63a00] dark:text-orange-200">Eye prescription sheet</p>
        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
          Enter a booking ID to auto-fill customer and any saved steps. Save each tab, then final submit — same partner eye-test API as before.
        </p>
      </div>

      {bookingMeta && (bookingMeta.mobile || bookingMeta.address) ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/60 px-3 py-2.5 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">From booking (read-only)</p>
          {bookingMeta.mobile ? (
            <p className="text-sm text-slate-800 dark:text-slate-100">
              <span className="font-semibold text-slate-600 dark:text-slate-400">Mobile</span>{' '}
              <span className="select-all">{bookingMeta.mobile}</span>
            </p>
          ) : null}
          {bookingMeta.address ? (
            <p className="text-sm text-slate-800 dark:text-slate-100 leading-snug">
              <span className="font-semibold text-slate-600 dark:text-slate-400">Address</span>{' '}
              <span className="select-all">{bookingMeta.address}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {STEPS.map((step, idx) => (
          <button
            key={step}
            type="button"
            onClick={() => setStepIndex(idx)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${
              idx === stepIndex ? 'bg-[#fe5001] text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200'
            }`}
          >
            {step.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {currentStep === 'VISION' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel>Distance vision (D.V.)</FieldLabel>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <Input placeholder="RE" value={sheet.distanceVA.re} onChange={(e) => setSheet((s) => ({ ...s, distanceVA: { ...s.distanceVA, re: e.target.value } }))} />
                <Input placeholder="LE" value={sheet.distanceVA.le} onChange={(e) => setSheet((s) => ({ ...s, distanceVA: { ...s.distanceVA, le: e.target.value } }))} />
              </div>
            </div>
            <div>
              <FieldLabel>Near vision (N.V.)</FieldLabel>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <Input placeholder="RE" value={sheet.nearVA.re} onChange={(e) => setSheet((s) => ({ ...s, nearVA: { ...s.nearVA, re: e.target.value } }))} />
                <Input placeholder="LE" value={sheet.nearVA.le} onChange={(e) => setSheet((s) => ({ ...s, nearVA: { ...s.nearVA, le: e.target.value } }))} />
              </div>
            </div>
          </div>
          <div>
            <FieldLabel>Customer concerns</FieldLabel>
            <div className="mt-2 flex flex-wrap gap-3">
              {(
                [
                  ['headacheFace', 'Headache (Face)'],
                  ['watering', 'Watering'],
                  ['redness', 'Redness'],
                  ['difficultyNearVision', 'Difficulty in near vision'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={sheet.concerns[key]}
                    onChange={(e) => setSheet((s) => ({ ...s, concerns: { ...s.concerns, [key]: e.target.checked } }))}
                    className="rounded border-slate-300"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {currentStep === 'NOTES' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel>Patient name</FieldLabel>
              <Input className="mt-1" placeholder="Full name" value={sheet.patientName} onChange={(e) => setSheet((s) => ({ ...s, patientName: e.target.value }))} />
            </div>
            <div>
              <FieldLabel>Date</FieldLabel>
              <Input className="mt-1" type="date" value={sheet.examDate} onChange={(e) => setSheet((s) => ({ ...s, examDate: e.target.value }))} />
            </div>
          </div>
          <div>
            <FieldLabel>History</FieldLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              <Input placeholder="PGP since" value={sheet.history.pgpSince} onChange={(e) => setSheet((s) => ({ ...s, history: { ...s.history, pgpSince: e.target.value } }))} />
              <Input placeholder="Thyroid" value={sheet.history.thyroid} onChange={(e) => setSheet((s) => ({ ...s, history: { ...s.history, thyroid: e.target.value } }))} />
              <Input placeholder="DM" value={sheet.history.dm} onChange={(e) => setSheet((s) => ({ ...s, history: { ...s.history, dm: e.target.value } }))} />
              <Input placeholder="HTN" value={sheet.history.htn} onChange={(e) => setSheet((s) => ({ ...s, history: { ...s.history, htn: e.target.value } }))} />
            </div>
          </div>
        </div>
      )}

      {currentStep === 'REFRACTION' && (
        <div className="space-y-3">
          <RxTable
            title="Objective (Auto / Retinoscopy)"
            re={sheet.objective.re}
            le={sheet.objective.le}
            onChangeRe={(re) => setSheet((s) => ({ ...s, objective: { ...s.objective, re } }))}
            onChangeLe={(le) => setSheet((s) => ({ ...s, objective: { ...s.objective, le } }))}
          />
          <RxTable
            title="Subjective acceptance"
            re={sheet.subjective.re}
            le={sheet.subjective.le}
            onChangeRe={(re) => setSheet((s) => ({ ...s, subjective: { ...s.subjective, re } }))}
            onChangeLe={(le) => setSheet((s) => ({ ...s, subjective: { ...s.subjective, le } }))}
          />
          <RxTable
            title="Final prescription"
            re={sheet.final.re}
            le={sheet.final.le}
            onChangeRe={(re) => setSheet((s) => ({ ...s, final: { ...s.final, re } }))}
            onChangeLe={(le) => setSheet((s) => ({ ...s, final: { ...s.final, le } }))}
          />
        </div>
      )}

      {currentStep === 'IOP' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>RE (mmHg)</FieldLabel>
            <Input className="mt-1" inputMode="decimal" placeholder="—" value={sheet.iop.re} onChange={(e) => setSheet((s) => ({ ...s, iop: { ...s.iop, re: e.target.value } }))} />
          </div>
          <div>
            <FieldLabel>LE (mmHg)</FieldLabel>
            <Input className="mt-1" inputMode="decimal" placeholder="—" value={sheet.iop.le} onChange={(e) => setSheet((s) => ({ ...s, iop: { ...s.iop, le: e.target.value } }))} />
          </div>
        </div>
      )}

      {currentStep === 'COLOR_VISION' && (
        <div>
          <FieldLabel>Colour vision / remarks</FieldLabel>
          <textarea
            className="mt-2 w-full min-h-[120px] rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
            placeholder="Ishihara / other notes"
            value={sheet.colorVisionNotes}
            onChange={(e) => setSheet((s) => ({ ...s, colorVisionNotes: e.target.value }))}
          />
        </div>
      )}

      {currentStep === 'REVIEW' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-3 text-sm text-slate-700 dark:text-slate-200 space-y-2">
          {bookingMeta?.mobile ? (
            <p>
              <span className="font-semibold">Mobile (booking):</span> {bookingMeta.mobile}
            </p>
          ) : null}
          {bookingMeta?.address ? (
            <p className="leading-snug">
              <span className="font-semibold">Address (booking):</span> {bookingMeta.address}
            </p>
          ) : null}
          <p>
            <span className="font-semibold">Patient:</span> {sheet.patientName || '—'} · <span className="font-semibold">Date:</span> {sheet.examDate || '—'}
          </p>
          <p>
            <span className="font-semibold">D.V.</span> RE {sheet.distanceVA.re || '—'} / LE {sheet.distanceVA.le || '—'}
          </p>
          <p>
            <span className="font-semibold">N.V.</span> RE {sheet.nearVA.re || '—'} / LE {sheet.nearVA.le || '—'}
          </p>
          <p className="text-xs text-slate-500">Use Save on each tab first, then Final submit to lock the session.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button type="button" className="common-btn common-btn--primary w-full" onClick={saveStep}>
          Save step
        </button>
        <button type="button" className="common-btn w-full" onClick={submit}>
          Final submit
        </button>
      </div>
    </div>
  );
}
