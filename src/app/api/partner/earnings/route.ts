import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/api/db';
import { requirePartnerUser } from '@/core/api/server/partner/auth';

export async function GET(request: NextRequest) {
  const partner = await requirePartnerUser(request);
  if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sinceDays = Math.min(Number(request.nextUrl.searchParams.get('days') ?? 30) || 30, 120);
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  const rows = await db.partnerEarningLedger.findMany({
    where: { partnerId: partner.id, createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
  });

  const totals = rows.reduce(
    (acc, row) => {
      acc.base += row.baseAmount;
      acc.distance += row.distanceAmount;
      acc.commission += row.commissionAmount;
      acc.incentive += row.incentiveAmount;
      acc.total += row.totalAmount;
      return acc;
    },
    { base: 0, distance: 0, commission: 0, incentive: 0, total: 0 }
  );

  return NextResponse.json({ sinceDays, totals, rows });
}
