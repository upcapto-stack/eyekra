import { NextRequest, NextResponse } from 'next/server';
import { BookingFieldStatus } from '@prisma/client';
import { db } from '@/core/api/db';
import { createUserNotification } from '@/core/api/server/notifications';
import { logPartnerAction } from '@/core/api/server/partner/audit';
import { requirePartnerUser } from '@/core/api/server/partner/auth';
import { canTransitionBookingFieldStatus } from '@/core/api/server/partner/booking-state';
import { bookingStatusUpdateSchema } from '@/core/api/server/partner/validation';

function parseStatus(v: string): BookingFieldStatus | null {
  const key = v.trim().toUpperCase().replace(/-/g, '_');
  return BookingFieldStatus[key as keyof typeof BookingFieldStatus] ?? null;
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const partner = await requirePartnerUser(request);
  if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const bookingId = params.id;
  const parsed = bookingStatusUpdateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
  const next = parseStatus(parsed.data.status);
  const note = parsed.data.note?.trim() || null;
  if (!next) return NextResponse.json({ error: 'Valid status is required' }, { status: 400 });

  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  if (!booking.assignedPartnerId || booking.assignedPartnerId !== partner.id) {
    return NextResponse.json({ error: 'Booking is not assigned to you' }, { status: 403 });
  }
  if (!canTransitionBookingFieldStatus(booking.fieldStatus, next)) {
    return NextResponse.json({ error: `Invalid transition ${booking.fieldStatus} -> ${next}` }, { status: 400 });
  }

  const now = new Date();
  const updated = await db.booking.update({
    where: { id: bookingId },
    data: {
      fieldStatus: next,
      ...(next === BookingFieldStatus.EN_ROUTE ? { status: 'OUT_FOR_VISIT' } : {}),
      ...(next === BookingFieldStatus.ARRIVED ? { arrivedAt: now, status: 'OPTOMETRIST_REACHED' } : {}),
      ...(next === BookingFieldStatus.OTP_VERIFIED ? { otpVerifiedAt: now } : {}),
      ...(next === BookingFieldStatus.SESSION_ACTIVE ? { sessionStartedAt: now } : {}),
      ...(next === BookingFieldStatus.COMPLETED ? { completedAt: now, status: 'COMPLETED' } : {}),
    },
  });

  await db.bookingEvent.create({
    data: { bookingId, partnerId: partner.id, fromStatus: booking.fieldStatus, toStatus: next, note },
  });
  await createUserNotification({
    userId: booking.userId,
    type: 'booking_status',
    title: `Booking ${updated.id} ${next.toLowerCase()}`,
    message: `Your eye test booking status is now ${next.replaceAll('_', ' ').toLowerCase()}.`,
    data: { bookingId: updated.id, status: next },
  }).catch(() => undefined);
  await logPartnerAction({
    partnerId: partner.id,
    action: 'booking.status_update',
    entityType: 'Booking',
    entityId: updated.id,
    metadata: { from: booking.fieldStatus, to: next, note },
  });

  return NextResponse.json({ ok: true, booking: updated });
}
