'use client';

import { useEffect, useState } from 'react';
import type { AppConfig } from '@/types/app-config';

const getSecret = () =>
  document.cookie.split('; ').find((c) => c.startsWith('admin_secret='))?.split('=')[1] || '';

export default function AdminCitiesPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newCity, setNewCity] = useState('');

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
      if (res.ok) setConfig(await res.json());
      else alert('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const addCity = () => {
    const city = newCity.trim().toLowerCase();
    if (!city || !config) return;
    if (config.eligibleCities.includes(city)) {
      setNewCity('');
      return;
    }
    handleSave({ ...config, eligibleCities: [...config.eligibleCities, city].sort() });
    setNewCity('');
  };

  const removeCity = (city: string) => {
    if (!config) return;
    handleSave({ ...config, eligibleCities: config.eligibleCities.filter((c) => c !== city) });
  };

  if (loading || !config) {
    return <p className="text-slate-500">Loading…</p>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Eligible cities</h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
        Banners marked &quot;Show only in eligible cities&quot; (e.g. Eye Test, 4hr Delivery) will appear only when the user&apos;s address contains one of these city names (case-insensitive).
      </p>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={newCity}
          onChange={(e) => setNewCity(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCity())}
          placeholder="Add city (e.g. noida, mumbai)"
          className="flex-1 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400"
        />
        <button
          type="button"
          onClick={addCity}
          disabled={saving || !newCity.trim()}
          className="px-4 py-2.5 rounded-xl bg-[#fe5001] text-white font-semibold disabled:opacity-50"
        >
          Add
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {config.eligibleCities.map((city) => (
          <span
            key={city}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm"
          >
            {city}
            <button
              type="button"
              onClick={() => removeCity(city)}
              className="text-slate-500 hover:text-red-600 dark:hover:text-red-400 font-bold"
              aria-label={`Remove ${city}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      {config.eligibleCities.length === 0 && (
        <p className="text-slate-500 text-sm mt-4">No cities yet. Add city names above.</p>
      )}
    </div>
  );
}
