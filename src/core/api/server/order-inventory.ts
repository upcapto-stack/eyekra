import type { Prisma } from '@prisma/client';
import { OrderStatus, StockMovementType } from '@prisma/client';
import { applyStockMovement } from '@/core/api/server/inventory';
import type { OrderItem } from '@/types/order';

/**
 * Stable lock order across concurrent transactions. Always process inventory rows in
 * (variantId, lensBlankId) ascending order to avoid cross-SKU deadlocks when two
 * orders touch the same set of SKUs in different sequences.
 */
function lockOrderKey(line: { variantId: string | null; lensBlankId: string | null }): string {
  return `v:${line.variantId ?? ''}|l:${line.lensBlankId ?? ''}`;
}
function sortLinesForLocking<T extends { variantId: string | null; lensBlankId: string | null }>(
  lines: T[],
): T[] {
  return [...lines].sort((a, b) => lockOrderKey(a).localeCompare(lockOrderKey(b)));
}

export async function resolveDefaultVariantIdForTx(
  tx: Prisma.TransactionClient,
  productCatalogSlug: string,
): Promise<string | null> {
  const product = await tx.product.findUnique({
    where: { catalogSlug: productCatalogSlug },
    select: { id: true, variants: { where: { isActive: true }, orderBy: { createdAt: 'asc' }, take: 1, select: { id: true } } },
  });
  return product?.variants[0]?.id ?? null;
}

export async function resolveLensBlankIdForTx(
  tx: Prisma.TransactionClient,
  lensId: string | undefined,
): Promise<string | null> {
  if (!lensId?.trim()) return null;
  const lb = await tx.lensBlank.findFirst({
    where: { OR: [{ legacyLensId: lensId }, { id: lensId }], isActive: true },
    select: { id: true },
  });
  return lb?.id ?? null;
}

export async function createOrderLines(
  tx: Prisma.TransactionClient,
  orderId: string,
  items: OrderItem[],
  centralWarehouseId: string | null,
): Promise<void> {
  const resolved: Array<{
    item: OrderItem;
    variantId: string | null;
    lensBlankId: string | null;
  }> = [];
  for (const it of items) {
    const variantId = await resolveDefaultVariantIdForTx(tx, it.productId);
    const lensBlankId = await resolveLensBlankIdForTx(tx, it.lensId);
    resolved.push({ item: it, variantId, lensBlankId });
  }
  resolved.sort((a, b) => lockOrderKey(a).localeCompare(lockOrderKey(b)));
  for (const r of resolved) {
    const it = r.item;
    await tx.orderLine.create({
      data: {
        orderId,
        variantId: r.variantId,
        lensBlankId: r.lensBlankId,
        productName: it.productName,
        variantName: null,
        unitPrice: parseFloat(String(it.productPrice).replace(/[^0-9.]/g, '')) || 0,
        lensPrice: it.lensPrice ?? null,
        quantity: it.quantity,
        lineTotal: it.lineTotal,
        fulfilledFromWarehouseId: centralWarehouseId,
      },
    });
  }
}

export async function reserveFramesForOrder(
  tx: Prisma.TransactionClient,
  warehouseId: string,
  orderId: string,
  createdById: string | null,
): Promise<void> {
  const rows = await tx.orderLine.findMany({ where: { orderId, variantId: { not: null } } });
  const lines = sortLinesForLocking(rows);
  for (const line of lines) {
    if (!line.variantId) continue;
    await applyStockMovement(tx, {
      warehouseId,
      variantId: line.variantId,
      type: StockMovementType.RESERVATION,
      qty: line.quantity,
      refType: 'order',
      refId: orderId,
      createdById,
    });
  }
}

export async function releaseFramesForOrder(
  tx: Prisma.TransactionClient,
  warehouseId: string,
  orderId: string,
  createdById: string | null,
): Promise<void> {
  const rows = await tx.orderLine.findMany({ where: { orderId, variantId: { not: null } } });
  const lines = sortLinesForLocking(rows);
  for (const line of lines) {
    if (!line.variantId) continue;
    try {
      await applyStockMovement(tx, {
        warehouseId,
        variantId: line.variantId,
        type: StockMovementType.RELEASE,
        qty: line.quantity,
        refType: 'order_cancel',
        refId: orderId,
        createdById,
      });
    } catch {
      /* not reserved (e.g. legacy order) */
    }
  }
}

export async function releaseLensBlanksForOrder(
  tx: Prisma.TransactionClient,
  warehouseId: string,
  orderId: string,
  createdById: string | null,
): Promise<void> {
  const rows = await tx.orderLine.findMany({ where: { orderId, lensBlankId: { not: null } } });
  const lines = sortLinesForLocking(rows);
  for (const line of lines) {
    if (!line.lensBlankId) continue;
    try {
      await applyStockMovement(tx, {
        warehouseId,
        lensBlankId: line.lensBlankId,
        type: StockMovementType.RELEASE,
        qty: line.quantity,
        refType: 'order_cancel',
        refId: orderId,
        createdById,
      });
    } catch {
      /* not reserved */
    }
  }
}

export async function reserveLensBlanksForOrder(
  tx: Prisma.TransactionClient,
  warehouseId: string,
  orderId: string,
  createdById: string | null,
): Promise<void> {
  const rows = await tx.orderLine.findMany({ where: { orderId, lensBlankId: { not: null } } });
  const lines = sortLinesForLocking(rows);
  for (const line of lines) {
    if (!line.lensBlankId) continue;
    await applyStockMovement(tx, {
      warehouseId,
      lensBlankId: line.lensBlankId,
      type: StockMovementType.RESERVATION,
      qty: line.quantity,
      refType: 'order_lab',
      refId: orderId,
      createdById,
    });
  }
}

export async function shipOrderStock(
  tx: Prisma.TransactionClient,
  warehouseId: string,
  orderId: string,
  createdById: string | null,
): Promise<void> {
  const rows = await tx.orderLine.findMany({ where: { orderId } });
  const lines = sortLinesForLocking(rows);
  for (const line of lines) {
    if (line.variantId) {
      await applyStockMovement(tx, {
        warehouseId,
        variantId: line.variantId,
        type: StockMovementType.SALE,
        qty: line.quantity,
        refType: 'order_ship',
        refId: orderId,
        createdById,
      });
    }
    if (line.lensBlankId) {
      await applyStockMovement(tx, {
        warehouseId,
        lensBlankId: line.lensBlankId,
        type: StockMovementType.SALE,
        qty: line.quantity,
        refType: 'order_ship',
        refId: orderId,
        createdById,
      });
    }
  }
}

export function orderStatusRank(s: OrderStatus): number {
  const order: OrderStatus[] = [
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
    OrderStatus.IN_LAB,
    OrderStatus.QC,
    OrderStatus.READY,
    OrderStatus.SHIPPED,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
  ];
  return order.indexOf(s);
}
