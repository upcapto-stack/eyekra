import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { db } from '@/core/api/db';
import { isAdmin, isStaffOrAdmin, requireSessionUser } from '@/core/api/server/authz';

/**
 * Lists field partners (users that can carry frames out for try-on). In this
 * codebase a "partner" is a user with role=STAFF (admins are excluded since
 * they don't normally do field visits). Used by admin UIs for dropdowns when
 * checking out a stock unit for try-on.
 */
export async function GET(request: NextRequest) {
  const user = await requireSessionUser(request);
  if (!user || !isStaffOrAdmin(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const partners = await db.user.findMany({
    where: { role: UserRole.STAFF, isVerified: true },
    select: { id: true, name: true, mobile: true, email: true },
    orderBy: { name: 'asc' },
    take: 500,
  });
  // Hide email field from non-admins
  const masked = partners.map((p) => ({
    id: p.id,
    name: p.name,
    mobile: p.mobile,
    ...(isAdmin(user.role) ? { email: p.email } : {}),
  }));
  return NextResponse.json({ partners: masked });
}
