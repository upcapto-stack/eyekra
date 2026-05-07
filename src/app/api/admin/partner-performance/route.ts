import { NextRequest, NextResponse } from 'next/server';
import { BookingFieldStatus, BookingStatus } from '@prisma/client';
import { db } from '@/core/api/db';
import { isStaffOrAdmin, requireSessionUser } from '@/core/api/server/authz';

type Agg = {
  bookingsAssigned: number;
  fieldCompleted: number;
  journeyCompleted: number;
  orderValues: number[];
  ledgerTotal: number;
  ledgerEntries: number;
  orderLinkedLedgerRows: number;
};

function emptyAgg(): Agg {
  return {
    bookingsAssigned: 0,
    fieldCompleted: 0,
    journeyCompleted: 0,
    orderValues: [],
    ledgerTotal: 0,
    ledgerEntries: 0,
    orderLinkedLedgerRows: 0,
  };
}

function getAgg(map: Map<string, Agg>, partnerId: string): Agg {
  let a = map.get(partnerId);
  if (!a) {
    a = emptyAgg();
    map.set(partnerId, a);
  }
  return a;
}

/** Staff/admin: partner-level booking + ledger metrics for a rolling window (same semantics as GET /api/partner/performance). */
export async function GET(request: NextRequest) {
  const user = await requireSessionUser(request);
  if (!user || !isStaffOrAdmin(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sinceDays = Math.min(Number(request.nextUrl.searchParams.get('days') ?? 30) || 30, 120);
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

  try {
    const [bookingRows, ledgerRows] = await Promise.all([
      db.booking.findMany({
        where: { assignedPartnerId: { not: null }, createdAt: { gte: since } },
        select: {
          assignedPartnerId: true,
          fieldStatus: true,
          status: true,
        },
      }),
      db.partnerEarningLedger.findMany({
        where: { createdAt: { gte: since } },
        select: { partnerId: true, totalAmount: true, orderId: true, metadata: true },
      }),
    ]);

    const byPartner = new Map<string, Agg>();

    for (const b of bookingRows) {
      const pid = b.assignedPartnerId;
      if (!pid) continue;
      const a = getAgg(byPartner, pid);
      a.bookingsAssigned += 1;
      if (b.fieldStatus === BookingFieldStatus.COMPLETED) a.fieldCompleted += 1;
      if (b.status === BookingStatus.COMPLETED) a.journeyCompleted += 1;
    }

    for (const row of ledgerRows) {
      const a = getAgg(byPartner, row.partnerId);
      a.ledgerTotal += Number(row.totalAmount) || 0;
      a.ledgerEntries += 1;
      if (row.orderId) {
        a.orderLinkedLedgerRows += 1;
        const v = Number((row.metadata as { orderTotal?: unknown } | null)?.orderTotal ?? 0);
        if (Number.isFinite(v) && v > 0) a.orderValues.push(v);
      }
    }

    const partnerIds = Array.from(byPartner.keys());
    if (partnerIds.length === 0) {
      return NextResponse.json({
        sinceDays,
        since: since.toISOString(),
        totals: {
          partnersWithActivity: 0,
          bookingsAssigned: 0,
          fieldCompleted: 0,
          journeyCompleted: 0,
          ledgerTotal: 0,
          ledgerEntries: 0,
        },
        partners: [],
      });
    }

    const users = await db.user.findMany({
      where: { id: { in: partnerIds } },
      select: { id: true, name: true, mobile: true, email: true, role: true },
    });
    const userById = new Map(users.map((u) => [u.id, u]));

    let sumBookings = 0;
    let sumField = 0;
    let sumJourney = 0;
    let sumLedger = 0;
    let sumLedgerEntries = 0;

    const partners = partnerIds.map((partnerId) => {
      const a = byPartner.get(partnerId)!;
      sumBookings += a.bookingsAssigned;
      sumField += a.fieldCompleted;
      sumJourney += a.journeyCompleted;
      sumLedger += a.ledgerTotal;
      sumLedgerEntries += a.ledgerEntries;

      const fieldConversionRate = a.bookingsAssigned
        ? Number(((a.fieldCompleted / a.bookingsAssigned) * 100).toFixed(2))
        : 0;
      const journeyConversionRate = a.bookingsAssigned
        ? Number(((a.journeyCompleted / a.bookingsAssigned) * 100).toFixed(2))
        : 0;
      const avgOrderValue = a.orderValues.length
        ? Number((a.orderValues.reduce((s, v) => s + v, 0) / a.orderValues.length).toFixed(2))
        : 0;

      const profile = userById.get(partnerId);
      return {
        partnerId,
        name: profile?.name ?? 'Unknown partner',
        mobile: profile?.mobile ?? '',
        email: profile?.email ?? null,
        role: profile?.role ?? null,
        bookingsAssigned: a.bookingsAssigned,
        fieldCompleted: a.fieldCompleted,
        journeyCompleted: a.journeyCompleted,
        fieldConversionRate,
        journeyConversionRate,
        avgOrderValue,
        ledgerTotal: Number(a.ledgerTotal.toFixed(2)),
        ledgerEntries: a.ledgerEntries,
        orderLinkedLedgerRows: a.orderLinkedLedgerRows,
      };
    });

    partners.sort((p, q) => q.ledgerTotal - p.ledgerTotal || q.bookingsAssigned - p.bookingsAssigned);

    return NextResponse.json({
      sinceDays,
      since: since.toISOString(),
      totals: {
        partnersWithActivity: partners.length,
        bookingsAssigned: sumBookings,
        fieldCompleted: sumField,
        journeyCompleted: sumJourney,
        ledgerTotal: Number(sumLedger.toFixed(2)),
        ledgerEntries: sumLedgerEntries,
      },
      partners,
    });
  } catch (e) {
    console.error('Admin partner performance error', e);
    return NextResponse.json({ error: 'Failed to load partner performance' }, { status: 500 });
  }
}
