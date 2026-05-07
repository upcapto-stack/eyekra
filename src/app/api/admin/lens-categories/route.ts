import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { db } from '@/core/api/db';
import { isStaffOrAdmin, requireSessionUser } from '@/core/api/server/authz';

async function gate(request: NextRequest) {
  const user = await requireSessionUser(request);
  if (!user || !isStaffOrAdmin(user.role)) {
    return { user: null, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { user, res: null as NextResponse | null };
}

export async function GET(request: NextRequest) {
  const { res } = await gate(request);
  if (res) return res;
  const categories = await db.lensBlankCategory.findMany({ orderBy: { key: 'asc' } });
  return NextResponse.json({ categories });
}

export async function POST(request: NextRequest) {
  const { res } = await gate(request);
  if (res) return res;
  const body = (await request.json()) as { key: string; name: string; description?: string; useCases?: unknown[]; badge?: string };
  if (!body?.key?.trim() || !body?.name?.trim()) {
    return NextResponse.json({ error: 'key and name required' }, { status: 400 });
  }
  const c = await db.lensBlankCategory.create({
    data: {
      key: body.key.trim(),
      name: body.name.trim(),
      description: body.description?.trim() || null,
      useCases: JSON.parse(JSON.stringify(body.useCases ?? [])) as Prisma.InputJsonValue,
      badge: body.badge?.trim() || null,
    },
  });
  return NextResponse.json({ id: c.id });
}
