import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSessionUser } from '@/lib/server/authz';

export async function GET(request: NextRequest) {
  const user = await requireSessionUser(request);
  if (!user) return NextResponse.json({ addresses: [] }, { status: 401 });
  const addresses = await db.userAddress.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
  });
  return NextResponse.json({ addresses });
}

export async function PUT(request: NextRequest) {
  const user = await requireSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const addresses = Array.isArray(body?.addresses) ? body.addresses : [];
  await db.$transaction([
    db.userAddress.deleteMany({ where: { userId: user.id } }),
    ...addresses.map((address: Record<string, unknown>) =>
      db.userAddress.create({
        data: {
          userId: user.id,
          label: address.label ? String(address.label) : null,
          displayName: String(address.displayName ?? ''),
          flatNo: address.flatNo ? String(address.flatNo) : null,
          address: String(address.address ?? ''),
          contactName: address.contactName ? String(address.contactName) : null,
          contactMobile: address.contactMobile ? String(address.contactMobile) : null,
          lat: typeof address.lat === 'number' ? address.lat : null,
          lng: typeof address.lng === 'number' ? address.lng : null,
        },
      })
    ),
  ]);
  const saved = await db.userAddress.findMany({ where: { userId: user.id }, orderBy: { updatedAt: 'desc' } });
  return NextResponse.json({ addresses: saved });
}
