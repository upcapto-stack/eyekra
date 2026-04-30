import crypto from 'crypto';
import { UserRole } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSession, sessionCookieValue } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

const STATE_COOKIE = 'eyekra_partner_google_oauth_state';

function getBaseUrl(request: NextRequest): string {
  const fromEnv = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return request.nextUrl.origin;
}

function clearStateCookie(): string {
  return `${STATE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; ${
    process.env.NODE_ENV === 'production' ? 'Secure;' : ''
  }`;
}

function isSafeNextPath(path: string | null | undefined): string {
  if (!path || !path.startsWith('/')) return '/partner';
  if (path.startsWith('//')) return '/partner';
  return path;
}

function syntheticMobileFromGoogleSub(sub: string, attempt = 0): string {
  const hash = crypto.createHash('sha256').update(`${sub}:${attempt}`).digest('hex');
  const numericSeed = Number.parseInt(hash.slice(0, 12), 16);
  const suffix = (numericSeed % 1_000_000_000).toString().padStart(9, '0');
  return `9${suffix}`;
}

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL('/partner/login?error=google_not_configured', request.url));
    }

    const code = request.nextUrl.searchParams.get('code');
    const stateParam = request.nextUrl.searchParams.get('state');
    const storedState = request.cookies.get(STATE_COOKIE)?.value;
    if (!code || !stateParam || !storedState) {
      return NextResponse.redirect(new URL('/partner/login?error=google_invalid_state', request.url));
    }

    let parsedState: { state: string; nextPath?: string } | null = null;
    try {
      parsedState = JSON.parse(Buffer.from(stateParam, 'base64url').toString('utf8')) as { state: string; nextPath?: string };
    } catch {
      parsedState = null;
    }

    if (!parsedState || parsedState.state !== storedState) {
      return NextResponse.redirect(new URL('/partner/login?error=google_invalid_state', request.url));
    }

    const redirectUri = `${getBaseUrl(request)}/api/partner/auth/google/callback`;
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
      cache: 'no-store',
    });

    if (!tokenResponse.ok) {
      return NextResponse.redirect(new URL('/partner/login?error=google_token_exchange_failed', request.url));
    }

    const tokenData = (await tokenResponse.json()) as { id_token?: string };
    if (!tokenData.id_token) {
      return NextResponse.redirect(new URL('/partner/login?error=google_id_token_missing', request.url));
    }

    const profileResponse = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenData.id_token)}`,
      { cache: 'no-store' },
    );
    if (!profileResponse.ok) {
      return NextResponse.redirect(new URL('/partner/login?error=google_profile_fetch_failed', request.url));
    }

    const profile = (await profileResponse.json()) as {
      sub?: string;
      email?: string;
      email_verified?: string;
      name?: string;
    };

    const email = String(profile.email ?? '').trim().toLowerCase();
    const sub = String(profile.sub ?? '').trim();
    const isEmailVerified = String(profile.email_verified ?? '') === 'true';
    if (!sub || !email || !isEmailVerified) {
      return NextResponse.redirect(new URL('/partner/login?error=google_email_unverified', request.url));
    }

    let user = await db.user.findUnique({ where: { email } });
    if (user && user.role === UserRole.CUSTOMER) {
      return NextResponse.redirect(new URL('/partner/login?error=google_partner_only', request.url));
    }

    if (!user) {
      let chosenMobile = '';
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const candidate = syntheticMobileFromGoogleSub(sub, attempt);
        const existingByMobile = await db.user.findUnique({ where: { mobile: candidate } });
        if (!existingByMobile) {
          chosenMobile = candidate;
          break;
        }
      }
      if (!chosenMobile) {
        return NextResponse.redirect(new URL('/partner/login?error=google_mobile_generation_failed', request.url));
      }

      user = await db.user.create({
        data: {
          name: String(profile.name ?? 'Partner').trim() || 'Partner',
          email,
          mobile: chosenMobile,
          role: UserRole.STAFF,
          isVerified: true,
        },
      });
    } else {
      user = await db.user.update({
        where: { id: user.id },
        data: {
          isVerified: true,
          ...(profile.name ? { name: profile.name.trim() || user.name } : {}),
        },
      });
    }

    const token = await createSession(user.id);
    const target = isSafeNextPath(parsedState.nextPath);
    const response = NextResponse.redirect(new URL(target, request.url));
    response.headers.append('Set-Cookie', sessionCookieValue(token));
    response.headers.append('Set-Cookie', clearStateCookie());
    return response;
  } catch (error) {
    console.error('partner google callback error', error);
    return NextResponse.redirect(new URL('/partner/login?error=google_login_failed', request.url));
  }
}
