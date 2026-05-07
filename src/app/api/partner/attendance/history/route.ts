import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/api/db';
import { requirePartnerUser } from '@/core/api/server/partner/auth';

export async function GET(request: NextRequest) {
  const partner = await requirePartnerUser(request);
  if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') ?? 30) || 30, 90);
  const history = await db.attendanceLog.findMany({
    where: { partnerId: partner.id },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return NextResponse.json({
    records: history.map((h) => ({
      id: h.id,
      shiftState: h.shiftState,
      punchInAt: h.punchInAt,
      punchOutAt: h.punchOutAt,
      punchInLiveness: h.punchInLiveness,
      punchOutLiveness: h.punchOutLiveness,
      deviceId: h.deviceId,
      createdAt: h.createdAt,
    })),
  });
}
