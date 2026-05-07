import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/api/db';
import { requirePartnerUser } from '@/core/api/server/partner/auth';

export async function GET(request: NextRequest) {
  const partner = await requirePartnerUser(request);
  if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const latest = await db.appConfigVersion.findFirst({ orderBy: { createdAt: 'desc' } });
  const payload = (latest?.payload ?? {}) as { offerRules?: unknown[] };
  const rules = Array.isArray(payload.offerRules) ? payload.offerRules : [];
  return NextResponse.json({ offers: rules });
}
