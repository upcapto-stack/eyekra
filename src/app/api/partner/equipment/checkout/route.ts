import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logPartnerAction } from '@/lib/server/partner/audit';
import { requirePartnerUser } from '@/lib/server/partner/auth';
import { equipmentActionSchema } from '@/lib/server/partner/validation';

export async function POST(request: NextRequest) {
  const partner = await requirePartnerUser(request);
  if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const parsed = equipmentActionSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
    const { equipmentId, checklist } = parsed.data;

    const equipment = await db.equipmentItem.findUnique({ where: { id: equipmentId } });
    if (!equipment) return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });

    const assignment = await db.equipmentAssignment.upsert({
      where: { id: `${partner.id}:${equipmentId}` },
      update: { isActive: true, releasedAt: null, checklist: checklist.length ? { checklist } : undefined },
      create: {
        id: `${partner.id}:${equipmentId}`,
        equipmentId,
        partnerId: partner.id,
        isActive: true,
        checklist: checklist.length ? { checklist } : undefined,
      },
    });

    await db.equipmentEvent.create({
      data: {
        equipmentId,
        partnerId: partner.id,
        assignmentId: assignment.id,
        type: 'CHECKOUT',
        checklist: checklist.length ? { checklist } : undefined,
      },
    });
    await logPartnerAction({
      partnerId: partner.id,
      action: 'equipment.checkout',
      entityType: 'EquipmentAssignment',
      entityId: assignment.id,
      metadata: { equipmentId, checklistCount: checklist.length },
    });

    return NextResponse.json({ ok: true, assignmentId: assignment.id });
  } catch (error) {
    console.error('equipment checkout error', error);
    return NextResponse.json({ error: 'Failed to checkout equipment' }, { status: 500 });
  }
}
