'use client';

import { useEffect, useRef, useState } from 'react';
import type { AppCollection, AppConfig, CollectionCondition, CollectionType } from '@/types/app-config';
import { getAttributes, getTags } from '@/shared/utils/admin-attributes';

const getSecret = () =>
  document.cookie.split('; ').find((c) => c.startsWith('admin_secret='))?.split('=')[1] || '';

function labelToSlug(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'collection';
}

export default function AdminCollectionsPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<AppCollection | null>(null);
  const [form, setForm] = useState<Partial<AppCollection>>({ label: '', type: 'manual', productIds: [], conditions: [], badge: '', subtitle: '', imageUrl: '', link: '' });
  const panelRef = useRef<HTMLDivElement>(null);

  const collectionType: CollectionType = (form.type ?? 'manual') as CollectionType;
  const isRuleBased = collectionType === 'rule_based';

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
        setForm({ label: '', type: 'manual', productIds: [], conditions: [], badge: '', subtitle: '', imageUrl: '', link: '' });
      } else {
        alert('Save failed: ' + (await res.text()));
      }
    } finally {
      setSaving(false);
    }
  };

  const collections = (config?.collections ?? []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const addCollection = () => {
    if (!config) return;
    const label = (form.label ?? '').trim();
    if (!label) return;
    const id = labelToSlug(label);
    if (collections.some((c) => c.id === id)) {
      alert('Isi name ki collection pehle se hai.');
      return;
    }
    const type = (form.type ?? 'manual') as CollectionType;
    const productIds = type === 'manual' && (form.productIds ?? []).length ? form.productIds : undefined;
    const conditions = type === 'rule_based' && (form.conditions ?? []).length ? form.conditions : undefined;
    const next: AppConfig = {
      ...config,
      collections: [...collections, { id, label, sortOrder: collections.length, type, productIds, conditions, badge: form.badge || undefined, subtitle: form.subtitle || undefined, imageUrl: form.imageUrl || undefined, link: form.link || undefined }],
    };
    handleSave(next);
  };

  const updateCollection = (oldId: string, updates: Partial<AppCollection>) => {
    if (!config) return;
    const next: AppConfig = {
      ...config,
      collections: config.collections.map((c) => (c.id === oldId ? { ...c, ...updates } : c)),
    };
    handleSave(next);
  };

  const deleteCollection = (id: string) => {
    if (!config || !confirm(`Delete collection "${id}"?`)) return;
    const next: AppConfig = { ...config, collections: config.collections.filter((c) => c.id !== id) };
    handleSave(next);
  };

  const startEdit = (c: AppCollection) => {
    setEditing(c);
    setForm({
      ...c,
      type: (c.type ?? 'manual') as CollectionType,
      productIds: c.productIds ?? [],
      conditions: c.conditions ?? [],
      label: c.label,
      badge: c.badge ?? '',
      subtitle: c.subtitle ?? '',
      imageUrl: c.imageUrl ?? '',
      link: c.link ?? '',
    });
  };

  const saveEdit = () => {
    if (!editing || !config) return;
    const label = (form.label ?? '').trim();
    if (!label) return;
    const type = (form.type ?? 'manual') as CollectionType;
    const productIds = type === 'manual' && (form.productIds ?? []).length ? form.productIds : undefined;
    const conditions = type === 'rule_based' && (form.conditions ?? []).length ? form.conditions : undefined;
    updateCollection(editing.id, { label, type, productIds, conditions, badge: form.badge || undefined, subtitle: form.subtitle || undefined, imageUrl: form.imageUrl || undefined, link: form.link || undefined });
  };

  const addCondition = () => {
    setForm((f) => ({ ...f, conditions: [...(f.conditions ?? []), { attribute: 'category', operator: 'eq', value: '' }] }));
  };
  const updateCondition = (index: number, upd: Partial<CollectionCondition>) => {
    setForm((f) => {
      const list = [...(f.conditions ?? [])];
      list[index] = { ...list[index], ...upd };
      return { ...f, conditions: list };
    });
  };
  const removeCondition = (index: number) => {
    setForm((f) => ({ ...f, conditions: (f.conditions ?? []).filter((_, i) => i !== index) }));
  };
  const parseConditionValue = (c: CollectionCondition): string => {
    if (Array.isArray(c.value)) return c.value.join(', ');
    return String(c.value ?? '');
  };
  const setConditionValue = (index: number, raw: string) => {
    const c = (form.conditions ?? [])[index];
    if (!c) return;
    if (c.operator === 'range') {
      const [a, b] = raw.split(',').map((x) => parseInt(x.trim(), 10));
      updateCondition(index, { value: [Number.isNaN(a) ? 0 : a, Number.isNaN(b) ? 0 : b] });
    } else if (c.operator === 'in') {
      updateCondition(index, { value: raw.split(',').map((x) => x.trim()).filter(Boolean) });
    } else {
      updateCondition(index, { value: raw.trim() });
    }
  };

  const productIdsStr = Array.isArray(form.productIds) ? form.productIds.join(', ') : '';
  const setProductIdsStr = (s: string) =>
    setForm((f) => ({ ...f, productIds: s.split(',').map((x) => x.trim()).filter(Boolean) }));

  useEffect(() => {
    if (editing && panelRef.current) panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [editing]);

  if (loading || !config) {
    return <p className="text-slate-500">Loading…</p>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Collections</h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
        Product collections for offer mapping. Link: <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">/products?collection=id</code>. Product IDs = comma-separated (e.g. 1,2,3). Leave product IDs empty for &quot;New Arrivals&quot; / &quot;Top Sellers&quot; to use built-in rules.
      </p>

      <div className="space-y-3 mb-6">
        {collections.map((c) => (
          <div key={c.id} className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 dark:text-white">{c.label}</p>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                {c.id} · {c.type === 'rule_based' ? 'Rule-based' : 'Manual'}
                {c.type === 'rule_based' && c.conditions?.length ? ` (${c.conditions.length} condition(s))` : c.productIds?.length ? ` · ${c.productIds.length} products` : ' · Built-in rule'}
                {c.badge ? ` · Badge: ${c.badge}` : ''}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button type="button" onClick={() => startEdit(c)} className="px-3 py-2 rounded-lg bg-[#fe5001]/10 text-[#fe5001] hover:bg-[#fe5001]/20 text-sm font-medium">Edit</button>
              <button type="button" onClick={() => deleteCollection(c.id)} className="px-3 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 text-sm font-medium">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {editing ? (
        <div ref={panelRef} className="p-6 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Edit collection</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Collection name</label>
            <input value={form.label ?? ''} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" placeholder="e.g. New Arrivals" />
            <p className="text-xs text-slate-500 mt-1">URL slug: {editing.id}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Type</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="collType" checked={!isRuleBased} onChange={() => setForm((f) => ({ ...f, type: 'manual' }))} className="rounded-full border-slate-300 text-[#fe5001]" />
                <span className="text-sm">Manual</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="collType" checked={isRuleBased} onChange={() => setForm((f) => ({ ...f, type: 'rule_based' }))} className="rounded-full border-slate-300 text-[#fe5001]" />
                <span className="text-sm">Rule-based</span>
              </label>
            </div>
            <p className="text-xs text-slate-500 mt-1">Manual = you pick product IDs. Rule-based = products auto-included by conditions (see Attributes page for keys).</p>
          </div>
          {!isRuleBased ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Product IDs (comma-separated, optional)</label>
              <input value={productIdsStr} onChange={(e) => setProductIdsStr(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm font-mono" placeholder="1, 2, 3, 5" />
              <p className="text-xs text-slate-500 mt-1">Leave empty for new-arrivals / top-sellers to use built-in filter.</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Conditions (all must match)</label>
                <button type="button" onClick={addCondition} className="text-sm text-[#fe5001] hover:underline">+ Add condition</button>
              </div>
              {(form.conditions ?? []).length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400 text-sm py-2">No conditions. Add one (e.g. category = eyeglasses, or price range).</p>
              ) : (
                <ul className="space-y-2">
                  {(form.conditions ?? []).map((cond, idx) => {
                    const attrList = getAttributes(config);
                    const attrKeys = attrList.map((a) => a.key);
                    const useSelect = attrList.length > 0;
                    const selectValue = cond.attribute && attrKeys.includes(cond.attribute) ? cond.attribute : '';
                    return (
                      <li key={idx} className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                        {useSelect ? (
                          <>
                            <select value={selectValue} onChange={(e) => updateCondition(idx, { attribute: e.target.value || (selectValue === '' && cond.attribute ? cond.attribute : '') })} className="min-w-[120px] rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-sm">
                              <option value="">Custom...</option>
                              {attrList.map((a) => (
                                <option key={a.key} value={a.key}>{a.label} ({a.key})</option>
                              ))}
                            </select>
                            {!selectValue && (
                              <input value={cond.attribute} onChange={(e) => updateCondition(idx, { attribute: e.target.value })} className="w-24 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-sm font-mono" placeholder="key" />
                            )}
                          </>
                        ) : (
                          <input value={cond.attribute} onChange={(e) => updateCondition(idx, { attribute: e.target.value })} className="w-24 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-sm font-mono" placeholder="attribute" title="e.g. category, shape, brand, price" />
                        )}
                        <select value={cond.operator} onChange={(e) => updateCondition(idx, { operator: e.target.value as 'eq' | 'in' | 'range' })} className="rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-sm">
                          <option value="eq">equals</option>
                          <option value="in">in list</option>
                          <option value="range">range</option>
                        </select>
                        <input value={parseConditionValue(cond)} onChange={(e) => setConditionValue(idx, e.target.value)} className="flex-1 min-w-[120px] rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-sm" placeholder={cond.operator === 'range' ? 'min, max' : cond.operator === 'in' ? 'a, b, c' : 'value'} />
                        <button type="button" onClick={() => removeCondition(idx)} className="text-red-600 dark:text-red-400 text-sm hover:underline">Remove</button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Badge (from Tags or custom)</label>
              <div className="flex gap-2">
                {getTags(config).length > 0 && (
                  <select
                    value={getTags(config).some((t) => t.label === (form.badge ?? '')) ? (form.badge ?? '') : ''}
                    onChange={(e) => e.target.value && setForm((f) => ({ ...f, badge: e.target.value }))}
                    className="flex-1 min-w-0 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {getTags(config).map((t) => (
                      <option key={t.id} value={t.label}>{t.label}</option>
                    ))}
                  </select>
                )}
                <input value={form.badge ?? ''} onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))} className="flex-1 min-w-0 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" placeholder="New, Bestseller" title="Pick from Tags or type custom" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Subtitle / tagline</label>
              <input value={form.subtitle ?? ''} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" placeholder="Latest styles" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Image URL (optional)</label>
            <input value={form.imageUrl ?? ''} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" placeholder="/banners/..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Link (optional, default: /products?collection=id)</label>
            <input value={form.link ?? ''} onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" placeholder="/products" />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={saveEdit} disabled={saving || !(form.label ?? '').trim()} className="px-4 py-2 rounded-lg bg-[#fe5001] text-white font-medium disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
            <button type="button" onClick={() => { setEditing(null); setForm({ label: '', type: 'manual', productIds: [], conditions: [], badge: '', subtitle: '', imageUrl: '', link: '' }); }} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium">Cancel</button>
          </div>
        </div>
      ) : (
        <div ref={panelRef} className="p-6 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Add collection</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Collection name</label>
            <input value={form.label ?? ''} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" placeholder="e.g. Summer Sale, Blue Cut Offers" />
            {form.label?.trim() && <p className="text-xs text-slate-500 mt-1">URL slug: {labelToSlug(form.label)}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Type</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="addCollType" checked={!isRuleBased} onChange={() => setForm((f) => ({ ...f, type: 'manual' }))} className="rounded-full border-slate-300 text-[#fe5001]" />
                <span className="text-sm">Manual</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="addCollType" checked={isRuleBased} onChange={() => setForm((f) => ({ ...f, type: 'rule_based' }))} className="rounded-full border-slate-300 text-[#fe5001]" />
                <span className="text-sm">Rule-based</span>
              </label>
            </div>
          </div>
          {!isRuleBased ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Product IDs (comma-separated, optional)</label>
              <input value={productIdsStr} onChange={(e) => setProductIdsStr(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm font-mono" placeholder="1, 2, 3, 5" />
              <p className="text-xs text-slate-500 mt-1">Products in this collection. Leave empty to define later or for special collections.</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Conditions (all must match)</label>
                <button type="button" onClick={addCondition} className="text-sm text-[#fe5001] hover:underline">+ Add condition</button>
              </div>
              {(form.conditions ?? []).length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400 text-sm py-2">Add at least one condition (e.g. category = eyeglasses, or price range 1000,5000).</p>
              ) : (
                <ul className="space-y-2">
                  {(form.conditions ?? []).map((cond, idx) => {
                    const attrList = getAttributes(config);
                    const attrKeys = attrList.map((a) => a.key);
                    const useSelect = attrList.length > 0;
                    const selectValue = cond.attribute && attrKeys.includes(cond.attribute) ? cond.attribute : '';
                    return (
                      <li key={idx} className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                        {useSelect ? (
                          <>
                            <select value={selectValue} onChange={(e) => updateCondition(idx, { attribute: e.target.value || (selectValue === '' && cond.attribute ? cond.attribute : '') })} className="min-w-[120px] rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-sm">
                              <option value="">Custom...</option>
                              {attrList.map((a) => (
                                <option key={a.key} value={a.key}>{a.label} ({a.key})</option>
                              ))}
                            </select>
                            {!selectValue && (
                              <input value={cond.attribute} onChange={(e) => updateCondition(idx, { attribute: e.target.value })} className="w-24 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-sm font-mono" placeholder="key" />
                            )}
                          </>
                        ) : (
                          <input value={cond.attribute} onChange={(e) => updateCondition(idx, { attribute: e.target.value })} className="w-24 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-sm font-mono" placeholder="attribute" />
                        )}
                        <select value={cond.operator} onChange={(e) => updateCondition(idx, { operator: e.target.value as 'eq' | 'in' | 'range' })} className="rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-sm">
                          <option value="eq">equals</option>
                          <option value="in">in list</option>
                          <option value="range">range</option>
                        </select>
                        <input value={parseConditionValue(cond)} onChange={(e) => setConditionValue(idx, e.target.value)} className="flex-1 min-w-[120px] rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-sm" placeholder={cond.operator === 'range' ? 'min, max' : cond.operator === 'in' ? 'a, b, c' : 'value'} />
                        <button type="button" onClick={() => removeCondition(idx)} className="text-red-600 dark:text-red-400 text-sm hover:underline">Remove</button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Badge (from Tags or custom)</label>
              <div className="flex gap-2">
                {getTags(config).length > 0 && (
                  <select
                    value={getTags(config).some((t) => t.label === (form.badge ?? '')) ? (form.badge ?? '') : ''}
                    onChange={(e) => e.target.value && setForm((f) => ({ ...f, badge: e.target.value }))}
                    className="flex-1 min-w-0 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {getTags(config).map((t) => (
                      <option key={t.id} value={t.label}>{t.label}</option>
                    ))}
                  </select>
                )}
                <input value={form.badge ?? ''} onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))} className="flex-1 min-w-0 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" placeholder="New, Bestseller" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Subtitle</label>
              <input value={form.subtitle ?? ''} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" placeholder="Tagline" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Image URL (optional)</label>
            <input value={form.imageUrl ?? ''} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" placeholder="/banners/..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Link (optional)</label>
            <input value={form.link ?? ''} onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" placeholder="/products" />
          </div>
          <button type="button" onClick={addCollection} disabled={saving || !(form.label ?? '').trim()} className="px-4 py-2 rounded-lg bg-[#fe5001] text-white font-semibold disabled:opacity-50">+ Add collection</button>
        </div>
      )}
    </div>
  );
}
