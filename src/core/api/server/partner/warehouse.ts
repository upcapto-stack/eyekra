import { Prisma } from '@prisma/client';
import { db } from '@/core/api/db';
import type { AppConfig, PartnerWarehouseCoverage } from '@/types/app-config';

type JsonObject = Record<string, unknown>;

export type PartnerWarehouseAssignment = {
  status: 'assigned' | 'coming_soon';
  city: string | null;
  warehouseName: string | null;
  warehouseAddress: string | null;
  assignedAt: string;
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function resolveCoverageFromAddress(
  address: string,
  rows: PartnerWarehouseCoverage[],
): PartnerWarehouseCoverage | null {
  const lowerAddress = normalize(address);
  if (!lowerAddress) return null;
  return rows.find((row) => lowerAddress.includes(normalize(row.city))) ?? null;
}

function toAssignment(coverage: PartnerWarehouseCoverage | null, city: string | null): PartnerWarehouseAssignment {
  return {
    status: coverage ? 'assigned' : 'coming_soon',
    city,
    warehouseName: coverage?.warehouseName ?? null,
    warehouseAddress: coverage?.warehouseAddress ?? null,
    assignedAt: new Date().toISOString(),
  };
}

async function getCoverageRows(): Promise<PartnerWarehouseCoverage[]> {
  const latest = await db.appConfigVersion.findFirst({ orderBy: { createdAt: 'desc' } });
  const config = (latest?.payload ?? {}) as unknown as AppConfig;
  const rows = Array.isArray(config.partnerWarehouseCoverage) ? config.partnerWarehouseCoverage : [];
  return rows.filter((row) => Boolean(row.city?.trim()) && Boolean(row.warehouseName?.trim()) && row.isActive !== false);
}

export async function resolvePartnerWarehouseAssignment(userId: string): Promise<PartnerWarehouseAssignment> {
  const [rows, latestAddress] = await Promise.all([
    getCoverageRows(),
    db.userAddress.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { address: true },
    }),
  ]);

  const address = String(latestAddress?.address ?? '').trim();
  const coverage = resolveCoverageFromAddress(address, rows);
  const city = coverage?.city ?? null;
  return toAssignment(coverage, city);
}

export async function savePartnerWarehouseAssignment(userId: string, assignment: PartnerWarehouseAssignment): Promise<void> {
  const existing = await db.userSetting.findUnique({
    where: { userId },
    select: { metadata: true },
  });
  const metadata: JsonObject = existing?.metadata && typeof existing.metadata === 'object'
    ? { ...(existing.metadata as JsonObject) }
    : {};

  metadata.partnerWarehouse = assignment;

  const metadataJson = metadata as Prisma.InputJsonValue;

  await db.userSetting.upsert({
    where: { userId },
    update: { metadata: metadataJson },
    create: { userId, metadata: metadataJson },
  });
}

export async function getPartnerWarehouseAssignment(userId: string): Promise<PartnerWarehouseAssignment | null> {
  const setting = await db.userSetting.findUnique({
    where: { userId },
    select: { metadata: true },
  });
  if (!setting?.metadata || typeof setting.metadata !== 'object') return null;
  const entry = (setting.metadata as JsonObject).partnerWarehouse;
  if (!entry || typeof entry !== 'object') return null;
  const data = entry as JsonObject;
  const status = data.status === 'assigned' ? 'assigned' : 'coming_soon';
  return {
    status,
    city: typeof data.city === 'string' ? data.city : null,
    warehouseName: typeof data.warehouseName === 'string' ? data.warehouseName : null,
    warehouseAddress: typeof data.warehouseAddress === 'string' ? data.warehouseAddress : null,
    assignedAt: typeof data.assignedAt === 'string' ? data.assignedAt : new Date().toISOString(),
  };
}
