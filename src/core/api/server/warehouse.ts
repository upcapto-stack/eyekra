import { db } from '@/core/api/db';
import { WarehouseKind } from '@prisma/client';

export async function getCentralWarehouse() {
  return db.warehouse.findUnique({ where: { code: 'CENTRAL' } });
}

export async function getCentralWarehouseId(): Promise<string | null> {
  const w = await getCentralWarehouse();
  return w?.id ?? null;
}

/** Ensures CENTRAL exists (e.g. after fresh migrate before seed-catalog). */
export async function ensureCentralWarehouse() {
  return db.warehouse.upsert({
    where: { code: 'CENTRAL' },
    create: {
      code: 'CENTRAL',
      name: 'Central warehouse & lab',
      kind: WarehouseKind.BOTH,
      city: 'Mumbai',
      state: 'Maharashtra',
      isActive: true,
    },
    update: {},
  });
}
