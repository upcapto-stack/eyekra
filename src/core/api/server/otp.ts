import bcrypt from 'bcryptjs';
import { db } from '@/core/api/db';

const OTP_EXPIRY_MINUTES = 10;

export function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function issueOtp(mobile: string, purpose: string, userId?: string): Promise<string> {
  const code = generateOtpCode();
  const codeHash = await bcrypt.hash(code, 10);
  await db.otpCode.create({
    data: {
      mobile,
      purpose,
      codeHash,
      userId,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
    },
  });
  return code;
}

export async function consumeOtp(mobile: string, purpose: string, code: string): Promise<boolean> {
  const latest = await db.otpCode.findFirst({
    where: {
      mobile,
      purpose,
      consumedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!latest) return false;
  if (latest.expiresAt.getTime() < Date.now()) return false;
  const ok = await bcrypt.compare(code, latest.codeHash);
  if (!ok) return false;
  await db.otpCode.update({
    where: { id: latest.id },
    data: { consumedAt: new Date() },
  });
  return true;
}
