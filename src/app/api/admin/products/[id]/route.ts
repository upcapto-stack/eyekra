import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/api/db';
import { isAdmin, isStaffOrAdmin, requireSessionUser } from '@/core/api/server/authz';
import { aggregateInventory } from '@/core/api/server/inventory-aggregate';

async function gate(request: NextRequest) {
  const user = await requireSessionUser(request);
  if (!user || !isStaffOrAdmin(user.role)) {
    return { user: null, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { user, res: null as NextResponse | null };
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await gate(request);
  if (!user) return res!;
  const { id } = await ctx.params;
  const product = await db.product.findFirst({
    where: { OR: [{ id }, { catalogSlug: id }] },
    include: {
      variants: {
        orderBy: { sku: 'asc' },
        include: {
          inventoryItems: {
            include: {
              warehouse: { select: { id: true, code: true, name: true } },
            },
          },
        },
      },
    },
  });
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const variants = product.variants.map((v) => {
    const agg = aggregateInventory(v.inventoryItems);
    const base = {
      id: v.id,
      sku: v.sku,
      displayType: v.displayType,
      colorName: v.colorName,
      displayPayload: v.displayPayload,
      barcode: v.barcode,
      costPrice: Number(v.costPrice),
      mrp: Number(v.mrp),
      sellingPrice: Number(v.sellingPrice),
      taxRate: Number(v.taxRate),
      hsnCode: v.hsnCode,
      weightG: v.weightG != null ? Number(v.weightG) : null,
      reorderPoint: v.reorderPoint,
      isActive: v.isActive,
      onHandQty: agg.onHand,
      reservedQty: agg.reserved,
      availableQty: agg.available,
      lowStock: agg.lowStock,
      inventoryByWarehouse: agg.byWarehouse,
    };
    if (!isAdmin(user.role)) {
      const { costPrice: _c, ...rest } = base;
      return rest;
    }
    return base;
  });
  return NextResponse.json({
    id: product.id,
    catalogSlug: product.catalogSlug,
    name: product.name,
    brand: product.brand,
    description: product.description,
    categoryId: product.categoryId,
    shape: product.shape,
    material: product.material,
    frameType: product.frameType,
    lensWidth: product.lensWidth,
    noseBridge: product.noseBridge,
    templeLength: product.templeLength,
    newArrival: product.newArrival,
    topSeller: product.topSeller,
    rating: product.rating,
    reviewCount: product.reviewCount,
    isActive: product.isActive,
    isPublished: product.isPublished,
    variants,
  });
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await gate(request);
  if (!user) return res!;
  const { id } = await ctx.params;
  const product = await db.product.findFirst({ where: { OR: [{ id }, { catalogSlug: id }] } });
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = (await request.json()) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  const str = (k: string) => (typeof body[k] === 'string' ? (body[k] as string).trim() : undefined);
  if (body.name != null) data.name = String(body.name).trim();
  if (body.brand != null) data.brand = str('brand') || null;
  if (body.description != null) data.description = str('description') || null;
  if (body.categoryId != null) data.categoryId = String(body.categoryId);
  if (body.shape != null) data.shape = String(body.shape);
  if (body.material != null) data.material = str('material') || null;
  if (body.frameType != null) data.frameType = str('frameType') || null;
  if (body.lensWidth != null) data.lensWidth = str('lensWidth') || null;
  if (body.noseBridge != null) data.noseBridge = str('noseBridge') || null;
  if (body.templeLength != null) data.templeLength = str('templeLength') || null;
  if (typeof body.newArrival === 'boolean') data.newArrival = body.newArrival;
  if (typeof body.topSeller === 'boolean') data.topSeller = body.topSeller;
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
  if (typeof body.isPublished === 'boolean') data.isPublished = body.isPublished;
  if (body.rating != null) data.rating = Number(body.rating);
  if (body.reviewCount != null) data.reviewCount = Number(body.reviewCount);
  if (body.catalogSlug != null) data.catalogSlug = String(body.catalogSlug).trim();
  await db.product.update({ where: { id: product.id }, data: data as object });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await gate(request);
  if (!user) return res!;
  const { id } = await ctx.params;
  const product = await db.product.findFirst({ where: { OR: [{ id }, { catalogSlug: id }] } });
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await db.product.delete({ where: { id: product.id } });
  return NextResponse.json({ ok: true });
}
