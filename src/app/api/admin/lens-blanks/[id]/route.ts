import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/api/db';
import { isAdmin, isStaffOrAdmin, requireSessionUser } from '@/core/api/server/authz';
import { getCentralWarehouse } from '@/core/api/server/warehouse';

async function gate(request: NextRequest) {
  const user = await requireSessionUser(request);
  if (!user || !isStaffOrAdmin(user.role)) {
    return { user: null, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { user, res: null as NextResponse | null };
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await gate(request);
  if (!user || res) return res!;
  const { id } = await ctx.params;
  const central = await getCentralWarehouse();
  const lb = await db.lensBlank.findFirst({
    where: { OR: [{ id }, { legacyLensId: id }] },
    include: {
      category: true,
      inventoryItems: central ? { where: { warehouseId: central.id }, take: 1 } : undefined,
    },
  });
  if (!lb) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const inv = lb.inventoryItems?.[0];
  const row: Record<string, unknown> = {
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
    sellingPrice: Number(lb.sellingPrice),
    taxRate: Number(lb.taxRate),
    hsnCode: lb.hsnCode,
    isActive: lb.isActive,
    onHandQty: inv?.onHandQty ?? 0,
    reservedQty: inv?.reservedQty ?? 0,
    availableQty: (inv?.onHandQty ?? 0) - (inv?.reservedQty ?? 0),
  };
  if (isAdmin(user.role)) row.costPrice = Number(lb.costPrice);
  return NextResponse.json(row);
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { res } = await gate(request);
  if (res) return res;
  const { id } = await ctx.params;
  const lb = await db.lensBlank.findFirst({ where: { OR: [{ id }, { legacyLensId: id }] } });
  if (!lb) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = (await request.json()) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (body.name != null) data.name = String(body.name).trim();
  if (body.shortDesc != null) data.shortDesc = String(body.shortDesc);
  if (body.description != null) data.description = String(body.description);
  if (body.whoIsItFor != null) data.whoIsItFor = String(body.whoIsItFor);
  if (body.lensType != null) data.lensType = String(body.lensType);
  if (typeof body.blueCut === 'boolean') data.blueCut = body.blueCut;
  if (body.useCases != null) data.useCases = body.useCases as object;
  if (body.badge !== undefined) data.badge = body.badge ? String(body.badge) : null;
  if (body.categoryId != null) data.categoryId = String(body.categoryId);
  if (body.legacyLensId !== undefined) data.legacyLensId = body.legacyLensId ? String(body.legacyLensId) : null;
  if (body.costPrice != null) data.costPrice = Number(body.costPrice);
  if (body.sellingPrice != null) data.sellingPrice = Number(body.sellingPrice);
  if (body.taxRate != null) data.taxRate = Number(body.taxRate);
  if (body.hsnCode != null) data.hsnCode = String(body.hsnCode);
  if (body.indexPower !== undefined) data.indexPower = body.indexPower == null ? null : Number(body.indexPower);
  if (body.coating !== undefined) data.coating = body.coating == null ? null : String(body.coating);
  if (body.powerMin !== undefined) data.powerMin = body.powerMin == null ? null : Number(body.powerMin);
  if (body.powerMax !== undefined) data.powerMax = body.powerMax == null ? null : Number(body.powerMax);
  if (body.cylMin !== undefined) data.cylMin = body.cylMin == null ? null : Number(body.cylMin);
  if (body.cylMax !== undefined) data.cylMax = body.cylMax == null ? null : Number(body.cylMax);
  if (body.diameterMm !== undefined) data.diameterMm = body.diameterMm == null ? null : Number(body.diameterMm);
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
  await db.lensBlank.update({ where: { id: lb.id }, data: data as object });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { res } = await gate(request);
  if (res) return res;
  const { id } = await ctx.params;
  const lb = await db.lensBlank.findFirst({ where: { OR: [{ id }, { legacyLensId: id }] } });
  if (!lb) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await db.lensBlank.delete({ where: { id: lb.id } });
  return NextResponse.json({ ok: true });
}
