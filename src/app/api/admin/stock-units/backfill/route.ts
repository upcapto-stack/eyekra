import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/api/db';
import { isStaffOrAdmin, requireSessionUser } from '@/core/api/server/authz';
import { generateSerials } from '@/core/api/server/stock-units';
import { StockUnitStatus } from '@prisma/client';

/**
 * Generate StockUnits for SKUs that already have on-hand stock but no per-piece
 * tracking yet (e.g. inventory imported before serialization was enabled). Each
 * generated unit gets status=IN_STOCK at the same warehouse where the aggregate
 * onHand currently lives. The InventoryItem aggregate is NOT changed (units are
 * created to MATCH existing onHand).
 *
 * Body: { variantId?: string; lensBlankId?: string }
 */
export async function POST(request: NextRequest) {
  const user = await requireSessionUser(request);
  if (!user || !isStaffOrAdmin(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = (await request.json()) as { variantId?: string; lensBlankId?: string };
  const variantId = body.variantId?.trim();
  const lensBlankId = body.lensBlankId?.trim();
  if (!variantId === !lensBlankId) {
    return NextResponse.json({ error: 'Pass exactly one of variantId / lensBlankId' }, { status: 400 });
  }

  const target = variantId
    ? await db.productVariant.findUnique({
        where: { id: variantId },
        select: {
          id: true,
          sku: true,
          costPrice: true,
          inventoryItems: {
            include: { warehouse: { select: { id: true, code: true } } },
          },
        },
      })
    : null;
  const lens = lensBlankId
    ? await db.lensBlank.findUnique({
        where: { id: lensBlankId },
        select: {
          id: true,
          legacyLensId: true,
          name: true,
          costPrice: true,
          inventoryItems: {
            include: { warehouse: { select: { id: true, code: true } } },
          },
        },
      })
    : null;

  if (!target && !lens) return NextResponse.json({ error: 'SKU not found' }, { status: 404 });

  // Compute onHand per warehouse, count existing tracked units, find the gap.
  const inv = (target?.inventoryItems ?? lens!.inventoryItems).filter((i) => i.onHandQty > 0);
  if (inv.length === 0) {
    return NextResponse.json({ created: 0, message: 'No on-hand stock to backfill' });
  }
  const existing = await db.stockUnit.count({
    where: variantId ? { variantId, status: StockUnitStatus.IN_STOCK } : { lensBlankId, status: StockUnitStatus.IN_STOCK },
  });
  const totalOnHand = inv.reduce((s, i) => s + i.onHandQty, 0);
  const gap = totalOnHand - existing;
  if (gap <= 0) {
    return NextResponse.json({
      created: 0,
      message: `Already ${existing} tracked units against ${totalOnHand} on-hand. Nothing to backfill.`,
    });
  }

  const skuPrefix = target?.sku ?? lens?.legacyLensId ?? lens?.name?.replace(/\s+/g, '_').toUpperCase().slice(0, 12) ?? 'EYK';
  const costPrice = String(target?.costPrice ?? lens?.costPrice ?? 0);

  // Distribute the gap across warehouses proportional to their onHand share.
  // For each warehouse, missing = (warehouseOnHand - units_already_in_that_warehouse).
  const created: { warehouseCode: string; serial: string }[] = [];

  // Existing units per warehouse (only IN_STOCK)
  const perWarehouse = new Map<string, number>();
  const perWarehouseRows = await db.stockUnit.groupBy({
    by: ['currentWarehouseId'],
    where: variantId ? { variantId, status: StockUnitStatus.IN_STOCK } : { lensBlankId, status: StockUnitStatus.IN_STOCK },
    _count: { _all: true },
  });
  for (const r of perWarehouseRows) if (r.currentWarehouseId) perWarehouse.set(r.currentWarehouseId, r._count._all);

  await db.$transaction(
    async (tx) => {
      for (const i of inv) {
        const have = perWarehouse.get(i.warehouseId) ?? 0;
        const missing = i.onHandQty - have;
        if (missing <= 0) continue;
        const serials = await generateSerials(tx, {
          skuPrefix,
          variantId: variantId ?? null,
          lensBlankId: lensBlankId ?? null,
          count: missing,
        });
        for (const serial of serials) {
          await tx.stockUnit.create({
            data: {
              serialNumber: serial,
              variantId: variantId ?? null,
              lensBlankId: lensBlankId ?? null,
              status: StockUnitStatus.IN_STOCK,
              currentWarehouseId: i.warehouseId,
              costPrice,
              notes: 'Backfilled to match existing on-hand aggregate',
              events: {
                create: {
                  fromStatus: null,
                  toStatus: StockUnitStatus.IN_STOCK,
                  toWarehouseId: i.warehouseId,
                  note: 'Backfilled (no GRN reference)',
                  createdById: user.id,
                },
              },
            },
          });
          created.push({ warehouseCode: i.warehouse.code, serial });
        }
      }
    },
    { timeout: Math.max(15000, gap * 35) },
  );

  return NextResponse.json({ created: created.length, units: created });
}
