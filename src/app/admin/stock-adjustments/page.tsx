'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type Warehouse = { id: string; code: string; name: string };
type Variant = {
  id: string;
  sku: string;
  colorName: string;
  onHandQty: number;
  reservedQty: number;
  availableQty: number;
};
type AdminProduct = { id: string; name: string; variants: Variant[] };
type LensBlank = { id: string; name: string; legacyLensId: string };

type Adjustment = {
  id: string;
  qty: number;
  onHandDelta: number;
  reservedDelta: number;
  note: string | null;
  refType: string | null;
  createdAt: string;
  warehouse: { code: string; name: string };
  variant: { sku: string; colorName: string; product: { name: string } } | null;
  lensBlank: { name: string; legacyLensId: string } | null;
  createdBy: { name: string | null; email: string | null } | null;
};

const REASONS: Array<{ value: string; label: string }> = [
  { value: 'count_correction', label: 'Count correction (cycle count)' },
  { value: 'damage', label: 'Damage / breakage' },
  { value: 'theft_loss', label: 'Theft / loss' },
  { value: 'found', label: 'Found / mis-counted earlier' },
  { value: 'opening', label: 'Initial opening balance' },
  { value: 'rework', label: 'Rework / lab waste' },
  { value: 'other', label: 'Other (specify in note)' },
];

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

export default function AdminStockAdjustmentsPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [lensBlanks, setLensBlanks] = useState<LensBlank[]>([]);
  const [history, setHistory] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const [warehouseId, setWarehouseId] = useState('');
  const [kind, setKind] = useState<'frame' | 'lens'>('frame');
  const [targetId, setTargetId] = useState('');
  const [direction, setDirection] = useState<'add' | 'remove'>('remove');
  const [qty, setQty] = useState('1');
  const [reason, setReason] = useState('count_correction');
  const [note, setNote] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [whRes, prodRes, lensRes, histRes] = await Promise.all([
        fetch('/api/admin/warehouses', { credentials: 'include' }).then((r) => r.json()),
        fetch('/api/admin/products', { credentials: 'include' }).then((r) => r.json()),
        fetch('/api/admin/lens-blanks', { credentials: 'include' }).then((r) => r.json()),
        fetch('/api/admin/stock-adjustments', { credentials: 'include' }).then((r) => r.json()),
      ]);
      const whs: Warehouse[] = whRes.warehouses ?? [];
      setWarehouses(whs);
      const central = whs.find((w) => w.code === 'CENTRAL');
      setWarehouseId((cur) => cur || central?.id || whs[0]?.id || '');
      setProducts(prodRes.products ?? []);
      setLensBlanks(lensRes.lensBlanks ?? []);
      setHistory(histRes.adjustments ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const selectedVariant = useMemo(() => {
    if (kind !== 'frame' || !targetId) return null;
    for (const p of products) {
      const v = p.variants.find((x) => x.id === targetId);
      if (v) return { product: p, variant: v };
    }
    return null;
  }, [kind, targetId, products]);

  const resetForm = () => {
    setTargetId('');
    setDirection('remove');
    setQty('1');
    setReason('count_correction');
    setNote('');
    setMsg('');
  };

  const submit = async () => {
    setMsg('');
    if (!warehouseId) {
      setMsg('Pick a warehouse');
      return;
    }
    if (!targetId) {
      setMsg('Pick a SKU');
      return;
    }
    const numQty = Math.max(1, Math.floor(Number(qty)));
    if (!Number.isFinite(numQty) || numQty <= 0) {
      setMsg('Quantity must be a positive whole number');
      return;
    }
    const signedQty = direction === 'add' ? numQty : -numQty;
    const composedNote = [REASONS.find((r) => r.value === reason)?.label ?? reason, note.trim()]
      .filter(Boolean)
      .join(' — ');

    setSaving(true);
    try {
      const r = await fetch('/api/admin/stock-adjustments', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouseId,
          variantId: kind === 'frame' ? targetId : undefined,
          lensBlankId: kind === 'lens' ? targetId : undefined,
          signedQty,
          note: composedNote,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(data.error || 'Failed to apply adjustment');
        return;
      }
      setMsg(`Applied: ${signedQty > 0 ? '+' : ''}${signedQty} units`);
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

  const positiveCount = useMemo(() => history.filter((h) => h.onHandDelta > 0).length, [history]);
  const negativeCount = useMemo(() => history.filter((h) => h.onHandDelta < 0).length, [history]);
  const netUnits = useMemo(() => history.reduce((s, h) => s + h.onHandDelta, 0), [history]);

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Stock adjustments</h1>
          <p className="text-sm text-slate-500 mt-1">
            Use this for cycle counts, damages, lost stock, opening balances, or any change to on-hand
            inventory that is not a sale, return, GRN, or transfer. Every adjustment is logged with reason,
            note, and the user who made it.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          disabled={!canCreate}
          className="px-4 py-2 rounded-lg bg-[#fe5001] text-white text-sm font-medium hover:bg-[#e64a01] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {showForm ? 'Cancel' : 'New adjustment'}
        </button>
      </div>

      {!canCreate && !loading && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-4 text-sm text-amber-800 dark:text-amber-200 space-y-2">
          <p className="font-semibold">Setup needed before adjusting stock:</p>
          <ul className="list-disc pl-5 space-y-1">
            {noWarehouses && (
              <li>
                Add a warehouse in{' '}
                <a className="underline" href="/admin/warehouses">
                  Warehouses
                </a>
                .
              </li>
            )}
            {noVariants && noLensBlanks && (
              <li>
                Add products / lens blanks in{' '}
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
          <p className="text-xs uppercase tracking-wider text-slate-500">Last 100 adjustments</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{history.length}</p>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">Positive / negative</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            <span className="text-emerald-600 dark:text-emerald-400">+{positiveCount}</span>
            {' / '}
            <span className="text-red-600 dark:text-red-400">-{negativeCount}</span>
          </p>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">Net units adjusted</p>
          <p
            className={`text-2xl font-bold mt-1 ${
              netUnits > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : netUnits < 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-slate-900 dark:text-white'
            }`}
          >
            {netUnits > 0 ? '+' : ''}
            {netUnits}
          </p>
        </div>
      </div>

      {showForm && canCreate && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Warehouse *</label>
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
              <label className="block text-xs font-medium text-slate-500 mb-1">Type *</label>
              <select
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value as 'frame' | 'lens');
                  setTargetId('');
                }}
              >
                <option value="frame">Frame</option>
                <option value="lens">Lens</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">SKU *</label>
              <select
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
              >
                <option value="">Select…</option>
                {kind === 'frame' &&
                  products.flatMap((p) =>
                    p.variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {p.name} — {v.colorName} ({v.sku})
                      </option>
                    ))
                  )}
                {kind === 'lens' &&
                  lensBlanks.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.legacyLensId})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {selectedVariant && (
            <div className="rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-4">
              <span>
                Current on-hand:{' '}
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedVariant.variant.onHandQty}
                </span>
              </span>
              <span>
                Reserved:{' '}
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedVariant.variant.reservedQty}
                </span>
              </span>
              <span>
                Available:{' '}
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedVariant.variant.availableQty}
                </span>
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Direction *</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDirection('add')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border ${
                    direction === 'add'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300'
                      : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  + Add
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('remove')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border ${
                    direction === 'remove'
                      ? 'bg-red-50 border-red-300 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300'
                      : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  − Remove
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Quantity *</label>
              <input
                type="number"
                min={1}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Reason *</label>
              <select
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                {REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Note (optional)</label>
            <input
              type="text"
              placeholder="e.g. Cracked during display setup, bin #4"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Effect:{' '}
              <span
                className={`font-semibold ${
                  direction === 'add'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {direction === 'add' ? '+' : '−'}
                {Math.max(0, Math.floor(Number(qty) || 0))} unit
                {Math.max(0, Math.floor(Number(qty) || 0)) === 1 ? '' : 's'}
              </span>
              {selectedVariant && (
                <span className="text-slate-400 ml-2">
                  → on-hand becomes{' '}
                  {selectedVariant.variant.onHandQty +
                    (direction === 'add' ? 1 : -1) * Math.max(0, Math.floor(Number(qty) || 0))}
                </span>
              )}
            </p>
            <div className="flex items-center gap-3">
              {msg && <span className="text-xs text-slate-500">{msg}</span>}
              <button
                type="button"
                onClick={submit}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-[#fe5001] text-white text-sm font-medium hover:bg-[#e64a01] disabled:opacity-50"
              >
                {saving ? 'Applying…' : 'Apply adjustment'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            History ({history.length})
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
        ) : history.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500 space-y-2">
            <p className="text-base font-medium text-slate-700 dark:text-slate-200">No adjustments yet</p>
            <p>Adjustments you make will appear here with full audit trail.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/40 text-xs uppercase text-slate-500">
                <tr>
                  <th className="text-left px-4 py-2">When</th>
                  <th className="text-left px-4 py-2">Warehouse</th>
                  <th className="text-left px-4 py-2">SKU</th>
                  <th className="text-right px-4 py-2">Δ on-hand</th>
                  <th className="text-left px-4 py-2">Note</th>
                  <th className="text-left px-4 py-2">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {history.map((a) => {
                  const skuLabel = a.variant
                    ? `${a.variant.product.name} — ${a.variant.colorName} (${a.variant.sku})`
                    : a.lensBlank
                      ? `${a.lensBlank.name} (${a.lensBlank.legacyLensId})`
                      : '—';
                  const positive = a.onHandDelta > 0;
                  return (
                    <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {formatDateTime(a.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {a.warehouse.code}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{skuLabel}</td>
                      <td
                        className={`px-4 py-3 text-right font-semibold ${
                          positive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {positive ? '+' : ''}
                        {a.onHandDelta}
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-[280px] truncate" title={a.note ?? ''}>
                        {a.note ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {a.createdBy?.name || a.createdBy?.email || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400">
        Tip: Adjustments only change on-hand. Reservations stay as-is. The system blocks any
        adjustment that would make on-hand go negative or below current reservations.
      </p>
    </div>
  );
}
