'use client';

import { useEffect, useRef, useState } from 'react';
import type { AppConfig, AppOfferRule, OfferAppliesTo, OfferDiscountType } from '@/types/app-config';

const getSecret = () =>
  document.cookie.split('; ').find((c) => c.startsWith('admin_secret='))?.split('=')[1] || '';

const DISCOUNT_TYPES: { value: OfferDiscountType; label: string }[] = [
  { value: 'percent_off', label: 'Percentage off' },
  { value: 'fixed_off', label: 'Fixed amount off (₹)' },
  { value: 'buy_x_get_y', label: 'Buy X get Y (BOGO)' },
  { value: 'free_shipping', label: 'Free shipping' },
];

const APPLIES_TO_OPTIONS: { value: OfferAppliesTo; label: string }[] = [
  { value: 'entire_order', label: 'Entire order' },
  { value: 'collection', label: 'Specific collection(s)' },
  { value: 'product', label: 'Specific product(s)' },
  { value: 'category', label: 'Specific category/categories' },
];

function idsFromStr(s: string): string[] {
  return s.split(/[\s,]+/).map((x) => x.trim()).filter(Boolean);
}

function idsToStr(ids: string[] | undefined): string {
  return (ids ?? []).join(', ');
}

export default function AdminOfferRulesPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<AppOfferRule | null>(null);
  const [form, setForm] = useState<Partial<AppOfferRule>>({
    name: '',
    description: '',
    discountType: 'percent_off',
    value: 0,
    valueSecondary: undefined,
    appliesTo: 'entire_order',
    appliesToIds: [],
    minOrderAmount: undefined,
    minQuantity: undefined,
    firstOrderOnly: false,
    code: '',
    validFrom: '',
    validTo: '',
    maxUses: undefined,
    priority: 0,
  });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((data) => { setConfig(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async (next: AppConfig) => {
    setSaving(true);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': getSecret() },
        body: JSON.stringify(next),
      });
      if (res.ok) {
        setConfig(await res.json());
        setEditing(null);
        resetForm();
      } else alert('Save failed');
    } finally {
      setSaving(false);
    }
  };

  function resetForm() {
    setForm({
      name: '', description: '', discountType: 'percent_off', value: 0, valueSecondary: undefined,
      appliesTo: 'entire_order', appliesToIds: [], minOrderAmount: undefined, minQuantity: undefined,
      firstOrderOnly: false, code: '', validFrom: '', validTo: '', maxUses: undefined, priority: 0,
    });
  }

  const rules = (config?.offerRules ?? []).slice().sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  const addRule = () => {
    if (!config) return;
    const name = (form.name ?? '').trim();
    if (!name) return;
    const rule: AppOfferRule = {
      id: `rule-${Date.now()}`,
      name,
      description: form.description?.trim() || undefined,
      discountType: form.discountType ?? 'percent_off',
      value: Number(form.value) || 0,
      valueSecondary: form.discountType === 'buy_x_get_y' && form.valueSecondary != null ? Number(form.valueSecondary) : undefined,
      appliesTo: form.appliesTo ?? 'entire_order',
      appliesToIds: (form.appliesTo !== 'entire_order' && form.appliesToIds?.length) ? form.appliesToIds : undefined,
      minOrderAmount: form.minOrderAmount != null ? Number(form.minOrderAmount) : undefined,
      minQuantity: form.minQuantity != null ? Number(form.minQuantity) : undefined,
      firstOrderOnly: form.firstOrderOnly ?? false,
      code: (form.code ?? '').trim().toUpperCase() || undefined,
      validFrom: form.validFrom?.trim() || undefined,
      validTo: form.validTo?.trim() || undefined,
      maxUses: form.maxUses != null ? Number(form.maxUses) : undefined,
      usedCount: 0,
      priority: Number(form.priority) || 0,
      sortOrder: (config.offerRules?.length ?? 0),
    };
    handleSave({ ...config, offerRules: [...(config.offerRules ?? []), rule] });
  };

  const updateRule = (id: string, updates: Partial<AppOfferRule>) => {
    if (!config) return;
    handleSave({
      ...config,
      offerRules: (config.offerRules ?? []).map((r) => (r.id === id ? { ...r, ...updates } : r)),
    });
  };

  const deleteRule = (id: string) => {
    if (!config || !confirm('Delete this offer rule?')) return;
    handleSave({ ...config, offerRules: (config.offerRules ?? []).filter((r) => r.id !== id) });
  };

  const startEdit = (r: AppOfferRule) => {
    setEditing(r);
    setForm({
      ...r,
      appliesToIds: r.appliesToIds ?? [],
      code: r.code ?? '',
      validFrom: r.validFrom ?? '',
      validTo: r.validTo ?? '',
    });
  };

  const saveEdit = () => {
    if (!editing || !config) return;
    const name = (form.name ?? '').trim();
    if (!name) return;
    updateRule(editing.id, {
      name,
      description: form.description?.trim() || undefined,
      discountType: form.discountType ?? 'percent_off',
      value: Number(form.value) || 0,
      valueSecondary: form.discountType === 'buy_x_get_y' && form.valueSecondary != null ? Number(form.valueSecondary) : undefined,
      appliesTo: form.appliesTo ?? 'entire_order',
      appliesToIds: form.appliesTo !== 'entire_order' && form.appliesToIds?.length ? form.appliesToIds : undefined,
      minOrderAmount: form.minOrderAmount != null ? Number(form.minOrderAmount) : undefined,
      minQuantity: form.minQuantity != null ? Number(form.minQuantity) : undefined,
      firstOrderOnly: form.firstOrderOnly ?? false,
      code: (form.code ?? '').trim().toUpperCase() || undefined,
      validFrom: form.validFrom?.trim() || undefined,
      validTo: form.validTo?.trim() || undefined,
      maxUses: form.maxUses != null ? Number(form.maxUses) : undefined,
      priority: Number(form.priority) || 0,
    });
  };

  useEffect(() => {
    if (editing && panelRef.current) panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [editing]);

  const appliesToIdsStr = idsToStr(form.appliesToIds);
  const setAppliesToIdsStr = (s: string) => setForm((f) => ({ ...f, appliesToIds: idsFromStr(s) }));

  if (loading || !config) return <p className="text-slate-500">Loading…</p>;

  const FormBlock = () => (
    <>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Rule name</label>
        <input value={form.name ?? ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" placeholder="e.g. Summer Sale 20%" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description (optional)</label>
        <input value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" placeholder="20% off on orders above ₹1999" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Discount type</label>
          <select value={form.discountType ?? 'percent_off'} onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value as OfferDiscountType }))} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm">
            {DISCOUNT_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {form.discountType === 'percent_off' ? 'Percentage' : form.discountType === 'fixed_off' ? 'Amount (₹)' : form.discountType === 'buy_x_get_y' ? 'Buy X (quantity)' : '—'}
          </label>
          <input type="number" min={0} value={form.value ?? 0} onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value) || 0 }))} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" disabled={form.discountType === 'free_shipping'} />
        </div>
      </div>
      {form.discountType === 'buy_x_get_y' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Get Y (free quantity)</label>
          <input type="number" min={0} value={form.valueSecondary ?? 1} onChange={(e) => setForm((f) => ({ ...f, valueSecondary: Number(e.target.value) || 0 }))} className="w-full max-w-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" />
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Applies to</label>
        <select value={form.appliesTo ?? 'entire_order'} onChange={(e) => setForm((f) => ({ ...f, appliesTo: e.target.value as OfferAppliesTo }))} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm">
          {APPLIES_TO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      {form.appliesTo !== 'entire_order' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {form.appliesTo === 'collection' ? 'Collection IDs' : form.appliesTo === 'product' ? 'Product IDs' : 'Category IDs'} (comma-separated)
          </label>
          <input value={appliesToIdsStr} onChange={(e) => setAppliesToIdsStr(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm font-mono" placeholder="e.g. new-arrivals, top-sellers or 1, 2, 3" />
        </div>
      )}
      <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Conditions (sab satisfy hone chahiye)</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Min order amount (₹)</label>
            <input type="number" min={0} value={form.minOrderAmount ?? ''} onChange={(e) => setForm((f) => ({ ...f, minOrderAmount: e.target.value ? Number(e.target.value) : undefined }))} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" placeholder="999" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Min quantity (items)</label>
            <input type="number" min={0} value={form.minQuantity ?? ''} onChange={(e) => setForm((f) => ({ ...f, minQuantity: e.target.value ? Number(e.target.value) : undefined }))} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" placeholder="2" />
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input type="checkbox" id="firstOrder" checked={form.firstOrderOnly ?? false} onChange={(e) => setForm((f) => ({ ...f, firstOrderOnly: e.target.checked }))} className="rounded border-slate-300" />
          <label htmlFor="firstOrder" className="text-sm text-slate-700 dark:text-slate-300">First order only</label>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Code (optional)</label>
        <input value={form.code ?? ''} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} className="w-full max-w-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm font-mono uppercase" placeholder="SAVE20" />
        <p className="text-xs text-slate-500 mt-1">Khali chhodne par ye rule auto-apply hoga jab conditions match karein (priority ke hisaab se).</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Valid from (YYYY-MM-DD)</label>
          <input type="date" value={form.validFrom ?? ''} onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Valid to (YYYY-MM-DD)</label>
          <input type="date" value={form.validTo ?? ''} onChange={(e) => setForm((f) => ({ ...f, validTo: e.target.value }))} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Max uses (0 = unlimited)</label>
          <input type="number" min={0} value={form.maxUses ?? ''} onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value ? Number(e.target.value) : undefined }))} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Priority (higher = pehle apply)</label>
          <input type="number" value={form.priority ?? 0} onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) || 0 }))} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" />
        </div>
      </div>
    </>
  );

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Offer rules</h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
        Shopify jaisa: har type ke offer banao – percent off, fixed off, BOGO, free shipping. Conditions (min order, collection, code optional) set karein. Code na do to rule auto-apply hoga jab conditions match karein.
      </p>

      <div className="space-y-3 mb-6">
        {rules.map((r) => (
          <div key={r.id} className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 dark:text-white">{r.name}</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                {r.discountType === 'percent_off' && `${r.value}% off`}
                {r.discountType === 'fixed_off' && `₹${r.value} off`}
                {r.discountType === 'buy_x_get_y' && `Buy ${r.value} get ${r.valueSecondary ?? 1} free`}
                {r.discountType === 'free_shipping' && 'Free shipping'}
                {r.appliesTo !== 'entire_order' && ` · ${r.appliesTo}`}
                {r.code ? ` · Code: ${r.code}` : ' · Auto-apply'}
                {r.minOrderAmount != null && ` · Min ₹${r.minOrderAmount}`}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button type="button" onClick={() => startEdit(r)} className="px-3 py-2 rounded-lg bg-[#fe5001]/10 text-[#fe5001] text-sm font-medium">Edit</button>
              <button type="button" onClick={() => deleteRule(r.id)} className="px-3 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {editing ? (
        <div ref={panelRef} className="p-6 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Edit offer rule</h2>
          <FormBlock />
          <div className="flex gap-2">
            <button type="button" onClick={saveEdit} disabled={saving || !(form.name ?? '').trim()} className="px-4 py-2 rounded-lg bg-[#fe5001] text-white font-medium disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
            <button type="button" onClick={() => { setEditing(null); resetForm(); }} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium">Cancel</button>
          </div>
        </div>
      ) : (
        <div ref={panelRef} className="p-6 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Add offer rule</h2>
          <FormBlock />
          <button type="button" onClick={addRule} disabled={saving || !(form.name ?? '').trim()} className="px-4 py-2 rounded-lg bg-[#fe5001] text-white font-semibold disabled:opacity-50">+ Add offer rule</button>
        </div>
      )}
    </div>
  );
}
