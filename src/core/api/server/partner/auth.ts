import { NextRequest } from 'next/server';
import { UserRole } from '@prisma/client';
import { requireSessionUser } from '@/core/api/server/authz';
import type { SessionUser } from '@/core/api/server/session';

export function isPartnerRole(role: UserRole): boolean {
  return role === UserRole.STAFF || role === UserRole.ADMIN;
}

export async function requirePartnerUser(request: NextRequest): Promise<SessionUser | null> {
  const user = await requireSessionUser(request);
  if (!user) return null;
  if (!isPartnerRole(user.role)) return null;
  return user;
}
