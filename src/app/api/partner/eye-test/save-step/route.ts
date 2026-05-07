import { NextRequest, NextResponse } from 'next/server';
import { EyeTestStep } from '@prisma/client';
import { db } from '@/core/api/db';
import { logPartnerAction } from '@/core/api/server/partner/audit';
import { requirePartnerUser } from '@/core/api/server/partner/auth';
import { eyeTestSaveStepSchema } from '@/core/api/server/partner/validation';

function parseStep(step: string): EyeTestStep | null {
  const key = step.trim().toUpperCase().replace(/\s+/g, '_');
  return EyeTestStep[key as keyof typeof EyeTestStep] ?? null;
}

export async function POST(request: NextRequest) {
  const partner = await requirePartnerUser(request);
  if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = eyeTestSaveStepSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
  const bookingId = parsed.data.bookingId;
  const step = parseStep(parsed.data.step);
  const payload = parsed.data.payload ?? {};
  if (!bookingId || !step) return NextResponse.json({ error: 'bookingId and valid step are required' }, { status: 400 });

  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  if (booking.assignedPartnerId !== partner.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const session = await db.eyeTestSession.upsert({
    where: { bookingId },
    update: {},
    create: {
      bookingId,
      partnerId: partner.id,
      customerId: booking.userId,
    },
  });
  if (session.isSubmitted) return NextResponse.json({ error: 'Eye test already submitted and locked' }, { status: 400 });

  const stepData = await db.eyeTestStepData.upsert({
    where: { eyeTestSessionId_step: { eyeTestSessionId: session.id, step } },
    update: { payload, savedByPartnerId: partner.id, isLocked: false },
    create: { eyeTestSessionId: session.id, step, payload, savedByPartnerId: partner.id, isLocked: false },
  });
  await logPartnerAction({
    partnerId: partner.id,
    action: 'eye_test.save_step',
    entityType: 'EyeTestSession',
    entityId: session.id,
    metadata: { bookingId, step },
  });

  return NextResponse.json({ ok: true, eyeTestSessionId: session.id, stepData });
}
