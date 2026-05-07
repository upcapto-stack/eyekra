import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/api/db';
import { isAdmin, isStaffOrAdmin, requireSessionUser } from '@/core/api/server/authz';

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireSessionUser(request);
  if (!user || !isStaffOrAdmin(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const unit = await db.stockUnit.findFirst({
    where: { OR: [{ id }, { serialNumber: id }, { barcode: id }] },
    include: {
      variant: {
        select: {
          sku: true,
          colorName: true,
          mrp: true,
          sellingPrice: true,
          product: { select: { id: true, catalogSlug: true, name: true } },
        },
      },
      lensBlank: { select: { id: true, name: true, legacyLensId: true } },
      currentWarehouse: { select: { id: true, code: true, name: true } },
      currentPartner: { select: { id: true, name: true, mobile: true, email: true } },
      currentOrder: { select: { id: true, status: true, customerName: true } },
      currentBooking: { select: { id: true, status: true, customerName: true } },
      events: {
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          createdBy: { select: { name: true, email: true } },
        },
      },
    },
  });
  if (!unit) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const fromIds = unit.events.map((e) => e.fromWarehouseId).filter(Boolean) as string[];
  const toIds = unit.events.map((e) => e.toWarehouseId).filter(Boolean) as string[];
  const partnerIds = unit.events.map((e) => e.partnerId).filter(Boolean) as string[];
  const [whMap, pMap] = await Promise.all([
    fromIds.length + toIds.length > 0
      ? db.warehouse
          .findMany({ where: { id: { in: [...fromIds, ...toIds] } }, select: { id: true, code: true } })
          .then((rows) => new Map(rows.map((r) => [r.id, r.code])))
      : Promise.resolve(new Map<string, string>()),
    partnerIds.length > 0
      ? db.user
          .findMany({ where: { id: { in: partnerIds } }, select: { id: true, name: true } })
          .then((rows) => new Map(rows.map((r) => [r.id, r.name])))
      : Promise.resolve(new Map<string, string>()),
  ]);

  return NextResponse.json({
    id: unit.id,
    serialNumber: unit.serialNumber,
    barcode: unit.barcode,
    status: unit.status,
    sku: unit.variant?.sku ?? unit.lensBlank?.legacyLensId ?? null,
    productName: unit.variant?.product.name ?? unit.lensBlank?.name ?? null,
    productId: unit.variant?.product.id ?? null,
    variantColor: unit.variant?.colorName ?? null,
    sellingPrice: unit.variant ? Number(unit.variant.sellingPrice) : null,
    mrp: unit.variant ? Number(unit.variant.mrp) : null,
    ...(isAdmin(user.role) ? { costPrice: Number(unit.costPrice) } : {}),
    currentWarehouse: unit.currentWarehouse,
    currentPartner: unit.currentPartner,
    currentOrder: unit.currentOrder,
    currentBooking: unit.currentBooking,
    vendorBatchNo: unit.vendorBatchNo,
    notes: unit.notes,
    receivedAt: unit.receivedAt,
    lastEventAt: unit.lastEventAt,
    soldAt: unit.soldAt,
    lostAt: unit.lostAt,
    damagedAt: unit.damagedAt,
    events: unit.events.map((e) => ({
      id: e.id,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      fromWarehouse: e.fromWarehouseId ? whMap.get(e.fromWarehouseId) : null,
      toWarehouse: e.toWarehouseId ? whMap.get(e.toWarehouseId) : null,
      partner: e.partnerId ? pMap.get(e.partnerId) : null,
      bookingId: e.bookingId,
      orderId: e.orderId,
      note: e.note,
      createdBy: e.createdBy?.name || e.createdBy?.email || null,
      createdAt: e.createdAt,
    })),
  });
}
