import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookieValue, destroySession } from '@/lib/server/session';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('eyekra_session')?.value;
    if (token) await destroySession(token);
    const response = NextResponse.json({ ok: true });
    response.headers.set('Set-Cookie', clearSessionCookieValue());
    return response;
  } catch (e) {
    console.error('logout error', e);
    return NextResponse.json({ error: 'Failed to logout' }, { status: 500 });
  }
}
