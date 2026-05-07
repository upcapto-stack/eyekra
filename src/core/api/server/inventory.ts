import type { Prisma } from '@prisma/client';
import { StockMovementType } from '@prisma/client';

export type StockTarget =
  | { variantId: string; lensBlankId?: undefined }
  | { lensBlankId: string; variantId?: undefined };

export interface ApplyStockMovementInput {
  warehouseId: string;
  variantId?: string | null;
  lensBlankId?: string | null;
  type: StockMovementType;
  /** Non-negative integer quantity (meaning depends on type). */
  qty: number;
  refType?: string;
  refId?: string;
  costSnapshot?: Prisma.Decimal | number | null;
  note?: string | null;
  createdById?: string | null;
}

function assertStockTarget(input: { variantId?: string | null; lensBlankId?: string | null }): void {
  const hasV = !!input.variantId;
  const hasL = !!input.lensBlankId;
  if (hasV === hasL) {
    throw new Error('Stock movement requires exactly one of variantId or lensBlankId');
  }
}

async function getOrCreateInventoryItem(
  tx: Prisma.TransactionClient,
  warehouseId: string,
  target: StockTarget,
  reorderPoint: number,
): Promise<{ id: string; onHandQty: number; reservedQty: number }> {
  const where =
    'variantId' in target && target.variantId
      ? { warehouseId_variantId: { warehouseId, variantId: target.variantId } }
      : { warehouseId_lensBlankId: { warehouseId, lensBlankId: target.lensBlankId! } };

  const existing = await tx.inventoryItem.findUnique({ where });
  if (existing) {
    return { id: existing.id, onHandQty: existing.onHandQty, reservedQty: existing.reservedQty };
  }
  const created = await tx.inventoryItem.create({
    data: {
      warehouseId,
      variantId: 'variantId' in target ? target.variantId : null,
      lensBlankId: 'lensBlankId' in target ? target.lensBlankId : null,
      onHandQty: 0,
      reservedQty: 0,
      reorderPoint,
    },
  });
  return { id: created.id, onHandQty: 0, reservedQty: 0 };
}

/** Append-only stock movement + cached balance update. Use inside `db.$transaction`. */
export async function applyStockMovement(tx: Prisma.TransactionClient, input: ApplyStockMovementInput): Promise<void> {
  assertStockTarget(input);
  const { warehouseId, type, refType, refId, costSnapshot, note, createdById } = input;
  const q = Math.floor(Number(input.qty));
  if (!Number.isFinite(q) || q < 0) {
    throw new Error('qty must be a non-negative finite number');
  }

  const target: StockTarget =
    input.variantId != null ? { variantId: input.variantId } : { lensBlankId: input.lensBlankId! };

  let reorderPoint = 5;
  if (input.variantId) {
    const v = await tx.productVariant.findUnique({
      where: { id: input.variantId },
      select: { reorderPoint: true },
    });
    if (v) reorderPoint = v.reorderPoint;
  } else if (input.lensBlankId) {
    const row = await tx.inventoryItem.findFirst({
      where: { warehouseId, lensBlankId: input.lensBlankId },
      select: { reorderPoint: true },
    });
    if (row) reorderPoint = row.reorderPoint;
  }

  const invInitial = await getOrCreateInventoryItem(tx, warehouseId, target, reorderPoint);

  await tx.$queryRaw`SELECT id FROM "InventoryItem" WHERE id = ${invInitial.id} FOR UPDATE`;
  const inv = await tx.inventoryItem.findUniqueOrThrow({
    where: { id: invInitial.id },
    select: { id: true, onHandQty: true, reservedQty: true },
  });

  let onHandDelta = 0;
  let reservedDelta = 0;

  switch (type) {
    case StockMovementType.OPENING:
      onHandDelta = q;
      break;
    case StockMovementType.GRN:
    case StockMovementType.RETURN:
      onHandDelta = q;
      break;
    case StockMovementType.RESERVATION: {
      const available = inv.onHandQty - inv.reservedQty;
      if (available < q) {
        throw new Error(`Insufficient stock: need ${q}, available ${available}`);
      }
      reservedDelta = q;
      break;
    }
    case StockMovementType.RELEASE:
      if (inv.reservedQty < q) {
        throw new Error(`Cannot release ${q}: reserved ${inv.reservedQty}`);
      }
      reservedDelta = -q;
      break;
    case StockMovementType.SALE: {
      const takeFromReserved = Math.min(q, inv.reservedQty);
      const takeFromOnHand = q - takeFromReserved;
      if (inv.onHandQty < takeFromOnHand) {
        throw new Error(`Cannot ship ${q}: onHand ${inv.onHandQty}, reserved ${inv.reservedQty}`);
      }
      onHandDelta = -takeFromOnHand - takeFromReserved;
      reservedDelta = -takeFromReserved;
      break;
    }
    case StockMovementType.TRANSFER_OUT: {
      const available = inv.onHandQty - inv.reservedQty;
      if (available < q) {
        throw new Error(`Insufficient available for transfer: need ${q}, have ${available}`);
      }
      onHandDelta = -q;
      break;
    }
    case StockMovementType.TRANSFER_IN:
      onHandDelta = q;
      break;
    case StockMovementType.ADJUSTMENT:
      throw new Error('Use applyStockAdjustment for ADJUSTMENT');
    default:
      throw new Error(`Unhandled movement type: ${type}`);
  }

  await tx.stockMovement.create({
    data: {
      warehouseId,
      variantId: input.variantId ?? null,
      lensBlankId: input.lensBlankId ?? null,
      type,
      qty: q || Math.abs(onHandDelta) || Math.abs(reservedDelta),
      onHandDelta,
      reservedDelta,
      refType: refType ?? null,
      refId: refId ?? null,
      costSnapshot: costSnapshot != null ? String(costSnapshot) : null,
      note: note ?? null,
      createdById: createdById ?? null,
    },
  });

  await tx.inventoryItem.update({
    where: { id: inv.id },
    data: {
      onHandQty: { increment: onHandDelta },
      reservedQty: { increment: reservedDelta },
    },
  });

  const after = await tx.inventoryItem.findUniqueOrThrow({ where: { id: inv.id } });
  if (after.onHandQty < 0 || after.reservedQty < 0) {
    throw new Error('Inventory would go negative');
  }
  if (after.reservedQty > after.onHandQty) {
    throw new Error(
      `Inventory invariant violated: reserved ${after.reservedQty} exceeds onHand ${after.onHandQty}`,
    );
  }
}

export interface ApplyStockAdjustmentInput {
  warehouseId: string;
  variantId?: string | null;
  lensBlankId?: string | null;
  signedQty: number;
  refType?: string;
  refId?: string;
  costSnapshot?: Prisma.Decimal | number | null;
  note?: string | null;
  createdById?: string | null;
}

/** Signed on-hand adjustment (damage, count correction, opening balance). */
export async function applyStockAdjustment(
  tx: Prisma.TransactionClient,
  input: ApplyStockAdjustmentInput,
): Promise<void> {
  assertStockTarget(input);
  const { warehouseId, refType, refId, costSnapshot, note, createdById, signedQty } = input;
  const onHandDelta = Math.trunc(Number(signedQty));
  if (!Number.isFinite(onHandDelta)) {
    throw new Error('signedQty must be finite');
  }

  const target: StockTarget =
    input.variantId != null ? { variantId: input.variantId } : { lensBlankId: input.lensBlankId! };

  let reorderPoint = 5;
  if (input.variantId) {
    const v = await tx.productVariant.findUnique({
      where: { id: input.variantId },
      select: { reorderPoint: true },
    });
    if (v) reorderPoint = v.reorderPoint;
  }

  const invInitial = await getOrCreateInventoryItem(tx, warehouseId, target, reorderPoint);
  await tx.$queryRaw`SELECT id FROM "InventoryItem" WHERE id = ${invInitial.id} FOR UPDATE`;
  const inv = await tx.inventoryItem.findUniqueOrThrow({
    where: { id: invInitial.id },
    select: { id: true, onHandQty: true, reservedQty: true },
  });

  await tx.stockMovement.create({
    data: {
      warehouseId,
      variantId: input.variantId ?? null,
      lensBlankId: input.lensBlankId ?? null,
      type: StockMovementType.ADJUSTMENT,
      qty: Math.abs(onHandDelta),
      onHandDelta,
      reservedDelta: 0,
      refType: refType ?? null,
      refId: refId ?? null,
      costSnapshot: costSnapshot != null ? String(costSnapshot) : null,
      note: note ?? null,
      createdById: createdById ?? null,
    },
  });

  await tx.inventoryItem.update({
    where: { id: inv.id },
    data: {
      onHandQty: { increment: onHandDelta },
    },
  });

  const after = await tx.inventoryItem.findUniqueOrThrow({ where: { id: inv.id } });
  if (after.onHandQty < 0 || after.reservedQty < 0) {
    throw new Error('Inventory would go negative');
  }
}
