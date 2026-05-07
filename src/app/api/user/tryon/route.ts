import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/api/db';
import { requireSessionUser } from '@/core/api/server/authz';

export async function GET(request: NextRequest) {
  const user = await requireSessionUser(request);
  if (!user) return NextResponse.json({ productIds: [] }, { status: 401 });
  const rows = await db.tryonItem.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ productIds: rows.map((row) => row.productId) });
}

export async function PUT(request: NextRequest) {
  const user = await requireSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const productIds = Array.isArray(body?.productIds) ? body.productIds.map((id: unknown) => String(id)) : [];
  await db.$transaction([
    db.tryonItem.deleteMany({ where: { userId: user.id } }),
    ...productIds.map((productId: string) =>
      db.tryonItem.create({ data: { userId: user.id, productId } })
    ),
  ]);
  return NextResponse.json({ productIds });
}
