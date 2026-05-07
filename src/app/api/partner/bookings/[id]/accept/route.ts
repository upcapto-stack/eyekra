import { NextRequest, NextResponse } from 'next/server';
import { BookingFieldStatus, PartnerShiftState } from '@prisma/client';
import { db } from '@/core/api/db';
import { createUserNotification } from '@/core/api/server/notifications';
import { logPartnerAction } from '@/core/api/server/partner/audit';
import { requirePartnerUser } from '@/core/api/server/partner/auth';
import { canTransitionBookingFieldStatus } from '@/core/api/server/partner/booking-state';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const partner = await requirePartnerUser(request);
  if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const bookingId = params.id;
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  if (!canTransitionBookingFieldStatus(booking.fieldStatus, BookingFieldStatus.ACCEPTED)) {
    return NextResponse.json({ error: 'Booking cannot be accepted in current state' }, { status: 400 });
  }

  const latestAttendance = await db.attendanceLog.findFirst({
    where: { partnerId: partner.id },
    orderBy: { createdAt: 'desc' },
  });
  if (!latestAttendance || latestAttendance.shiftState !== PartnerShiftState.READY) {
    return NextResponse.json({ error: 'Punch in and be READY before accepting bookings' }, { status: 400 });
  }

  const updated = await db.booking.update({
    where: { id: bookingId },
    data: {
      assignedPartnerId: partner.id,
      fieldStatus: BookingFieldStatus.ACCEPTED,
      acceptedAt: new Date(),
    },
  });
  await db.bookingEvent.create({
    data: {
      bookingId,
      partnerId: partner.id,
      fromStatus: booking.fieldStatus,
      toStatus: BookingFieldStatus.ACCEPTED,
    },
  });
  await createUserNotification({
    userId: updated.userId,
    type: 'booking_assigned',
    title: 'Booking accepted by partner',
    message: `Partner accepted booking ${updated.id}.`,
    data: { bookingId: updated.id, status: updated.fieldStatus },
  }).catch(() => undefined);
  await logPartnerAction({
    partnerId: partner.id,
    action: 'booking.accept',
    entityType: 'Booking',
    entityId: updated.id,
    metadata: { from: booking.fieldStatus, to: updated.fieldStatus },
  });

  return NextResponse.json({ ok: true, booking: updated });
}
