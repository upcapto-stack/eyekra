import { NextRequest, NextResponse } from 'next/server';
import { BookingFieldStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { logPartnerAction } from '@/lib/server/partner/audit';
import { requirePartnerUser } from '@/lib/server/partner/auth';
import { trackingStartSchema } from '@/lib/server/partner/validation';

export async function POST(request: NextRequest) {
  const partner = await requirePartnerUser(request);
  if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = trackingStartSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
  const { bookingId, gpsPath } = parsed.data;

  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  if (booking.assignedPartnerId !== partner.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (booking.fieldStatus !== BookingFieldStatus.ACCEPTED && booking.fieldStatus !== BookingFieldStatus.EN_ROUTE) {
    return NextResponse.json({ error: 'Tracking can only start for accepted journey states' }, { status: 400 });
  }

  const tracking = await db.journeyTracking.upsert({
    where: { bookingId },
    update: {
      partnerId: partner.id,
      startedAt: new Date(),
      stoppedAt: null,
      recordingActive: true,
      gpsPath: gpsPath.length ? gpsPath : undefined,
      metadata: { autoAudioRadiusMeters: 50, autoRecording: true },
    },
    create: {
      bookingId,
      partnerId: partner.id,
      recordingActive: true,
      gpsPath: gpsPath.length ? gpsPath : undefined,
      metadata: { autoAudioRadiusMeters: 50, autoRecording: true },
    },
  });

  const updatedBooking = await db.booking.update({
    where: { id: bookingId },
    data: { fieldStatus: BookingFieldStatus.EN_ROUTE },
  });
  await db.bookingEvent.create({
    data: {
      bookingId,
      partnerId: partner.id,
      fromStatus: booking.fieldStatus,
      toStatus: BookingFieldStatus.EN_ROUTE,
      note: 'Journey started',
    },
  });
  await logPartnerAction({
    partnerId: partner.id,
    action: 'tracking.start',
    entityType: 'Booking',
    entityId: bookingId,
    metadata: { from: booking.fieldStatus, to: BookingFieldStatus.EN_ROUTE },
  });

  return NextResponse.json({ ok: true, tracking, booking: updatedBooking });
}
