import { NextRequest, NextResponse } from 'next/server';
import { BookingFieldStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { createUserNotification } from '@/lib/server/notifications';
import { logPartnerAction } from '@/lib/server/partner/audit';
import { requirePartnerUser } from '@/lib/server/partner/auth';
import { eyeTestSubmitSchema } from '@/lib/server/partner/validation';

export async function POST(request: NextRequest) {
  const partner = await requirePartnerUser(request);
  if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = eyeTestSubmitSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'bookingId is required' }, { status: 400 });
  const bookingId = parsed.data.bookingId;

  const session = await db.eyeTestSession.findUnique({
    where: { bookingId },
    include: { steps: true, booking: true },
  });
  if (!session) return NextResponse.json({ error: 'Eye test session not found' }, { status: 404 });
  if (session.partnerId !== partner.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (session.isSubmitted) return NextResponse.json({ ok: true, eyeTestSessionId: session.id, alreadySubmitted: true });

  const finalData = session.steps.reduce<Record<string, unknown>>((acc, item) => {
    acc[item.step] = item.payload;
    return acc;
  }, {});

  await db.eyeTestSession.update({
    where: { id: session.id },
    data: {
      isSubmitted: true,
      submittedAt: new Date(),
      finalData: JSON.parse(JSON.stringify(finalData)),
      steps: { updateMany: { where: { eyeTestSessionId: session.id }, data: { isLocked: true } } },
    },
  });
  await db.booking.update({
    where: { id: bookingId },
    data: {
      fieldStatus: BookingFieldStatus.COMPLETED,
      completedAt: new Date(),
      status: 'COMPLETED',
    },
  });
  const ledger = await db.partnerEarningLedger.create({
    data: {
      partnerId: partner.id,
      bookingId,
      earningType: 'BOOKING_COMPLETION',
      baseAmount: Number(session.booking.amount || 0),
      commissionAmount: Number((session.booking.amount || 0) * 0.15),
      totalAmount: Number((session.booking.amount || 0) * 1.15),
      metadata: { source: 'eye-test-submit' },
    },
  });
  await createUserNotification({
    userId: partner.id,
    type: 'payout',
    title: 'Earning credited',
    message: `₹${ledger.totalAmount.toFixed(2)} credited for booking ${bookingId}.`,
    data: { bookingId, ledgerId: ledger.id },
  }).catch(() => undefined);
  await logPartnerAction({
    partnerId: partner.id,
    action: 'eye_test.submit',
    entityType: 'EyeTestSession',
    entityId: session.id,
    metadata: { bookingId, payout: ledger.totalAmount },
  });

  return NextResponse.json({ ok: true, eyeTestSessionId: session.id });
}
