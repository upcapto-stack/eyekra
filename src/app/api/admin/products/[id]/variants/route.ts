import { NextRequest, NextResponse } from 'next/server';
import { ProductVariantDisplayType } from '@prisma/client';
import { db } from '@/core/api/db';
import { isStaffOrAdmin, requireSessionUser } from '@/core/api/server/authz';
import { aggregateInventory } from '@/core/api/server/inventory-aggregate';

async function gate(request: NextRequest) {
  const user = await requireSessionUser(request);
  if (!user || !isStaffOrAdmin(user.role)) {
    return { user: null, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { user, res: null as NextResponse | null };
}

async function resolveProductId(id: string) {
  const product = await db.product.findFirst({ where: { OR: [{ id }, { catalogSlug: id }] } });
  return product?.id ?? null;
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await gate(request);
  if (!user) return res!;
  const { id } = await ctx.params;
  const productId = await resolveProductId(id);
  if (!productId) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  const variants = await db.productVariant.findMany({
    where: { productId },
    orderBy: { sku: 'asc' },
    include: {
      inventoryItems: {
        include: { warehouse: { select: { id: true, code: true, name: true } } },
      },
    },
  });
  const mapped = variants.map((v) => {
    const agg = aggregateInventory(v.inventoryItems);
    return {
      ...v,
      onHandQty: agg.onHand,
      reservedQty: agg.reserved,
      availableQty: agg.available,
      lowStock: agg.lowStock,
      inventoryByWarehouse: agg.byWarehouse,
    };
  });
  return NextResponse.json({ variants: mapped });
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await gate(request);
  if (!user) return res!;
  const { id } = await ctx.params;
  const productId = await resolveProductId(id);
  if (!productId) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  const body = (await request.json()) as {
    sku: string;
    colorName: string;
    displayType?: string;
    displayPayload?: object | null;
    costPrice: number;
    mrp: number;
    sellingPrice: number;
    taxRate?: number;
    hsnCode?: string;
    weightG?: number | null;
    reorderPoint?: number;
  };
  if (!body?.sku?.trim() || !body?.colorName?.trim()) {
    return NextResponse.json({ error: 'sku and colorName required' }, { status: 400 });
  }
  const rawDt = String(body.displayType || 'SOLID').toUpperCase();
  const displayType =
    rawDt === 'GRADIENT'
      ? ProductVariantDisplayType.GRADIENT
      : rawDt === 'MULTI'
        ? ProductVariantDisplayType.MULTI
        : rawDt === 'PATTERN'
          ? ProductVariantDisplayType.PATTERN
          : ProductVariantDisplayType.SOLID;

  const variant = await db.productVariant.create({
    data: {
      productId,
      sku: body.sku.trim(),
      displayType,
      colorName: body.colorName.trim(),
      displayPayload: body.displayPayload === undefined ? undefined : (body.displayPayload as object),
      costPrice: body.costPrice ?? 0,
      mrp: body.mrp ?? body.sellingPrice ?? 0,
      sellingPrice: body.sellingPrice ?? 0,
      taxRate: body.taxRate ?? 18,
      hsnCode: body.hsnCode?.trim() || '9004',
      weightG: body.weightG ?? undefined,
      reorderPoint: body.reorderPoint ?? 5,
    },
  });

  // Pre-create zero-quantity inventory rows in every active warehouse so the
  // dashboards and listings show the SKU immediately, even before any GRN.
  const warehouses = await db.warehouse.findMany({
    where: { isActive: true },
    select: { id: true },
  });
  if (warehouses.length > 0) {
    await db.inventoryItem.createMany({
      data: warehouses.map((w) => ({
        warehouseId: w.id,
        variantId: variant.id,
        onHandQty: 0,
        reservedQty: 0,
        reorderPoint: variant.reorderPoint,
      })),
      skipDuplicates: true,
    });
  }
  return NextResponse.json({ variantId: variant.id });
}
