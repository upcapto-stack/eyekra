import { NextRequest, NextResponse } from 'next/server';
import { StockMovementType } from '@prisma/client';
import { db } from '@/core/api/db';
import { isStaffOrAdmin, requireSessionUser } from '@/core/api/server/authz';
import { applyStockMovement } from '@/core/api/server/inventory';
import { createStockUnitsForGrn } from '@/core/api/server/stock-units';

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
  const list = await db.goodsReceipt.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { warehouse: true, lines: true },
  });
  return NextResponse.json({ goodsReceipts: list });
}

async function nextGrnNumber(): Promise<string> {
  const y = new Date().getFullYear();
  const n = await db.goodsReceipt.count({ where: { grnNumber: { startsWith: `GRN-${y}-` } } });
  return `GRN-${y}-${String(n + 1).padStart(5, '0')}`;
}

export async function POST(request: NextRequest) {
  const { user, res } = await gate(request);
  if (!user || res) return res!;
  const body = (await request.json()) as {
    warehouseId: string;
    poId?: string | null;
    vendorInvoiceNo?: string;
    vendorBatchNo?: string;
    lines: {
      variantId?: string;
      lensBlankId?: string;
      qty: number;
      unitCost: number;
      /** If true (default for frames), one trackable StockUnit row is created per piece. */
      serialize?: boolean;
    }[];
  };
  if (!body?.warehouseId || !Array.isArray(body.lines) || body.lines.length === 0) {
    return NextResponse.json({ error: 'warehouseId and lines required' }, { status: 400 });
  }
  const grnNumber = await nextGrnNumber();

  const sortedLines = [...body.lines].sort((a, b) => {
    const ka = `v:${a.variantId ?? ''}|l:${a.lensBlankId ?? ''}`;
    const kb = `v:${b.variantId ?? ''}|l:${b.lensBlankId ?? ''}`;
    return ka.localeCompare(kb);
  });

  // Pre-fetch SKU prefixes outside the transaction (faster)
  const variantIds = sortedLines.map((l) => l.variantId).filter(Boolean) as string[];
  const lensIds = sortedLines.map((l) => l.lensBlankId).filter(Boolean) as string[];
  const [variants, lensBlanks] = await Promise.all([
    variantIds.length > 0
      ? db.productVariant.findMany({ where: { id: { in: variantIds } }, select: { id: true, sku: true } })
      : Promise.resolve([]),
    lensIds.length > 0
      ? db.lensBlank.findMany({
          where: { id: { in: lensIds } },
          select: { id: true, legacyLensId: true, name: true },
        })
      : Promise.resolve([]),
  ]);
  const skuByVariantId = new Map(variants.map((v) => [v.id, v.sku]));
  const skuByLensId = new Map(lensBlanks.map((l) => [l.id, l.legacyLensId ?? l.name.replace(/\s+/g, '_').toUpperCase().slice(0, 12)]));

  const totalUnits = sortedLines.reduce((s, l) => s + Math.max(1, Math.floor(Number(l.qty))), 0);
  const serializedTotal = sortedLines
    .filter((l) => l.variantId && l.serialize !== false)
    .reduce((s, l) => s + Math.max(1, Math.floor(Number(l.qty))), 0);
  // Generous timeout: each unit insert + event ~5ms, plus inventory updates.
  const txTimeoutMs = Math.max(15000, 50 + serializedTotal * 30 + totalUnits * 5);

  const createdSerials: string[] = [];

  await db.$transaction(
    async (tx) => {
      const grn = await tx.goodsReceipt.create({
        data: {
          grnNumber,
          poId: body.poId?.trim() || null,
          warehouseId: body.warehouseId,
          vendorInvoiceNo: body.vendorInvoiceNo?.trim() || null,
          receivedById: user.id,
        },
      });
      for (const ln of sortedLines) {
        const qty = Math.max(1, Math.floor(Number(ln.qty)));
        const grnLine = await tx.goodsReceiptLine.create({
          data: {
            grnId: grn.id,
            variantId: ln.variantId ?? null,
            lensBlankId: ln.lensBlankId ?? null,
            qty,
            unitCost: ln.unitCost,
          },
        });
        if (ln.variantId) {
          await applyStockMovement(tx, {
            warehouseId: body.warehouseId,
            variantId: ln.variantId,
            type: StockMovementType.GRN,
            qty,
            refType: 'grn',
            refId: grn.id,
            costSnapshot: ln.unitCost,
            createdById: user.id,
          });
          // Default: serialize frames (per-piece tracking for try-on / theft prevention)
          const shouldSerialize = ln.serialize !== false;
          if (shouldSerialize) {
            const skuPrefix = skuByVariantId.get(ln.variantId) ?? 'EYK';
            const ids = await createStockUnitsForGrn(tx, {
              qty,
              variantId: ln.variantId,
              lensBlankId: null,
              skuPrefix,
              warehouseId: body.warehouseId,
              costPrice: ln.unitCost,
              grnLineId: grnLine.id,
              vendorBatchNo: body.vendorBatchNo?.trim() || null,
              createdById: user.id,
            });
            createdSerials.push(...ids);
          }
        } else if (ln.lensBlankId) {
          await applyStockMovement(tx, {
            warehouseId: body.warehouseId,
            lensBlankId: ln.lensBlankId,
            type: StockMovementType.GRN,
            qty,
            refType: 'grn',
            refId: grn.id,
            costSnapshot: ln.unitCost,
            createdById: user.id,
          });
          // Lens blanks are typically consumables (cut to size during fitting), so
          // per-piece tracking is opt-in via serialize=true.
          if (ln.serialize === true) {
            const skuPrefix = skuByLensId.get(ln.lensBlankId) ?? 'LENS';
            const ids = await createStockUnitsForGrn(tx, {
              qty,
              variantId: null,
              lensBlankId: ln.lensBlankId,
              skuPrefix,
              warehouseId: body.warehouseId,
              costPrice: ln.unitCost,
              grnLineId: grnLine.id,
              vendorBatchNo: body.vendorBatchNo?.trim() || null,
              createdById: user.id,
            });
            createdSerials.push(...ids);
          }
        }
      }
    },
    { timeout: txTimeoutMs },
  );

  return NextResponse.json({ grnNumber, unitsCreated: createdSerials.length });
}
