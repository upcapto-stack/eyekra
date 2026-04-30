import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { isPartnerRole } from '@/lib/server/partner/auth';
import { getSessionUser } from '@/lib/server/session';

export default async function PartnerProtectedLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/partner/login');
  if (!isPartnerRole(user.role)) redirect('/partner/login?error=role_required');
  return <>{children}</>;
}
