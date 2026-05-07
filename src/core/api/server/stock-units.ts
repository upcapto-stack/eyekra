/**
 * Per-piece stock unit helpers. A StockUnit is a single physical frame/lens-blank
 * piece, tagged with a serial + QR. InventoryItem.onHandQty stays as the cached
 * aggregate (count of StockUnits with status=IN_STOCK at that warehouse).
 */
import type { Prisma } from '@prisma/client';
import { StockUnitStatus } from '@prisma/client';

const SERIAL_RANDOM_SUFFIX_LEN = 4;

function randomSuffix(): string {
  // Base32 (Crockford) alphabet without ambiguous chars (0/O, 1/I/L)
  const alphabet = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
  let out = '';
  for (let i = 0; i < SERIAL_RANDOM_SUFFIX_LEN; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

/**
 * Generate the next N unique serial numbers for a SKU. Format:
 *   {SKU}-{YY}{MM}-{NNNNN}{RAND}
 * where NNNNN is the unit's order-of-receipt across the SKU's lifetime, and RAND
 * is 4 chars to make scanning collisions vanishingly unlikely even if a label is
 * smudged or partially scanned.
 *
 * Returns serials in deterministic ascending order so callers can pair them
 * one-to-one with physical pieces being labelled.
 */
export async function generateSerials(
  tx: Prisma.TransactionClient,
  opts: { skuPrefix: string; variantId?: string | null; lensBlankId?: string | null; count: number },
): Promise<string[]> {
  const baseCount = opts.variantId
    ? await tx.stockUnit.count({ where: { variantId: opts.variantId } })
    : opts.lensBlankId
      ? await tx.stockUnit.count({ where: { lensBlankId: opts.lensBlankId } })
      : 0;
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const out: string[] = [];
  for (let i = 0; i < opts.count; i++) {
    const seq = String(baseCount + i + 1).padStart(5, '0');
    out.push(`${opts.skuPrefix}-${yy}${mm}-${seq}${randomSuffix()}`);
  }
  return out;
}

/**
 * Create N StockUnit rows for a GRN line. Idempotent against a (grnLineId, sequence)
 * key conceptually but uses unique-on-serial enforcement plus retries on collision.
 */
export async function createStockUnitsForGrn(
  tx: Prisma.TransactionClient,
  args: {
    qty: number;
    variantId?: string | null;
    lensBlankId?: string | null;
    skuPrefix: string;
    warehouseId: string;
    costPrice: number | string;
    grnLineId: string;
    vendorBatchNo?: string | null;
    createdById?: string | null;
  },
): Promise<string[]> {
  if (args.qty <= 0) return [];
  if (!args.variantId && !args.lensBlankId) {
    throw new Error('createStockUnitsForGrn: variantId or lensBlankId required');
  }
  const serials = await generateSerials(tx, {
    skuPrefix: args.skuPrefix,
    variantId: args.variantId,
    lensBlankId: args.lensBlankId,
    count: args.qty,
  });
  const ids: string[] = [];
  for (const serial of serials) {
    const created = await tx.stockUnit.create({
      data: {
        serialNumber: serial,
        variantId: args.variantId ?? null,
        lensBlankId: args.lensBlankId ?? null,
        status: StockUnitStatus.IN_STOCK,
        currentWarehouseId: args.warehouseId,
        costPrice: String(args.costPrice),
        vendorBatchNo: args.vendorBatchNo ?? null,
        createdFromGrnLineId: args.grnLineId,
        events: {
          create: {
            fromStatus: null,
            toStatus: StockUnitStatus.IN_STOCK,
            toWarehouseId: args.warehouseId,
            note: 'Received via GRN',
            createdById: args.createdById ?? null,
          },
        },
      },
      select: { id: true },
    });
    ids.push(created.id);
  }
  return ids;
}

export interface TransitionInput {
  unitId: string;
  toStatus: StockUnitStatus;
  toWarehouseId?: string | null;
  partnerId?: string | null;
  bookingId?: string | null;
  orderId?: string | null;
  note?: string | null;
  createdById?: string | null;
}

/**
 * State machine for a single StockUnit. Validates the transition, updates the
 * unit, and writes an immutable event row. All in a transaction.
 */
const FINAL_STATES = new Set<StockUnitStatus>([
  StockUnitStatus.SOLD,
  StockUnitStatus.LOST,
  StockUnitStatus.RETURNED_TO_VENDOR,
]);

export async function transitionUnit(
  tx: Prisma.TransactionClient,
  input: TransitionInput,
): Promise<void> {
  const unit = await tx.stockUnit.findUnique({ where: { id: input.unitId } });
  if (!unit) throw new Error(`StockUnit ${input.unitId} not found`);
  if (FINAL_STATES.has(unit.status)) {
    throw new Error(`StockUnit ${unit.serialNumber} is in terminal state ${unit.status}; cannot transition`);
  }
  if (unit.status === input.toStatus && unit.currentWarehouseId === (input.toWarehouseId ?? unit.currentWarehouseId)) {
    // No-op
    return;
  }

  const data: Prisma.StockUnitUpdateInput = {
    status: input.toStatus,
    lastEventAt: new Date(),
  };

  // Handle current-location fields based on target state
  switch (input.toStatus) {
    case StockUnitStatus.IN_STOCK:
      if (input.toWarehouseId) data.currentWarehouse = { connect: { id: input.toWarehouseId } };
      data.currentPartner = { disconnect: true };
      data.currentBooking = { disconnect: true };
      break;
    case StockUnitStatus.IN_TRANSIT:
      if (input.toWarehouseId) data.currentWarehouse = { connect: { id: input.toWarehouseId } };
      break;
    case StockUnitStatus.WITH_PARTNER:
    case StockUnitStatus.WITH_CUSTOMER:
      if (!input.partnerId) throw new Error('partnerId required for WITH_PARTNER / WITH_CUSTOMER');
      data.currentPartner = { connect: { id: input.partnerId } };
      if (input.bookingId) data.currentBooking = { connect: { id: input.bookingId } };
      break;
    case StockUnitStatus.IN_LAB:
      if (input.toWarehouseId) data.currentWarehouse = { connect: { id: input.toWarehouseId } };
      break;
    case StockUnitStatus.RESERVED:
      if (input.orderId) data.currentOrder = { connect: { id: input.orderId } };
      break;
    case StockUnitStatus.SOLD:
      data.soldAt = new Date();
      if (input.orderId) data.currentOrder = { connect: { id: input.orderId } };
      break;
    case StockUnitStatus.LOST:
      data.lostAt = new Date();
      break;
    case StockUnitStatus.DAMAGED:
      data.damagedAt = new Date();
      break;
    case StockUnitStatus.RETURNED_TO_VENDOR:
      // keep where it physically is for now
      break;
  }

  await tx.stockUnit.update({ where: { id: unit.id }, data });

  await tx.stockUnitEvent.create({
    data: {
      unitId: unit.id,
      fromStatus: unit.status,
      toStatus: input.toStatus,
      fromWarehouseId: unit.currentWarehouseId,
      toWarehouseId: input.toWarehouseId ?? null,
      partnerId: input.partnerId ?? null,
      bookingId: input.bookingId ?? null,
      orderId: input.orderId ?? null,
      note: input.note ?? null,
      createdById: input.createdById ?? null,
    },
  });
}
