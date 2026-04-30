import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logPartnerAction } from '@/lib/server/partner/audit';
import { requirePartnerUser } from '@/lib/server/partner/auth';
import { summarizePathDistanceKm } from '@/lib/server/partner/earnings';
import { trackingStopSchema } from '@/lib/server/partner/validation';

export async function POST(request: NextRequest) {
  const partner = await requirePartnerUser(request);
  if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = trackingStopSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
  const bookingId = parsed.data.bookingId;
  const gpsPath = parsed.data.gpsPath;
  const audioUrl = parsed.data.audioUrl?.trim() || null;

  const tracking = await db.journeyTracking.findUnique({ where: { bookingId } });
  if (!tracking) return NextResponse.json({ error: 'Tracking not found' }, { status: 404 });
  if (tracking.partnerId !== partner.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const mergedPath = gpsPath.length ? gpsPath : ((tracking.gpsPath as unknown[]) ?? []);
  const distanceKm = summarizePathDistanceKm(mergedPath);
  const updated = await db.journeyTracking.update({
    where: { bookingId },
    data: {
      stoppedAt: new Date(),
      recordingActive: false,
      audioUrl,
      gpsPath: mergedPath,
      metadata: {
        ...(typeof tracking.metadata === 'object' && tracking.metadata ? tracking.metadata : {}),
        distanceKm,
      },
    },
  });
  await logPartnerAction({
    partnerId: partner.id,
    action: 'tracking.stop',
    entityType: 'Booking',
    entityId: bookingId,
    metadata: { distanceKm, hasAudio: Boolean(audioUrl) },
  });

  return NextResponse.json({ ok: true, tracking: updated, distanceKm });
}
