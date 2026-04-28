'use client';

/**
 * Data Layer – Product Attributes & Tags
 * Customize attributes (category, shape, etc.) and tags (badges). Updates flow to Frames, Collections, and other admin forms.
 */

import { useEffect, useRef, useState } from 'react';
import type { AppConfig, AppAttribute, AppAttributeOption, AppTag } from '@/types/app-config';

const getSecret = () =>
  document.cookie.split('; ').find((c) => c.startsWith('admin_secret='))?.split('=')[1] || '';

const DEFAULT_ATTRIBUTES: AppAttribute[] = [
  { key: 'category', label: 'Category', description: 'Primary grouping. Used in Structure layer and filters.', type: 'select', options: [{ id: 'eyeglasses', label: 'Eyeglasses' }, { id: 'sunglasses', label: 'Sunglasses' }, { id: 'reading', label: 'Reading Glasses' }, { id: 'computer', label: 'Computer Glasses' }, { id: 'kids', label: 'Kids Glasses' }] },
  { key: 'shape', label: 'Frame shape', description: 'Filter and collection condition.', type: 'select', options: [{ id: 'round', label: 'Round' }, { id: 'oval', label: 'Oval' }, { id: 'square', label: 'Square' }, { id: 'rectangle', label: 'Rectangle' }, { id: 'aviator', label: 'Aviator' }, { id: 'cat-eye', label: 'Cat-Eye' }, { id: 'wayfarer', label: 'Wayfarer' }, { id: 'geometric', label: 'Geometric' }, { id: 'clubmaster', label: 'Clubmaster' }] },
  { key: 'brand', label: 'Brand', description: 'Filter and SEO.', example: 'Eyekra', type: 'text' },
  { key: 'frameType', label: 'Frame type', description: 'e.g. Full Frame, Half Frame.', example: 'Full Frame', type: 'text' },
  { key: 'material', label: 'Material', description: 'Product detail and filter.', example: 'Metal, Acetate', type: 'text' },
  { key: 'newArrival', label: 'New arrival', description: 'Boolean. Powers “New Arrivals” collection and filters.', type: 'boolean' },
  { key: 'topSeller', label: 'Top seller', description: 'Boolean. Powers “Top Sellers” collection and filters.', type: 'boolean' },
  { key: 'price', label: 'Price', description: 'Numeric (parsed from string). Range conditions in rule-based collections.', example: '₹2,499', type: 'text' },
];

const DEFAULT_TAGS: AppTag[] = [
  { id: 'new', label: 'New' },
  { id: 'bestseller', label: 'Bestseller' },
  { id: 'popular', label: 'Popular' },
];

function keyFromLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'tag';
}

export default function AdminAttributesPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingAttr, setEditingAttr] = useState<AppAttribute | null>(null);
  const [editingTag, setEditingTag] = useState<AppTag | null>(null);
  const [formAttr, setFormAttr] = useState<Partial<AppAttribute>>({ key: '', label: '', description: '', example: '', type: 'text', options: [] });
  const [formTag, setFormTag] = useState<Partial<AppTag>>({ id: '', label: '' });
  const [newOptionId, setNewOptionId] = useState('');
  const [newOptionLabel, setNewOptionLabel] = useState('');
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
        setEditingAttr(null);
        setEditingTag(null);
        setFormAttr({ key: '', label: '', description: '', example: '', type: 'text', options: [] });
        setFormTag({ id: '', label: '' });
      } else {
        alert('Save failed: ' + (await res.text()));
      }
    } finally {
      setSaving(false);
    }
  };

  const attributes = config?.attributes ?? [];
  const tags = config?.tags ?? [];

  const loadDefaults = () => {
    if (!config || !confirm('Load default attributes and tags? This will only run if current lists are empty.')) return;
    const next: AppConfig = {
      ...config,
      attributes: attributes.length === 0 ? DEFAULT_ATTRIBUTES : config.attributes,
      tags: tags.length === 0 ? DEFAULT_TAGS : config.tags,
    };
    handleSave(next);
  };

  const addAttribute = () => {
    if (!config) return;
    const key = (formAttr.key ?? '').trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || keyFromLabel(formAttr.label ?? '');
    const label = (formAttr.label ?? '').trim();
    if (!label) {
      alert('Label required.');
      return;
    }
    const existing = attributes.some((a) => a.key === key);
    if (existing && !editingAttr) {
      alert('An attribute with this key already exists.');
      return;
    }
    const attr: AppAttribute = {
      key: key || 'attr',
      label,
      description: (formAttr.description ?? '').trim() || undefined,
      example: (formAttr.example ?? '').trim() || undefined,
      type: (formAttr.type as AppAttribute['type']) ?? 'text',
      options: formAttr.type === 'select' && Array.isArray(formAttr.options) && formAttr.options.length > 0 ? formAttr.options : undefined,
    };
    const next: AppConfig = {
      ...config,
      attributes: editingAttr ? attributes.map((a) => (a.key === editingAttr.key ? attr : a)) : [...attributes, attr],
    };
    handleSave(next);
  };

  const deleteAttribute = (key: string) => {
    if (!config || !confirm(`Delete attribute "${key}"?`)) return;
    const next: AppConfig = { ...config, attributes: attributes.filter((a) => a.key !== key) };
    handleSave(next);
  };

  const addTag = () => {
    if (!config) return;
    const id = (formTag.id ?? keyFromLabel(formTag.label ?? '')).trim() || keyFromLabel(formTag.label ?? '');
    const label = (formTag.label ?? '').trim();
    if (!label) {
      alert('Tag label required.');
      return;
    }
    const existing = tags.some((t) => t.id === id);
    if (existing && !editingTag) {
      alert('A tag with this ID already exists.');
      return;
    }
    const tag: AppTag = { id: id || 'tag', label };
    const next: AppConfig = {
      ...config,
      tags: editingTag ? tags.map((t) => (t.id === editingTag.id ? tag : t)) : [...tags, tag],
    };
    handleSave(next);
  };

  const deleteTag = (id: string) => {
    if (!config || !confirm(`Delete tag "${id}"?`)) return;
    const next: AppConfig = { ...config, tags: tags.filter((t) => t.id !== id) };
    handleSave(next);
  };

  const addOptionToForm = () => {
    const id = newOptionId.trim() || newOptionLabel.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const label = newOptionLabel.trim();
    if (!label) return;
    setFormAttr((f) => ({
      ...f,
      options: [...(f.options ?? []), { id: id || label, label }],
    }));
    setNewOptionId('');
    setNewOptionLabel('');
  };

  const removeOptionFromForm = (index: number) => {
    setFormAttr((f) => ({ ...f, options: (f.options ?? []).filter((_, i) => i !== index) }));
  };

  const startEditAttr = (a: AppAttribute) => {
    setEditingAttr(a);
    setFormAttr({ ...a, options: a.options ? [...a.options] : [] });
    panelRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const startEditTag = (t: AppTag) => {
    setEditingTag(t);
    setFormTag({ ...t });
  };

  if (loading || !config) {
    return (
      <div className="max-w-4xl">
        <p className="text-slate-500 dark:text-slate-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl" ref={panelRef}>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Attributes & Tags</h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
        Define <strong>attributes</strong> (category, shape, etc.) and <strong>tags</strong> (badges like New, Bestseller). These drive dropdowns and filters in <strong>Frames</strong>, <strong>Collections</strong> (rule-based conditions), and other admin forms. Changes here update everywhere.
      </p>

      {attributes.length === 0 && tags.length === 0 && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm">
          <p className="font-medium mb-1">No attributes or tags yet</p>
          <p className="mb-3">Load default attributes and tags to get started, then customize them.</p>
          <button type="button" onClick={loadDefaults} className="px-3 py-1.5 rounded-lg bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 text-sm font-medium">
            Load defaults
          </button>
        </div>
      )}

      {/* Attributes */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden mb-8">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 dark:text-white">Attributes</h2>
          {attributes.length === 0 && (
            <button type="button" onClick={loadDefaults} className="text-sm text-[#fe5001] hover:underline">Load defaults</button>
          )}
        </div>
        <div className="p-4 space-y-4">
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
            Add or edit an attribute. Use <strong>type: select</strong> and add options to power dropdowns in Frames (e.g. Category, Shape).
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Key (e.g. category, shape)</label>
              <input
                type="text"
                value={formAttr.key ?? ''}
                onChange={(e) => setFormAttr((f) => ({ ...f, key: e.target.value }))}
                placeholder="category"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
                disabled={!!editingAttr}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Label</label>
              <input
                type="text"
                value={formAttr.label ?? ''}
                onChange={(e) => setFormAttr((f) => ({ ...f, label: e.target.value }))}
                placeholder="Category"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <input
              type="text"
              value={formAttr.description ?? ''}
              onChange={(e) => setFormAttr((f) => ({ ...f, description: e.target.value }))}
              placeholder="Used in filters and collections"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Example</label>
              <input
                type="text"
                value={formAttr.example ?? ''}
                onChange={(e) => setFormAttr((f) => ({ ...f, example: e.target.value }))}
                placeholder="eyeglasses, sunglasses"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
              <select
                value={formAttr.type ?? 'text'}
                onChange={(e) => setFormAttr((f) => ({ ...f, type: e.target.value as AppAttribute['type'] }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
              >
                <option value="text">Text</option>
                <option value="select">Select (dropdown)</option>
                <option value="boolean">Boolean</option>
              </select>
            </div>
          </div>
          {formAttr.type === 'select' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Options (for dropdown)</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(formAttr.options ?? []).map((opt, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm">
                    <span className="font-mono text-xs">{opt.id}</span>
                    <span>{opt.label}</span>
                    <button type="button" onClick={() => removeOptionFromForm(i)} className="text-red-500 hover:text-red-700" aria-label="Remove">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newOptionId}
                  onChange={(e) => setNewOptionId(e.target.value)}
                  placeholder="ID (e.g. eyeglasses)"
                  className="flex-1 max-w-[140px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
                />
                <input
                  type="text"
                  value={newOptionLabel}
                  onChange={(e) => setNewOptionLabel(e.target.value)}
                  placeholder="Label (e.g. Eyeglasses)"
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
                />
                <button type="button" onClick={addOptionToForm} className="px-3 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 text-sm font-medium">
                  Add option
                </button>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={addAttribute} disabled={saving} className="px-4 py-2 rounded-lg bg-[#fe5001] text-white text-sm font-semibold disabled:opacity-50">
              {editingAttr ? 'Update attribute' : 'Add attribute'}
            </button>
            {editingAttr && (
              <button type="button" onClick={() => { setEditingAttr(null); setFormAttr({ key: '', label: '', description: '', example: '', type: 'text', options: [] }); }} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm">
                Cancel
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Key</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Label</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Options</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {attributes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">No attributes. Add above or load defaults.</td>
                </tr>
              ) : (
                attributes.map((a) => (
                  <tr key={a.key} className="border-b border-slate-100 dark:border-slate-700/50">
                    <td className="px-4 py-3 font-mono text-[#fe5001]">{a.key}</td>
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{a.label}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{a.type ?? 'text'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{a.options?.length ? `${a.options.length} options` : '—'}</td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => startEditAttr(a)} className="text-[#fe5001] hover:underline mr-2">Edit</button>
                      <button type="button" onClick={() => deleteAttribute(a.key)} className="text-red-500 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tags */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 dark:text-white">Tags</h2>
          {tags.length === 0 && (
            <button type="button" onClick={loadDefaults} className="text-sm text-[#fe5001] hover:underline">Load defaults</button>
          )}
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">Use tags as badges in Collections and elsewhere. ID is used in code; label is shown to users.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ID</label>
              <input
                type="text"
                value={formTag.id ?? ''}
                onChange={(e) => setFormTag((f) => ({ ...f, id: e.target.value }))}
                placeholder="new"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
                disabled={!!editingTag}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Label</label>
              <input
                type="text"
                value={formTag.label ?? ''}
                onChange={(e) => setFormTag((f) => ({ ...f, label: e.target.value }))}
                placeholder="New"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={addTag} disabled={saving} className="px-4 py-2 rounded-lg bg-[#fe5001] text-white text-sm font-semibold disabled:opacity-50">
              {editingTag ? 'Update tag' : 'Add tag'}
            </button>
            {editingTag && (
              <button type="button" onClick={() => { setEditingTag(null); setFormTag({ id: '', label: '' }); }} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm">
                Cancel
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">ID</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Label</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tags.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">No tags. Add above or load defaults.</td>
                </tr>
              ) : (
                tags.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 dark:border-slate-700/50">
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{t.id}</td>
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{t.label}</td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => startEditTag(t)} className="text-[#fe5001] hover:underline mr-2">Edit</button>
                      <button type="button" onClick={() => deleteTag(t.id)} className="text-red-500 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 p-4 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm">
        <p className="font-medium mb-1">Where these are used</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li><strong>Frames</strong> – Category and Shape dropdowns use attribute options; labels come from here.</li>
          <li><strong>Collections</strong> – Rule-based conditions use attribute keys; badge can use tags.</li>
          <li><strong>Offer rules</strong> – Condition attribute keys match these keys.</li>
        </ul>
      </div>
    </div>
  );
}
