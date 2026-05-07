import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/api/db';
import { requirePartnerUser } from '@/core/api/server/partner/auth';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const partner = await requirePartnerUser(request);
  if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const booking = await db.booking.findUnique({
    where: { id: params.id },
    include: {
      events: { orderBy: { createdAt: 'asc' } },
      tracking: true,
      eyeTestSession: { include: { steps: { orderBy: { updatedAt: 'asc' } } } },
    },
  });
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  if (booking.assignedPartnerId && booking.assignedPartnerId !== partner.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json({ booking });
}
