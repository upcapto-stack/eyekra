import { NextRequest, NextResponse } from 'next/server';
import { PurchaseOrderStatus } from '@prisma/client';
import { db } from '@/core/api/db';
import { isStaffOrAdmin, requireSessionUser } from '@/core/api/server/authz';

async function gate(request: NextRequest) {
  const user = await requireSessionUser(request);
  if (!user || !isStaffOrAdmin(user.role)) {
    return { user: null, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { user, res: null as NextResponse | null };
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { res } = await gate(request);
  if (res) return res;
  const { id } = await ctx.params;
  const body = (await request.json()) as { status?: string };
  if (!body?.status) return NextResponse.json({ error: 'status required' }, { status: 400 });
  const u = String(body.status).toUpperCase();
  const status =
    u === 'SENT'
      ? PurchaseOrderStatus.SENT
      : u === 'PARTIAL'
        ? PurchaseOrderStatus.PARTIAL
        : u === 'RECEIVED'
          ? PurchaseOrderStatus.RECEIVED
          : u === 'CANCELLED'
            ? PurchaseOrderStatus.CANCELLED
            : PurchaseOrderStatus.DRAFT;
  await db.purchaseOrder.update({ where: { id }, data: { status } });
  return NextResponse.json({ ok: true });
}
