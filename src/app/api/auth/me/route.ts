import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/core/api/server/session';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) return NextResponse.json({ user: null }, { status: 401 });
    return NextResponse.json({ user });
  } catch (e) {
    console.error('me error', e);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
