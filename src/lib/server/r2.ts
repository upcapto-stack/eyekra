import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

const endpoint = accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined;

const canUseR2 = Boolean(endpoint && accessKeyId && secretAccessKey);

const s3Client = canUseR2
  ? new S3Client({
      region: 'auto',
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
