import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/api/db';
import { requireSessionUser } from '@/core/api/server/authz';

export async function GET(request: NextRequest) {
  const user = await requireSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limitRaw = Number(request.nextUrl.searchParams.get('limit') ?? 50);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 50;

  try {
    const [items, unreadCount] = await Promise.all([
      db.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      db.notification.count({ where: { userId: user.id, isRead: false } }),
    ]);
    return NextResponse.json({ items, unreadCount });
  } catch (e) {
    console.error('Notifications read error', e);
    return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await requireSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const id = typeof body?.id === 'string' ? body.id.trim() : '';
    const markAll = body?.all === true;

    if (markAll) {
      await db.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
      return NextResponse.json({ ok: true });
    }

    if (!id) return NextResponse.json({ error: 'id required or all=true' }, { status: 400 });
    await db.notification.updateMany({
      where: { id, userId: user.id },
      data: { isRead: true, readAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Notifications update error', e);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}
