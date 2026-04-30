import { NextRequest, NextResponse } from 'next/server';
import { BookingFieldStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { createUserNotification } from '@/lib/server/notifications';
import { logPartnerAction } from '@/lib/server/partner/audit';
import { requirePartnerUser } from '@/lib/server/partner/auth';
import { canTransitionBookingFieldStatus } from '@/lib/server/partner/booking-state';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const partner = await requirePartnerUser(request);
  if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const bookingId = params.id;

  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  if (!canTransitionBookingFieldStatus(booking.fieldStatus, BookingFieldStatus.REJECTED)) {
    return NextResponse.json({ error: 'Booking cannot be rejected in current state' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const reason = String(body?.reason ?? '').trim() || 'Not available';

  const updated = await db.booking.update({
    where: { id: bookingId },
    data: {
      fieldStatus: BookingFieldStatus.REJECTED,
      rejectionReason: reason,
      rejectedAt: new Date(),
      assignedPartnerId: partner.id,
    },
  });
  await db.bookingEvent.create({
    data: {
      bookingId,
      partnerId: partner.id,
      fromStatus: booking.fieldStatus,
      toStatus: BookingFieldStatus.REJECTED,
      note: reason,
    },
  });
  await createUserNotification({
    userId: updated.userId,
    type: 'booking_status',
    title: 'Booking update',
    message: `Booking ${updated.id} was rejected and will be reassigned.`,
    data: { bookingId: updated.id, status: 'rejected', reason },
  }).catch(() => undefined);
  await logPartnerAction({
    partnerId: partner.id,
    action: 'booking.reject',
    entityType: 'Booking',
    entityId: updated.id,
    metadata: { reason, from: booking.fieldStatus, to: updated.fieldStatus },
  });

  return NextResponse.json({ ok: true, booking: updated });
}
