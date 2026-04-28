'use client';

import { useEffect, useRef, useState } from 'react';
import type { AppConfig, AppCategory } from '@/types/app-config';
import type { Product, ProductShape, ColorVariant } from '@/lib/products-data';
import { SHAPE_LABELS } from '@/lib/products-data';
import { MOCK_PRODUCTS } from '@/lib/products-data';
import { getAttributeOptions, getAttributeOptionLabel } from '@/lib/admin-attributes';

const getSecret = () =>
  document.cookie.split('; ').find((c) => c.startsWith('admin_secret='))?.split('=')[1] || '';

const FALLBACK_SHAPES = ['round', 'oval', 'square', 'rectangle', 'aviator', 'cat-eye', 'wayfarer', 'geometric', 'clubmaster'] as const;

/** Top-level categories from config (no parentId). Sorted by sortOrder. Fallback when none. */
function getTopLevelCategories(config: AppConfig | null): AppCategory[] {
  const list = config?.categories ?? [];
  const top = list.filter((c) => !c.parentId).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  if (top.length === 0) return [{ id: 'eyeglasses', label: 'Eyeglasses', sortOrder: 0 }];
  return top;
}

/** Sub-categories under a parent. */
function getSubCategories(config: AppConfig | null, parentId: string): AppCategory[] {
  const list = config?.categories ?? [];
  return list.filter((c) => c.parentId === parentId).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

/** Label for any category id (top-level or sub) from config. */
function getCategoryLabel(config: AppConfig | null, categoryId: string): string {
  const cat = (config?.categories ?? []).find((c) => c.id === categoryId);
  return cat?.label ?? categoryId;
}

function getShapeOptions(config: AppConfig | null) {
  const opts = getAttributeOptions(config, 'shape');
  return opts.length > 0 ? opts : FALLBACK_SHAPES.map((s) => ({ id: s, label: SHAPE_LABELS[s as ProductShape] }));
}

function nameToId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'product';
}

export default function AdminProductsPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<Partial<Product>>({
    id: '',
    name: '',
    brand: 'Eyekra',
    price: '',
    originalPrice: '',
    discount: '',
    category: '',
    shape: 'round',
    newArrival: false,
    topSeller: false,
    rating: undefined,
    reviewCount: undefined,
    material: '',
    frameType: '',
    lensWidth: '',
    noseBridge: '',
    templeLength: '',
    description: '',
    colors: [],
  });
  const [variantType, setVariantType] = useState<'solid' | 'gradient' | 'multi' | 'pattern'>('solid');
  const [colorName, setColorName] = useState('');
  const [colorHex, setColorHex] = useState('#000000');
  const [gradientFrom, setGradientFrom] = useState('#6366f1');
  const [gradientTo, setGradientTo] = useState('#ec4899');
  const [multiHexes, setMultiHexes] = useState<string[]>(['#000000', '#ffffff']);
  const [patternValue, setPatternValue] = useState('');
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
        const data = await res.json();
        setConfig(data);
        setEditing(null);
        const top = getTopLevelCategories(data);
        setForm({
          id: '', name: '', brand: 'Eyekra', price: '', originalPrice: '', discount: '', category: top[0]?.id ?? 'eyeglasses', shape: 'round',
          newArrival: false, topSeller: false, material: '', frameType: '', lensWidth: '', noseBridge: '', templeLength: '', description: '', colors: [],
        });
      } else {
        alert('Save failed: ' + (await res.text()));
      }
    } finally {
      setSaving(false);
    }
  };

  const products = config?.products ?? [];
  const useBuiltIn = products.length === 0;
  const topLevelCategories = getTopLevelCategories(config);
  const allCategories = config?.categories ?? [];
  const selectedCategoryRecord = allCategories.find((c) => c.id === (form.category ?? ''));
  const selectedTopId = selectedCategoryRecord?.parentId ?? ((form.category ?? '') || (topLevelCategories[0]?.id ?? ''));
  const selectedSubId = selectedCategoryRecord?.parentId ? (form.category ?? '') : '';
  const subOptions = getSubCategories(config, selectedTopId);

  const addProduct = () => {
    if (!config) return;
    const name = (form.name ?? '').trim();
    if (!name) {
      alert('Product name required.');
      return;
    }
    const id = (form.id ?? nameToId(name)).trim() || nameToId(name);
    const existing = products.some((p) => p.id === id);
    if (existing && !editing) {
      alert('Isi ID ya name ka product pehle se hai.');
      return;
    }
    const price = (form.price ?? '').trim();
    if (!price) {
      alert('Price required.');
      return;
    }
    const product: Product = {
      id,
      name,
      brand: (form.brand ?? '').trim() || undefined,
      price,
      originalPrice: (form.originalPrice ?? '').trim() || undefined,
      discount: (form.discount ?? '').trim() || undefined,
      category: (form.category ?? '').trim() || (getTopLevelCategories(config)[0]?.id ?? 'eyeglasses'),
      shape: (form.shape as ProductShape) ?? 'round',
      newArrival: !!form.newArrival,
      topSeller: !!form.topSeller,
      rating: form.rating,
      reviewCount: form.reviewCount,
      material: (form.material ?? '').trim() || undefined,
      frameType: (form.frameType ?? '').trim() || undefined,
      lensWidth: (form.lensWidth ?? '').trim() || undefined,
      noseBridge: (form.noseBridge ?? '').trim() || undefined,
      templeLength: (form.templeLength ?? '').trim() || undefined,
      description: (form.description ?? '').trim() || undefined,
      colors: Array.isArray(form.colors) && form.colors.length > 0 ? (form.colors as ColorVariant[]) : undefined,
    };
    const next: AppConfig = {
      ...config,
      products: editing ? (config.products ?? []).map((p) => (p.id === editing.id ? product : p)) : [...products, product],
    };
    handleSave(next);
  };

  const deleteProduct = (id: string) => {
    if (!config || !config.products || !confirm(`Delete product "${id}"?`)) return;
    const next: AppConfig = { ...config, products: config.products.filter((p) => p.id !== id) };
    handleSave(next);
  };

  const startEdit = (p: Product) => {
    setEditing(p);
    setForm({
      ...p,
      colors: p.colors ?? [],
    });
    panelRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addVariant = () => {
    const name = colorName.trim();
    if (!name) return;
    let v: ColorVariant;
    if (variantType === 'solid') {
      v = { type: 'solid', name, hex: colorHex };
      setColorName('');
      setColorHex('#000000');
    } else if (variantType === 'gradient') {
      v = { type: 'gradient', name, gradient: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` };
      setColorName('');
      setGradientFrom('#6366f1');
      setGradientTo('#ec4899');
    } else if (variantType === 'multi') {
      v = { type: 'multi', name, hexes: [...multiHexes] };
      setColorName('');
      setMultiHexes(['#000000', '#ffffff']);
    } else {
      v = { type: 'pattern', name, pattern: patternValue.trim() || undefined };
      setColorName('');
      setPatternValue('');
    }
    setForm((f) => ({
      ...f,
      colors: [...(f.colors ?? []), v],
    }));
  };

  const addMultiHex = () => setMultiHexes((h) => [...h, '#888888']);
  const setMultiHexAt = (i: number, hex: string) => setMultiHexes((h) => h.map((x, j) => (j === i ? hex : x)));
  const removeMultiHex = (i: number) => setMultiHexes((h) => h.filter((_, j) => j !== i));

  const removeColor = (index: number) => {
    setForm((f) => ({
      ...f,
      colors: (f.colors ?? []).filter((_, i) => i !== index),
    }));
  };

  function getVariantLabel(c: ColorVariant): string {
    if ('type' in c) {
      if (c.type === 'gradient') return `Gradient: ${c.name}`;
      if (c.type === 'multi') return `Multi: ${c.name}`;
      if (c.type === 'pattern') return `Pattern: ${c.name} (${c.pattern ?? '—'})`;
      if (c.type === 'solid') return c.name;
    }
    return ('name' in c ? c.name : '');
  }

  function getVariantStyle(c: ColorVariant): React.CSSProperties {
    if ('type' in c) {
      if (c.type === 'gradient') return { background: c.gradient };
      if (c.type === 'multi' && c.hexes.length > 0) return { background: c.hexes[0] };
      if (c.type === 'pattern') return { background: 'linear-gradient(135deg, #78716c 0%, #a8a29e 50%, #57534e 100%)' };
      if (c.type === 'solid') return { backgroundColor: c.hex };
    }
    return { backgroundColor: ('hex' in c ? c.hex : '#000') };
  }

  const loadFromBuiltIn = () => {
    if (!config || !confirm('Replace current products with built-in sample products?')) return;
    const next: AppConfig = { ...config, products: [...MOCK_PRODUCTS] };
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
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Frames (Products)</h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
        Create and edit frame products. Map each product to <strong>Category</strong>, <strong>Shape (type)</strong>, and marketing flags (New Arrival, Top Seller). Attributes (material, frame type, dimensions) and <strong>variants (colors)</strong> appear on the product detail page.
      </p>

      {useBuiltIn && (
        <div className="mb-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm">
          <p className="font-medium mb-1">Using built-in products</p>
          <p className="mb-3">No custom products in config. The storefront shows built-in sample products. Add products below or load samples to start editing.</p>
          <button
            type="button"
            onClick={loadFromBuiltIn}
            className="px-3 py-1.5 rounded-lg bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 text-sm font-medium"
          >
            Load built-in products
          </button>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden mb-6">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white">{editing ? 'Edit product' : 'Add product'}</h2>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ID</label>
              <input
                type="text"
                value={form.id ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                placeholder="e.g. classic-aviator"
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
                placeholder="e.g. Classic Aviator"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Brand</label>
              <input
                type="text"
                value={form.brand ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                placeholder="Eyekra"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Price *</label>
              <input
                type="text"
                value={form.price ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="₹2,499"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Original price</label>
              <input
                type="text"
                value={form.originalPrice ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, originalPrice: e.target.value }))}
                placeholder="₹3,499"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Discount label</label>
              <input
                type="text"
                value={form.discount ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, discount: e.target.value }))}
                placeholder="30% off"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
              <select
                value={selectedTopId}
                onChange={(e) => {
                  const topId = e.target.value;
                  setForm((f) => ({ ...f, category: topId }));
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
              >
                {topLevelCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Admin → Categories se manage karein</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sub-category (optional)</label>
              <select
                value={selectedSubId}
                onChange={(e) => {
                  const subId = e.target.value;
                  setForm((f) => ({ ...f, category: subId || selectedTopId }));
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
              >
                <option value="">— None (top-level only) —</option>
                {subOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Shape (Type)</label>
              <select
                value={form.shape ?? 'round'}
                onChange={(e) => setForm((f) => ({ ...f, shape: e.target.value as ProductShape }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
              >
                {getShapeOptions(config).map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.newArrival}
                onChange={(e) => setForm((f) => ({ ...f, newArrival: e.target.checked }))}
                className="rounded border-slate-300 text-[#fe5001] focus:ring-[#fe5001]"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">New Arrival (marketing)</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.topSeller}
                onChange={(e) => setForm((f) => ({ ...f, topSeller: e.target.checked }))}
                className="rounded border-slate-300 text-[#fe5001] focus:ring-[#fe5001]"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Top Seller (marketing)</span>
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Material (attribute)</label>
              <input
                type="text"
                value={form.material ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, material: e.target.value }))}
                placeholder="Metal, Acetate"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Frame type (attribute)</label>
              <input
                type="text"
                value={form.frameType ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, frameType: e.target.value }))}
                placeholder="Full Frame, Half Frame"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Lens width</label>
              <input
                type="text"
                value={form.lensWidth ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, lensWidth: e.target.value }))}
                placeholder="52 mm"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nose bridge</label>
              <input
                type="text"
                value={form.noseBridge ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, noseBridge: e.target.value }))}
                placeholder="16 mm"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Temple length</label>
              <input
                type="text"
                value={form.templeLength ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, templeLength: e.target.value }))}
                placeholder="145 mm"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea
              value={form.description ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Product description..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Variants (colours / gradient / multi / pattern)</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {(form.colors ?? []).map((c, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm"
                >
                  <span className="w-5 h-5 rounded border border-slate-300 shrink-0" style={getVariantStyle(c)} />
                  {getVariantLabel(c)}
                  <button type="button" onClick={() => removeColor(i)} className="text-red-500 hover:text-red-700" aria-label="Remove">×</button>
                </span>
              ))}
            </div>
            <div className="space-y-3 p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Add variant type</p>
              <div className="flex flex-wrap gap-2">
                {(['solid', 'gradient', 'multi', 'pattern'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setVariantType(t)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${variantType === t ? 'bg-[#fe5001] text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300'}`}
                  >
                    {t === 'solid' ? 'Solid colour' : t === 'gradient' ? 'Gradient' : t === 'multi' ? 'Multi colour' : 'Pattern'}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={colorName}
                onChange={(e) => setColorName(e.target.value)}
                placeholder="Variant name (e.g. Black, Sunset gradient, Tortoise)"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
              />
              {variantType === 'solid' && (
                <div className="flex gap-2 items-center">
                  <input type="color" value={colorHex} onChange={(e) => setColorHex(e.target.value)} className="w-10 h-9 rounded border border-slate-300 cursor-pointer" />
                  <span className="text-xs text-slate-500">{colorHex}</span>
                </div>
              )}
              {variantType === 'gradient' && (
                <div className="flex gap-2 items-center flex-wrap">
                  <span className="text-xs text-slate-500">From</span>
                  <input type="color" value={gradientFrom} onChange={(e) => setGradientFrom(e.target.value)} className="w-10 h-9 rounded border cursor-pointer" />
                  <span className="text-xs text-slate-500">To</span>
                  <input type="color" value={gradientTo} onChange={(e) => setGradientTo(e.target.value)} className="w-10 h-9 rounded border cursor-pointer" />
                  <span className="w-12 h-9 rounded border border-slate-300 shrink-0" style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }} />
                </div>
              )}
              {variantType === 'multi' && (
                <div className="flex flex-wrap gap-2 items-center">
                  {multiHexes.map((hex, i) => (
                    <span key={i} className="inline-flex items-center gap-1">
                      <input type="color" value={hex} onChange={(e) => setMultiHexAt(i, e.target.value)} className="w-8 h-8 rounded border cursor-pointer" />
                      <button type="button" onClick={() => removeMultiHex(i)} className="text-red-500 text-xs" aria-label="Remove">×</button>
                    </span>
                  ))}
                  <button type="button" onClick={addMultiHex} className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs">+ Colour</button>
                </div>
              )}
              {variantType === 'pattern' && (
                <input
                  type="text"
                  value={patternValue}
                  onChange={(e) => setPatternValue(e.target.value)}
                  placeholder="Pattern name (e.g. Tortoise, Marble, Floral)"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
                />
              )}
              <button type="button" onClick={addVariant} className="px-3 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 text-sm font-medium">
                Add variant
              </button>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={addProduct}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-[#fe5001] text-white text-sm font-semibold disabled:opacity-50"
            >
              {editing ? 'Update product' : 'Add product'}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => { setEditing(null); setForm({ id: '', name: '', brand: 'Eyekra', price: '', category: topLevelCategories[0]?.id ?? 'eyeglasses', shape: 'round', newArrival: false, topSeller: false, colors: [] }); }}
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
          <h2 className="font-semibold text-slate-900 dark:text-white">Products ({products.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">ID</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Category</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Shape</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Price</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Flags</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
                    No custom products. Add above or load built-in products.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 dark:border-slate-700/50">
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{p.id}</td>
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{p.name}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{getCategoryLabel(config, p.category)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{getAttributeOptionLabel(config, 'shape', p.shape) || p.shape}</td>
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{p.price}</td>
                    <td className="px-4 py-3">
                      {[p.newArrival && 'New', p.topSeller && 'Top'].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => startEdit(p)} className="text-[#fe5001] hover:underline mr-2">Edit</button>
                      <button type="button" onClick={() => deleteProduct(p.id)} className="text-red-500 hover:underline">Delete</button>
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
