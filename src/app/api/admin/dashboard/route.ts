import { NextRequest, NextResponse } from 'next/server';
import { OrderStatus, UserRole } from '@prisma/client';
import { db } from '@/core/api/db';
import { isStaffOrAdmin, requireSessionUser } from '@/core/api/server/authz';

export async function GET(request: NextRequest) {
  const user = await requireSessionUser(request);
  if (!user || !isStaffOrAdmin(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const since30 = new Date(Date.now() - 30 * 86400000);

  const [orderCount, customerCount, revenueAgg, productCount, variantCount, lensCount, invItems, recentLines] =
    await Promise.all([
      db.order.count(),
      db.user.count({ where: { role: UserRole.CUSTOMER } }),
      db.order.aggregate({ _sum: { total: true } }),
      db.product.count({ where: { isActive: true } }),
      db.productVariant.count({ where: { isActive: true } }),
      db.lensBlank.count({ where: { isActive: true } }),
      db.inventoryItem.findMany({
        include: {
          warehouse: { select: { code: true } },
          variant: { include: { product: true } },
          lensBlank: true,
        },
      }),
      db.orderLine.findMany({
        where: {
          order: {
            createdAt: { gte: since30 },
            status: { notIn: [OrderStatus.CANCELLED] },
          },
          variantId: { not: null },
        },
        select: { variantId: true, quantity: true, unitPrice: true },
      }),
    ]);

  // Aggregate per-SKU across all warehouses so a SKU with stock in one
  // warehouse and zero in another isn't counted as out-of-stock.
  type SkuAgg = {
    key: string;
    kind: 'variant' | 'lens';
    sku: string;
    name: string;
    onHand: number;
    reserved: number;
    reorderPoint: number;
    variantRef?: (typeof invItems)[number]['variant'];
    lensRef?: (typeof invItems)[number]['lensBlank'];
  };
  const skuAgg = new Map<string, SkuAgg>();
  for (const i of invItems) {
    if (i.variantId && i.variant) {
      const k = `v:${i.variantId}`;
      const existing = skuAgg.get(k);
      if (existing) {
        existing.onHand += i.onHandQty;
        existing.reserved += i.reservedQty;
        existing.reorderPoint = Math.max(existing.reorderPoint, i.reorderPoint);
      } else {
        skuAgg.set(k, {
          key: k,
          kind: 'variant',
          sku: i.variant.sku,
          name: `${i.variant.product?.name ?? ''} — ${i.variant.colorName}`.trim(),
          onHand: i.onHandQty,
          reserved: i.reservedQty,
          reorderPoint: i.reorderPoint,
          variantRef: i.variant,
        });
      }
    } else if (i.lensBlankId && i.lensBlank) {
      const k = `l:${i.lensBlankId}`;
      const existing = skuAgg.get(k);
      if (existing) {
        existing.onHand += i.onHandQty;
        existing.reserved += i.reservedQty;
        existing.reorderPoint = Math.max(existing.reorderPoint, i.reorderPoint);
      } else {
        skuAgg.set(k, {
          key: k,
          kind: 'lens',
          sku: i.lensBlank.legacyLensId ?? i.lensBlank.id,
          name: i.lensBlank.name,
          onHand: i.onHandQty,
          reserved: i.reservedQty,
          reorderPoint: i.reorderPoint,
          lensRef: i.lensBlank,
        });
      }
    }
  }
  const skuList = Array.from(skuAgg.values());
  const availableOf = (s: SkuAgg) => s.onHand - s.reserved;

  const lowStock = skuList.filter((s) => availableOf(s) <= s.reorderPoint);
  const outOfStock = skuList.filter((s) => availableOf(s) <= 0);

  const qtyByVariant = new Map<string, number>();
  for (const ln of recentLines) {
    if (!ln.variantId) continue;
    qtyByVariant.set(ln.variantId, (qtyByVariant.get(ln.variantId) ?? 0) + ln.quantity);
  }
  const topMovers = Array.from(qtyByVariant.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([variantId, unitsSold30d]) => ({ variantId, unitsSold30d }));

  let marginPctAgg = 0;
  let marginWeight = 0;
  for (const ln of recentLines) {
    if (!ln.variantId) continue;
    const v = skuAgg.get(`v:${ln.variantId}`)?.variantRef;
    if (!v) continue;
    const cost = Number(v.costPrice);
    const sell = Number(v.sellingPrice);
    if (sell > 0) {
      const m = ((sell - cost) / sell) * 100;
      marginPctAgg += m * ln.quantity;
      marginWeight += ln.quantity;
    }
  }
  const avgMarginPct30d = marginWeight > 0 ? marginPctAgg / marginWeight : null;

  const reorderWeek = skuList
    .map((s) => {
      const av = availableOf(s);
      const sold = s.kind === 'variant' && s.variantRef ? (qtyByVariant.get(s.variantRef.id) ?? 0) : 0;
      const avgDaily = sold / 30;
      const daysOfCover = avgDaily > 0 ? av / avgDaily : av > 0 ? 999 : 0;
      return {
        sku: s.sku,
        name: s.name,
        available: av,
        reorderPoint: s.reorderPoint,
        daysOfCover: Math.round(daysOfCover * 10) / 10,
      };
    })
    .sort((a, b) => a.daysOfCover - b.daysOfCover)
    .slice(0, 20);

  const deadStock = skuList.filter((s) => {
    if (s.kind !== 'variant' || availableOf(s) <= 0 || !s.variantRef) return false;
    const sold = qtyByVariant.get(s.variantRef.id) ?? 0;
    return sold === 0;
  }).length;

  return NextResponse.json({
    stats: {
      orderCount,
      customerCount,
      totalRevenue: revenueAgg._sum.total ?? 0,
      productCount,
      variantCount,
      lensBlankCount: lensCount,
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
      deadStockSkusApprox: deadStock,
      avgMarginPct30d: avgMarginPct30d != null ? Math.round(avgMarginPct30d * 10) / 10 : null,
    },
    lowStock: lowStock.slice(0, 25).map((s) => ({
      sku: s.sku,
      name: s.name,
      available: availableOf(s),
      reorderPoint: s.reorderPoint,
    })),
    topMovers,
    reorderThisWeek: reorderWeek,
  });
}
