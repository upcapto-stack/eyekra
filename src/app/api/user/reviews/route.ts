import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSessionUser } from '@/lib/server/authz';

export async function GET(request: NextRequest) {
  const user = await requireSessionUser(request);
  if (!user) return NextResponse.json({ reviews: [] }, { status: 401 });
  const reviews = await db.review.findMany({ where: { userId: user.id }, orderBy: { updatedAt: 'desc' } });
  return NextResponse.json({ reviews });
}

export async function PUT(request: NextRequest) {
  const user = await requireSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const reviews = Array.isArray(body?.reviews) ? body.reviews : [];
  await db.$transaction([
    db.review.deleteMany({ where: { userId: user.id } }),
    ...reviews.map((review: Record<string, unknown>) =>
      db.review.create({
        data: {
          userId: user.id,
          productId: String(review.productId ?? ''),
          rating: Number(review.rating ?? 0),
          title: review.title ? String(review.title) : null,
          body: review.body ? String(review.body) : null,
        },
      })
    ),
  ]);
  const saved = await db.review.findMany({ where: { userId: user.id }, orderBy: { updatedAt: 'desc' } });
  return NextResponse.json({ reviews: saved });
}
