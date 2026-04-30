import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logPartnerAction } from '@/lib/server/partner/audit';
import { requirePartnerUser } from '@/lib/server/partner/auth';
import { equipmentDamageSchema } from '@/lib/server/partner/validation';

export async function POST(request: NextRequest) {
  const partner = await requirePartnerUser(request);
  if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const parsed = equipmentDamageSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
    const { equipmentId, note, severity } = parsed.data;
    const photoUrl = parsed.data.photoUrl?.trim() || null;

    const assignment = await db.equipmentAssignment.findFirst({
      where: { equipmentId, partnerId: partner.id },
      orderBy: { assignedAt: 'desc' },
      select: { id: true },
    });

    const report = await db.equipmentDamageReport.create({
      data: {
        equipmentId,
        partnerId: partner.id,
        assignmentId: assignment?.id,
        note,
        photoUrl,
        severity,
      },
    });
    await logPartnerAction({
      partnerId: partner.id,
      action: 'equipment.report_damage',
      entityType: 'EquipmentDamageReport',
      entityId: report.id,
      metadata: { equipmentId, severity },
    });

    return NextResponse.json({ ok: true, reportId: report.id });
  } catch (error) {
    console.error('equipment damage report error', error);
    return NextResponse.json({ error: 'Failed to submit damage report' }, { status: 500 });
  }
}
