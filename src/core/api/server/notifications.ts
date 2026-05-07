import { db } from '@/core/api/db';
import { sendPushToManyUsers, sendPushToUser } from '@/core/api/server/push';

export type AppNotificationType =
  | 'order_placed'
  | 'order_status'
  | 'booking_created'
  | 'booking_status'
  | 'booking_assigned'
  | 'otp'
  | 'offer'
  | 'new_arrival'
  | 'reminder'
  | 'payout'
  | 'offers_updated';

export async function createUserNotification(input: {
  userId: string;
  type: AppNotificationType;
  title: string;
  message: string;
  data?: unknown;
}): Promise<void> {
  await db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      data: input.data == null ? undefined : JSON.parse(JSON.stringify(input.data)),
    },
  });
  await sendPushToUser(input.userId, {
    title: input.title,
    body: input.message,
    url: '/notifications',
  }).catch(() => undefined);
}

export async function broadcastToCustomers(input: {
  type: AppNotificationType;
  title: string;
  message: string;
  data?: unknown;
  limit?: number;
}): Promise<number> {
  const users = await db.user.findMany({
    where: { role: 'CUSTOMER' },
    select: { id: true },
    take: input.limit ?? 1000,
    orderBy: { createdAt: 'desc' },
  });
  if (users.length === 0) return 0;
  await db.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      type: input.type,
      title: input.title,
      message: input.message,
      data: input.data == null ? undefined : JSON.parse(JSON.stringify(input.data)),
    })),
  });
  await sendPushToManyUsers(
    users.map((u) => u.id),
    {
      title: input.title,
      body: input.message,
      url: '/notifications',
    }
  ).catch(() => undefined);
  return users.length;
}

export function humanizeOrderStatus(status: string): string {
  const map: Record<string, string> = {
    pending: 'Order placed',
    confirmed: 'Confirmed',
    in_lab: 'In lab',
    qc: 'Quality check',
    ready: 'Ready',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };
  return map[status] ?? status.replace(/_/g, ' ');
}

export function humanizeBookingStatus(status: string): string {
  const map: Record<string, string> = {
    pending: 'Booked',
    confirmed: 'Confirmed',
    scheduled: 'Scheduled',
    out_for_visit: 'Out for visit',
    optometrist_reached: 'Optometrist reached',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return map[status] ?? status.replace(/_/g, ' ');
}
