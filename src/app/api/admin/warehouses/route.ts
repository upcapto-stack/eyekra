import { NextRequest, NextResponse } from 'next/server';
import { WarehouseKind } from '@prisma/client';
import { db } from '@/core/api/db';
import { isStaffOrAdmin, requireSessionUser } from '@/core/api/server/authz';

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
  const list = await db.warehouse.findMany({ orderBy: { code: 'asc' } });
  return NextResponse.json({ warehouses: list });
}

export async function POST(request: NextRequest) {
  const { res } = await gate(request);
  if (res) return res;
  const body = (await request.json()) as {
    code: string;
    name: string;
    kind?: string;
    addressLine?: string;
    city?: string;
    state?: string;
    pincode?: string;
    gstin?: string;
    managerName?: string;
    managerPhone?: string;
  };
  if (!body?.code?.trim() || !body?.name?.trim()) {
    return NextResponse.json({ error: 'code and name required' }, { status: 400 });
  }
  const k = String(body.kind || 'BOTH').toUpperCase();
  const kind =
    k === 'WAREHOUSE' ? WarehouseKind.WAREHOUSE : k === 'LAB' ? WarehouseKind.LAB : WarehouseKind.BOTH;
  const w = await db.warehouse.create({
    data: {
      code: body.code.trim().toUpperCase(),
      name: body.name.trim(),
      kind,
      addressLine: body.addressLine?.trim() || null,
      city: body.city?.trim() || null,
      state: body.state?.trim() || null,
      pincode: body.pincode?.trim() || null,
      gstin: body.gstin?.trim() || null,
      managerName: body.managerName?.trim() || null,
      managerPhone: body.managerPhone?.trim() || null,
    },
  });
  return NextResponse.json({ id: w.id });
}
