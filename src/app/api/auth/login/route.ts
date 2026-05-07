import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/core/api/db';
import { createSession, sessionCookieValue } from '@/core/api/server/session';
import { limitRequest } from '@/core/api/server/rate-limit';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const allowed = await limitRequest(`login:${ip}`, 12, 60);
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  try {
    const body = await request.json();
    const mobile = String(body?.mobile ?? '').replace(/\D/g, '').slice(-10);
    const password = String(body?.password ?? '');

    if (mobile.length !== 10 || !password) {
      return NextResponse.json({ error: 'Mobile and password are required' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { mobile } });
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    const token = await createSession(user.id);
    const response = NextResponse.json({
      user: { id: user.id, name: user.name, mobile: user.mobile, email: user.email, role: user.role },
    });
    response.headers.set('Set-Cookie', sessionCookieValue(token));
    return response;
  } catch (e) {
    console.error('login error', e);
    return NextResponse.json({ error: 'Failed to login' }, { status: 500 });
  }
}
