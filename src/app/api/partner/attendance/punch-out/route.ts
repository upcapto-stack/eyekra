import { NextRequest, NextResponse } from 'next/server';
import { PartnerShiftState } from '@prisma/client';
import { db } from '@/lib/db';
import { logPartnerAction } from '@/lib/server/partner/audit';
import { requirePartnerUser } from '@/lib/server/partner/auth';
import { punchOutSchema } from '@/lib/server/partner/validation';

export async function POST(request: NextRequest) {
  const partner = await requirePartnerUser(request);
  if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const parsed = punchOutSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
    const { selfieUrl, liveness, geo, returnChecklist } = parsed.data;

    const latestOpen = await db.attendanceLog.findFirst({
      where: { partnerId: partner.id, punchInAt: { not: null }, punchOutAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!latestOpen) return NextResponse.json({ error: 'No active punch-in found' }, { status: 400 });

    const attendance = await db.attendanceLog.update({
      where: { id: latestOpen.id },
      data: {
        shiftState: PartnerShiftState.OFFLINE,
        punchOutAt: new Date(),
        punchOutGeo: geo,
        punchOutSelfieUrl: selfieUrl,
        punchOutLiveness: liveness,
        notes: returnChecklist.length ? JSON.stringify({ returnChecklist }) : latestOpen.notes,
      },
    });

    const activeAssignments = await db.equipmentAssignment.findMany({
      where: { partnerId: partner.id, isActive: true },
      select: { id: true, equipmentId: true },
    });
    if (activeAssignments.length > 0) {
      await db.equipmentEvent.createMany({
        data: activeAssignments.map((a) => ({
          equipmentId: a.equipmentId,
          partnerId: partner.id,
          assignmentId: a.id,
          type: 'RETURN',
          checklist: returnChecklist.length ? { returnChecklist } : undefined,
        })),
      });
    }
    await logPartnerAction({
      partnerId: partner.id,
      action: 'attendance.punch_out',
      entityType: 'AttendanceLog',
      entityId: attendance.id,
      metadata: { liveness, checklistCount: returnChecklist.length },
    });

    return NextResponse.json({ ok: true, attendanceId: attendance.id, shiftState: attendance.shiftState });
  } catch (error) {
    console.error('partner punch-out error', error);
    return NextResponse.json({ error: 'Failed to punch out' }, { status: 500 });
  }
}
