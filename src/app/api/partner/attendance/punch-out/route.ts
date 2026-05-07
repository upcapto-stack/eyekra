import { NextRequest, NextResponse } from 'next/server';
import { PartnerShiftState } from '@prisma/client';
import { db } from '@/core/api/db';
import { logPartnerAction } from '@/core/api/server/partner/audit';
import { requirePartnerUser } from '@/core/api/server/partner/auth';
import { punchOutSchema } from '@/core/api/server/partner/validation';

function toFiniteNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function distanceMetersBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const earthRadiusMeters = 6_371_000;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const haversine = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return earthRadiusMeters * arc;
}

export async function POST(request: NextRequest) {
  const partner = await requirePartnerUser(request);
  if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const parsed = punchOutSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
    const { selfieUrl, liveness, previewOnly, geo, returnChecklist } = parsed.data;
    const geofenceCenterLat = toFiniteNumber(process.env.PARTNER_GEOFENCE_CENTER_LAT);
    const geofenceCenterLng = toFiniteNumber(process.env.PARTNER_GEOFENCE_CENTER_LNG);
    const geofenceRadius = toFiniteNumber(process.env.PARTNER_GEOFENCE_RADIUS_METERS) ?? 50;

    if (geofenceCenterLat !== null && geofenceCenterLng !== null) {
      if (!geo) {
        return NextResponse.json({ error: 'Location is required for punch-out' }, { status: 400 });
      }
      const distanceMeters = distanceMetersBetween(
        { lat: geofenceCenterLat, lng: geofenceCenterLng },
        { lat: geo.lat, lng: geo.lng },
      );
      if (distanceMeters > geofenceRadius) {
        return NextResponse.json(
          {
            error: `You are outside geofence by ${Math.round(distanceMeters - geofenceRadius)}m`,
            geofence: {
              inside: false,
              distanceMeters: Math.round(distanceMeters),
              radiusMeters: geofenceRadius,
            },
          },
          { status: 403 },
        );
      }
    }

    if (previewOnly) {
      return NextResponse.json({
        ok: true,
        previewOnly: true,
        geofence: {
          inside: true,
          radiusMeters: geofenceRadius,
        },
      });
    }

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
