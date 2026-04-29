import { NextResponse } from 'next/server';

/** Public liveness: no DB, no secrets. Safe for load balancers and uptime monitors. */
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    { ok: true, service: 'eyekra' },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}

export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  });
}
