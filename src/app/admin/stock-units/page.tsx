'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

const STATUS_LABELS: Record<string, string> = {
  IN_STOCK: 'In stock',
  RESERVED: 'Reserved',
  WITH_PARTNER: 'With partner',
  WITH_CUSTOMER: 'With customer (try-on)',
  IN_LAB: 'In lab',
  IN_TRANSIT: 'In transit',
  SOLD: 'Sold',
  LOST: 'Lost',
  DAMAGED: 'Damaged',
  RETURNED_TO_VENDOR: 'Returned to vendor',
};

const STATUS_COLOR: Record<string, string> = {
  IN_STOCK: '#16a34a',
  RESERVED: '#0284c7',
  WITH_PARTNER: '#9333ea',
  WITH_CUSTOMER: '#a16207',
  IN_LAB: '#0891b2',
  IN_TRANSIT: '#1e40af',
  SOLD: '#374151',
  LOST: '#dc2626',
  DAMAGED: '#dc2626',
  RETURNED_TO_VENDOR: '#7c2d12',
};

type Unit = {
  id: string;
  serialNumber: string;
  status: string;
  sku: string | null;
  productName: string | null;
  variantColor: string | null;
  currentWarehouse: string | null;
  currentPartner: { id: string; name: string } | null;
  currentOrderId: string | null;
  currentBookingId: string | null;
  vendorBatchNo: string | null;
  receivedAt: string;
  lastEventAt: string;
  costPrice?: number;
};

type Warehouse = { id: string; code: string; name: string };
type Variant = { id: string; sku: string; colorName: string };
type AdminProduct = { id: string; name: string; variants: Variant[] };

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

export default function AdminStockUnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [variantFilter, setVariantFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState('');

  const variantList = useMemo(
    () => products.flatMap((p) => p.variants.map((v) => ({ ...v, productName: p.name }))),
    [products],
  );

  const loadUnits = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (search) sp.set('search', search);
      if (statusFilter) sp.set('status', statusFilter);
      if (warehouseFilter) sp.set('warehouseId', warehouseFilter);
      if (variantFilter) sp.set('variantId', variantFilter);
      sp.set('limit', '300');
      const res = await fetch(`/api/admin/stock-units?${sp.toString()}`, { credentials: 'include' });
      const json = await res.json();
      if (res.ok) {
        setUnits(json.units ?? []);
        setStatusCounts(json.statusCounts ?? {});
      } else {
        setMsg(json?.error ?? 'Failed to load');
      }
    } catch {
      setMsg('Network error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, warehouseFilter, variantFilter]);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/warehouses', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/admin/products', { credentials: 'include' }).then((r) => r.json()),
    ]).then(([wh, pr]) => {
      setWarehouses(wh.warehouses ?? []);
      setProducts(pr.products ?? []);
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(loadUnits, 200);
    return () => clearTimeout(t);
  }, [loadUnits]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(units.map((u) => u.id)));
  }
  function clearSelection() {
    setSelected(new Set());
  }

  function printLabels() {
    if (selected.size === 0) {
      setMsg('Select at least one unit to print labels');
      return;
    }
    const ids = Array.from(selected).join(',');
    window.open(`/api/admin/stock-units/labels?ids=${ids}`, '_blank');
  }

  const totalUnits = units.length;
  const totalInStock = statusCounts.IN_STOCK ?? 0;
  const outForTryOn =
    (statusCounts.WITH_PARTNER ?? 0) + (statusCounts.WITH_CUSTOMER ?? 0);
  const lostOrDamaged = (statusCounts.LOST ?? 0) + (statusCounts.DAMAGED ?? 0);

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Stock units (per-piece tracking)</h1>
          <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>
            Each row is a single physical frame with its own QR. Scan to update its status anywhere in the chain.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={printLabels}
            disabled={selected.size === 0}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid #fe5001',
              background: selected.size === 0 ? '#fff' : '#fe5001',
              color: selected.size === 0 ? '#fe5001' : '#fff',
              fontWeight: 600,
              cursor: selected.size === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            Print labels ({selected.size})
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        <StatCard label="Total units" value={totalUnits} />
        <StatCard label="In stock" value={totalInStock} color="#16a34a" />
        <StatCard label="Out for try-on / partner" value={outForTryOn} color="#9333ea" />
        <StatCard label="Sold" value={statusCounts.SOLD ?? 0} color="#374151" />
        <StatCard label="Lost / damaged" value={lostOrDamaged} color="#dc2626" />
      </div>

      {/* Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px 200px 240px', gap: 12, marginBottom: 12 }}>
        <input
          type="search"
          placeholder="Search by serial / SKU / batch…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14 }}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14 }}>
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label} ({statusCounts[k] ?? 0})
            </option>
          ))}
        </select>
        <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14 }}>
          <option value="">All warehouses</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.code} — {w.name}
            </option>
          ))}
        </select>
        <select value={variantFilter} onChange={(e) => setVariantFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14 }}>
          <option value="">All SKUs</option>
          {variantList.map((v) => (
            <option key={v.id} value={v.id}>
              {v.sku} — {v.productName} / {v.colorName}
            </option>
          ))}
        </select>
      </div>

      {msg && (
        <div style={{ padding: '10px 14px', borderRadius: 6, background: '#fef3c7', color: '#92400e', marginBottom: 12, fontSize: 13 }}>
          {msg}
          <button type="button" onClick={() => setMsg('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>
            ×
          </button>
        </div>
      )}

      {/* List */}
      <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '8px 14px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
          <div style={{ fontSize: 13, color: '#666' }}>
            Showing {units.length} unit{units.length === 1 ? '' : 's'}
            {selected.size > 0 && <> &middot; <strong>{selected.size}</strong> selected</>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={selectAll} style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #ddd', background: '#fff', fontSize: 12, cursor: 'pointer' }}>
              Select all
            </button>
            <button type="button" onClick={clearSelection} disabled={selected.size === 0} style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #ddd', background: '#fff', fontSize: 12, cursor: 'pointer' }}>
              Clear
            </button>
          </div>
        </div>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#999' }}>Loading…</div>
        ) : units.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#999' }}>No units match the filter.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ background: '#fafafa' }}>
              <tr>
                <th style={{ padding: '10px', textAlign: 'left', width: 32 }}></th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Serial</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Product / SKU</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Location</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Last event</th>
                <th style={{ padding: '10px', textAlign: 'left', width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {units.map((u) => (
                <tr key={u.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '8px 10px' }}>
                    <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)} />
                  </td>
                  <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: 12 }}>{u.serialNumber}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <div style={{ fontWeight: 500 }}>{u.productName ?? '—'}</div>
                    <div style={{ color: '#888', fontSize: 11 }}>
                      {u.sku ?? '—'}
                      {u.variantColor ? ` • ${u.variantColor}` : ''}
                    </div>
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 12,
                        background: (STATUS_COLOR[u.status] ?? '#888') + '15',
                        color: STATUS_COLOR[u.status] ?? '#888',
                        fontSize: 11,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {STATUS_LABELS[u.status] ?? u.status}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px', fontSize: 12 }}>
                    {u.currentPartner ? (
                      <>
                        <div style={{ fontWeight: 500 }}>Partner: {u.currentPartner.name}</div>
                        {u.currentBookingId && <div style={{ color: '#888', fontSize: 11 }}>Booking: {u.currentBookingId.slice(-8)}</div>}
                      </>
                    ) : u.currentWarehouse ? (
                      <span style={{ background: '#eef', color: '#446', padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace' }}>{u.currentWarehouse}</span>
                    ) : (
                      <span style={{ color: '#aaa' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '8px 10px', color: '#666', fontSize: 12 }}>{formatDateTime(u.lastEventAt)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                    <Link
                      href={`/admin/stock-units/${u.serialNumber}`}
                      style={{ padding: '4px 10px', borderRadius: 4, background: '#fff', border: '1px solid #fe5001', color: '#fe5001', fontSize: 12, textDecoration: 'none', fontWeight: 500 }}
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color ?? '#111', marginTop: 2 }}>{value}</div>
    </div>
  );
}
