import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/api/db';
import { requireSessionUser } from '@/core/api/server/authz';
import { getWebPushPublicKey } from '@/core/api/server/push';

export async function GET() {
  const publicKey = getWebPushPublicKey();
  return NextResponse.json({ publicKey, enabled: Boolean(publicKey) });
}

export async function POST(request: NextRequest) {
  const user = await requireSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const endpoint = String(body?.endpoint ?? '').trim();
    const p256dh = String(body?.keys?.p256dh ?? '').trim();
    const auth = String(body?.keys?.auth ?? '').trim();
    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: 'Invalid push subscription' }, { status: 400 });
    }
    await db.pushSubscription.upsert({
      where: { endpoint },
      update: { userId: user.id, p256dh, auth },
      create: { userId: user.id, endpoint, p256dh, auth },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Push subscribe error', e);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await requireSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json().catch(() => ({}));
    const endpoint = String(body?.endpoint ?? '').trim();
    if (!endpoint) return NextResponse.json({ error: 'endpoint required' }, { status: 400 });
    await db.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Push unsubscribe error', e);
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
  }
}
