import { NextRequest, NextResponse } from 'next/server';
import { requirePartnerUser } from '@/core/api/server/partner/auth';
import {
  getPartnerWarehouseAssignment,
  resolvePartnerWarehouseAssignment,
  savePartnerWarehouseAssignment,
} from '@/core/api/server/partner/warehouse';

export async function GET(request: NextRequest) {
  const partner = await requirePartnerUser(request);
  if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let assignment = await getPartnerWarehouseAssignment(partner.id);
  if (!assignment) {
    assignment = await resolvePartnerWarehouseAssignment(partner.id);
    await savePartnerWarehouseAssignment(partner.id, assignment);
  }

  return NextResponse.json({ assignment });
}
