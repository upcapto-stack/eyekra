'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type Warehouse = { id: string; code: string; name: string };
type Variant = { id: string; sku: string; colorName: string };
type AdminProduct = { id: string; name: string; variants: Variant[] };
type LensBlank = { id: string; name: string; legacyLensId: string };

type POLine = {
  id: string;
  variantId: string | null;
  lensBlankId: string | null;
  qty: number;
  unitCost: number | string;
};
type PurchaseOrderSummary = {
  id: string;
  poNumber: string;
  status: string;
  warehouseId: string;
  supplier: { name: string } | null;
  lines: POLine[];
};

type GRNLine = {
  id: string;
  variantId: string | null;
  lensBlankId: string | null;
  qty: number;
  unitCost: number | string;
};
type GoodsReceipt = {
  id: string;
  grnNumber: string;
  vendorInvoiceNo: string | null;
  poId: string | null;
  createdAt: string;
  warehouse: { code: string } | null;
  lines: GRNLine[];
};

type LineDraft = {
  kind: 'frame' | 'lens';
  targetId: string;
  qty: string;
  unitCost: string;
};

function formatINR(n: number): string {
  return `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function AdminGoodsReceiptsPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [lensBlanks, setLensBlanks] = useState<LensBlank[]>([]);
  const [openPOs, setOpenPOs] = useState<PurchaseOrderSummary[]>([]);
  const [grns, setGrns] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const [warehouseId, setWarehouseId] = useState('');
  const [poId, setPoId] = useState('');
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([
    { kind: 'frame', targetId: '', qty: '1', unitCost: '0' },
  ]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [grnRes, whRes, prodRes, lensRes, poRes] = await Promise.all([
        fetch('/api/admin/goods-receipts', { credentials: 'include' }).then((r) => r.json()),
        fetch('/api/admin/warehouses', { credentials: 'include' }).then((r) => r.json()),
        fetch('/api/admin/products', { credentials: 'include' }).then((r) => r.json()),
        fetch('/api/admin/lens-blanks', { credentials: 'include' }).then((r) => r.json()),
        fetch('/api/admin/purchase-orders', { credentials: 'include' }).then((r) => r.json()),
      ]);
      setGrns(grnRes.goodsReceipts ?? []);
      const whs: Warehouse[] = whRes.warehouses ?? [];
      setWarehouses(whs);
      const central = whs.find((w) => w.code === 'CENTRAL');
      setWarehouseId((cur) => cur || central?.id || whs[0]?.id || '');
      setProducts(prodRes.products ?? []);
      setLensBlanks(lensRes.lensBlanks ?? []);
      const allPOs: PurchaseOrderSummary[] = poRes.purchaseOrders ?? [];
      setOpenPOs(allPOs.filter((p) => p.status === 'DRAFT' || p.status === 'SENT' || p.status === 'PARTIAL'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const computedSubtotal = useMemo(() => {
    return lines.reduce((sum, l) => sum + (Number(l.unitCost) || 0) * (Number(l.qty) || 0), 0);
  }, [lines]);

  const updateLine = (idx: number, patch: Partial<LineDraft>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const removeLine = (idx: number) => {
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));
  };

  const addLine = () => {
    setLines((prev) => [...prev, { kind: 'frame', targetId: '', qty: '1', unitCost: '0' }]);
  };

  const onPickPo = (id: string) => {
    setPoId(id);
    if (!id) return;
    const po = openPOs.find((p) => p.id === id);
    if (!po) return;
    setWarehouseId(po.warehouseId);
    if (po.lines.length > 0) {
      setLines(
        po.lines.map((ln) => ({
          kind: ln.variantId ? 'frame' : 'lens',
          targetId: (ln.variantId ?? ln.lensBlankId ?? '') as string,
          qty: String(ln.qty),
          unitCost: String(ln.unitCost ?? '0'),
        })),
      );
    }
    setMsg(`Pre-filled from ${po.poNumber}. Adjust quantities if partial delivery.`);
  };

  const resetForm = () => {
    setPoId('');
    setVendorInvoiceNo('');
    setLines([{ kind: 'frame', targetId: '', qty: '1', unitCost: '0' }]);
    setMsg('');
  };

  const submit = async () => {
    setMsg('');
    if (!warehouseId) {
      setMsg('Pick a warehouse');
      return;
    }
    const cleanLines = lines.filter((l) => l.targetId && Number(l.qty) > 0);
    if (cleanLines.length === 0) {
      setMsg('Add at least one line item with quantity');
      return;
    }
    setSaving(true);
    try {
      const r = await fetch('/api/admin/goods-receipts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouseId,
          poId: poId || undefined,
          vendorInvoiceNo: vendorInvoiceNo.trim() || undefined,
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
        setMsg(data.error || 'Failed to post GRN');
        return;
      }
      setMsg(`Stock booked — ${data.grnNumber}`);
      resetForm();
      setShowForm(false);
      await loadAll();
    } finally {
      setSaving(false);
    }
  };

  const noWarehouses = warehouses.length === 0;
  const noVariants = products.length === 0;
  const noLensBlanks = lensBlanks.length === 0;
  const canCreate = !noWarehouses && (!noVariants || !noLensBlanks);
  const totalUnitsReceived = useMemo(() => grns.reduce((s, g) => s + g.lines.reduce((a, l) => a + l.qty, 0), 0), [grns]);

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Goods Receipt (GRN)</h1>
          <p className="text-sm text-slate-500 mt-1">
            Book incoming stock here. Posting a GRN immediately increases on-hand inventory in the chosen warehouse.
            Optionally link to a Purchase Order for traceability.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          disabled={!canCreate}
          className="px-4 py-2 rounded-lg bg-[#fe5001] text-white text-sm font-medium hover:bg-[#e64a01] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {showForm ? 'Cancel' : 'Receive stock'}
        </button>
      </div>

      {!canCreate && !loading && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-4 text-sm text-amber-800 dark:text-amber-200 space-y-2">
          <p className="font-semibold">Setup needed before booking GRNs:</p>
          <ul className="list-disc pl-5 space-y-1">
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
                Add products / lens blanks first in{' '}
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">Total GRNs</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{grns.length}</p>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">Units received (last 50)</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalUnitsReceived}</p>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">Open POs</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{openPOs.length}</p>
        </div>
      </div>

      {showForm && canCreate && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <label className="block text-xs font-medium text-slate-500 mb-1">Link to PO (optional)</label>
              <select
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                value={poId}
                onChange={(e) => onPickPo(e.target.value)}
              >
                <option value="">— None —</option>
                {openPOs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.poNumber} — {p.supplier?.name ?? '?'} ({p.status})
                  </option>
                ))}
              </select>
              {openPOs.length === 0 && (
                <p className="text-[10px] text-slate-400 mt-1">No open POs. You can still receive stock without one.</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Vendor invoice no.</label>
              <input
                type="text"
                placeholder="e.g. INV/2026/00123"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                value={vendorInvoiceNo}
                onChange={(e) => setVendorInvoiceNo(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Items received</h3>
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
                  <label className="block text-[10px] font-medium text-slate-500 mb-1">Qty received *</label>
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
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Goods value: <span className="font-semibold">{formatINR(computedSubtotal)}</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Posting will book {lines.reduce((s, l) => s + (Number(l.qty) || 0), 0)} units into{' '}
                {warehouses.find((w) => w.id === warehouseId)?.code ?? 'warehouse'}.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {msg && <span className="text-xs text-slate-500">{msg}</span>}
              <button
                type="button"
                onClick={submit}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-[#fe5001] text-white text-sm font-medium hover:bg-[#e64a01] disabled:opacity-50"
              >
                {saving ? 'Posting…' : 'Post GRN & book stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Recent GRNs ({grns.length})
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
        ) : grns.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500 space-y-2">
            <p className="text-base font-medium text-slate-700 dark:text-slate-200">No goods receipts yet</p>
            <p>
              {canCreate
                ? 'Click "Receive stock" once your first shipment arrives.'
                : 'Setup warehouses and products first, then come back here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/40 text-xs uppercase text-slate-500">
                <tr>
                  <th className="text-left px-4 py-2">GRN #</th>
                  <th className="text-left px-4 py-2">Warehouse</th>
                  <th className="text-left px-4 py-2">PO ref</th>
                  <th className="text-left px-4 py-2">Vendor invoice</th>
                  <th className="text-right px-4 py-2">Lines</th>
                  <th className="text-right px-4 py-2">Units</th>
                  <th className="text-left px-4 py-2">Posted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {grns.map((g) => {
                  const units = g.lines.reduce((s, l) => s + l.qty, 0);
                  return (
                    <tr key={g.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-200">
                        {g.grnNumber}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {g.warehouse?.code ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs font-mono">{g.poId ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{g.vendorInvoiceNo ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                        {g.lines.length}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-200 font-medium">
                        {units}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatDateTime(g.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400">
        Tip: GRN posting is atomic — the receipt header, line items, and stock movements all commit in a single transaction. If anything fails, nothing is booked.
      </p>
    </div>
  );
}
