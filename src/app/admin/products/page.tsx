'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppConfig, AppCategory } from '@/types/app-config';

type WarehouseStock = {
  warehouseId?: string;
  code: string;
  name: string;
  onHand: number;
  reserved: number;
  available: number;
  reorderPoint: number;
};

type AdminVariant = {
  id: string;
  sku: string;
  displayType: string;
  colorName: string;
  displayPayload?: unknown;
  costPrice?: number;
  mrp: number;
  sellingPrice: number;
  taxRate: number;
  hsnCode: string;
  reorderPoint: number;
  isActive: boolean;
  onHandQty: number;
  reservedQty: number;
  availableQty: number;
  lowStock?: boolean;
  inventoryByWarehouse?: WarehouseStock[];
};

type AdminProduct = {
  id: string;
  catalogSlug: string;
  name: string;
  brand: string | null;
  categoryId: string;
  shape: string;
  material: string | null;
  frameType: string | null;
  lensWidth: string | null;
  noseBridge: string | null;
  templeLength: string | null;
  newArrival: boolean;
  topSeller: boolean;
  isActive: boolean;
  isPublished: boolean;
  variants: AdminVariant[];
};

type Movement = {
  id: string;
  type: string;
  qty: number;
  onHandDelta: number;
  reservedDelta: number;
  refType: string | null;
  refId: string | null;
  costSnapshot: number | null;
  note: string | null;
  createdAt: string;
  warehouse: { code: string; name: string };
  createdBy: { name: string | null; email: string | null } | null;
  onHandAfter: number;
  reservedAfter: number;
  availableAfter: number;
};

function getTopLevelCategories(config: AppConfig | null): AppCategory[] {
  const list = config?.categories ?? [];
  return list.filter((c) => !c.parentId).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

function formatINR(n: number | null | undefined): string {
  if (n == null) return '—';
  return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function suggestSku(productName: string, colorName: string, existing: AdminVariant[]): string {
  const slug = (s: string) =>
    s
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6);
  const base = `${slug(productName) || 'EYK'}-${slug(colorName) || 'V'}`;
  let n = existing.length + 1;
  while (existing.some((v) => v.sku === `${base}-${String(n).padStart(3, '0')}`)) n += 1;
  return `${base}-${String(n).padStart(3, '0')}`;
}

const MOVEMENT_TONE: Record<string, string> = {
  GRN: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  SALE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  RESERVATION: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  RELEASE: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  ADJUSTMENT: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  TRANSFER_IN: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  TRANSFER_OUT: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  OPENING: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  RETURN: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

export default function AdminProductsPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showCreateProduct, setShowCreateProduct] = useState(false);

  const [newProduct, setNewProduct] = useState({
    catalogSlug: '',
    name: '',
    categoryId: '',
    shape: 'round',
    brand: 'Eyekra',
  });

  // Per-product inline variant draft (productId -> draft)
  const [variantDrafts, setVariantDrafts] = useState<
    Record<
      string,
      {
        sku: string;
        colorName: string;
        displayType: string;
        costPrice: string;
        mrp: string;
        sellingPrice: string;
        taxRate: string;
        hsnCode: string;
        reorderPoint: string;
      }
    >
  >({});

  // History modal state
  const [historyVariant, setHistoryVariant] = useState<{
    productName: string;
    variant: AdminVariant;
  } | null>(null);
  const [historyData, setHistoryData] = useState<{
    movements: Movement[];
    currentOnHand: number;
    currentReserved: number;
    currentAvailable: number;
  } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cfgRes, prodRes] = await Promise.all([
        fetch('/api/config').then((r) => r.json()),
        fetch('/api/admin/products', { credentials: 'include' }).then((r) => r.json()),
      ]);
      setConfig(cfgRes);
      setProducts(Array.isArray(prodRes.products) ? prodRes.products : []);
      const tops = getTopLevelCategories(cfgRes);
      setNewProduct((f) => ({ ...f, categoryId: f.categoryId || tops[0]?.id || 'eyeglasses' }));
    } catch {
      setMsg('Failed to load catalog.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      if (p.name.toLowerCase().includes(q)) return true;
      if (p.catalogSlug.toLowerCase().includes(q)) return true;
      if (p.brand?.toLowerCase().includes(q)) return true;
      if (p.variants.some((v) => v.sku.toLowerCase().includes(q) || v.colorName.toLowerCase().includes(q)))
        return true;
      return false;
    });
  }, [products, search]);

  const totals = useMemo(() => {
    let variantCount = 0;
    let onHand = 0;
    let lowStock = 0;
    let outOfStock = 0;
    for (const p of products) {
      for (const v of p.variants) {
        variantCount += 1;
        onHand += v.onHandQty;
        if (v.availableQty <= 0) outOfStock += 1;
        else if (v.lowStock) lowStock += 1;
      }
    }
    return { variantCount, onHand, lowStock, outOfStock };
  }, [products]);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const ensureDraft = (p: AdminProduct) => {
    if (variantDrafts[p.id]) return;
    setVariantDrafts((prev) => ({
      ...prev,
      [p.id]: {
        sku: '',
        colorName: '',
        displayType: 'SOLID',
        costPrice: '',
        mrp: '',
        sellingPrice: '',
        taxRate: '18',
        hsnCode: '9004',
        reorderPoint: '5',
      },
    }));
  };

  const updateDraft = (
    productId: string,
    patch: Partial<NonNullable<(typeof variantDrafts)[string]>>,
  ) => {
    setVariantDrafts((prev) => ({ ...prev, [productId]: { ...prev[productId], ...patch } }));
  };

  const saveProductMeta = async (p: AdminProduct, patch: Partial<AdminProduct>) => {
    setMsg('');
    const res = await fetch(`/api/admin/products/${p.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      setMsg(await res.text());
      return;
    }
    void load();
  };

  const createProduct = async () => {
    setMsg('');
    if (!newProduct.catalogSlug.trim() || !newProduct.name.trim()) {
      setMsg('Slug and name required.');
      return;
    }
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        catalogSlug: newProduct.catalogSlug.trim(),
        name: newProduct.name.trim(),
        brand: newProduct.brand.trim() || 'Eyekra',
        categoryId: newProduct.categoryId,
        shape: newProduct.shape,
      }),
    });
    if (!res.ok) {
      setMsg((await res.json()).error || 'Failed to create');
      return;
    }
    setNewProduct((f) => ({ ...f, catalogSlug: '', name: '' }));
    setShowCreateProduct(false);
    await load();
  };

  const addVariant = async (p: AdminProduct) => {
    setMsg('');
    const draft = variantDrafts[p.id];
    if (!draft) return;
    if (!draft.sku.trim() || !draft.colorName.trim()) {
      setMsg('SKU and colour name required.');
      return;
    }
    const sellingPrice = Number(draft.sellingPrice) || 0;
    if (sellingPrice <= 0) {
      setMsg('Selling price required.');
      return;
    }
    const res = await fetch(`/api/admin/products/${p.id}/variants`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sku: draft.sku.trim(),
        colorName: draft.colorName.trim(),
        displayType: draft.displayType,
        costPrice: Number(draft.costPrice) || 0,
        mrp: Number(draft.mrp) || sellingPrice,
        sellingPrice,
        taxRate: Number(draft.taxRate) || 18,
        hsnCode: draft.hsnCode.trim() || '9004',
        reorderPoint: Number(draft.reorderPoint) || 5,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setMsg(err.error || 'Failed to add variant.');
      return;
    }
    setVariantDrafts((prev) => {
      const next = { ...prev };
      delete next[p.id];
      return next;
    });
    await load();
  };

  const patchVariant = async (productId: string, v: AdminVariant, patch: Record<string, unknown>) => {
    setMsg('');
    const res = await fetch(`/api/admin/products/${productId}/variants/${v.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      setMsg(await res.text());
      return;
    }
    await load();
  };

  const deleteVariant = async (productId: string, v: AdminVariant) => {
    if (!confirm(`Delete variant ${v.sku}? This will permanently remove its stock history.`)) return;
    const res = await fetch(`/api/admin/products/${productId}/variants/${v.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) {
      setMsg(await res.text());
      return;
    }
    await load();
  };

  const deleteProduct = async (p: AdminProduct) => {
    if (!confirm(`Delete product "${p.name}" and all ${p.variants.length} variant(s)?`)) return;
    const res = await fetch(`/api/admin/products/${p.id}`, { method: 'DELETE', credentials: 'include' });
    if (!res.ok) {
      setMsg(await res.text());
      return;
    }
    await load();
  };

  const openHistory = async (productName: string, v: AdminVariant) => {
    setHistoryVariant({ productName, variant: v });
    setHistoryData(null);
    setHistoryLoading(true);
    try {
      const r = await fetch(`/api/admin/inventory/movements?variantId=${encodeURIComponent(v.id)}&limit=200`, {
        credentials: 'include',
      });
      const data = await r.json();
      setHistoryData(data);
    } finally {
      setHistoryLoading(false);
    }
  };

  const backfillUnits = async (productName: string, v: AdminVariant) => {
    if (!confirm(`Generate QR labels for ${v.onHandQty} existing ${productName} • ${v.colorName} units? This pads tracked units up to your current on-hand count.`)) {
      return;
    }
    setMsg('');
    const r = await fetch('/api/admin/stock-units/backfill', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variantId: v.id }),
    });
    const data = await r.json();
    if (!r.ok) {
      setMsg(data?.error ?? 'Backfill failed');
      return;
    }
    if (data.created === 0) {
      setMsg(data.message || 'Nothing to backfill — all units are already tracked.');
    } else {
      setMsg(`Created ${data.created} tracked units. Click "Units" to view & print QR labels.`);
    }
  };

  if (loading) return <p className="text-slate-500">Loading…</p>;

  const tops = getTopLevelCategories(config);

  return (
    <div className="max-w-6xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Frames catalog</h1>
          <p className="text-sm text-slate-500 mt-1">
            Each product can have multiple variants (colours/finishes). Each variant is one SKU. All inventory
            and sales tracking happens at the SKU level.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateProduct((s) => !s)}
          className="px-4 py-2 rounded-lg bg-[#fe5001] text-white text-sm font-medium hover:bg-[#e64a01]"
        >
          {showCreateProduct ? 'Cancel' : '+ New product'}
        </button>
      </div>

      {msg && (
        <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700 p-3 text-sm text-red-700 dark:text-red-300">
          {msg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">Products</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{products.length}</p>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">SKUs (variants)</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totals.variantCount}</p>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">Units on hand</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totals.onHand}</p>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">Low / Out</p>
          <p className="text-2xl font-bold mt-1">
            <span className="text-amber-600 dark:text-amber-400">{totals.lowStock}</span>
            <span className="text-slate-300 dark:text-slate-600 mx-1">/</span>
            <span className="text-red-600 dark:text-red-400">{totals.outOfStock}</span>
          </p>
        </div>
      </div>

      {/* Create product form */}
      {showCreateProduct && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">New product</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Name *</label>
              <input
                placeholder="e.g. Metal Aviator"
                value={newProduct.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setNewProduct((f) => ({
                    ...f,
                    name,
                    catalogSlug:
                      f.catalogSlug ||
                      name
                        .toLowerCase()
                        .replace(/\s+/g, '-')
                        .replace(/[^a-z0-9-]/g, '')
                        .slice(0, 40),
                  }));
                }}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Catalog slug *</label>
              <input
                placeholder="metal-aviator"
                value={newProduct.catalogSlug}
                onChange={(e) => setNewProduct((f) => ({ ...f, catalogSlug: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Brand</label>
              <input
                value={newProduct.brand}
                onChange={(e) => setNewProduct((f) => ({ ...f, brand: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Category *</label>
              <select
                value={newProduct.categoryId}
                onChange={(e) => setNewProduct((f) => ({ ...f, categoryId: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              >
                {tops.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Shape *</label>
              <select
                value={newProduct.shape}
                onChange={(e) => setNewProduct((f) => ({ ...f, shape: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              >
                {['round', 'square', 'rectangle', 'aviator', 'cat-eye', 'oval', 'wayfarer'].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={createProduct}
              className="px-4 py-2 rounded-lg bg-[#fe5001] text-white text-sm font-medium hover:bg-[#e64a01]"
            >
              Create product
            </button>
          </div>
          <p className="text-xs text-slate-400">
            After creating the product, click on it below to expand and add variants (each colour/finish).
          </p>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            type="search"
            placeholder="Search by product name, slug, brand, SKU, or colour…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 pl-9 pr-3 py-2 text-sm"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
        </div>
        <span className="text-xs text-slate-500">
          {filteredProducts.length} of {products.length}
        </span>
      </div>

      {/* Product cards */}
      {filteredProducts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center text-slate-500">
          {products.length === 0
            ? 'No products yet. Click "+ New product" to start.'
            : 'No products match your search.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map((p) => {
            const isOpen = expanded.has(p.id);
            const variantCount = p.variants.length;
            const totalOnHand = p.variants.reduce((s, v) => s + v.onHandQty, 0);
            const draft = variantDrafts[p.id];
            return (
              <div
                key={p.id}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden"
              >
                <div
                  className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40"
                  onClick={() => toggleExpanded(p.id)}
                >
                  <span className="text-slate-400 text-xs w-4">{isOpen ? '▼' : '▶'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate">{p.name}</h3>
                      <span className="font-mono text-[10px] text-slate-400">{p.catalogSlug}</span>
                      {!p.isPublished && (
                        <span className="text-[10px] uppercase tracking-wide bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                          Draft
                        </span>
                      )}
                      {p.newArrival && (
                        <span className="text-[10px] uppercase tracking-wide bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                          New
                        </span>
                      )}
                      {p.topSeller && (
                        <span className="text-[10px] uppercase tracking-wide bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">
                          Top
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {p.brand} • {p.shape} • {variantCount} variant{variantCount === 1 ? '' : 's'} • {totalOnHand} units on hand
                    </p>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-slate-200 dark:border-slate-700 p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/20">
                    {/* Product meta toggles + delete */}
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex flex-wrap gap-3 text-xs">
                        <label className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={p.isPublished}
                            onChange={(e) => saveProductMeta(p, { isPublished: e.target.checked })}
                          />
                          Published
                        </label>
                        <label className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={p.newArrival}
                            onChange={(e) => saveProductMeta(p, { newArrival: e.target.checked })}
                          />
                          New arrival
                        </label>
                        <label className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={p.topSeller}
                            onChange={(e) => saveProductMeta(p, { topSeller: e.target.checked })}
                          />
                          Top seller
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteProduct(p)}
                        className="text-xs text-red-600 dark:text-red-400 hover:underline"
                      >
                        Delete product
                      </button>
                    </div>

                    {/* Variants table */}
                    {variantCount === 0 ? (
                      <div className="text-sm text-slate-500 italic px-2">
                        No variants yet. Add the first colour/finish below.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-100 dark:bg-slate-900/50">
                            <tr className="text-left text-slate-500 uppercase text-[10px] tracking-wider">
                              <th className="px-3 py-2">SKU</th>
                              <th className="px-3 py-2">Colour</th>
                              <th className="px-3 py-2 text-right">Cost</th>
                              <th className="px-3 py-2 text-right">MRP</th>
                              <th className="px-3 py-2 text-right">Sell</th>
                              <th className="px-3 py-2 text-right">On hand</th>
                              <th className="px-3 py-2 text-right">Reserved</th>
                              <th className="px-3 py-2 text-right">Available</th>
                              <th className="px-3 py-2 text-right">Reorder</th>
                              <th className="px-3 py-2 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                            {p.variants.map((v) => {
                              const rowsByWh = v.inventoryByWarehouse ?? [];
                              const splitTooltip =
                                rowsByWh.length > 0
                                  ? rowsByWh.map((b) => `${b.code}: ${b.onHand} on, ${b.reserved} res`).join('\n')
                                  : 'No warehouse rows';
                              return (
                                <tr
                                  key={v.id}
                                  className={
                                    v.availableQty <= 0
                                      ? 'bg-red-50/50 dark:bg-red-900/10'
                                      : v.lowStock
                                        ? 'bg-amber-50/50 dark:bg-amber-900/10'
                                        : ''
                                  }
                                >
                                  <td className="px-3 py-2 font-mono text-[11px] text-slate-700 dark:text-slate-200">
                                    {v.sku}
                                  </td>
                                  <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{v.colorName}</td>
                                  <td className="px-3 py-2 text-right text-slate-500">
                                    {v.costPrice != null ? formatINR(v.costPrice) : '—'}
                                  </td>
                                  <td className="px-3 py-2 text-right text-slate-500">{formatINR(v.mrp)}</td>
                                  <td className="px-3 py-2 text-right font-medium text-slate-900 dark:text-white">
                                    {formatINR(v.sellingPrice)}
                                  </td>
                                  <td
                                    className="px-3 py-2 text-right font-medium text-slate-900 dark:text-white cursor-help underline decoration-dotted"
                                    title={splitTooltip}
                                  >
                                    {v.onHandQty}
                                    {rowsByWh.length > 1 && (
                                      <span className="ml-1 text-[10px] text-slate-400">
                                        ({rowsByWh.length}×WH)
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-right text-slate-500">{v.reservedQty}</td>
                                  <td
                                    className={`px-3 py-2 text-right font-semibold ${
                                      v.availableQty <= 0
                                        ? 'text-red-600 dark:text-red-400'
                                        : v.lowStock
                                          ? 'text-amber-600 dark:text-amber-400'
                                          : 'text-emerald-600 dark:text-emerald-400'
                                    }`}
                                  >
                                    {v.availableQty}
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <input
                                      type="number"
                                      min={0}
                                      className="w-12 border border-slate-300 dark:border-slate-600 rounded px-1 dark:bg-slate-900 text-right text-xs"
                                      defaultValue={v.reorderPoint}
                                      onBlur={(e) => {
                                        const n = Number(e.target.value);
                                        if (n !== v.reorderPoint) patchVariant(p.id, v, { reorderPoint: n });
                                      }}
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-right whitespace-nowrap">
                                    <a
                                      href={`/admin/stock-units?variantId=${encodeURIComponent(v.id)}`}
                                      className="text-[#fe5001] hover:underline mr-2"
                                      title="View per-piece tracked units (QR-tagged)"
                                    >
                                      Units
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => openHistory(p.name, v)}
                                      className="text-[#fe5001] hover:underline mr-2"
                                    >
                                      History
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => backfillUnits(p.name, v)}
                                      className="text-blue-600 dark:text-blue-400 hover:underline mr-2"
                                      title="Generate QR labels for existing on-hand stock"
                                    >
                                      Backfill
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteVariant(p.id, v)}
                                      className="text-red-600 dark:text-red-400 hover:underline"
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Inline add variant */}
                    {!draft ? (
                      <button
                        type="button"
                        onClick={() => ensureDraft(p)}
                        className="text-sm text-[#fe5001] font-medium hover:underline"
                      >
                        + Add variant (colour / finish)
                      </button>
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            New variant for {p.name}
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              setVariantDrafts((prev) => {
                                const next = { ...prev };
                                delete next[p.id];
                                return next;
                              })
                            }
                            className="text-xs text-slate-400 hover:text-slate-600"
                          >
                            Cancel
                          </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 mb-1">Colour name *</label>
                            <input
                              placeholder="Matte black"
                              value={draft.colorName}
                              onChange={(e) => {
                                const colorName = e.target.value;
                                updateDraft(p.id, {
                                  colorName,
                                  sku: draft.sku || suggestSku(p.name, colorName, p.variants),
                                });
                              }}
                              className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 mb-1">SKU *</label>
                            <input
                              placeholder="EYK-MAV-BLK-001"
                              value={draft.sku}
                              onChange={(e) => updateDraft(p.id, { sku: e.target.value })}
                              className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 mb-1">Cost ₹</label>
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="0"
                              value={draft.costPrice}
                              onChange={(e) => updateDraft(p.id, { costPrice: e.target.value })}
                              className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 mb-1">MRP ₹</label>
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="0"
                              value={draft.mrp}
                              onChange={(e) => updateDraft(p.id, { mrp: e.target.value })}
                              className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 mb-1">Sell ₹ *</label>
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="0"
                              value={draft.sellingPrice}
                              onChange={(e) => updateDraft(p.id, { sellingPrice: e.target.value })}
                              className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 mb-1">Reorder pt</label>
                            <input
                              type="number"
                              min={0}
                              value={draft.reorderPoint}
                              onChange={(e) => updateDraft(p.id, { reorderPoint: e.target.value })}
                              className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] text-slate-400">
                            Stock starts at 0. Use a Goods Receipt to bring units in.
                          </p>
                          <button
                            type="button"
                            onClick={() => addVariant(p)}
                            className="px-3 py-1.5 rounded-lg bg-[#fe5001] text-white text-xs font-medium hover:bg-[#e64a01]"
                          >
                            Save variant
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Stock history drawer */}
      {historyVariant && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/40">
          <div
            className="absolute inset-0"
            onClick={() => {
              setHistoryVariant(null);
              setHistoryData(null);
            }}
          />
          <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 shadow-xl flex flex-col">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">Stock history</p>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
                  {historyVariant.productName}
                </h3>
                <p className="text-sm text-slate-500">
                  <span className="font-mono">{historyVariant.variant.sku}</span> — {historyVariant.variant.colorName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setHistoryVariant(null);
                  setHistoryData(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {historyData && (
              <div className="px-5 py-3 grid grid-cols-3 gap-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">On hand now</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{historyData.currentOnHand}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Reserved</p>
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                    {historyData.currentReserved}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Available</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {historyData.currentAvailable}
                  </p>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {historyLoading ? (
                <div className="p-8 text-center text-sm text-slate-500">Loading history…</div>
              ) : !historyData || historyData.movements.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-500">
                  No stock movements yet. Movements appear here after GRNs, sales, adjustments, etc.
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0">
                    <tr className="text-left text-slate-500 uppercase text-[10px] tracking-wider">
                      <th className="px-3 py-2">When</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Warehouse</th>
                      <th className="px-3 py-2 text-right">Δ on-hand</th>
                      <th className="px-3 py-2 text-right">Δ reserved</th>
                      <th className="px-3 py-2 text-right">After</th>
                      <th className="px-3 py-2">Ref</th>
                      <th className="px-3 py-2">Note / By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {historyData.movements.map((m) => {
                      const tone = MOVEMENT_TONE[m.type] ?? 'bg-slate-100 text-slate-700';
                      return (
                        <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{formatDateTime(m.createdAt)}</td>
                          <td className="px-3 py-2">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${tone}`}>
                              {m.type}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{m.warehouse.code}</td>
                          <td
                            className={`px-3 py-2 text-right font-semibold ${
                              m.onHandDelta > 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : m.onHandDelta < 0
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-slate-400'
                            }`}
                          >
                            {m.onHandDelta > 0 ? '+' : ''}
                            {m.onHandDelta}
                          </td>
                          <td
                            className={`px-3 py-2 text-right ${
                              m.reservedDelta > 0
                                ? 'text-amber-600 dark:text-amber-400'
                                : m.reservedDelta < 0
                                  ? 'text-slate-500'
                                  : 'text-slate-300 dark:text-slate-600'
                            }`}
                          >
                            {m.reservedDelta !== 0 && (m.reservedDelta > 0 ? '+' : '')}
                            {m.reservedDelta || '—'}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-500">{m.onHandAfter}</td>
                          <td className="px-3 py-2 text-slate-500 font-mono text-[10px]">
                            {m.refType ? `${m.refType}` : '—'}
                          </td>
                          <td className="px-3 py-2 text-slate-500 max-w-[200px]">
                            <p className="truncate" title={m.note ?? ''}>
                              {m.note ?? '—'}
                            </p>
                            {m.createdBy && (
                              <p className="text-[10px] text-slate-400 truncate">
                                by {m.createdBy.name || m.createdBy.email}
                              </p>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div className="border-t border-slate-200 dark:border-slate-700 px-5 py-2 text-[10px] text-slate-400">
              Showing latest 200 movements. Each row is an immutable audit log entry.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
