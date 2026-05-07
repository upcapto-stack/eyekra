import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { db } from '@/core/api/db';
import { isStaffOrAdmin, requireSessionUser } from '@/core/api/server/authz';
import { getCentralWarehouse } from '@/core/api/server/warehouse';

async function gate(request: NextRequest) {
  const user = await requireSessionUser(request);
  if (!user || !isStaffOrAdmin(user.role)) {
    return { user: null, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { user, res: null as NextResponse | null };
}

export async function GET(request: NextRequest) {
  const { res } = await gate(request);
  if (res) return res;
  const central = await getCentralWarehouse();
  const blanks = await db.lensBlank.findMany({
    orderBy: { name: 'asc' },
    include: {
      category: true,
      inventoryItems: central ? { where: { warehouseId: central.id }, take: 1 } : undefined,
    },
  });
  const mapped = blanks.map((lb) => {
    const inv = lb.inventoryItems?.[0];
    return {
      id: lb.id,
      categoryId: lb.categoryId,
      categoryKey: lb.category.key,
      legacyLensId: lb.legacyLensId,
      name: lb.name,
      shortDesc: lb.shortDesc,
      description: lb.description,
      whoIsItFor: lb.whoIsItFor,
      lensType: lb.lensType,
      blueCut: lb.blueCut,
      useCases: lb.useCases,
      badge: lb.badge,
      indexPower: lb.indexPower != null ? Number(lb.indexPower) : null,
      coating: lb.coating,
      powerMin: lb.powerMin != null ? Number(lb.powerMin) : null,
      powerMax: lb.powerMax != null ? Number(lb.powerMax) : null,
      cylMin: lb.cylMin != null ? Number(lb.cylMin) : null,
      cylMax: lb.cylMax != null ? Number(lb.cylMax) : null,
      diameterMm: lb.diameterMm,
      costPrice: Number(lb.costPrice),
      sellingPrice: Number(lb.sellingPrice),
      taxRate: Number(lb.taxRate),
      hsnCode: lb.hsnCode,
      isActive: lb.isActive,
      onHandQty: inv?.onHandQty ?? 0,
      reservedQty: inv?.reservedQty ?? 0,
      availableQty: (inv?.onHandQty ?? 0) - (inv?.reservedQty ?? 0),
      lowStock: inv != null && inv.onHandQty - inv.reservedQty <= inv.reorderPoint,
    };
  });
  return NextResponse.json({ lensBlanks: mapped });
}

export async function POST(request: NextRequest) {
  const { res } = await gate(request);
  if (res) return res;
  const central = await getCentralWarehouse();
  if (!central) return NextResponse.json({ error: 'CENTRAL warehouse missing' }, { status: 500 });

  const body = (await request.json()) as {
    categoryId: string;
    legacyLensId?: string;
    name: string;
    shortDesc?: string;
    description?: string;
    whoIsItFor?: string;
    lensType: string;
    blueCut?: boolean;
    useCases?: unknown[];
    badge?: string;
    indexPower?: number | null;
    coating?: string | null;
    powerMin?: number | null;
    powerMax?: number | null;
    cylMin?: number | null;
    cylMax?: number | null;
    diameterMm?: number | null;
    costPrice: number;
    sellingPrice: number;
    taxRate?: number;
    hsnCode?: string;
  };
  if (!body?.categoryId || !body?.name?.trim() || !body?.lensType) {
    return NextResponse.json({ error: 'categoryId, name, lensType required' }, { status: 400 });
  }

  const lb = await db.lensBlank.create({
    data: {
      categoryId: body.categoryId,
      legacyLensId: body.legacyLensId?.trim() || null,
      name: body.name.trim(),
      shortDesc: body.shortDesc?.trim() || '',
      description: body.description?.trim() || '',
      whoIsItFor: body.whoIsItFor?.trim() || '',
      lensType: body.lensType,
      blueCut: !!body.blueCut,
      useCases: JSON.parse(JSON.stringify(body.useCases ?? ['all'])) as Prisma.InputJsonValue,
      badge: body.badge?.trim() || null,
      indexPower: body.indexPower ?? undefined,
      coating: body.coating ?? undefined,
      powerMin: body.powerMin ?? undefined,
      powerMax: body.powerMax ?? undefined,
      cylMin: body.cylMin ?? undefined,
      cylMax: body.cylMax ?? undefined,
      diameterMm: body.diameterMm ?? undefined,
      costPrice: body.costPrice,
      sellingPrice: body.sellingPrice,
      taxRate: body.taxRate ?? 18,
      hsnCode: body.hsnCode?.trim() || '9004',
    },
  });
  await db.inventoryItem.create({
    data: {
      warehouseId: central.id,
      lensBlankId: lb.id,
      onHandQty: 0,
      reservedQty: 0,
      reorderPoint: 5,
    },
  });
  return NextResponse.json({ id: lb.id });
}
