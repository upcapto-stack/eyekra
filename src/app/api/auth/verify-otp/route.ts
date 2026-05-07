import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { db } from '@/core/api/db';
import { consumeOtp } from '@/core/api/server/otp';
import { createSession, sessionCookieValue } from '@/core/api/server/session';
import { createUserNotification } from '@/core/api/server/notifications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const mobile = String(body?.mobile ?? '').replace(/\D/g, '').slice(-10);
    const code = String(body?.code ?? '').replace(/\D/g, '').slice(0, 6);
    const purpose = String(body?.purpose ?? 'login');
    const name = String(body?.name ?? '').trim();
    const email = String(body?.email ?? '').trim().toLowerCase() || null;
    const password = String(body?.password ?? '');

    if (mobile.length !== 10 || code.length !== 6) {
      return NextResponse.json({ error: 'Mobile and OTP are required' }, { status: 400 });
    }

    const valid = await consumeOtp(mobile, purpose, code);
    if (!valid) return NextResponse.json({ error: 'Invalid OTP' }, { status: 401 });

    let user = await db.user.findUnique({ where: { mobile } });
    if (!user) {
      user = await db.user.create({
        data: {
          mobile,
          name: name || 'Customer',
          email,
          role: UserRole.CUSTOMER,
          isVerified: true,
          ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
        },
      });
    } else {
      user = await db.user.update({
        where: { id: user.id },
        data: {
          isVerified: true,
          ...(name ? { name } : {}),
          ...(email ? { email } : {}),
          ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
        },
      });
    }

    const token = await createSession(user.id);
    await createUserNotification({
      userId: user.id,
      type: 'otp',
      title: 'OTP verified',
      message: 'Your OTP has been verified and you are signed in.',
      data: { purpose },
    }).catch(() => undefined);
    const response = NextResponse.json({
      user: { id: user.id, name: user.name, mobile: user.mobile, email: user.email, role: user.role },
    });
    response.headers.set('Set-Cookie', sessionCookieValue(token));
    return response;
  } catch (e) {
    console.error('verify-otp error', e);
    return NextResponse.json({ error: 'Failed to verify OTP' }, { status: 500 });
  }
}
