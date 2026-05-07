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

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { res } = await gate(request);
  if (res) return res;
  const { id } = await ctx.params;
  const body = (await request.json()) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (body.name != null) data.name = String(body.name).trim();
  if (body.addressLine !== undefined) data.addressLine = body.addressLine ? String(body.addressLine) : null;
  if (body.city !== undefined) data.city = body.city ? String(body.city) : null;
  if (body.state !== undefined) data.state = body.state ? String(body.state) : null;
  if (body.pincode !== undefined) data.pincode = body.pincode ? String(body.pincode) : null;
  if (body.gstin !== undefined) data.gstin = body.gstin ? String(body.gstin) : null;
  if (body.managerName !== undefined) data.managerName = body.managerName ? String(body.managerName) : null;
  if (body.managerPhone !== undefined) data.managerPhone = body.managerPhone ? String(body.managerPhone) : null;
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
  if (body.kind != null) {
    const k = String(body.kind).toUpperCase();
    data.kind =
      k === 'WAREHOUSE' ? WarehouseKind.WAREHOUSE : k === 'LAB' ? WarehouseKind.LAB : WarehouseKind.BOTH;
  }
  await db.warehouse.update({ where: { id }, data: data as object }).catch(() => null);
  return NextResponse.json({ ok: true });
}
