import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/api/db';
import { isStaffOrAdmin, requireSessionUser } from '@/core/api/server/authz';
import { applyStockAdjustment } from '@/core/api/server/inventory';

async function gate(request: NextRequest) {
  const user = await requireSessionUser(request);
  if (!user || !isStaffOrAdmin(user.role)) {
    return { user: null, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { user, res: null as NextResponse | null };
}

export async function POST(request: NextRequest) {
  const { user, res } = await gate(request);
  if (!user || res) return res!;
  const body = (await request.json()) as {
    warehouseId: string;
    variantId?: string;
    lensBlankId?: string;
    signedQty: number;
    note?: string;
  };
  if (!body?.warehouseId || body.signedQty === undefined || body.signedQty === null) {
    return NextResponse.json({ error: 'warehouseId and signedQty required' }, { status: 400 });
  }
  const hasV = !!body.variantId;
  const hasL = !!body.lensBlankId;
  if (hasV === hasL) {
    return NextResponse.json({ error: 'Exactly one of variantId or lensBlankId' }, { status: 400 });
  }
  await db.$transaction(async (tx) => {
    await applyStockAdjustment(tx, {
      warehouseId: body.warehouseId,
      variantId: body.variantId,
      lensBlankId: body.lensBlankId,
      signedQty: Number(body.signedQty),
      refType: 'adjustment',
      refId: `adj-${Date.now()}`,
      note: body.note ?? null,
      createdById: user.id,
    });
  });
  return NextResponse.json({ ok: true });
}
