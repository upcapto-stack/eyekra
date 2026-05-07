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

export async function GET(request: NextRequest) {
  const { res } = await gate(request);
  if (res) return res;
  const suppliers = await db.supplier.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json({ suppliers });
}

export async function POST(request: NextRequest) {
  const { res } = await gate(request);
  if (res) return res;
  const body = (await request.json()) as {
    name: string;
    gstin?: string;
    contactName?: string;
    contactPhone?: string;
    address?: string;
  };
  if (!body?.name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const s = await db.supplier.create({
    data: {
      name: body.name.trim(),
      gstin: body.gstin?.trim() || null,
      contactName: body.contactName?.trim() || null,
      contactPhone: body.contactPhone?.trim() || null,
      address: body.address?.trim() || null,
    },
  });
  return NextResponse.json({ id: s.id });
}
