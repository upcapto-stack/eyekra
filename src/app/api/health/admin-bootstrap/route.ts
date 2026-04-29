import { createHash, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

function normalizeMobile(value: string | undefined): string {
  return String(value ?? '').replace(/\D/g, '').slice(-10);
}

function sha256Hex(input: string): Buffer {
  return createHash('sha256').update(input, 'utf8').digest();
}

function timingSafeSecretEqual(provided: string, expected: string): boolean {
  const a = sha256Hex(provided);
  const b = sha256Hex(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Internal readiness probe. Requires a dedicated secret — never reuse AUTH_SECRET.
 * If HEALTH_CHECK_SECRET is unset, returns 404 so the route is not advertised.
 */
export async function GET(request: NextRequest) {
  const healthSecret = process.env.HEALTH_CHECK_SECRET;
  if (!healthSecret) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const provided = request.headers.get('x-health-key') ?? '';
  if (!timingSafeSecretEqual(provided, healthSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const bootstrapMobile = normalizeMobile(process.env.ADMIN_BOOTSTRAP_MOBILE);
  const hasBootstrapMobile = bootstrapMobile.length === 10;
  const hasBootstrapPassword = Boolean(process.env.ADMIN_BOOTSTRAP_PASSWORD);

  const adminCount = await db.user.count({
    where: { role: 'ADMIN' },
  });

  const bootstrapUser = hasBootstrapMobile
    ? await db.user.findUnique({
        where: { mobile: bootstrapMobile },
        select: { id: true, role: true, passwordHash: true, isVerified: true },
      })
    : null;

  return NextResponse.json({
    ok: adminCount > 0,
    checks: {
      adminUsersPresent: adminCount > 0,
      bootstrapEnvConfigured: hasBootstrapMobile && hasBootstrapPassword,
      bootstrapUserPresent: Boolean(bootstrapUser),
      bootstrapUserReady: Boolean(bootstrapUser?.passwordHash) && Boolean(bootstrapUser?.isVerified),
    },
    meta: {
      adminUserCount: adminCount,
      bootstrapMobileMasked: hasBootstrapMobile ? `******${bootstrapMobile.slice(-4)}` : null,
    },
  });
}
