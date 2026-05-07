import { NextRequest, NextResponse } from 'next/server';
import { StockMovementType } from '@prisma/client';
import { db } from '@/core/api/db';
import { isStaffOrAdmin, requireSessionUser } from '@/core/api/server/authz';
import { applyStockMovement } from '@/core/api/server/inventory';

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
    lines: { variantId?: string; lensBlankId?: string; qty: number; unitCost: number }[];
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

  await db.$transaction(async (tx) => {
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
      await tx.goodsReceiptLine.create({
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
      }
    }
  });

  return NextResponse.json({ grnNumber });
}
