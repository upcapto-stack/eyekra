import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/api/db';
import { logPartnerAction } from '@/core/api/server/partner/audit';
import { requirePartnerUser } from '@/core/api/server/partner/auth';
import { equipmentActionSchema } from '@/core/api/server/partner/validation';

export async function POST(request: NextRequest) {
  const partner = await requirePartnerUser(request);
  if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const parsed = equipmentActionSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
    const { equipmentId, checklist } = parsed.data;

    const assignment = await db.equipmentAssignment.findFirst({
      where: { equipmentId, partnerId: partner.id, isActive: true },
      orderBy: { assignedAt: 'desc' },
    });
    if (!assignment) return NextResponse.json({ error: 'Active assignment not found' }, { status: 404 });

    await db.equipmentAssignment.update({
      where: { id: assignment.id },
      data: {
        isActive: false,
        releasedAt: new Date(),
        ...(checklist.length ? { checklist: { checklist } } : {}),
      },
    });

    await db.equipmentEvent.create({
      data: {
        equipmentId,
        partnerId: partner.id,
        assignmentId: assignment.id,
        type: 'RETURN',
        checklist: checklist.length ? { checklist } : undefined,
      },
    });
    await logPartnerAction({
      partnerId: partner.id,
      action: 'equipment.return',
      entityType: 'EquipmentAssignment',
      entityId: assignment.id,
      metadata: { equipmentId, checklistCount: checklist.length },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('equipment return error', error);
    return NextResponse.json({ error: 'Failed to return equipment' }, { status: 500 });
  }
}
