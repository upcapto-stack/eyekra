import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/api/db';
import { requirePartnerUser } from '@/core/api/server/partner/auth';

export async function GET(request: NextRequest) {
  const partner = await requirePartnerUser(request);
  if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const latest = await db.appConfigVersion.findFirst({ orderBy: { createdAt: 'desc' } });
  const payload = (latest?.payload ?? {}) as { products?: unknown[] };
  const allFrames = Array.isArray(payload.products) ? payload.products : [];
  const q = request.nextUrl.searchParams.get('q')?.toLowerCase() ?? '';
  const category = request.nextUrl.searchParams.get('category') ?? '';

  const frames = allFrames.filter((item) => {
    if (typeof item !== 'object' || item === null) return false;
    const name = String((item as { name?: unknown }).name ?? '').toLowerCase();
    const itemCategory = String((item as { category?: unknown }).category ?? '');
    const matchesQ = q ? name.includes(q) : true;
    const matchesCategory = category ? itemCategory === category : true;
    return matchesQ && matchesCategory;
  });

  return NextResponse.json({ frames, count: frames.length });
}
