import { NextRequest, NextResponse } from 'next/server';
import { BookingFieldStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { requirePartnerUser } from '@/lib/server/partner/auth';

export async function GET(request: NextRequest) {
  const partner = await requirePartnerUser(request);
  if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sinceDays = Math.min(Number(request.nextUrl.searchParams.get('days') ?? 30) || 30, 120);
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

  const bookings = await db.booking.findMany({
    where: { assignedPartnerId: partner.id, createdAt: { gte: since } },
    select: { id: true, fieldStatus: true, amount: true },
  });
  const totalBookings = bookings.length;
  const completedBookings = bookings.filter((b) => b.fieldStatus === BookingFieldStatus.COMPLETED).length;
  const conversionRate = totalBookings ? Number(((completedBookings / totalBookings) * 100).toFixed(2)) : 0;

  const orders = await db.partnerEarningLedger.findMany({
    where: { partnerId: partner.id, orderId: { not: null }, createdAt: { gte: since } },
    select: { metadata: true },
  });
  const orderValues = orders
    .map((o) => Number((o.metadata as { orderTotal?: unknown } | null)?.orderTotal ?? 0))
    .filter((v) => Number.isFinite(v) && v > 0);
  const avgOrderValue = orderValues.length
    ? Number((orderValues.reduce((sum, v) => sum + v, 0) / orderValues.length).toFixed(2))
    : 0;

  return NextResponse.json({
    sinceDays,
    metrics: {
      bookingsCount: totalBookings,
      completedBookings,
      conversionRate,
      avgOrderValue,
    },
  });
}
