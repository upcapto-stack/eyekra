import { NextRequest, NextResponse } from 'next/server';
import { BookingFieldStatus } from '@prisma/client';
import { db } from '@/core/api/db';
import { consumeOtp } from '@/core/api/server/otp';
import { logPartnerAction } from '@/core/api/server/partner/audit';
import { requirePartnerUser } from '@/core/api/server/partner/auth';
import { verifyOtpSchema } from '@/core/api/server/partner/validation';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const partner = await requirePartnerUser(request);
  if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const booking = await db.booking.findUnique({ where: { id: params.id } });
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  if (booking.assignedPartnerId !== partner.id) {
    return NextResponse.json({ error: 'Booking is not assigned to you' }, { status: 403 });
  }
  if (booking.fieldStatus !== BookingFieldStatus.ARRIVED) {
    return NextResponse.json({ error: 'OTP can only be verified after ARRIVED state' }, { status: 400 });
  }

  const parsed = verifyOtpSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Valid OTP is required' }, { status: 400 });
  const code = parsed.data.otp;

  const ok = await consumeOtp(booking.customerMobile.replace(/\D/g, '').slice(-10), `booking:${booking.id}`, code);
  if (!ok) return NextResponse.json({ error: 'Invalid OTP' }, { status: 401 });

  const now = new Date();
  const updated = await db.booking.update({
    where: { id: booking.id },
    data: { fieldStatus: BookingFieldStatus.OTP_VERIFIED, otpVerifiedAt: now },
  });
  await db.bookingEvent.create({
    data: {
      bookingId: booking.id,
      partnerId: partner.id,
      fromStatus: booking.fieldStatus,
      toStatus: BookingFieldStatus.OTP_VERIFIED,
      note: 'OTP verified',
    },
  });
  await logPartnerAction({
    partnerId: partner.id,
    action: 'booking.verify_otp',
    entityType: 'Booking',
    entityId: booking.id,
    metadata: { from: booking.fieldStatus, to: BookingFieldStatus.OTP_VERIFIED },
  });

  return NextResponse.json({ ok: true, booking: updated });
}
