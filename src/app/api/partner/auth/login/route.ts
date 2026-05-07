import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { db } from '@/core/api/db';
import { createSession, sessionCookieValue } from '@/core/api/server/session';
import { limitRequest } from '@/core/api/server/rate-limit';
import { resolvePartnerWarehouseAssignment, savePartnerWarehouseAssignment } from '@/core/api/server/partner/warehouse';

function isPartnerRole(role: UserRole): boolean {
  return role === UserRole.STAFF || role === UserRole.ADMIN;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const allowed = await limitRequest(`partner-login:${ip}`, 12, 60);
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  try {
    const body = await request.json();
    const identifier = String(body?.identifier ?? '').trim().toLowerCase();
    const password = String(body?.password ?? '');

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Email/mobile and password are required' }, { status: 400 });
    }

    const mobile = identifier.replace(/\D/g, '').slice(-10);
    const user = mobile.length === 10
      ? await db.user.findUnique({ where: { mobile } })
      : await db.user.findUnique({ where: { email: identifier } });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    if (!isPartnerRole(user.role)) {
      return NextResponse.json({ error: 'This account is not a partner account' }, { status: 403 });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    const assignment = await resolvePartnerWarehouseAssignment(user.id);
    await savePartnerWarehouseAssignment(user.id, assignment);

    const token = await createSession(user.id);
    const response = NextResponse.json({
      user: { id: user.id, name: user.name, mobile: user.mobile, email: user.email, role: user.role },
      warehouse: assignment,
    });
    response.headers.set('Set-Cookie', sessionCookieValue(token));
    return response;
  } catch (error) {
    console.error('partner login error', error);
    return NextResponse.json({ error: 'Failed to login' }, { status: 500 });
  }
}
