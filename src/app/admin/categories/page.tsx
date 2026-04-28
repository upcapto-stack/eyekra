'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { AppCategory, AppConfig } from '@/types/app-config';

const getSecret = () =>
  document.cookie.split('; ').find((c) => c.startsWith('admin_secret='))?.split('=')[1] || '';

/** Category name se filter slug banata hai (non-technical use ke liye) */
function labelToSlug(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'category';
}

export default function AdminCategoriesPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<AppCategory | null>(null);
  const [form, setForm] = useState({ id: '', label: '', iconUrl: '' as string | undefined, parentId: undefined as string | undefined });
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingIcon(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload/category-icon', {
        method: 'POST',
        headers: { 'x-admin-secret': getSecret() },
        body: fd,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setForm((f) => ({ ...f, iconUrl: data.url }));
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch {
      alert('Upload failed');
    } finally {
      setUploadingIcon(false);
      e.target.value = '';
    }
  };

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
        setForm({ id: '', label: '', iconUrl: undefined, parentId: undefined });
      } else {
        alert('Save failed: ' + (await res.text()));
      }
    } finally {
      setSaving(false);
    }
  };

  const categories = (config?.categories ?? []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const topLevel = categories.filter((c) => !c.parentId);
  const subCategories = categories.filter((c) => c.parentId);
  const getSubs = (parentId: string) => subCategories.filter((c) => c.parentId === parentId);

  const addCategory = () => {
    if (!config) return;
    const label = form.label.trim();
    if (!label) return;
    const parentId = form.parentId || undefined;
    const slug = labelToSlug(label);
    const id = parentId ? `${parentId}-${slug}` : slug;
    if (categories.some((c) => c.id === id)) {
      alert('Isi name ki category pehle se hai. Koi aur name try karein.');
      return;
    }
    const sortOrder = parentId ? getSubs(parentId).length : topLevel.length;
    const next: AppConfig = {
      ...config,
      categories: [...categories, { id, label, sortOrder, iconUrl: form.iconUrl || undefined, parentId }],
    };
    handleSave(next);
    setForm({ id: '', label: '', iconUrl: undefined, parentId: undefined });
  };

  const updateCategory = (oldId: string, updates: Partial<AppCategory>) => {
    if (!config) return;
    const next: AppConfig = {
      ...config,
      categories: config.categories.map((c) => (c.id === oldId ? { ...c, ...updates } : c)),
    };
    handleSave(next);
  };

  const deleteCategory = (id: string) => {
    if (!config) return;
    const subs = getSubs(id);
    const msg = subs.length > 0
      ? `"${categories.find((c) => c.id === id)?.label ?? id}" aur iski ${subs.length} sub-category delete karein?`
      : `Delete category "${categories.find((c) => c.id === id)?.label ?? id}"?`;
    if (!confirm(msg)) return;
    const toRemove = new Set([id, ...subs.map((s) => s.id)]);
    const next: AppConfig = {
      ...config,
      categories: config.categories.filter((c) => !toRemove.has(c.id)),
    };
    handleSave(next);
  };

  const startEdit = (c: AppCategory) => {
    setEditing(c);
        setForm({ id: c.id, label: c.label, iconUrl: c.iconUrl, parentId: c.parentId });
  };

  const startAddSub = (parent: AppCategory) => {
    setEditing(null);
    setForm({ id: '', label: '', iconUrl: undefined, parentId: parent.id });
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const addSlugPreview = labelToSlug(form.label || form.id);

  const saveEdit = () => {
    if (!editing || !config) return;
    const label = form.label.trim();
    if (!label) return;
    updateCategory(editing.id, { label, iconUrl: form.iconUrl || undefined, parentId: form.parentId });
  };

  useEffect(() => {
    if (editing && panelRef.current) panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [editing]);

  if (loading || !config) {
    return <p className="text-slate-500">Loading…</p>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Categories</h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
        Pehle nayi category banao (top-level). Uske baad list mein us category par &quot;+ Sub-category&quot; se uske andar sub-categories add karein.
      </p>

      {/* Form area: either "Create new category" or "Add sub-category under X" (hidden when editing) */}
      {!editing && (
      <div ref={panelRef} className="p-6 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mb-6">
        {!form.parentId ? (
          <>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Create new category</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Pehle yahan se nayi category banao. Baad mein list mein us category par &quot;+ Sub-category&quot; dabakar uske andar sub-categories add karein.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category name</label>
                <input
                  value={editing ? '' : form.label}
                  onChange={(e) => !editing && setForm((f) => ({ ...f, label: e.target.value, parentId: undefined }))}
                  disabled={!!editing}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm disabled:opacity-60"
                  placeholder="e.g. Eyeglasses, Sunglasses, Contact Lenses"
                />
                {form.label.trim() && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Filter slug: <strong>{addSlugPreview}</strong></p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Icon (optional)</label>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="px-3 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-500 disabled:opacity-50">
                    {uploadingIcon ? 'Uploading…' : 'Choose icon'}
                    <input type="file" accept="image/png,image/webp,image/svg+xml,image/jpeg" className="hidden" onChange={handleIconUpload} disabled={uploadingIcon || !!editing} />
                  </label>
                  {form.iconUrl && (
                    <>
                      <Image src={form.iconUrl} alt="" width={48} height={48} className="w-12 h-12 rounded-lg object-contain border border-slate-200 dark:border-slate-600" />
                      <button type="button" onClick={() => setForm((f) => ({ ...f, iconUrl: undefined }))} className="text-red-600 dark:text-red-400 text-sm">Remove</button>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { if (!editing) addCategory(); }}
              disabled={saving || !!editing || !form.label.trim()}
              className="mt-2 px-4 py-2 rounded-lg bg-[#fe5001] text-white font-semibold disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Create category'}
            </button>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Add sub-category under &quot;{topLevel.find((t) => t.id === form.parentId)?.label ?? form.parentId}&quot;
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Sub-category ka name daalein. Filter slug: <strong>{form.parentId}-{addSlugPreview || '…'}</strong></p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sub-category name</label>
                <input
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
                  placeholder="e.g. Metal, Acetate, Blue Cut"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Icon (optional)</label>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="px-3 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-500 disabled:opacity-50">
                    {uploadingIcon ? 'Uploading…' : 'Choose icon'}
                    <input type="file" accept="image/png,image/webp,image/svg+xml,image/jpeg" className="hidden" onChange={handleIconUpload} disabled={uploadingIcon} />
                  </label>
                  {form.iconUrl && (
                    <>
                      <Image src={form.iconUrl} alt="" width={48} height={48} className="w-12 h-12 rounded-lg object-contain border border-slate-200 dark:border-slate-600" />
                      <button type="button" onClick={() => setForm((f) => ({ ...f, iconUrl: undefined }))} className="text-red-600 dark:text-red-400 text-sm">Remove</button>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => { if (!editing) addCategory(); }}
                disabled={saving || !form.label.trim()}
                className="px-4 py-2 rounded-lg bg-[#fe5001] text-white font-semibold disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Add sub-category'}
              </button>
              <button
                type="button"
                onClick={() => setForm({ id: '', label: '', iconUrl: undefined, parentId: undefined })}
                className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
      )}

      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">Categories list (sub-categories add karein)</h2>
      <div className="space-y-3 mb-6">
        {topLevel.map((c) => (
          <div key={c.id} className="space-y-2">
            <div
              className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              <div className="flex-1 min-w-0 flex items-center gap-3">
                {c.iconUrl ? (
                  <Image src={c.iconUrl} alt="" width={40} height={40} className="w-10 h-10 rounded-lg object-contain bg-slate-100 dark:bg-slate-700" />
                ) : (
                  <span className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-500 text-xs">—</span>
                )}
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{c.label}</p>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Filter: {c.id}</p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => startAddSub(c)}
                  className="px-3 py-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 text-sm font-medium"
                >
                  + Sub-category
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(c)}
                  className="px-3 py-2 rounded-lg bg-[#fe5001]/10 text-[#fe5001] hover:bg-[#fe5001]/20 text-sm font-medium"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteCategory(c.id)}
                  className="px-3 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
            {getSubs(c.id).map((sub) => (
              <div
                key={sub.id}
                className="flex items-center gap-4 pl-6 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 ml-4 border-l-2 border-l-[#fe5001]/40"
              >
                <div className="flex-1 min-w-0 flex items-center gap-3">
                  {sub.iconUrl ? (
                    <Image src={sub.iconUrl} alt="" width={32} height={32} className="w-8 h-8 rounded-lg object-contain bg-slate-100 dark:bg-slate-700" />
                  ) : (
                    <span className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-500 text-xs">—</span>
                  )}
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-200">{sub.label}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Filter: {sub.id}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(sub)}
                    className="px-3 py-2 rounded-lg bg-[#fe5001]/10 text-[#fe5001] hover:bg-[#fe5001]/20 text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCategory(sub.id)}
                    className="px-3 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {editing ? (
        <div ref={panelRef} className="p-6 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 scroll-mt-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Edit category</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Parent category</label>
              <select
                value={form.parentId ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value || undefined }))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
              >
                <option value="">— Top-level (no parent) —</option>
                {topLevel.filter((t) => t.id !== editing.id).map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Sub-category banane ke liye parent choose karein; ID change nahi hogi.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category name</label>
              <input
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
                placeholder="e.g. Eyeglasses, Contact Lenses"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">Filter ab bhi: {editing.id}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Icon</label>
              <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-slate-600 dark:text-slate-300 mb-2">
                <strong>Recommended dimensions: 128×128 px</strong> (square). PNG, WebP, SVG ya JPEG. Max 512KB. Is size se icon sab devices par clear dikhega.
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="px-3 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-500 disabled:opacity-50">
                  {uploadingIcon ? 'Uploading…' : 'Choose icon'}
                  <input type="file" accept="image/png,image/webp,image/svg+xml,image/jpeg" className="hidden" onChange={handleIconUpload} disabled={uploadingIcon} />
                </label>
                {form.iconUrl && (
                  <>
                    <Image src={form.iconUrl} alt="" width={48} height={48} className="w-12 h-12 rounded-lg object-contain border border-slate-200 dark:border-slate-600" />
                    <button type="button" onClick={() => setForm((f) => ({ ...f, iconUrl: undefined }))} className="text-red-600 dark:text-red-400 text-sm">Remove</button>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={saveEdit}
              disabled={saving || !form.label.trim()}
              className="px-4 py-2 rounded-lg bg-[#fe5001] text-white font-medium disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => { setEditing(null); setForm({ id: '', label: '', iconUrl: undefined, parentId: undefined }); }}
              className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
