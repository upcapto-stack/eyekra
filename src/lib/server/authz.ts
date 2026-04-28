import { NextRequest } from 'next/server';
import { UserRole } from '@prisma/client';
import { getSessionUser, type SessionUser } from '@/lib/server/session';

export async function requireSessionUser(request: NextRequest): Promise<SessionUser | null> {
  return getSessionUser(request);
}

export function isStaffOrAdmin(role: UserRole): boolean {
  return role === UserRole.ADMIN || role === UserRole.STAFF;
}
