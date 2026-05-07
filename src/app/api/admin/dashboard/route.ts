import { NextRequest, NextResponse } from 'next/server';
import { OrderStatus, UserRole } from '@prisma/client';
import { db } from '@/core/api/db';
import { isStaffOrAdmin, requireSessionUser } from '@/core/api/server/authz';
import { getCentralWarehouse } from '@/core/api/server/warehouse';

export async function GET(request: NextRequest) {
  const user = await requireSessionUser(request);
  if (!user || !isStaffOrAdmin(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const since30 = new Date(Date.now() - 30 * 86400000);
  const central = await getCentralWarehouse();

  const [orderCount, customerCount, revenueAgg, productCount, variantCount, lensCount, invItems, recentLines] =
    await Promise.all([
      db.order.count(),
      db.user.count({ where: { role: UserRole.CUSTOMER } }),
      db.order.aggregate({ _sum: { total: true } }),
      db.product.count({ where: { isActive: true } }),
      db.productVariant.count({ where: { isActive: true } }),
      db.lensBlank.count({ where: { isActive: true } }),
      central
        ? db.inventoryItem.findMany({
            where: { warehouseId: central.id },
            include: {
              variant: { include: { product: true } },
              lensBlank: true,
            },
          })
        : Promise.resolve([]),
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

  const available = (i: { onHandQty: number; reservedQty: number }) => i.onHandQty - i.reservedQty;
  const lowStock = invItems.filter((i) => available(i) <= i.reorderPoint && (i.variantId || i.lensBlankId));
  const outOfStock = invItems.filter((i) => available(i) <= 0 && (i.variantId || i.lensBlankId));

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
    const v = invItems.find((x) => x.variantId === ln.variantId)?.variant;
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

  const reorderWeek = [...invItems]
    .filter((i) => i.variant?.product || i.lensBlank)
    .map((i) => {
      const av = available(i);
      const sold = i.variantId ? (qtyByVariant.get(i.variantId!) ?? 0) : 0;
      const avgDaily = sold / 30;
      const daysOfCover = avgDaily > 0 ? av / avgDaily : av > 0 ? 999 : 0;
      return {
        sku: i.variant?.sku ?? i.lensBlank?.name ?? i.id,
        available: av,
        reorderPoint: i.reorderPoint,
        daysOfCover: Math.round(daysOfCover * 10) / 10,
      };
    })
    .sort((a, b) => a.daysOfCover - b.daysOfCover)
    .slice(0, 20);

  const deadStock = invItems.filter((i) => {
    if (!i.variantId || available(i) <= 0) return false;
    const sold = qtyByVariant.get(i.variantId) ?? 0;
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
    lowStock: lowStock.slice(0, 25).map((i) => ({
      sku: i.variant?.sku ?? i.lensBlank?.legacyLensId ?? '',
      name: i.variant?.product?.name ?? i.lensBlank?.name ?? '',
      available: available(i),
      reorderPoint: i.reorderPoint,
    })),
    topMovers,
    reorderThisWeek: reorderWeek,
  });
}
