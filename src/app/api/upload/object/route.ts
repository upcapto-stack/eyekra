import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/core/api/server/authz';
import { getStorageObject, resolveR2Bucket } from '@/core/api/server/r2';

function resolveBucketFromKey(key: string): string {
  if (key.startsWith('banners/')) return resolveR2Bucket('banners');
  if (key.startsWith('category-icons/')) return resolveR2Bucket('category-icons');
  if (key.startsWith('prescriptions/')) return resolveR2Bucket('prescriptions');
  return resolveR2Bucket('banners') || resolveR2Bucket('category-icons') || resolveR2Bucket('prescriptions');
}

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key')?.trim() ?? '';
  if (!key) return NextResponse.json({ error: 'key is required' }, { status: 400 });

  // Prescription files remain authenticated even when using storage proxy.
  if (key.startsWith('prescriptions/')) {
    const user = await requireSessionUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const bucket = resolveBucketFromKey(key);
  if (!bucket) return NextResponse.json({ error: 'Storage bucket not configured' }, { status: 500 });

  try {
    const obj = await getStorageObject({ bucket, key });
    const headers = new Headers();
    if (obj.ContentType) headers.set('Content-Type', obj.ContentType);
    if (obj.ContentLength != null) headers.set('Content-Length', String(obj.ContentLength));
    headers.set('Cache-Control', key.startsWith('prescriptions/') ? 'private, max-age=60' : 'public, max-age=300');
    return new NextResponse(obj.Body as BodyInit, { status: 200, headers });
  } catch (e) {
    console.error('Object fetch error', e);
    return NextResponse.json({ error: 'Object not found' }, { status: 404 });
  }
}
