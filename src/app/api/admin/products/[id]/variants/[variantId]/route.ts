import { NextRequest, NextResponse } from 'next/server';
import { ProductVariantDisplayType } from '@prisma/client';
import { db } from '@/core/api/db';
import { isStaffOrAdmin, requireSessionUser } from '@/core/api/server/authz';

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

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string; variantId: string }> }) {
  const { user, res } = await gate(request);
  if (!user) return res!;
  const { id, variantId } = await ctx.params;
  const productId = await resolveProductId(id);
  if (!productId) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  const variant = await db.productVariant.findFirst({
    where: { id: variantId, productId },
  });
  if (!variant) return NextResponse.json({ error: 'Variant not found' }, { status: 404 });

  const body = (await request.json()) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (body.colorName != null) data.colorName = String(body.colorName).trim();
  if (body.displayPayload !== undefined) data.displayPayload = body.displayPayload as object | null;
  if (body.barcode !== undefined) data.barcode = body.barcode ? String(body.barcode) : null;
  if (body.costPrice != null) data.costPrice = Number(body.costPrice);
  if (body.mrp != null) data.mrp = Number(body.mrp);
  if (body.sellingPrice != null) data.sellingPrice = Number(body.sellingPrice);
  if (body.taxRate != null) data.taxRate = Number(body.taxRate);
  if (body.hsnCode != null) data.hsnCode = String(body.hsnCode).trim();
  if (body.weightG !== undefined) data.weightG = body.weightG == null ? null : Number(body.weightG);
  if (body.reorderPoint != null) data.reorderPoint = Number(body.reorderPoint);
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
  if (body.displayType != null && String(body.displayType) in ProductVariantDisplayType) {
    data.displayType = ProductVariantDisplayType[String(body.displayType) as keyof typeof ProductVariantDisplayType];
  }
  if (body.sku != null) data.sku = String(body.sku).trim();

  await db.productVariant.update({ where: { id: variant.id }, data: data as object });

  if (body.reorderPoint != null) {
    await db.inventoryItem.updateMany({
      where: { variantId: variant.id },
      data: { reorderPoint: Number(body.reorderPoint) },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string; variantId: string }> }) {
  const { user, res } = await gate(request);
  if (!user) return res!;
  const { id, variantId } = await ctx.params;
  const productId = await resolveProductId(id);
  if (!productId) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  const variant = await db.productVariant.findFirst({
    where: { id: variantId, productId },
  });
  if (!variant) return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
  await db.productVariant.delete({ where: { id: variant.id } });
  return NextResponse.json({ ok: true });
}
