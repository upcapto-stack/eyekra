import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { StockUnitStatus } from '@prisma/client';
import { db } from '@/core/api/db';
import { isAdmin, isStaffOrAdmin, requireSessionUser } from '@/core/api/server/authz';

const ALL_STATUSES = new Set(Object.values(StockUnitStatus));

export async function GET(request: NextRequest) {
  const user = await requireSessionUser(request);
  if (!user || !isStaffOrAdmin(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const sp = request.nextUrl.searchParams;
  const variantId = sp.get('variantId');
  const lensBlankId = sp.get('lensBlankId');
  const warehouseId = sp.get('warehouseId');
  const partnerId = sp.get('partnerId');
  const orderId = sp.get('orderId');
  const bookingId = sp.get('bookingId');
  const statusParam = sp.get('status');
  const search = sp.get('search')?.trim();
  const limitRaw = Number(sp.get('limit') ?? '100');
  const limit = Math.min(500, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 100));

  const where: Prisma.StockUnitWhereInput = {};
  if (variantId) where.variantId = variantId;
  if (lensBlankId) where.lensBlankId = lensBlankId;
  if (warehouseId) where.currentWarehouseId = warehouseId;
  if (partnerId) where.currentPartnerId = partnerId;
  if (orderId) where.currentOrderId = orderId;
  if (bookingId) where.currentBookingId = bookingId;
  if (statusParam) {
    const list = statusParam.split(',').map((s) => s.trim()).filter((s) => ALL_STATUSES.has(s as StockUnitStatus));
    if (list.length > 0) where.status = { in: list as StockUnitStatus[] };
  }
  if (search) {
    where.OR = [
      { serialNumber: { contains: search, mode: 'insensitive' } },
      { barcode: { contains: search, mode: 'insensitive' } },
      { vendorBatchNo: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [units, statusCounts] = await Promise.all([
    db.stockUnit.findMany({
      where,
      orderBy: [{ lastEventAt: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      include: {
        variant: { select: { sku: true, colorName: true, product: { select: { name: true } } } },
        lensBlank: { select: { name: true, legacyLensId: true } },
        currentWarehouse: { select: { code: true, name: true } },
        currentPartner: { select: { id: true, name: true, mobile: true } },
      },
    }),
    db.stockUnit.groupBy({
      by: ['status'],
      where: { ...where, status: undefined },
      _count: { _all: true },
    }),
  ]);

  const counts: Record<string, number> = Object.fromEntries(
    Object.values(StockUnitStatus).map((s) => [s, 0]),
  );
  for (const c of statusCounts) counts[c.status] = c._count._all;

  return NextResponse.json({
    units: units.map((u) => ({
      id: u.id,
      serialNumber: u.serialNumber,
      barcode: u.barcode,
      status: u.status,
      sku: u.variant?.sku ?? u.lensBlank?.legacyLensId ?? null,
      productName: u.variant?.product.name ?? u.lensBlank?.name ?? null,
      variantColor: u.variant?.colorName ?? null,
      currentWarehouse: u.currentWarehouse?.code ?? null,
      currentPartner: u.currentPartner ? { id: u.currentPartner.id, name: u.currentPartner.name } : null,
      currentOrderId: u.currentOrderId,
      currentBookingId: u.currentBookingId,
      vendorBatchNo: u.vendorBatchNo,
      receivedAt: u.receivedAt,
      lastEventAt: u.lastEventAt,
      soldAt: u.soldAt,
      ...(isAdmin(user.role) ? { costPrice: Number(u.costPrice) } : {}),
    })),
    statusCounts: counts,
  });
}
