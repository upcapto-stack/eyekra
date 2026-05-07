import { NextRequest, NextResponse } from 'next/server';
import { StockMovementType, StockUnitStatus } from '@prisma/client';
import { db } from '@/core/api/db';
import { isStaffOrAdmin, requireSessionUser } from '@/core/api/server/authz';
import { applyStockAdjustment } from '@/core/api/server/inventory';
import { transitionUnit } from '@/core/api/server/stock-units';

const VALID_STATUSES = new Set(Object.values(StockUnitStatus));

/**
 * Status transitions that physically remove the piece from a warehouse's
 * IN_STOCK pool need a matching InventoryItem decrement. Note: for stock that
 * leaves "into the field" (WITH_PARTNER, IN_TRANSIT, IN_LAB) we still consider
 * it on-hand of the source warehouse to keep account-level numbers stable.
 * Only true outflow (SOLD / LOST / DAMAGED / RETURNED_TO_VENDOR) decrements
 * the cached aggregate.
 */
const FINAL_OUTFLOW = new Set<StockUnitStatus>([
  StockUnitStatus.SOLD,
  StockUnitStatus.LOST,
  StockUnitStatus.DAMAGED,
  StockUnitStatus.RETURNED_TO_VENDOR,
]);

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireSessionUser(request);
  if (!user || !isStaffOrAdmin(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const body = (await request.json()) as {
    toStatus: string;
    toWarehouseId?: string;
    partnerId?: string;
    bookingId?: string;
    orderId?: string;
    note?: string;
  };
  const toStatus = String(body?.toStatus ?? '').toUpperCase() as StockUnitStatus;
  if (!VALID_STATUSES.has(toStatus)) {
    return NextResponse.json({ error: 'Invalid toStatus' }, { status: 400 });
  }

  const unit = await db.stockUnit.findFirst({
    where: { OR: [{ id }, { serialNumber: id }, { barcode: id }] },
  });
  if (!unit) return NextResponse.json({ error: 'StockUnit not found' }, { status: 404 });

  const wasOnHand =
    unit.status === StockUnitStatus.IN_STOCK ||
    unit.status === StockUnitStatus.RESERVED ||
    unit.status === StockUnitStatus.IN_LAB ||
    unit.status === StockUnitStatus.IN_TRANSIT ||
    unit.status === StockUnitStatus.WITH_PARTNER ||
    unit.status === StockUnitStatus.WITH_CUSTOMER;
  const willBeOnHand =
    toStatus === StockUnitStatus.IN_STOCK ||
    toStatus === StockUnitStatus.RESERVED ||
    toStatus === StockUnitStatus.IN_LAB ||
    toStatus === StockUnitStatus.IN_TRANSIT ||
    toStatus === StockUnitStatus.WITH_PARTNER ||
    toStatus === StockUnitStatus.WITH_CUSTOMER;

  try {
    await db.$transaction(async (tx) => {
      await transitionUnit(tx, {
        unitId: unit.id,
        toStatus,
        toWarehouseId: body.toWarehouseId ?? null,
        partnerId: body.partnerId ?? null,
        bookingId: body.bookingId ?? null,
        orderId: body.orderId ?? null,
        note: body.note ?? null,
        createdById: user.id,
      });

      // Sync InventoryItem aggregate when piece leaves warehouse for good
      const decremented = wasOnHand && !willBeOnHand && FINAL_OUTFLOW.has(toStatus);
      if (decremented && unit.currentWarehouseId) {
        await applyStockAdjustment(tx, {
          warehouseId: unit.currentWarehouseId,
          variantId: unit.variantId,
          lensBlankId: unit.lensBlankId,
          signedQty: -1,
          refType: `unit_${toStatus.toLowerCase()}`,
          refId: unit.id,
          note: `Unit ${unit.serialNumber} → ${toStatus}${body.note ? `: ${body.note}` : ''}`,
          createdById: user.id,
        });
      }

      // Coming back into stock from a final state isn't allowed by transitionUnit.
      // (Added for completeness; transitionUnit blocks final → other transitions.)
      void StockMovementType; // keep import for future returns flow
    });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Transition failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
