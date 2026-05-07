import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { db } from '@/core/api/db';
import { isStaffOrAdmin, requireSessionUser } from '@/core/api/server/authz';

/**
 * Returns the QR code SVG for a stock unit. The QR encodes the absolute URL of
 * the unit detail page, so any phone camera scan navigates straight to it.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireSessionUser(request);
  if (!user || !isStaffOrAdmin(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const unit = await db.stockUnit.findFirst({
    where: { OR: [{ id }, { serialNumber: id }, { barcode: id }] },
    select: { id: true, serialNumber: true },
  });
  if (!unit) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const origin =
    request.nextUrl.origin || process.env.APP_BASE_URL || 'https://eyekra.vercel.app';
  const payload = `${origin}/admin/stock-units/${unit.serialNumber}`;
  const svg = await QRCode.toString(payload, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 256,
  });
  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
