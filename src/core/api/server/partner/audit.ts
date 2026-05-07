import { db } from '@/core/api/db';

export async function logPartnerAction(input: {
  partnerId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: unknown;
}): Promise<void> {
  await db.partnerAuditLog.create({
    data: {
      partnerId: input.partnerId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata == null ? undefined : JSON.parse(JSON.stringify(input.metadata)),
    },
  }).catch(() => undefined);
}
