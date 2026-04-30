import { NextRequest, NextResponse } from 'next/server';
import { PartnerShiftState } from '@prisma/client';
import { db } from '@/lib/db';
import { logPartnerAction } from '@/lib/server/partner/audit';
import { requirePartnerUser } from '@/lib/server/partner/auth';
import { punchInSchema } from '@/lib/server/partner/validation';

export async function POST(request: NextRequest) {
  const partner = await requirePartnerUser(request);
  if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const parsed = punchInSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
    const { deviceId, selfieUrl, liveness, geo, equipmentChecklist: checklist } = parsed.data;

    await db.partnerDeviceBinding.upsert({
      where: { partnerId_deviceId: { partnerId: partner.id, deviceId } },
      update: { isActive: true, lastSeenAt: new Date() },
      create: { partnerId: partner.id, deviceId, isActive: true },
    });

    const activeAssignments = await db.equipmentAssignment.findMany({
      where: { partnerId: partner.id, isActive: true },
      select: { id: true, equipmentId: true },
    });

    const attendance = await db.attendanceLog.create({
      data: {
        partnerId: partner.id,
        shiftState: PartnerShiftState.READY,
        punchInAt: new Date(),
        punchInGeo: geo,
        punchInSelfieUrl: selfieUrl,
        punchInLiveness: liveness,
        deviceId,
        notes: checklist.length ? JSON.stringify({ checklist }) : null,
      },
    });

    if (activeAssignments.length > 0) {
      await db.equipmentEvent.createMany({
        data: activeAssignments.map((a) => ({
          equipmentId: a.equipmentId,
          partnerId: partner.id,
          assignmentId: a.id,
          type: 'CHECKOUT',
          checklist: checklist.length ? { checklist } : undefined,
        })),
      });
    }
    await logPartnerAction({
      partnerId: partner.id,
      action: 'attendance.punch_in',
      entityType: 'AttendanceLog',
      entityId: attendance.id,
      metadata: { deviceId, liveness, checklistCount: checklist.length },
    });

    return NextResponse.json({ ok: true, attendanceId: attendance.id, shiftState: attendance.shiftState });
  } catch (error) {
    console.error('partner punch-in error', error);
    return NextResponse.json({ error: 'Failed to punch in' }, { status: 500 });
  }
}
