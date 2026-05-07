import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/api/db';
import { requirePartnerUser } from '@/core/api/server/partner/auth';

export async function GET(request: NextRequest) {
  const partner = await requirePartnerUser(request);
  if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const assignments = await db.equipmentAssignment.findMany({
    where: { partnerId: partner.id, isActive: true },
    include: { equipment: true },
    orderBy: { assignedAt: 'desc' },
  });

  return NextResponse.json({
    items: assignments.map((a) => ({
      assignmentId: a.id,
      equipmentId: a.equipmentId,
      name: a.equipment.name,
      sku: a.equipment.sku,
      category: a.equipment.category,
      checklist: a.checklist,
      assignedAt: a.assignedAt,
    })),
  });
}
