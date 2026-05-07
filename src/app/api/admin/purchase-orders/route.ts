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

async function nextPoNumber(): Promise<string> {
  const y = new Date().getFullYear();
  const n = await db.purchaseOrder.count({ where: { poNumber: { startsWith: `PO-${y}-` } } });
  return `PO-${y}-${String(n + 1).padStart(5, '0')}`;
}

export async function GET(request: NextRequest) {
  const { res } = await gate(request);
  if (res) return res;
  const pos = await db.purchaseOrder.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { supplier: true, warehouse: true, lines: true },
  });
  return NextResponse.json({ purchaseOrders: pos });
}

export async function POST(request: NextRequest) {
  const { user, res } = await gate(request);
  if (!user || res) return res!;
  const body = (await request.json()) as {
    supplierId: string;
    warehouseId: string;
    expectedAt?: string;
    lines: { variantId?: string; lensBlankId?: string; qty: number; unitCost: number; taxRate?: number }[];
  };
  if (!body?.supplierId || !body?.warehouseId || !Array.isArray(body.lines) || body.lines.length === 0) {
    return NextResponse.json({ error: 'supplierId, warehouseId, lines required' }, { status: 400 });
  }
  const poNumber = await nextPoNumber();
  let subtotal = 0;
  for (const ln of body.lines) {
    const lineTotal = Number(ln.unitCost) * Number(ln.qty);
    subtotal += lineTotal;
  }
  const po = await db.purchaseOrder.create({
    data: {
      poNumber,
      supplierId: body.supplierId,
      warehouseId: body.warehouseId,
      status: PurchaseOrderStatus.DRAFT,
      expectedAt: body.expectedAt ? new Date(body.expectedAt) : null,
      subtotal,
      taxTotal: 0,
      total: subtotal,
      createdById: user.id,
      lines: {
        create: body.lines.map((ln) => ({
          variantId: ln.variantId ?? null,
          lensBlankId: ln.lensBlankId ?? null,
          qty: Math.max(1, Math.floor(Number(ln.qty))),
          unitCost: ln.unitCost,
          taxRate: ln.taxRate ?? 18,
          lineTotal: Number(ln.unitCost) * Math.max(1, Math.floor(Number(ln.qty))),
        })),
      },
    },
  });
  return NextResponse.json({ id: po.id, poNumber: po.poNumber });
}
