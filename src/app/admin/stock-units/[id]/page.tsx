'use client';

import Link from 'next/link';
import { use, useCallback, useEffect, useState } from 'react';

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

const TERMINAL = new Set(['SOLD', 'LOST', 'RETURNED_TO_VENDOR']);

type Detail = {
  id: string;
  serialNumber: string;
  barcode: string | null;
  status: string;
  sku: string | null;
  productName: string | null;
  productId: string | null;
  variantColor: string | null;
  sellingPrice: number | null;
  mrp: number | null;
  costPrice?: number;
  currentWarehouse: { id: string; code: string; name: string } | null;
  currentPartner: { id: string; name: string; mobile: string } | null;
  currentOrder: { id: string; status: string; customerName: string } | null;
  currentBooking: { id: string; status: string; customerName: string } | null;
  vendorBatchNo: string | null;
  notes: string | null;
  receivedAt: string;
  lastEventAt: string;
  soldAt: string | null;
  lostAt: string | null;
  damagedAt: string | null;
  events: {
    id: string;
    fromStatus: string | null;
    toStatus: string;
    fromWarehouse: string | null;
    toWarehouse: string | null;
    partner: string | null;
    bookingId: string | null;
    orderId: string | null;
    note: string | null;
    createdBy: string | null;
    createdAt: string;
  }[];
};

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
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

type Warehouse = { id: string; code: string; name: string };
type Partner = { id: string; name: string; mobile: string };

export default function StockUnitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [action, setAction] = useState('');
  const [actionWarehouse, setActionWarehouse] = useState('');
  const [actionPartner, setActionPartner] = useState('');
  const [actionNote, setActionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setMsg('');
    const res = await fetch(`/api/admin/stock-units/${id}`, { credentials: 'include' });
    const json = await res.json();
    if (res.ok) setDetail(json);
    else setMsg(json?.error ?? 'Failed to load');
  }, [id]);

  useEffect(() => {
    load();
    fetch('/api/admin/warehouses', { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => setWarehouses(j.warehouses ?? []));
    fetch('/api/admin/partners', { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => setPartners(j.partners ?? []))
      .catch(() => setPartners([]));
  }, [load]);

  async function submit() {
    if (!action) {
      setMsg('Pick an action');
      return;
    }
    setSubmitting(true);
    setMsg('');
    try {
      const body: Record<string, string | undefined> = { toStatus: action };
      if (action === 'IN_STOCK' || action === 'IN_TRANSIT' || action === 'IN_LAB') body.toWarehouseId = actionWarehouse || undefined;
      if (action === 'WITH_PARTNER' || action === 'WITH_CUSTOMER') body.partnerId = actionPartner || undefined;
      if (actionNote.trim()) body.note = actionNote.trim();

      const res = await fetch(`/api/admin/stock-units/${id}/transition`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.ok) {
        setAction('');
        setActionWarehouse('');
        setActionPartner('');
        setActionNote('');
        await load();
      } else {
        setMsg(json?.error ?? 'Action failed');
      }
    } catch {
      setMsg('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  if (!detail) {
    return (
      <div style={{ padding: 24 }}>
        <Link href="/admin/stock-units" style={{ color: '#fe5001', textDecoration: 'none' }}>
          ← All units
        </Link>
        <div style={{ marginTop: 24, color: '#999' }}>{msg || 'Loading…'}</div>
      </div>
    );
  }

  const isFinal = TERMINAL.has(detail.status);
  const requiresWarehouse = action === 'IN_STOCK' || action === 'IN_TRANSIT' || action === 'IN_LAB';
  const requiresPartner = action === 'WITH_PARTNER' || action === 'WITH_CUSTOMER';

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <Link href="/admin/stock-units" style={{ color: '#fe5001', textDecoration: 'none', fontSize: 13 }}>
        ← All units
      </Link>

      <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
        {/* LEFT: header + actions + history */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: 'monospace' }}>{detail.serialNumber}</h1>
            <span
              style={{
                padding: '4px 12px',
                borderRadius: 16,
                background: (STATUS_COLOR[detail.status] ?? '#888') + '20',
                color: STATUS_COLOR[detail.status] ?? '#888',
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              {STATUS_LABELS[detail.status] ?? detail.status}
            </span>
          </div>
          <div style={{ marginTop: 6, color: '#666' }}>
            {detail.productName} {detail.variantColor && <>• {detail.variantColor}</>}
            {detail.sku && (
              <span style={{ marginLeft: 8, fontFamily: 'monospace', fontSize: 13, color: '#888' }}>
                ({detail.sku})
              </span>
            )}
          </div>

          {/* Current location card */}
          <div style={{ marginTop: 16, background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>Currently</div>
            {detail.currentPartner ? (
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>With partner: {detail.currentPartner.name}</div>
                <div style={{ color: '#666', fontSize: 13 }}>{detail.currentPartner.mobile}</div>
              </div>
            ) : detail.currentWarehouse ? (
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>
                  At {detail.currentWarehouse.name}{' '}
                  <span style={{ fontFamily: 'monospace', color: '#888' }}>({detail.currentWarehouse.code})</span>
                </div>
              </div>
            ) : (
              <div style={{ color: '#999', fontSize: 14 }}>Location unknown</div>
            )}
            {detail.currentBooking && (
              <div style={{ marginTop: 4, fontSize: 13 }}>
                Booking: <Link href={`/admin/bookings`} style={{ color: '#fe5001' }}>{detail.currentBooking.id.slice(-10)}</Link> for {detail.currentBooking.customerName} ({detail.currentBooking.status})
              </div>
            )}
            {detail.currentOrder && (
              <div style={{ marginTop: 4, fontSize: 13 }}>
                Order: <Link href={`/admin/orders`} style={{ color: '#fe5001' }}>{detail.currentOrder.id.slice(-10)}</Link> for {detail.currentOrder.customerName} ({detail.currentOrder.status})
              </div>
            )}
            {detail.vendorBatchNo && (
              <div style={{ marginTop: 6, fontSize: 12, color: '#888' }}>Batch: {detail.vendorBatchNo}</div>
            )}
            {detail.notes && (
              <div style={{ marginTop: 6, fontSize: 12, color: '#888' }}>Note: {detail.notes}</div>
            )}
          </div>

          {/* Action panel */}
          {!isFinal && (
            <div style={{ marginTop: 16, background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Update status</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <select value={action} onChange={(e) => setAction(e.target.value)} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd' }}>
                  <option value="">Choose action…</option>
                  <option value="IN_STOCK">Return to warehouse (IN_STOCK)</option>
                  <option value="WITH_PARTNER">Hand over to partner</option>
                  <option value="WITH_CUSTOMER">With customer (try-on)</option>
                  <option value="IN_LAB">Send to lab</option>
                  <option value="IN_TRANSIT">Mark in transit</option>
                  <option value="SOLD">Mark SOLD (final)</option>
                  <option value="DAMAGED">Mark DAMAGED</option>
                  <option value="LOST">Mark LOST (final)</option>
                  <option value="RETURNED_TO_VENDOR">Return to vendor (final)</option>
                </select>
                {requiresWarehouse && (
                  <select value={actionWarehouse} onChange={(e) => setActionWarehouse(e.target.value)} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd' }}>
                    <option value="">Pick warehouse…</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.code} — {w.name}
                      </option>
                    ))}
                  </select>
                )}
                {requiresPartner && (
                  <select value={actionPartner} onChange={(e) => setActionPartner(e.target.value)} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd' }}>
                    <option value="">Pick partner…</option>
                    {partners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.mobile})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <textarea
                placeholder="Note (optional, but recommended for theft/damage cases)"
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                rows={2}
                style={{ width: '100%', marginTop: 10, padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13, resize: 'vertical' }}
              />
              <div style={{ marginTop: 10, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting || !action || (requiresWarehouse && !actionWarehouse) || (requiresPartner && !actionPartner)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#fe5001',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    opacity: submitting ? 0.6 : 1,
                  }}
                >
                  {submitting ? 'Updating…' : 'Apply'}
                </button>
              </div>
            </div>
          )}

          {msg && (
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 6, background: '#fef3c7', color: '#92400e', fontSize: 13 }}>
              {msg}
            </div>
          )}

          {/* Event history */}
          <div style={{ marginTop: 16, background: '#fff', border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', background: '#fafafa', borderBottom: '1px solid #eee', fontSize: 14, fontWeight: 600 }}>
              Event history
            </div>
            {detail.events.length === 0 ? (
              <div style={{ padding: 16, color: '#999', fontSize: 13, textAlign: 'center' }}>No events yet.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead style={{ background: '#fafafa' }}>
                  <tr>
                    <th style={{ padding: 8, textAlign: 'left' }}>When</th>
                    <th style={{ padding: 8, textAlign: 'left' }}>Transition</th>
                    <th style={{ padding: 8, textAlign: 'left' }}>Where / Who</th>
                    <th style={{ padding: 8, textAlign: 'left' }}>Note / By</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.events.map((e) => (
                    <tr key={e.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                      <td style={{ padding: 8, color: '#666', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {formatDateTime(e.createdAt)}
                      </td>
                      <td style={{ padding: 8 }}>
                        <span style={{ color: '#888', fontSize: 11 }}>{e.fromStatus ?? '—'}</span>
                        <span style={{ margin: '0 4px', color: '#aaa' }}>→</span>
                        <span style={{ fontWeight: 500, color: STATUS_COLOR[e.toStatus] ?? '#111' }}>{e.toStatus}</span>
                      </td>
                      <td style={{ padding: 8, fontSize: 12 }}>
                        {e.fromWarehouse && e.toWarehouse && e.fromWarehouse !== e.toWarehouse ? (
                          <span>
                            <span style={{ color: '#888' }}>{e.fromWarehouse}</span>
                            <span style={{ margin: '0 4px', color: '#aaa' }}>→</span>
                            <span>{e.toWarehouse}</span>
                          </span>
                        ) : e.toWarehouse ? (
                          <span>{e.toWarehouse}</span>
                        ) : null}
                        {e.partner && <div>Partner: {e.partner}</div>}
                        {e.bookingId && <div style={{ fontSize: 11, color: '#888' }}>Booking {e.bookingId.slice(-8)}</div>}
                        {e.orderId && <div style={{ fontSize: 11, color: '#888' }}>Order {e.orderId.slice(-8)}</div>}
                      </td>
                      <td style={{ padding: 8, fontSize: 12 }}>
                        {e.note && <div>{e.note}</div>}
                        {e.createdBy && <div style={{ color: '#888', fontSize: 11 }}>by {e.createdBy}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* RIGHT: QR + meta */}
        <div>
          <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: 20, textAlign: 'center', position: 'sticky', top: 20 }}>
            <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.6 }}>QR / Barcode</div>
            <div style={{ marginTop: 12, padding: 8, background: '#fff', borderRadius: 4 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/admin/stock-units/${detail.id}/qr`}
                alt={`QR for ${detail.serialNumber}`}
                style={{ width: '100%', maxWidth: 240, display: 'block', margin: '0 auto' }}
              />
            </div>
            <div style={{ marginTop: 12, fontSize: 11, fontFamily: 'monospace', color: '#666', wordBreak: 'break-all' }}>
              {detail.serialNumber}
            </div>
            <a
              href={`/api/admin/stock-units/labels?ids=${detail.id}`}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'inline-block', marginTop: 12, padding: '6px 14px', borderRadius: 4, border: '1px solid #fe5001', color: '#fe5001', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}
            >
              Print label
            </a>
            <div style={{ marginTop: 16, fontSize: 11, color: '#888', borderTop: '1px solid #f0f0f0', paddingTop: 12, textAlign: 'left' }}>
              <div style={{ marginBottom: 4 }}>
                Received: <span style={{ color: '#444' }}>{formatDateTime(detail.receivedAt)}</span>
              </div>
              <div style={{ marginBottom: 4 }}>
                Last event: <span style={{ color: '#444' }}>{formatDateTime(detail.lastEventAt)}</span>
              </div>
              {detail.soldAt && (
                <div style={{ marginBottom: 4 }}>
                  Sold: <span style={{ color: '#444' }}>{formatDateTime(detail.soldAt)}</span>
                </div>
              )}
              {detail.lostAt && (
                <div style={{ marginBottom: 4 }}>
                  Lost: <span style={{ color: '#dc2626' }}>{formatDateTime(detail.lostAt)}</span>
                </div>
              )}
              {detail.damagedAt && (
                <div style={{ marginBottom: 4 }}>
                  Damaged: <span style={{ color: '#dc2626' }}>{formatDateTime(detail.damagedAt)}</span>
                </div>
              )}
              {detail.costPrice !== undefined && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #f0f0f0' }}>
                  <div>Cost: ₹{detail.costPrice.toLocaleString('en-IN')}</div>
                  {detail.sellingPrice && <div>Selling: ₹{detail.sellingPrice.toLocaleString('en-IN')}</div>}
                  {detail.mrp && <div>MRP: ₹{detail.mrp.toLocaleString('en-IN')}</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
