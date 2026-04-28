import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSessionUser } from '@/lib/server/authz';
import { createPresignedUploadUrl, isR2Configured } from '@/lib/server/r2';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];

export async function POST(request: NextRequest) {
  const user = await requireSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isR2Configured()) {
    return NextResponse.json({ error: 'R2 is not configured' }, { status: 500 });
  }
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Use JPEG, PNG, WebP, GIF or PDF.' },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Max 5MB.' },
        { status: 400 }
      );
    }
    const ext = file.name.split('.').pop() || (file.type === 'application/pdf' ? 'pdf' : 'png');
    const safeName = `prescriptions/rx-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const bucket = process.env.R2_BUCKET_PRESCRIPTIONS || '';
    if (!bucket) return NextResponse.json({ error: 'R2 bucket not configured' }, { status: 500 });
    const uploadUrl = await createPresignedUploadUrl({
      bucket,
      key: safeName,
      contentType: file.type,
    });
    const bytes = await file.arrayBuffer();
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: Buffer.from(bytes),
    });
    if (!uploadRes.ok) {
      return NextResponse.json({ error: 'Upload failed at storage layer' }, { status: 500 });
    }
    const privateBase = process.env.R2_PRIVATE_BASE_URL || '';
    const url = privateBase ? `${privateBase}/${safeName}` : safeName;
    await db.uploadAsset.create({
      data: {
        bucket,
        key: safeName,
        url,
        contentType: file.type,
        sizeBytes: file.size,
        category: 'prescription',
        uploadedBy: user.id,
      },
    });
    return NextResponse.json({ url, fileName: file.name });
  } catch (e) {
    console.error('Prescription upload error', e);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
