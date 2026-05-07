import { GetObjectCommand, S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const accountId = process.env.R2_ACCOUNT_ID;
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

// Generic S3-compatible provider support (e.g. Backblaze B2)
const s3EndpointOverride = process.env.S3_ENDPOINT || process.env.B2_ENDPOINT;
const s3RegionOverride = process.env.S3_REGION || process.env.B2_REGION;
const s3AccessKeyIdOverride = process.env.S3_ACCESS_KEY_ID || process.env.B2_ACCESS_KEY_ID;
const s3SecretAccessKeyOverride = process.env.S3_SECRET_ACCESS_KEY || process.env.B2_SECRET_ACCESS_KEY;

const endpoint =
  s3EndpointOverride ||
  (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);
const region = s3RegionOverride || 'auto';
const accessKeyId = s3AccessKeyIdOverride || r2AccessKeyId;
const secretAccessKey = s3SecretAccessKeyOverride || r2SecretAccessKey;

const canUseR2 = Boolean(endpoint && accessKeyId && secretAccessKey);

const s3Client = canUseR2
  ? new S3Client({
      region,
      endpoint,
      credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
      },
    })
  : null;

export function isR2Configured(): boolean {
  return Boolean(s3Client);
}

export function getMissingR2ConfigKeys(): string[] {
  const missing: string[] = [];
  const usingGeneric = Boolean(s3EndpointOverride || s3AccessKeyIdOverride || s3SecretAccessKeyOverride);
  if (usingGeneric) {
    if (!endpoint) missing.push('S3_ENDPOINT (or B2_ENDPOINT)');
    if (!accessKeyId) missing.push('S3_ACCESS_KEY_ID (or B2_ACCESS_KEY_ID)');
    if (!secretAccessKey) missing.push('S3_SECRET_ACCESS_KEY (or B2_SECRET_ACCESS_KEY)');
    return missing;
  }
  if (!accountId) missing.push('R2_ACCOUNT_ID');
  if (!accessKeyId) missing.push('R2_ACCESS_KEY_ID');
  if (!secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY');
  return missing;
}

type UploadBucketKind = 'banners' | 'category-icons' | 'prescriptions';

export function resolveR2Bucket(kind: UploadBucketKind): string {
  const common = process.env.R2_BUCKET_UPLOADS || process.env.R2_BUCKET || '';
  if (kind === 'banners') return process.env.R2_BUCKET_BANNERS || common;
  if (kind === 'category-icons') return process.env.R2_BUCKET_CATEGORY_ICONS || common;
  return process.env.R2_BUCKET_PRESCRIPTIONS || common;
}

export function buildR2ObjectUrl(key: string, opts?: { private?: boolean }): string {
  const base = opts?.private
    ? process.env.R2_PRIVATE_BASE_URL || process.env.R2_PUBLIC_BASE_URL || ''
    : process.env.R2_PUBLIC_BASE_URL || '';
  if (base) return `${base.replace(/\/$/, '')}/${key}`;
  return `/api/upload/object?key=${encodeURIComponent(key)}`;
}

export async function createPresignedUploadUrl(params: {
  bucket: string;
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}): Promise<string> {
  if (!s3Client) {
    throw new Error('R2 not configured');
  }
  const command = new PutObjectCommand({
    Bucket: params.bucket,
    Key: params.key,
    ContentType: params.contentType,
  });
  return getSignedUrl(s3Client, command, { expiresIn: params.expiresInSeconds ?? 120 });
}

export async function getStorageObject(params: { bucket: string; key: string }) {
  if (!s3Client) throw new Error('R2 not configured');
  return s3Client.send(new GetObjectCommand({ Bucket: params.bucket, Key: params.key }));
}
