import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/api/db';
import { requirePartnerUser } from '@/core/api/server/partner/auth';

function recommendType(spherical: number, cylindrical: number): 'single-vision' | 'blue-cut' | 'progressive' {
  if (Math.abs(spherical) > 4 || Math.abs(cylindrical) > 2) return 'progressive';
  if (Math.abs(spherical) > 1.5 || Math.abs(cylindrical) > 1) return 'blue-cut';
  return 'single-vision';
}

export async function GET(request: NextRequest) {
  const partner = await requirePartnerUser(request);
  if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const spherical = Number(request.nextUrl.searchParams.get('spherical') ?? 0);
  const cylindrical = Number(request.nextUrl.searchParams.get('cylindrical') ?? 0);
  const type = recommendType(spherical, cylindrical);

  const latest = await db.appConfigVersion.findFirst({ orderBy: { createdAt: 'desc' } });
  const payload = (latest?.payload ?? {}) as { lenses?: unknown[] };
  const lenses = Array.isArray(payload.lenses) ? payload.lenses : [];

  const recommended = lenses.filter((l) => {
    if (typeof l !== 'object' || l === null) return false;
    const id = String((l as { id?: unknown }).id ?? '').toLowerCase();
    const name = String((l as { name?: unknown }).name ?? '').toLowerCase();
    if (type === 'single-vision') return id.includes('single') || name.includes('single');
    if (type === 'blue-cut') return id.includes('blue') || name.includes('blue');
    return id.includes('progressive') || name.includes('progressive');
  });

  return NextResponse.json({
    recommendationType: type,
    lenses: recommended.length ? recommended : lenses.slice(0, 3),
  });
}
