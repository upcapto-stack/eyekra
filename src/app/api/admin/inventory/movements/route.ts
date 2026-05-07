import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/api/db';
import { isStaffOrAdmin, requireSessionUser } from '@/core/api/server/authz';

export async function GET(request: NextRequest) {
  const user = await requireSessionUser(request);
  if (!user || !isStaffOrAdmin(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const sp = request.nextUrl.searchParams;
  const variantId = sp.get('variantId');
  const lensBlankId = sp.get('lensBlankId');
  const warehouseId = sp.get('warehouseId');
  const limitRaw = Number(sp.get('limit') ?? '200');
  const limit = Math.min(500, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 200));

  const where: Record<string, unknown> = {};
  if (variantId) where.variantId = variantId;
  if (lensBlankId) where.lensBlankId = lensBlankId;
  if (warehouseId) where.warehouseId = warehouseId;

  const movements = await db.stockMovement.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      warehouse: { select: { code: true, name: true } },
      variant: { select: { sku: true, colorName: true, product: { select: { name: true } } } },
      lensBlank: { select: { name: true, legacyLensId: true } },
      createdBy: { select: { name: true, email: true } },
    },
  });

  // Compute current balance for this SKU (sum across all warehouses unless filtered)
  // so we can walk backwards from "now" to reconstruct accurate balance after each movement.
  const balanceWhere: Record<string, unknown> = {};
  if (variantId) balanceWhere.variantId = variantId;
  if (lensBlankId) balanceWhere.lensBlankId = lensBlankId;
  if (warehouseId) balanceWhere.warehouseId = warehouseId;
  const balanceAgg = await db.inventoryItem.aggregate({
    where: balanceWhere,
    _sum: { onHandQty: true, reservedQty: true },
  });
  const currentOnHand = balanceAgg._sum.onHandQty ?? 0;
  const currentReserved = balanceAgg._sum.reservedQty ?? 0;

  let runningOnHand = currentOnHand;
  let runningReserved = currentReserved;
  const withRunning = movements.map((m) => {
    const onHandAfter = runningOnHand;
    const reservedAfter = runningReserved;
    runningOnHand -= m.onHandDelta;
    runningReserved -= m.reservedDelta;
    return {
      ...m,
      onHandAfter,
      reservedAfter,
      availableAfter: onHandAfter - reservedAfter,
      costSnapshot: m.costSnapshot != null ? Number(m.costSnapshot) : null,
    };
  });

  return NextResponse.json({
    movements: withRunning,
    currentOnHand,
    currentReserved,
    currentAvailable: currentOnHand - currentReserved,
  });
}
