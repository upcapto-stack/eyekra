import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { db } from '@/lib/db';
import { issueOtp } from '@/lib/server/otp';
import { limitRequest } from '@/lib/server/rate-limit';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const allowed = await limitRequest(`otp-send:${ip}`, 8, 60);
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  try {
    const body = await request.json();
    const mobile = String(body?.mobile ?? '').replace(/\D/g, '').slice(-10);
    const purpose = String(body?.purpose ?? 'login');
    const name = String(body?.name ?? '').trim();
    const email = String(body?.email ?? '').trim().toLowerCase() || null;

    if (mobile.length !== 10) {
      return NextResponse.json({ error: 'Valid mobile required' }, { status: 400 });
    }

    let user = await db.user.findUnique({ where: { mobile } });
    if (!user && purpose === 'signup') {
      user = await db.user.create({
        data: {
          mobile,
          name: name || 'Customer',
          email,
          role: UserRole.CUSTOMER,
          isVerified: false,
        },
      });
    }

    const otp = await issueOtp(mobile, purpose, user?.id);
    const showOtp = process.env.NODE_ENV !== 'production';
    return NextResponse.json({
      ok: true,
      message: 'OTP sent',
      ...(showOtp ? { otp } : {}),
    });
  } catch (e) {
    console.error('send-otp error', e);
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}
