import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/api/db';
import { requireSessionUser } from '@/core/api/server/authz';

export async function GET(request: NextRequest) {
  const user = await requireSessionUser(request);
  if (!user) return NextResponse.json({ settings: null }, { status: 401 });
  const settings = await db.userSetting.findUnique({ where: { userId: user.id } });
  return NextResponse.json({ settings });
}

export async function PUT(request: NextRequest) {
  const user = await requireSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const settings = await db.userSetting.upsert({
    where: { userId: user.id },
    update: {
      theme: body?.theme ? String(body.theme) : null,
      language: body?.language ? String(body.language) : null,
      metadata: JSON.parse(JSON.stringify(body?.metadata ?? {})),
    },
    create: {
      userId: user.id,
      theme: body?.theme ? String(body.theme) : null,
      language: body?.language ? String(body.language) : null,
      metadata: JSON.parse(JSON.stringify(body?.metadata ?? {})),
    },
  });
  return NextResponse.json({ settings });
}
