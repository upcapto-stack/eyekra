import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/api/db';
import { isAdmin, isStaffOrAdmin, requireSessionUser } from '@/core/api/server/authz';
import { aggregateInventory } from '@/core/api/server/inventory-aggregate';

async function requireAdminCatalogUser(request: NextRequest) {
  const user = await requireSessionUser(request);
  if (!user || !isStaffOrAdmin(user.role)) {
    return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { user, error: null as NextResponse | null };
}

export async function GET(request: NextRequest) {
  const { user, error } = await requireAdminCatalogUser(request);
  if (error || !user) return error!;
  const products = await db.product.findMany({
    orderBy: { updatedAt: 'desc' },
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
  const mapped = products.map((p) => {
    const variants = p.variants.map((v) => {
      const agg = aggregateInventory(v.inventoryItems);
      const row: Record<string, unknown> = {
        id: v.id,
        sku: v.sku,
        displayType: v.displayType,
        colorName: v.colorName,
        displayPayload: v.displayPayload,
        barcode: v.barcode,
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
      if (isAdmin(user.role)) row.costPrice = Number(v.costPrice);
      return row;
    });
    return {
      id: p.id,
      catalogSlug: p.catalogSlug,
      name: p.name,
      brand: p.brand,
      description: p.description,
      categoryId: p.categoryId,
      shape: p.shape,
      material: p.material,
      frameType: p.frameType,
      lensWidth: p.lensWidth,
      noseBridge: p.noseBridge,
      templeLength: p.templeLength,
      newArrival: p.newArrival,
      topSeller: p.topSeller,
      rating: p.rating,
      reviewCount: p.reviewCount,
      isActive: p.isActive,
      isPublished: p.isPublished,
      variants,
    };
  });
  return NextResponse.json({ products: mapped });
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireAdminCatalogUser(request);
  if (error || !user) return error!;
  try {
    const body = (await request.json()) as {
      catalogSlug: string;
      name: string;
      brand?: string;
      description?: string;
      categoryId: string;
      shape: string;
      material?: string;
      frameType?: string;
      lensWidth?: string;
      noseBridge?: string;
      templeLength?: string;
      newArrival?: boolean;
      topSeller?: boolean;
      rating?: number;
      reviewCount?: number;
      isPublished?: boolean;
    };
    if (!body?.catalogSlug?.trim() || !body?.name?.trim() || !body?.categoryId || !body?.shape) {
      return NextResponse.json({ error: 'catalogSlug, name, categoryId, shape required' }, { status: 400 });
    }
    const product = await db.product.create({
      data: {
        catalogSlug: body.catalogSlug.trim(),
        name: body.name.trim(),
        brand: body.brand?.trim() || 'Eyekra',
        description: body.description?.trim() || null,
        categoryId: body.categoryId,
        shape: body.shape,
        material: body.material?.trim() || null,
        frameType: body.frameType?.trim() || null,
        lensWidth: body.lensWidth?.trim() || null,
        noseBridge: body.noseBridge?.trim() || null,
        templeLength: body.templeLength?.trim() || null,
        newArrival: !!body.newArrival,
        topSeller: !!body.topSeller,
        rating: body.rating,
        reviewCount: body.reviewCount,
        isPublished: body.isPublished !== false,
      },
    });
    return NextResponse.json({ productId: product.id });
  } catch (e: unknown) {
    const msg = e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2002'
      ? 'Duplicate catalogSlug or SKU'
      : 'Failed to create product';
    console.error(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
