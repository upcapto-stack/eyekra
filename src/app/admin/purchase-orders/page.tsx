'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type Supplier = { id: string; name: string };
type Warehouse = { id: string; code: string; name: string };
type Variant = {
  id: string;
  sku: string;
  colorName: string;
  sellingPrice: number;
  costPrice?: number;
};
type AdminProduct = { id: string; name: string; variants: Variant[] };
type LensBlank = { id: string; name: string; legacyLensId: string };

type POLineDraft = {
  kind: 'frame' | 'lens';
  targetId: string;
  qty: string;
  unitCost: string;
};

type PurchaseOrder = {
  id: string;
  poNumber: string;
  status: string;
  expectedAt: string | null;
  total: number;
  createdAt: string;
  supplier: { name: string } | null;
  warehouse: { code: string } | null;
  lines: { id: string }[];
};

const STATUS_TONE: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  SENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  PARTIAL: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  RECEIVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

function formatINR(n: number): string {
  return `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

export default function AdminPurchaseOrdersPage() {
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [lensBlanks, setLensBlanks] = useState<LensBlank[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [expectedAt, setExpectedAt] = useState('');
  const [lines, setLines] = useState<POLineDraft[]>([
    { kind: 'frame', targetId: '', qty: '1', unitCost: '0' },
  ]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [poRes, supRes, whRes, prodRes, lensRes] = await Promise.all([
        fetch('/api/admin/purchase-orders', { credentials: 'include' }).then((r) => r.json()),
        fetch('/api/admin/suppliers', { credentials: 'include' }).then((r) => r.json()),
        fetch('/api/admin/warehouses', { credentials: 'include' }).then((r) => r.json()),
        fetch('/api/admin/products', { credentials: 'include' }).then((r) => r.json()),
        fetch('/api/admin/lens-blanks', { credentials: 'include' }).then((r) => r.json()),
      ]);
      setPos(poRes.purchaseOrders ?? []);
      setSuppliers(supRes.suppliers ?? []);
      const whs: Warehouse[] = whRes.warehouses ?? [];
      setWarehouses(whs);
      const central = whs.find((w) => w.code === 'CENTRAL');
      if (central && !warehouseId) setWarehouseId(central.id);
      setProducts(prodRes.products ?? []);
      setLensBlanks(lensRes.lensBlanks ?? []);
    } finally {
      setLoading(false);
    }
  }, [warehouseId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const computedSubtotal = useMemo(() => {
    return lines.reduce((sum, l) => sum + (Number(l.unitCost) || 0) * (Number(l.qty) || 0), 0);
  }, [lines]);

  const updateLine = (idx: number, patch: Partial<POLineDraft>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const removeLine = (idx: number) => {
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));
  };

  const addLine = () => {
    setLines((prev) => [...prev, { kind: 'frame', targetId: '', qty: '1', unitCost: '0' }]);
  };

  const resetForm = () => {
    setSupplierId('');
    setExpectedAt('');
    setLines([{ kind: 'frame', targetId: '', qty: '1', unitCost: '0' }]);
    setMsg('');
  };

  const submit = async () => {
    setMsg('');
    if (!supplierId) {
      setMsg('Pick a supplier');
      return;
    }
    if (!warehouseId) {
      setMsg('Pick a warehouse');
      return;
    }
    const cleanLines = lines.filter((l) => l.targetId && Number(l.qty) > 0);
    if (cleanLines.length === 0) {
      setMsg('Add at least one line item');
      return;
    }
    setSaving(true);
    try {
      const r = await fetch('/api/admin/purchase-orders', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId,
          warehouseId,
          expectedAt: expectedAt || undefined,
          lines: cleanLines.map((l) => ({
            variantId: l.kind === 'frame' ? l.targetId : undefined,
            lensBlankId: l.kind === 'lens' ? l.targetId : undefined,
            qty: Math.max(1, Math.floor(Number(l.qty))),
            unitCost: Number(l.unitCost) || 0,
          })),
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setMsg(data.error || 'Failed to create PO');
        return;
      }
      setMsg(`Created ${data.poNumber}`);
      resetForm();
      setShowForm(false);
      await loadAll();
    } finally {
      setSaving(false);
    }
  };

  const noSuppliers = suppliers.length === 0;
  const noVariants = products.length === 0;
  const noLensBlanks = lensBlanks.length === 0;
  const noWarehouses = warehouses.length === 0;
  const canCreate = !noSuppliers && !noWarehouses && (!noVariants || !noLensBlanks);

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Purchase orders</h1>
          <p className="text-sm text-slate-500 mt-1">
            Record paper/phone POs here so each Goods Receipt can be linked back for the audit trail.
            Stock only changes when you post a Goods Receipt — POs by themselves do not move inventory.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          disabled={!canCreate}
          className="px-4 py-2 rounded-lg bg-[#fe5001] text-white text-sm font-medium hover:bg-[#e64a01] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {showForm ? 'Cancel' : 'Record PO'}
        </button>
      </div>

      {!canCreate && !loading && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-4 text-sm text-amber-800 dark:text-amber-200 space-y-2">
          <p className="font-semibold">Setup needed before creating POs:</p>
          <ul className="list-disc pl-5 space-y-1">
            {noSuppliers && (
              <li>
                Add at least one supplier in{' '}
                <a className="underline" href="/admin/suppliers">
                  Suppliers
                </a>
                .
              </li>
            )}
            {noWarehouses && (
              <li>
                Add at least one warehouse in{' '}
                <a className="underline" href="/admin/warehouses">
                  Warehouses
                </a>
                .
              </li>
            )}
            {noVariants && noLensBlanks && (
              <li>
                Add products / lens blanks first under{' '}
                <a className="underline" href="/admin/products">
                  Frames
                </a>{' '}
                or{' '}
                <a className="underline" href="/admin/lenses">
                  Lenses
                </a>
                .
              </li>
            )}
          </ul>
        </div>
      )}

      {showForm && canCreate && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Supplier *</label>
              <select
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">Select supplier…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Receive at warehouse *</label>
              <select
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} — {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Expected delivery</label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                value={expectedAt}
                onChange={(e) => setExpectedAt(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Line items</h3>
              <button
                type="button"
                onClick={addLine}
                className="text-xs text-[#fe5001] font-medium hover:underline"
              >
                + Add line
              </button>
            </div>
            {lines.map((line, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40"
              >
                <div className="col-span-2">
                  <label className="block text-[10px] font-medium text-slate-500 mb-1">Type</label>
                  <select
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-2 text-sm"
                    value={line.kind}
                    onChange={(e) =>
                      updateLine(idx, { kind: e.target.value as 'frame' | 'lens', targetId: '' })
                    }
                  >
                    <option value="frame">Frame</option>
                    <option value="lens">Lens</option>
                  </select>
                </div>
                <div className="col-span-5">
                  <label className="block text-[10px] font-medium text-slate-500 mb-1">SKU *</label>
                  <select
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-2 text-sm"
                    value={line.targetId}
                    onChange={(e) => updateLine(idx, { targetId: e.target.value })}
                  >
                    <option value="">Select…</option>
                    {line.kind === 'frame' &&
                      products.flatMap((p) =>
                        p.variants.map((v) => (
                          <option key={v.id} value={v.id}>
                            {p.name} — {v.colorName} ({v.sku})
                          </option>
                        ))
                      )}
                    {line.kind === 'lens' &&
                      lensBlanks.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} ({l.legacyLensId})
                        </option>
                      ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-medium text-slate-500 mb-1">Qty *</label>
                  <input
                    type="number"
                    min={1}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-2 text-sm"
                    value={line.qty}
                    onChange={(e) => updateLine(idx, { qty: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-medium text-slate-500 mb-1">Unit cost ₹</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-2 text-sm"
                    value={line.unitCost}
                    onChange={(e) => updateLine(idx, { unitCost: e.target.value })}
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    disabled={lines.length === 1}
                    title="Remove line"
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Subtotal: <span className="font-semibold">{formatINR(computedSubtotal)}</span>
            </p>
            <div className="flex items-center gap-3">
              {msg && <span className="text-xs text-slate-500">{msg}</span>}
              <button
                type="button"
                onClick={submit}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-[#fe5001] text-white text-sm font-medium hover:bg-[#e64a01] disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Create PO'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Purchase orders ({pos.length})
          </h2>
          <button
            type="button"
            onClick={() => void loadAll()}
            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
          >
            Refresh
          </button>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
        ) : pos.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500 space-y-2">
            <p className="text-base font-medium text-slate-700 dark:text-slate-200">No purchase orders yet</p>
            <p>
              {canCreate
                ? 'Click "Record PO" to log your first paper PO.'
                : 'Set up suppliers and warehouses first, then come back here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/40 text-xs uppercase text-slate-500">
                <tr>
                  <th className="text-left px-4 py-2">PO #</th>
                  <th className="text-left px-4 py-2">Supplier</th>
                  <th className="text-left px-4 py-2">Warehouse</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">Lines</th>
                  <th className="text-right px-4 py-2">Total</th>
                  <th className="text-left px-4 py-2">Expected</th>
                  <th className="text-left px-4 py-2">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {pos.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-200">
                      {po.poNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      {po.supplier?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {po.warehouse?.code ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                          STATUS_TONE[po.status] ?? STATUS_TONE.DRAFT
                        }`}
                      >
                        {po.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{po.lines.length}</td>
                    <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-200 font-medium">
                      {formatINR(po.total)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(po.expectedAt)}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(po.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400">
        Hint: After receiving stock against a PO, post a{' '}
        <a className="underline" href="/admin/goods-receipts">
          Goods Receipt
        </a>{' '}
        with the same SKUs — that updates inventory.
      </p>
    </div>
  );
}
