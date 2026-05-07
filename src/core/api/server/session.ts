import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { UserRole } from '@prisma/client';
import { db } from '@/core/api/db';

const SESSION_COOKIE = 'eyekra_session';
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

export type SessionUser = {
  id: string;
  role: UserRole;
  mobile: string;
  email: string | null;
  name: string;
};

function getTokenFromRequest(request?: NextRequest): string | null {
  if (request) {
    return request.cookies.get(SESSION_COOKIE)?.value ?? null;
  }
  return cookies().get(SESSION_COOKIE)?.value ?? null;
}

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(48).toString('base64url');
  await db.session.create({
    data: {
      token,
      userId,
      expiresAt: new Date(Date.now() + SESSION_MAX_AGE_MS),
    },
  });
  return token;
}

export async function getSessionUser(request?: NextRequest): Promise<SessionUser | null> {
  const token = getTokenFromRequest(request);
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await db.session.delete({ where: { token } }).catch(() => undefined);
    return null;
  }
  return {
    id: session.user.id,
    role: session.user.role,
    mobile: session.user.mobile,
    email: session.user.email,
    name: session.user.name,
  };
}

export async function destroySession(token: string): Promise<void> {
  await db.session.delete({ where: { token } }).catch(() => undefined);
}

export function sessionCookieValue(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_MS / 1000}; ${
    process.env.NODE_ENV === 'production' ? 'Secure;' : ''
  }`;
}

export function clearSessionCookieValue(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; ${
    process.env.NODE_ENV === 'production' ? 'Secure;' : ''
  }`;
}
