import { NextRequest, NextResponse } from 'next/server';
import { BookingStatus } from '@prisma/client';
import type { EyeTestBooking } from '@/types/booking';
import { db } from '@/lib/db';
import { isStaffOrAdmin, requireSessionUser } from '@/lib/server/authz';

function generateBookingId(): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 6);
  return `EYE-${t}-${r}`.toUpperCase();
}

function toBookingStatus(status: string): BookingStatus {
  const map: Record<string, BookingStatus> = {
    pending: BookingStatus.PENDING,
    confirmed: BookingStatus.CONFIRMED,
    scheduled: BookingStatus.SCHEDULED,
    out_for_visit: BookingStatus.OUT_FOR_VISIT,
    optometrist_reached: BookingStatus.OPTOMETRIST_REACHED,
    completed: BookingStatus.COMPLETED,
    cancelled: BookingStatus.CANCELLED,
  };
  return map[status] || BookingStatus.PENDING;
}

function fromBookingStatus(status: BookingStatus): EyeTestBooking['status'] {
  const map: Record<BookingStatus, EyeTestBooking['status']> = {
    [BookingStatus.PENDING]: 'pending',
    [BookingStatus.CONFIRMED]: 'confirmed',
    [BookingStatus.SCHEDULED]: 'scheduled',
    [BookingStatus.OUT_FOR_VISIT]: 'out_for_visit',
    [BookingStatus.OPTOMETRIST_REACHED]: 'optometrist_reached',
    [BookingStatus.COMPLETED]: 'completed',
    [BookingStatus.CANCELLED]: 'cancelled',
  };
  return map[status];
}

function mapBooking(record: {
  id: string;
  createdAt: Date;
  status: BookingStatus;
  customerName: string;
  customerMobile: string;
  customerEmail: string;
  address: string;
  deliveryAddress: unknown;
  preferredDate: string;
  preferredSlotId: string;
  slotLabel: string | null;
  amount: number;
  patients: unknown;
  tryonFrameIds: unknown;
}): EyeTestBooking {
  return {
    id: record.id,
    createdAt: record.createdAt.toISOString(),
    status: fromBookingStatus(record.status),
    customer: {
      name: record.customerName,
      mobile: record.customerMobile,
      email: record.customerEmail,
    },
    address: record.address,
    deliveryAddress: (record.deliveryAddress as EyeTestBooking['deliveryAddress']) ?? undefined,
    preferredDate: record.preferredDate,
    preferredSlotId: record.preferredSlotId,
    slotLabel: record.slotLabel ?? undefined,
    amount: record.amount,
    patients: (record.patients as EyeTestBooking['patients']) ?? undefined,
    tryonFrameIds: (record.tryonFrameIds as EyeTestBooking['tryonFrameIds']) ?? undefined,
  };
}

/** GET: user gets own bookings; staff/admin get all. */
export async function GET(request: NextRequest) {
  const user = await requireSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = request.nextUrl.searchParams.get('id')?.trim();

  try {
    const where = isStaffOrAdmin(user.role) ? {} : { userId: user.id };
    const records = await db.booking.findMany({ where, orderBy: { createdAt: 'desc' } });
    const bookings = records.map(mapBooking);
    if (id) {
      const one = bookings.find((b) => b.id === id);
      return NextResponse.json(one ?? null);
    }
    return NextResponse.json(bookings);
  } catch (e) {
    console.error('Bookings read error', e);
    return NextResponse.json({ error: 'Failed to load bookings' }, { status: 500 });
  }
}

/** POST: create eye test booking (from home eye test flow). */
export async function POST(request: NextRequest) {
  const user = await requireSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = (await request.json()) as Omit<EyeTestBooking, 'id' | 'createdAt' | 'status'> & Partial<EyeTestBooking>;
    if (!body || !body.customer?.mobile || !body.preferredDate || !body.preferredSlotId) {
      return NextResponse.json(
        { error: 'Invalid booking: customer.mobile, preferredDate, preferredSlotId required' },
        { status: 400 }
      );
    }
    const booking: EyeTestBooking = {
      id: body.id ?? generateBookingId(),
      createdAt: body.createdAt ?? new Date().toISOString(),
      status: body.status ?? 'pending',
      customer: body.customer,
      address: body.address ?? '',
      deliveryAddress: body.deliveryAddress,
      preferredDate: body.preferredDate,
      preferredSlotId: body.preferredSlotId,
      slotLabel: body.slotLabel,
      amount: Number(body.amount) ?? 99,
      patients: body.patients,
      tryonFrameIds: body.tryonFrameIds,
    };
    await db.booking.create({
      data: {
        id: booking.id,
        userId: user.id,
        createdAt: new Date(booking.createdAt),
        status: toBookingStatus(booking.status),
        customerName: booking.customer.name,
        customerMobile: booking.customer.mobile,
        customerEmail: booking.customer.email,
        address: booking.address,
        deliveryAddress: booking.deliveryAddress ? JSON.parse(JSON.stringify(booking.deliveryAddress)) : undefined,
        preferredDate: booking.preferredDate,
        preferredSlotId: booking.preferredSlotId,
        slotLabel: booking.slotLabel ?? null,
        amount: booking.amount,
        patients: booking.patients ? JSON.parse(JSON.stringify(booking.patients)) : undefined,
        tryonFrameIds: booking.tryonFrameIds ? JSON.parse(JSON.stringify(booking.tryonFrameIds)) : undefined,
      },
    });
    return NextResponse.json({ bookingId: booking.id, booking });
  } catch (e) {
    console.error('Booking create error', e);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}

const VALID_BOOKING_STATUSES: EyeTestBooking['status'][] = ['pending', 'confirmed', 'scheduled', 'out_for_visit', 'optometrist_reached', 'completed', 'cancelled'];

/** PATCH: update booking status (admin only). Body: { id?: string, status }. id in body or ?id= */
export async function PATCH(request: NextRequest) {
  const user = await requireSessionUser(request);
  if (!user || !isStaffOrAdmin(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const id = (body?.id ?? request.nextUrl.searchParams.get('id'))?.trim();
    const status = typeof body?.status === 'string' ? body.status.trim() : '';
    if (!id || !VALID_BOOKING_STATUSES.includes(status as EyeTestBooking['status'])) {
      return NextResponse.json(
        { error: 'Invalid: id and status required. status: ' + VALID_BOOKING_STATUSES.join(', ') },
        { status: 400 }
      );
    }
    const updated = await db.booking.update({
      where: { id },
      data: { status: toBookingStatus(status) },
    }).catch(() => null);
    if (!updated) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    return NextResponse.json({ booking: mapBooking(updated) });
  } catch (e) {
    console.error('Booking update error', e);
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
  }
}
