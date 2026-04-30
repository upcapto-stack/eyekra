import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const STATE_COOKIE = 'eyekra_google_oauth_state';
const STATE_MAX_AGE_SECONDS = 60 * 10;

function getBaseUrl(request: NextRequest): string {
  const fromEnv = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return request.nextUrl.origin;
}

function buildStateCookie(state: string): string {
  return `${STATE_COOKIE}=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${STATE_MAX_AGE_SECONDS}; ${
    process.env.NODE_ENV === 'production' ? 'Secure;' : ''
  }`;
}

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL('/partner/login?error=google_not_configured', request.url));
  }

  const redirectUri = `${getBaseUrl(request)}/api/auth/google/callback`;
  const state = crypto.randomBytes(32).toString('base64url');
  const nextPath = request.nextUrl.searchParams.get('next') || '/partner';
  const encodedState = Buffer.from(JSON.stringify({ state, nextPath, audience: 'partner' }), 'utf8').toString('base64url');

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', encodedState);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'select_account');

  const response = NextResponse.redirect(authUrl);
  response.headers.set('Set-Cookie', buildStateCookie(state));
  return response;
}
