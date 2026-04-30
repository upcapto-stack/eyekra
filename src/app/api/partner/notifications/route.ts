import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePartnerUser } from '@/lib/server/partner/auth';

export async function GET(request: NextRequest) {
  const partner = await requirePartnerUser(request);
  if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') ?? 20) || 20, 50);
  const notifications = await db.notification.findMany({
    where: { userId: partner.id },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  const unreadCount = await db.notification.count({ where: { userId: partner.id, isRead: false } });
  return NextResponse.json({ notifications, unreadCount });
}
