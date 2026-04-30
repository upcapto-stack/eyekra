import { NextRequest, NextResponse } from 'next/server';
import { BookingFieldStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { requirePartnerUser } from '@/lib/server/partner/auth';

export async function GET(request: NextRequest) {
  const partner = await requirePartnerUser(request);
  if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const statusParam = request.nextUrl.searchParams.get('status');
  const where = {
    OR: [{ assignedPartnerId: partner.id }, { assignedPartnerId: null }],
    ...(statusParam ? { fieldStatus: statusParam as BookingFieldStatus } : {}),
  };

  const bookings = await db.booking.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return NextResponse.json({ bookings });
}
