import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSessionUser } from '@/lib/server/authz';

export async function GET(request: NextRequest) {
  const user = await requireSessionUser(request);
  if (!user) return NextResponse.json({ items: [] }, { status: 401 });
  const items = await db.cartItem.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ items });
}

export async function PUT(request: NextRequest) {
  const user = await requireSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const items = Array.isArray(body?.items) ? body.items : [];
  await db.$transaction([
    db.cartItem.deleteMany({ where: { userId: user.id } }),
    ...items.map((item: Record<string, unknown>) =>
      db.cartItem.create({
        data: {
          userId: user.id,
          productId: String(item.productId ?? ''),
          productName: String(item.productName ?? ''),
          productPrice: String(item.productPrice ?? ''),
          lensId: item.lensId ? String(item.lensId) : null,
          lensName: item.lensName ? String(item.lensName) : null,
          lensPrice: item.lensPrice != null ? Number(item.lensPrice) : null,
          quantity: Number(item.quantity ?? 1),
          lineTotal: Number(item.lineTotal ?? 0),
          metadata: JSON.parse(JSON.stringify(item)),
        },
      })
    ),
  ]);
  const saved = await db.cartItem.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ items: saved });
}
