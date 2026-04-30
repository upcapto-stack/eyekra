import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { db } from '@/lib/db';
import { createSession, sessionCookieValue } from '@/lib/server/session';
import { limitRequest } from '@/lib/server/rate-limit';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const allowed = await limitRequest(`partner-signup:${ip}`, 10, 60);
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  try {
    const body = await request.json();
    const name = String(body?.name ?? '').trim();
    const mobile = String(body?.mobile ?? '').replace(/\D/g, '').slice(-10);
    const email = String(body?.email ?? '').trim().toLowerCase();
    const password = String(body?.password ?? '');

    if (name.length < 2) {
      return NextResponse.json({ error: 'Partner name is required' }, { status: 400 });
    }
    if (mobile.length !== 10) {
      return NextResponse.json({ error: 'Valid 10-digit mobile number is required' }, { status: 400 });
    }
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const existingByMobile = await db.user.findUnique({ where: { mobile } });
    if (existingByMobile) {
      return NextResponse.json({ error: 'Mobile is already registered' }, { status: 409 });
    }
    const existingByEmail = await db.user.findUnique({ where: { email } });
    if (existingByEmail) {
      return NextResponse.json({ error: 'Email is already registered' }, { status: 409 });
    }

    const user = await db.user.create({
      data: {
        name,
        mobile,
        email,
        passwordHash: await bcrypt.hash(password, 10),
        role: UserRole.STAFF,
        isVerified: true,
      },
    });

    const token = await createSession(user.id);
    const response = NextResponse.json({
      user: { id: user.id, name: user.name, mobile: user.mobile, email: user.email, role: user.role },
    });
    response.headers.set('Set-Cookie', sessionCookieValue(token));
    return response;
  } catch (error) {
    console.error('partner signup error', error);
    return NextResponse.json({ error: 'Failed to create partner account' }, { status: 500 });
  }
}
