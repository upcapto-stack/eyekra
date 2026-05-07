'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AppConfig, PartnerWarehouseCoverage } from '@/types/app-config';

const getSecret = () =>
  document.cookie.split('; ').find((c) => c.startsWith('admin_secret='))?.split('=')[1] || '';

function uid(): string {
  return `wh_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

export default function AdminPartnerWarehousesPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [city, setCity] = useState('');
  const [warehouseName, setWarehouseName] = useState('');
  const [warehouseAddress, setWarehouseAddress] = useState('');

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((data) => {
        setConfig(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const rows = useMemo(
    () => (Array.isArray(config?.partnerWarehouseCoverage) ? config!.partnerWarehouseCoverage : []),
    [config],
  );

  const handleSave = async (next: AppConfig) => {
    setSaving(true);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': getSecret() },
        body: JSON.stringify(next),
      });
      if (res.ok) setConfig(await res.json());
      else alert('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const addMapping = () => {
    if (!config) return;
    const nextCity = city.trim().toLowerCase();
    const nextWarehouseName = warehouseName.trim();
    const nextWarehouseAddress = warehouseAddress.trim();
    if (!nextCity || !nextWarehouseName) return;
    const duplicate = rows.some(
      (row) => row.city.toLowerCase() === nextCity && row.warehouseName.toLowerCase() === nextWarehouseName.toLowerCase(),
    );
    if (duplicate) return;
    const nextRow: PartnerWarehouseCoverage = {
      id: uid(),
      city: nextCity,
      warehouseName: nextWarehouseName,
      warehouseAddress: nextWarehouseAddress || undefined,
      isActive: true,
    };
    void handleSave({ ...config, partnerWarehouseCoverage: [...rows, nextRow] });
    setCity('');
    setWarehouseName('');
    setWarehouseAddress('');
  };

  const removeMapping = (id: string) => {
    if (!config) return;
    void handleSave({ ...config, partnerWarehouseCoverage: rows.filter((row) => row.id !== id) });
  };

  const toggleActive = (id: string, active: boolean) => {
    if (!config) return;
    void handleSave({
      ...config,
      partnerWarehouseCoverage: rows.map((row) => (row.id === id ? { ...row, isActive: active } : row)),
    });
  };

  if (loading || !config) {
    return <p className="text-slate-500">Loading…</p>;
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Partner city to warehouse map</h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
        On partner sign-in we match their latest saved address city token and auto-assign the warehouse below. If no match is found, partner performance shows a coming soon state.
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 mb-3">
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City token (e.g. noida)"
          className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400"
        />
        <input
          type="text"
          value={warehouseName}
          onChange={(e) => setWarehouseName(e.target.value)}
          placeholder="Warehouse name"
          className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400"
        />
        <input
          type="text"
          value={warehouseAddress}
          onChange={(e) => setWarehouseAddress(e.target.value)}
          placeholder="Warehouse address (optional)"
          className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400"
        />
      </div>
      <button
        type="button"
        onClick={addMapping}
        disabled={saving || !city.trim() || !warehouseName.trim()}
        className="px-4 py-2.5 rounded-xl bg-[#fe5001] text-white font-semibold disabled:opacity-50 mb-6"
      >
        Add mapping
      </button>

      <div className="space-y-2">
        {rows.map((row) => (
          <article
            key={row.id}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {row.city} → {row.warehouseName}
              </p>
              {row.warehouseAddress && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{row.warehouseAddress}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={row.isActive !== false}
                  onChange={(e) => toggleActive(row.id, e.target.checked)}
                />
                Active
              </label>
              <button
                type="button"
                onClick={() => removeMapping(row.id)}
                className="px-2.5 py-1 rounded-md text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>
      {rows.length === 0 && <p className="text-slate-500 text-sm mt-4">No mappings added yet.</p>}
    </div>
  );
}
