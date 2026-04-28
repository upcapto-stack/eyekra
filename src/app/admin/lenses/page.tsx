'use client';

import { useEffect, useRef, useState } from 'react';
import type { AppConfig } from '@/types/app-config';
import type { LensOption, LensTypeCategory } from '@/lib/lenses-data';
import { LENS_TYPE_CATEGORIES, LENS_OPTIONS } from '@/lib/lenses-data';

const getSecret = () =>
  document.cookie.split('; ').find((c) => c.startsWith('admin_secret='))?.split('=')[1] || '';

const LENS_TYPES: LensOption['type'][] = ['single_vision', 'blue_cut', 'bifocal', 'progressive', 'non_prescription'];
const USE_CASES: LensOption['useCases'][number][] = ['reading', 'computer', 'driving', 'all', 'blue_cut', 'bifocal'];

function nameToId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'lens';
}

export default function AdminLensesPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<LensOption | null>(null);
  const [form, setForm] = useState<Partial<LensOption>>({
    id: '',
    name: '',
    shortDesc: '',
    description: '',
    whoIsItFor: '',
    price: 0,
    lensTypeCategory: 'single_vision',
    useCases: ['all'],
    blueCut: false,
    type: 'single_vision',
    badge: '',
  });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((data) => {
        setConfig(data);
        setLoading(false);
      })
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
        setForm({
          id: '', name: '', shortDesc: '', description: '', whoIsItFor: '', price: 0,
          lensTypeCategory: 'single_vision', useCases: ['all'], blueCut: false, type: 'single_vision', badge: '',
        });
      } else {
        alert('Save failed: ' + (await res.text()));
      }
    } finally {
      setSaving(false);
    }
  };

  const lenses = config?.lenses ?? [];
  const useBuiltIn = lenses.length === 0;

  const toggleUseCase = (uc: LensOption['useCases'][number]) => {
    const current = form.useCases ?? [];
    if (current.includes(uc)) {
      setForm((f) => ({ ...f, useCases: current.filter((c) => c !== uc) }));
    } else {
      setForm((f) => ({ ...f, useCases: [...current, uc] }));
    }
  };

  const addLens = () => {
    if (!config) return;
    const name = (form.name ?? '').trim();
    if (!name) {
      alert('Lens name required.');
      return;
    }
    const id = (form.id ?? nameToId(name)).trim() || nameToId(name);
    const existing = lenses.some((l) => l.id === id);
    if (existing && !editing) {
      alert('Isi ID ya name ka lens pehle se hai.');
      return;
    }
    const lens: LensOption = {
      id,
      name,
      shortDesc: (form.shortDesc ?? '').trim(),
      description: (form.description ?? '').trim(),
      whoIsItFor: (form.whoIsItFor ?? '').trim(),
      price: Number(form.price) || 0,
      lensTypeCategory: (form.lensTypeCategory as LensTypeCategory) ?? 'single_vision',
      useCases: (form.useCases ?? []).length ? (form.useCases as LensOption['useCases']) : ['all'],
      blueCut: !!form.blueCut,
      type: (form.type as LensOption['type']) ?? 'single_vision',
      badge: (form.badge ?? '').trim() || undefined,
    };
    const next: AppConfig = {
      ...config,
      lenses: editing ? (config.lenses ?? []).map((l) => (l.id === editing.id ? lens : l)) : [...lenses, lens],
    };
    handleSave(next);
  };

  const deleteLens = (id: string) => {
    if (!config || !config.lenses || !confirm(`Delete lens "${id}"?`)) return;
    const next: AppConfig = { ...config, lenses: config.lenses.filter((l) => l.id !== id) };
    handleSave(next);
  };

  const startEdit = (l: LensOption) => {
    setEditing(l);
    setForm({ ...l });
    panelRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadFromBuiltIn = () => {
    if (!config || !confirm('Replace current lenses with built-in lens options?')) return;
    const next: AppConfig = { ...config, lenses: [...LENS_OPTIONS] };
    handleSave(next);
  };

  if (loading) {
    return (
      <div className="max-w-4xl">
        <p className="text-slate-500 dark:text-slate-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl" ref={panelRef}>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Lenses</h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
        Create and edit lens options. Each lens maps to a <strong>Lens type category</strong> (Single Vision, Bifocal/Progressive, etc.), a <strong>type</strong> (single_vision, blue_cut, bifocal, etc.), and <strong>use cases</strong> (reading, computer, driving, all). Used in lens selection and filters.
      </p>

      {useBuiltIn && (
        <div className="mb-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm">
          <p className="font-medium mb-1">Using built-in lenses</p>
          <p className="mb-3">No custom lenses in config. The app shows built-in lens options. Add below or load samples to start editing.</p>
          <button
            type="button"
            onClick={loadFromBuiltIn}
            className="px-3 py-1.5 rounded-lg bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 text-sm font-medium"
          >
            Load built-in lenses
          </button>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden mb-6">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white">{editing ? 'Edit lens' : 'Add lens'}</h2>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ID</label>
              <input
                type="text"
                value={form.id ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                placeholder="e.g. blue-cut"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
                disabled={!!editing}
              />
              {!editing && <p className="text-xs text-slate-500 mt-0.5">Leave blank to auto-generate from name</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name *</label>
              <input
                type="text"
                value={form.name ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Blue Cut"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Short description</label>
            <input
              type="text"
              value={form.shortDesc ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, shortDesc: e.target.value }))}
              placeholder="One line for cards"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea
              value={form.description ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Full description..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Who is it for</label>
            <textarea
              value={form.whoIsItFor ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, whoIsItFor: e.target.value }))}
              placeholder="Best for: ..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Price (₹)</label>
            <input
              type="number"
              min={0}
              value={form.price ?? 0}
              onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) || 0 }))}
              className="w-full max-w-[140px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Lens type category</label>
              <select
                value={form.lensTypeCategory ?? 'single_vision'}
                onChange={(e) => setForm((f) => ({ ...f, lensTypeCategory: e.target.value as LensTypeCategory }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
              >
                {LENS_TYPE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type (attribute)</label>
              <select
                value={form.type ?? 'single_vision'}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as LensOption['type'] }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
              >
                {LENS_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Use cases (filters)</label>
            <div className="flex flex-wrap gap-2">
              {USE_CASES.map((uc) => (
                <label key={uc} className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(form.useCases ?? []).includes(uc)}
                    onChange={() => toggleUseCase(uc)}
                    className="rounded border-slate-300 text-[#fe5001] focus:ring-[#fe5001]"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{uc}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.blueCut}
                onChange={(e) => setForm((f) => ({ ...f, blueCut: e.target.checked }))}
                className="rounded border-slate-300 text-[#fe5001] focus:ring-[#fe5001]"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Blue cut</span>
            </label>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Badge</label>
              <input
                type="text"
                value={form.badge ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))}
                placeholder="e.g. Popular, Recommended"
                className="w-full max-w-[180px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={addLens}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-[#fe5001] text-white text-sm font-semibold disabled:opacity-50"
            >
              {editing ? 'Update lens' : 'Add lens'}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => { setEditing(null); setForm({ id: '', name: '', shortDesc: '', description: '', whoIsItFor: '', price: 0, lensTypeCategory: 'single_vision', useCases: ['all'], blueCut: false, type: 'single_vision', badge: '' }); }}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 dark:text-white">Lenses ({lenses.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">ID</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Category</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Price</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {lenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
                    No custom lenses. Add above or load built-in lenses.
                  </td>
                </tr>
              ) : (
                lenses.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100 dark:border-slate-700/50">
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{l.id}</td>
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{l.name}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{LENS_TYPE_CATEGORIES.find((c) => c.id === l.lensTypeCategory)?.name ?? l.lensTypeCategory}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{l.type}</td>
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-100">₹{l.price}</td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => startEdit(l)} className="text-[#fe5001] hover:underline mr-2">Edit</button>
                      <button type="button" onClick={() => deleteLens(l.id)} className="text-red-500 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
