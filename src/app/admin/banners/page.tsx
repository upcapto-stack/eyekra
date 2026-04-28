'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { AppConfig, HomeBanner } from '@/types/app-config';

const getSecret = () =>
  document.cookie.split('; ').find((c) => c.startsWith('admin_secret='))?.split('=')[1] || '';

export default function AdminBannersPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<HomeBanner | null>(null);
  const [form, setForm] = useState<Partial<HomeBanner>>({});
  const editPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((data) => {
        setConfig(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSaveConfig = async (next: AppConfig) => {
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
        setForm({});
      } else {
        alert('Save failed: ' + (await res.text()));
      }
    } finally {
      setSaving(false);
    }
  };

  const updateBanner = (id: string, updates: Partial<HomeBanner>) => {
    if (!config) return;
    const next: AppConfig = {
      ...config,
      banners: config.banners.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    };
    handleSaveConfig(next);
  };

  const addBanner = (b: HomeBanner) => {
    if (!config) return;
    const next: AppConfig = {
      ...config,
      banners: [...config.banners, { ...b, sortOrder: config.banners.length }],
    };
    handleSaveConfig(next);
    setEditing(null);
    setForm({});
  };

  const deleteBanner = (id: string) => {
    if (!config || !confirm('Delete this banner?')) return;
    const next: AppConfig = {
      ...config,
      banners: config.banners.filter((b) => b.id !== id),
    };
    handleSaveConfig(next);
    setEditing(null);
  };

  const startEdit = (b: HomeBanner) => {
    const copy: HomeBanner = {
      id: b.id,
      tag: b.tag ?? '',
      title: b.title ?? '',
      sub: b.sub ?? '',
      extra: b.extra,
      gradient: b.gradient,
      backgroundColor: b.backgroundColor,
      imageUrl: b.imageUrl,
      aspectRatio: b.aspectRatio,
      link: b.link ?? '/home',
      offerRuleId: b.offerRuleId,
      showOnlyInEligibleCities: Boolean(b.showOnlyInEligibleCities),
      sortOrder: typeof b.sortOrder === 'number' ? b.sortOrder : 0,
      tagSize: b.tagSize,
      titleSize: b.titleSize,
      subSize: b.subSize,
      extraSize: b.extraSize,
      textColor: b.textColor,
    };
    setEditing(copy);
    setForm({ ...copy });
  };

  useEffect(() => {
    if (editing && editPanelRef.current) {
      editPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [editing]);

  if (loading || !config) {
    return <p className="text-slate-500">Loading config…</p>;
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Banners</h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
        Edit home carousel. Use &quot;Show only in eligible cities&quot; for Eye Test / 4hr delivery. Size: use imageUrl for custom graphic or gradient for colored card.
      </p>

      <div className="space-y-4 mb-8">
        {config.banners.map((b) => (
          <div
            key={b.id}
            className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          >
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 dark:text-white">{b.tag}</p>
              <p className="text-slate-600 dark:text-slate-300 text-sm">{b.title} · {b.sub}</p>
              <p className="text-slate-500 text-xs mt-1">
                Link: {b.link} · {b.showOnlyInEligibleCities ? 'Eligible cities only' : 'All locations'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  startEdit(b);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#fe5001]/10 text-[#fe5001] hover:bg-[#fe5001]/20 text-sm font-medium"
                title="Edit banner"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit
              </button>
              <button
                type="button"
                onClick={() => deleteBanner(b.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 text-sm font-medium"
                title="Delete banner"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing ? (
        <div ref={editPanelRef} className="p-6 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            {editing.id ? 'Edit banner' : 'New banner'}
          </h2>
          <BannerForm
            initial={form as HomeBanner}
            onChange={setForm}
            offerRules={config?.offerRules ?? []}
            onSave={() => {
              if (editing.id) updateBanner(editing.id, { ...editing, ...form });
              else addBanner({ ...form, sortOrder: config.banners.length } as HomeBanner);
            }}
            onCancel={() => { setEditing(null); setForm({}); }}
            onDelete={editing.id ? () => deleteBanner(editing.id) : undefined}
            saving={saving}
            getSecret={getSecret}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setEditing({ id: '', tag: '', title: '', sub: '', link: '/home', showOnlyInEligibleCities: false, sortOrder: config.banners.length });
            setForm({ id: `b${Date.now()}`, tag: '', title: '', sub: '', link: '/home', showOnlyInEligibleCities: false, sortOrder: config.banners.length });
          }}
          className="px-4 py-2 rounded-xl bg-[#fe5001] text-white font-semibold"
        >
          + Add banner
        </button>
      )}
    </div>
  );
}

const ASPECT_RATIOS = [
  { value: '16/9', label: '16:9 (wide)', width: 1200, height: 675 },
  { value: '3/2', label: '3:2', width: 1200, height: 800 },
  { value: '2/1', label: '2:1', width: 1200, height: 600 },
  { value: '1/1', label: '1:1 (square)', width: 800, height: 800 },
];

const TEXT_SIZES = [
  { value: 'text-xs', label: 'Extra small' },
  { value: 'text-sm', label: 'Small' },
  { value: 'text-base', label: 'Base' },
  { value: 'text-lg', label: 'Large' },
  { value: 'text-xl', label: 'XL' },
  { value: 'text-2xl', label: '2XL' },
  { value: 'text-3xl', label: '3XL' },
] as const;

const TEXT_COLORS = [
  { value: 'text-white', label: 'White' },
  { value: 'text-slate-100', label: 'Slate light' },
  { value: 'text-slate-900', label: 'Black / dark' },
  { value: 'text-amber-200', label: 'Amber' },
  { value: 'text-amber-100', label: 'Amber light' },
];

function BannerForm({
  initial,
  onChange,
  onSave,
  onCancel,
  onDelete,
  saving,
  getSecret,
  offerRules,
}: {
  initial: HomeBanner;
  onChange: (f: Partial<HomeBanner>) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  saving: boolean;
  getSecret: () => string;
  offerRules: { id: string; name?: string; code?: string }[];
}) {
  const [uploading, setUploading] = useState(false);
  const [bannerMode, setBannerMode] = useState<'image' | 'custom'>(() => (initial.imageUrl ? 'image' : 'custom'));
  const isImageBanner = bannerMode === 'image';
  useEffect(() => {
    setBannerMode(initial.imageUrl ? 'image' : 'custom');
  }, [initial.imageUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload/banner', {
        method: 'POST',
        headers: { 'x-admin-secret': getSecret() },
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        onChange({ ...initial, imageUrl: data.url, aspectRatio: initial.aspectRatio || '3/2' });
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch {
      alert('Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Banner type</p>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="bannerType"
              checked={!isImageBanner}
              onChange={() => { setBannerMode('custom'); onChange({ ...initial, imageUrl: undefined }); }}
              className="rounded-full"
            />
            <span className="text-sm">Create custom banner (colour + text)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="bannerType"
              checked={isImageBanner}
              onChange={() => setBannerMode('image')}
              className="rounded-full"
            />
            <span className="text-sm">Image banner (upload)</span>
          </label>
        </div>
      </div>

      {isImageBanner ? (
        <>
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
            <p className="font-medium text-slate-800 dark:text-slate-200 mb-2">Recommended banner image dimensions (designer ke liye)</p>
            <ul className="text-slate-600 dark:text-slate-300 text-xs space-y-1 list-disc list-inside">
              <li><strong>16:9</strong> → 1200 × 675 px</li>
              <li><strong>3:2</strong> → 1200 × 800 px (sabse use karein)</li>
              <li><strong>2:1</strong> → 1200 × 600 px</li>
              <li><strong>1:1</strong> → 800 × 800 px</li>
            </ul>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Format: JPEG, PNG, WebP ya GIF. Max 3MB. Neeche jo aspect ratio select karenge, utne dimensions ki image upload karein — har device par sahi dikhegi.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Upload image</label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-500 disabled:opacity-50">
                {uploading ? 'Uploading…' : 'Choose file'}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFileChange} disabled={uploading} />
              </label>
              {initial.imageUrl && (
                <div className="flex items-center gap-2">
                  <Image src={initial.imageUrl} alt="" width={56} height={56} className="h-14 w-auto rounded-lg object-cover border border-slate-200" />
                  <button type="button" onClick={() => onChange({ ...initial, imageUrl: undefined })} className="text-red-600 text-sm">Remove</button>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Aspect ratio (keeps image from distorting on all devices)</label>
            <select
              value={initial.aspectRatio || '3/2'}
              onChange={(e) => onChange({ ...initial, aspectRatio: e.target.value })}
              className="w-full max-w-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
            >
              {ASPECT_RATIOS.map((r) => (
                <option key={r.value} value={r.value}>{r.label} — {r.width}×{r.height} px</option>
              ))}
            </select>
          </div>
          <p className="text-slate-500 text-xs">Optional overlay text on image:</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={initial.tag} onChange={(e) => onChange({ ...initial, tag: e.target.value })} className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" placeholder="Tag" />
            <input value={initial.title} onChange={(e) => onChange({ ...initial, title: e.target.value })} className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" placeholder="Title" />
            <input value={initial.sub} onChange={(e) => onChange({ ...initial, sub: e.target.value })} className="sm:col-span-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" placeholder="Sub" />
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Background: Gradient (Tailwind)</label>
              <input
                value={initial.gradient || ''}
                onChange={(e) => onChange({ ...initial, gradient: e.target.value, backgroundColor: e.target.value ? undefined : initial.backgroundColor })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
                placeholder="from-violet-600 to-purple-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Or solid colour (hex)</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={/^#[0-9A-Fa-f]{6}$/.test(initial.backgroundColor || '') ? initial.backgroundColor! : '#6366f1'}
                  onChange={(e) => onChange({ ...initial, backgroundColor: e.target.value, gradient: undefined })}
                  className="h-10 w-14 rounded border border-slate-300 cursor-pointer"
                />
                <input
                  value={initial.backgroundColor || ''}
                  onChange={(e) => onChange({ ...initial, backgroundColor: e.target.value || undefined })}
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
                  placeholder="#6366f1"
                />
              </div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tag</label>
              <input value={initial.tag} onChange={(e) => onChange({ ...initial, tag: e.target.value })} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" placeholder="Eyekra Frame Fest" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tag size</label>
              <select value={initial.tagSize || 'text-xs'} onChange={(e) => onChange({ ...initial, tagSize: e.target.value })} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm">
                {TEXT_SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
              <input value={initial.title} onChange={(e) => onChange({ ...initial, title: e.target.value })} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" placeholder="UP TO 40% OFF" />
            </div>
            <div className="sm:col-span-2 flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title size</label>
                <select value={initial.titleSize || 'text-2xl'} onChange={(e) => onChange({ ...initial, titleSize: e.target.value })} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm">
                  {TEXT_SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Text colour</label>
                <select value={initial.textColor || 'text-white'} onChange={(e) => onChange({ ...initial, textColor: e.target.value })} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm">
                  {TEXT_COLORS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sub</label>
              <input value={initial.sub} onChange={(e) => onChange({ ...initial, sub: e.target.value })} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" placeholder="Grab big discounts..." />
            </div>
            <div className="sm:col-span-2 flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sub size</label>
                <select value={initial.subSize || 'text-sm'} onChange={(e) => onChange({ ...initial, subSize: e.target.value })} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm">
                  {TEXT_SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Extra (optional)</label>
                <input value={initial.extra || ''} onChange={(e) => onChange({ ...initial, extra: e.target.value })} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" placeholder="+ Free home trial..." />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Extra size</label>
              <select value={initial.extraSize || 'text-xs'} onChange={(e) => onChange({ ...initial, extraSize: e.target.value })} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm">
                {TEXT_SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2 border-t border-slate-200 dark:border-slate-700 pt-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ID</label>
          <input value={initial.id} onChange={(e) => onChange({ ...initial, id: e.target.value })} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" placeholder="e.g. 1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Link</label>
          <input value={initial.link} onChange={(e) => onChange({ ...initial, link: e.target.value })} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" placeholder="/home or /products" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Offer rule (banner par &quot;Use code X&quot; – rule ke paas code ho to)</label>
          <select value={initial.offerRuleId ?? ''} onChange={(e) => onChange({ ...initial, offerRuleId: e.target.value || undefined })} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm">
            <option value="">None</option>
            {offerRules.map((r) => (
              <option key={r.id} value={r.id}>{r.name || r.id}{r.code ? ` (${r.code})` : ' (auto)'}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2 flex items-center gap-2">
          <input type="checkbox" id="eligible" checked={initial.showOnlyInEligibleCities} onChange={(e) => onChange({ ...initial, showOnlyInEligibleCities: e.target.checked })} className="rounded border-slate-300" />
          <label htmlFor="eligible" className="text-sm text-slate-700 dark:text-slate-300">Show only in eligible cities</label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onSave} disabled={saving || (!initial.imageUrl && (!initial.tag || !initial.title))} className="px-4 py-2 rounded-lg bg-[#fe5001] text-white font-medium disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium">Cancel</button>
        {onDelete && (
          <button type="button" onClick={onDelete} disabled={saving} className="px-4 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50 ml-auto">Delete this banner</button>
        )}
      </div>
    </div>
  );
}
