'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
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

function getTopLevelCategories(config: AppConfig | null): AppCategory[] {
  const list = config?.categories ?? [];
  return list.filter((c) => !c.parentId).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export default function AdminProductsPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const [newProduct, setNewProduct] = useState({
    catalogSlug: '',
    name: '',
    categoryId: '',
    shape: 'round',
  });

  const [variantForm, setVariantForm] = useState({
    productId: '',
    sku: '',
    colorName: '',
    displayType: 'SOLID',
    costPrice: 0,
    mrp: 0,
    sellingPrice: 0,
    taxRate: 18,
    hsnCode: '9004',
    reorderPoint: 5,
  });

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
      setNewProduct((f) => ({
        ...f,
        categoryId: f.categoryId || tops[0]?.id || 'eyeglasses',
      }));
    } catch {
      setMsg('Failed to load catalog.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveProductMeta = async (p: AdminProduct, patch: Partial<AdminProduct>) => {
    setMsg('');
    const res = await fetch(`/api/admin/products/${p.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) setMsg(await res.text());
    else void load();
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
        categoryId: newProduct.categoryId,
        shape: newProduct.shape,
      }),
    });
    if (!res.ok) setMsg(await res.text());
    else {
      setNewProduct((f) => ({ ...f, catalogSlug: '', name: '' }));
      void load();
    }
  };

  const addVariant = async () => {
    setMsg('');
    const pid = variantForm.productId;
    if (!pid || !variantForm.sku.trim() || !variantForm.colorName.trim()) {
      setMsg('Select product, SKU, and colour name.');
      return;
    }
    const res = await fetch(`/api/admin/products/${pid}/variants`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sku: variantForm.sku.trim(),
        colorName: variantForm.colorName.trim(),
        displayType: variantForm.displayType,
        costPrice: variantForm.costPrice,
        mrp: variantForm.mrp || variantForm.sellingPrice,
        sellingPrice: variantForm.sellingPrice,
        taxRate: variantForm.taxRate,
        hsnCode: variantForm.hsnCode,
        reorderPoint: variantForm.reorderPoint,
      }),
    });
    if (!res.ok) setMsg(await res.text());
    else {
      setVariantForm((f) => ({ ...f, sku: '', colorName: '' }));
      void load();
    }
  };

  const patchVariant = async (productId: string, v: AdminVariant, patch: Record<string, unknown>) => {
    setMsg('');
    const res = await fetch(`/api/admin/products/${productId}/variants/${v.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) setMsg(await res.text());
    else void load();
  };

  const deleteProduct = async (p: AdminProduct) => {
    if (!confirm(`Delete product ${p.name} and all variants?`)) return;
    const res = await fetch(`/api/admin/products/${p.id}`, { method: 'DELETE', credentials: 'include' });
    if (!res.ok) setMsg(await res.text());
    else void load();
  };

  if (loading) return <p className="text-slate-500">Loading…</p>;

  const tops = getTopLevelCategories(config);

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Frames (DB catalog)</h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm">
        Products and variants are stored in PostgreSQL. Storefront reads them via <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 rounded">/api/config</code>. Cost price is only visible to ADMIN.
      </p>
      {msg && <p className="text-sm text-red-600 dark:text-red-400">{msg}</p>}

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
        <h2 className="font-semibold text-slate-900 dark:text-white">New product</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input
            placeholder="Catalog slug (storefront id)"
            value={newProduct.catalogSlug}
            onChange={(e) => setNewProduct((f) => ({ ...f, catalogSlug: e.target.value }))}
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          />
          <input
            placeholder="Name"
            value={newProduct.name}
            onChange={(e) => setNewProduct((f) => ({ ...f, name: e.target.value }))}
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          />
          <select
            value={newProduct.categoryId}
            onChange={(e) => setNewProduct((f) => ({ ...f, categoryId: e.target.value }))}
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          >
            {tops.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <input
            placeholder="shape e.g. round"
            value={newProduct.shape}
            onChange={(e) => setNewProduct((f) => ({ ...f, shape: e.target.value }))}
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          />
        </div>
        <button type="button" onClick={createProduct} className="px-4 py-2 rounded-lg bg-[#fe5001] text-white text-sm font-semibold">
          Create product
        </button>
      </section>

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
        <h2 className="font-semibold text-slate-900 dark:text-white">New variant (SKU)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <select
            value={variantForm.productId}
            onChange={(e) => setVariantForm((f) => ({ ...f, productId: e.target.value }))}
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          >
            <option value="">— Product —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.catalogSlug})</option>
            ))}
          </select>
          <input placeholder="SKU" value={variantForm.sku} onChange={(e) => setVariantForm((f) => ({ ...f, sku: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm dark:bg-slate-900" />
          <input placeholder="Colour name" value={variantForm.colorName} onChange={(e) => setVariantForm((f) => ({ ...f, colorName: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm dark:bg-slate-900" />
          <select value={variantForm.displayType} onChange={(e) => setVariantForm((f) => ({ ...f, displayType: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm dark:bg-slate-900">
            {['SOLID', 'GRADIENT', 'MULTI', 'PATTERN'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input type="number" placeholder="Cost" value={variantForm.costPrice} onChange={(e) => setVariantForm((f) => ({ ...f, costPrice: Number(e.target.value) }))} className="rounded-lg border px-3 py-2 text-sm dark:bg-slate-900" />
          <input type="number" placeholder="MRP" value={variantForm.mrp} onChange={(e) => setVariantForm((f) => ({ ...f, mrp: Number(e.target.value) }))} className="rounded-lg border px-3 py-2 text-sm dark:bg-slate-900" />
          <input type="number" placeholder="Selling" value={variantForm.sellingPrice} onChange={(e) => setVariantForm((f) => ({ ...f, sellingPrice: Number(e.target.value) }))} className="rounded-lg border px-3 py-2 text-sm dark:bg-slate-900" />
          <input type="number" placeholder="Reorder pt" value={variantForm.reorderPoint} onChange={(e) => setVariantForm((f) => ({ ...f, reorderPoint: Number(e.target.value) }))} className="rounded-lg border px-3 py-2 text-sm dark:bg-slate-900" />
        </div>
        <button type="button" onClick={addVariant} className="px-4 py-2 rounded-lg bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 text-sm font-semibold">
          Add variant
        </button>
      </section>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <th className="text-left px-3 py-2">Product</th>
              <th className="text-left px-3 py-2">Slug</th>
              <th className="text-left px-3 py-2">Variants</th>
              <th className="text-left px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <Fragment key={p.id}>
                <tr className="border-b border-slate-100 dark:border-slate-700/60">
                  <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">{p.name}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-600 dark:text-slate-400">{p.catalogSlug}</td>
                  <td className="px-3 py-2">{p.variants.length}</td>
                  <td className="px-3 py-2 space-x-2">
                    <button type="button" className="text-[#fe5001]" onClick={() => setExpanded((x) => (x === p.id ? null : p.id))}>
                      {expanded === p.id ? 'Hide' : 'Variants'}
                    </button>
                    <button type="button" className="text-red-600" onClick={() => deleteProduct(p)}>Delete</button>
                  </td>
                </tr>
                {expanded === p.id && (
                  <tr className="bg-slate-50/80 dark:bg-slate-900/30">
                    <td colSpan={4} className="px-3 py-3 space-y-3">
                      <div className="flex flex-wrap gap-3 text-xs">
                        <label className="flex items-center gap-1">
                          <input type="checkbox" checked={p.newArrival} onChange={(e) => saveProductMeta(p, { newArrival: e.target.checked })} />
                          New arrival
                        </label>
                        <label className="flex items-center gap-1">
                          <input type="checkbox" checked={p.topSeller} onChange={(e) => saveProductMeta(p, { topSeller: e.target.checked })} />
                          Top seller
                        </label>
                        <label className="flex items-center gap-1">
                          <input type="checkbox" checked={p.isPublished} onChange={(e) => saveProductMeta(p, { isPublished: e.target.checked })} />
                          Published
                        </label>
                      </div>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-slate-500">
                            <th className="py-1">SKU</th>
                            <th>Colour</th>
                            <th>Cost</th>
                            <th>MRP</th>
                            <th>Sell</th>
                            <th>On hand</th>
                            <th>Res.</th>
                            <th>Avail.</th>
                            <th>Reorder</th>
                          </tr>
                        </thead>
                        <tbody>
                          {p.variants.map((v) => {
                            const breakdown = v.inventoryByWarehouse ?? [];
                            const splitTooltip =
                              breakdown.length > 0
                                ? breakdown
                                    .map((b) => `${b.code}: ${b.onHand} on hand, ${b.reserved} reserved`)
                                    .join('\n')
                                : 'No warehouse rows yet';
                            return (
                              <tr key={v.id} className={v.lowStock ? 'text-amber-700 dark:text-amber-300' : ''}>
                                <td className="font-mono py-1 pr-2">{v.sku}</td>
                                <td>{v.colorName}</td>
                                <td>{v.costPrice != null ? `₹${v.costPrice}` : '—'}</td>
                                <td>₹{v.mrp}</td>
                                <td>₹{v.sellingPrice}</td>
                                <td>
                                  <span title={splitTooltip} className="cursor-help underline decoration-dotted">
                                    {v.onHandQty}
                                  </span>
                                  {breakdown.length > 1 && (
                                    <span className="ml-1 text-[10px] text-slate-400">
                                      ({breakdown.length}×WH)
                                    </span>
                                  )}
                                </td>
                                <td>{v.reservedQty}</td>
                                <td>{v.availableQty}</td>
                                <td>
                                  <input
                                    type="number"
                                    className="w-14 border rounded px-1 dark:bg-slate-900"
                                    defaultValue={v.reorderPoint}
                                    onBlur={(e) => patchVariant(p.id, v, { reorderPoint: Number(e.target.value) })}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {products.length === 0 && <p className="p-4 text-slate-500 text-sm">No products in DB. Run <code className="bg-slate-100 dark:bg-slate-900 px-1 rounded">node prisma/seed-catalog.cjs</code> after migrate.</p>}
      </div>
    </div>
  );
}
