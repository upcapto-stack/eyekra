import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { db } from '@/core/api/db';
import { isStaffOrAdmin, requireSessionUser } from '@/core/api/server/authz';

/**
 * Returns a printable HTML label sheet for the given stock unit ids.
 * Optimized for A4 / Letter, 4 columns × N rows of small labels.
 *
 * Query: ?ids=cuid1,cuid2,...  OR  ?serials=SER-1,SER-2
 */
export async function GET(request: NextRequest) {
  const user = await requireSessionUser(request);
  if (!user || !isStaffOrAdmin(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const sp = request.nextUrl.searchParams;
  const idsParam = sp.get('ids');
  const serialsParam = sp.get('serials');
  let units: Array<{
    id: string;
    serialNumber: string;
    sku: string | null;
    productName: string | null;
    color: string | null;
  }>;
  const includeFields = {
    variant: { select: { sku: true, colorName: true, product: { select: { name: true } } } },
    lensBlank: { select: { name: true, legacyLensId: true } },
  };
  if (idsParam) {
    const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 200);
    const rows = await db.stockUnit.findMany({ where: { id: { in: ids } }, include: includeFields });
    units = rows.map((u) => ({
      id: u.id,
      serialNumber: u.serialNumber,
      sku: u.variant?.sku ?? u.lensBlank?.legacyLensId ?? null,
      productName: u.variant?.product.name ?? u.lensBlank?.name ?? null,
      color: u.variant?.colorName ?? null,
    }));
  } else if (serialsParam) {
    const serials = serialsParam.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 200);
    const rows = await db.stockUnit.findMany({ where: { serialNumber: { in: serials } }, include: includeFields });
    units = rows.map((u) => ({
      id: u.id,
      serialNumber: u.serialNumber,
      sku: u.variant?.sku ?? u.lensBlank?.legacyLensId ?? null,
      productName: u.variant?.product.name ?? u.lensBlank?.name ?? null,
      color: u.variant?.colorName ?? null,
    }));
  } else {
    return NextResponse.json({ error: 'ids or serials query param required' }, { status: 400 });
  }

  const origin = request.nextUrl.origin || process.env.APP_BASE_URL || 'https://eyekra.vercel.app';
  const labels = await Promise.all(
    units.map(async (u) => {
      const url = `${origin}/admin/stock-units/${u.serialNumber}`;
      const svg = await QRCode.toString(url, {
        type: 'svg',
        errorCorrectionLevel: 'M',
        margin: 0,
        width: 96,
      });
      return { ...u, qrSvg: svg };
    }),
  );

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Eyekra labels — ${units.length}</title>
  <style>
    @media print {
      @page { size: A4; margin: 8mm; }
      body { margin: 0; }
      .no-print { display: none !important; }
      .label { break-inside: avoid; }
    }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 16px; background: #fff; color: #111; }
    .toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }
    .toolbar h1 { font-size: 16px; margin: 0; }
    .toolbar button { padding: 6px 14px; border-radius: 6px; border: 1px solid #ccc; background: #fe5001; color: #fff; cursor: pointer; font-weight: 600; font-size: 13px; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
    .label { border: 1px dashed #999; padding: 6px; text-align: center; }
    .label svg { width: 100%; height: 76px; display: block; margin: 0 auto 4px; }
    .label .pname { font-size: 9px; color: #555; line-height: 1.1; min-height: 22px; overflow: hidden; word-break: break-word; }
    .label .sku { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; font-weight: 600; margin-top: 2px; }
    .label .serial { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 8px; color: #777; word-break: break-all; }
    .label .brand { font-size: 8px; font-weight: 700; color: #fe5001; letter-spacing: 1px; margin-bottom: 2px; }
  </style>
</head>
<body>
  <div class="toolbar no-print">
    <h1>Print labels — ${units.length} unit${units.length === 1 ? '' : 's'}</h1>
    <button type="button" onclick="window.print()">Print</button>
    <span style="font-size:12px;color:#666">Stick one label per physical frame. Scanning the QR opens the unit's detail page.</span>
  </div>
  <div class="grid">
    ${labels
      .map(
        (l) => `
      <div class="label">
        <div class="brand">EYEKRA</div>
        ${l.qrSvg}
        <div class="pname">${escapeHtml(l.productName ?? '')}${l.color ? ' • ' + escapeHtml(l.color) : ''}</div>
        <div class="sku">${escapeHtml(l.sku ?? '')}</div>
        <div class="serial">${escapeHtml(l.serialNumber)}</div>
      </div>`,
      )
      .join('')}
  </div>
</body>
</html>`;

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
