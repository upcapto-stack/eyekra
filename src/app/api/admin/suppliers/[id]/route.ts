import { NextRequest, NextResponse } from 'next/server';
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
  if (body.gstin !== undefined) data.gstin = body.gstin ? String(body.gstin) : null;
  if (body.contactName !== undefined) data.contactName = body.contactName ? String(body.contactName) : null;
  if (body.contactPhone !== undefined) data.contactPhone = body.contactPhone ? String(body.contactPhone) : null;
  if (body.address !== undefined) data.address = body.address ? String(body.address) : null;
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
  await db.supplier.update({ where: { id }, data: data as object }).catch(() => null);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { res } = await gate(request);
  if (res) return res;
  const { id } = await ctx.params;
  await db.supplier.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
