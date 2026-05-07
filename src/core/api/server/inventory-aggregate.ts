/**
 * Aggregates inventory rows across ALL warehouses for display purposes.
 * Use this in admin read APIs so users see real totals regardless of which
 * warehouse they posted GRNs against.
 */

export interface InvRow {
  onHandQty: number;
  reservedQty: number;
  reorderPoint: number;
  warehouseId?: string;
  warehouse?: { id?: string; code: string; name: string } | null;
}

export interface InvBreakdown {
  warehouseId?: string;
  code: string;
  name: string;
  onHand: number;
  reserved: number;
  available: number;
  reorderPoint: number;
}

export interface InvAggregate {
  onHand: number;
  reserved: number;
  available: number;
  reorderPoint: number;
  lowStock: boolean;
  byWarehouse: InvBreakdown[];
}

export function aggregateInventory(rows: InvRow[]): InvAggregate {
  let onHand = 0;
  let reserved = 0;
  let maxReorder = 0;
  const byWarehouse: InvBreakdown[] = [];
  for (const r of rows) {
    onHand += r.onHandQty;
    reserved += r.reservedQty;
    if (r.reorderPoint > maxReorder) maxReorder = r.reorderPoint;
    byWarehouse.push({
      warehouseId: r.warehouseId ?? r.warehouse?.id,
      code: r.warehouse?.code ?? '?',
      name: r.warehouse?.name ?? '?',
      onHand: r.onHandQty,
      reserved: r.reservedQty,
      available: r.onHandQty - r.reservedQty,
      reorderPoint: r.reorderPoint,
    });
  }
  const available = onHand - reserved;
  return {
    onHand,
    reserved,
    available,
    reorderPoint: maxReorder,
    lowStock: rows.length > 0 && available <= maxReorder,
    byWarehouse,
  };
}
