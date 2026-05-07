import webpush from 'web-push';
import { db } from '@/core/api/db';

let configured = false;

function ensureWebPushConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  const subject = process.env.WEB_PUSH_SUBJECT || 'mailto:support@eyekra.com';
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export function getWebPushPublicKey(): string {
  return process.env.WEB_PUSH_VAPID_PUBLIC_KEY || '';
}

export async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string }): Promise<void> {
  if (!ensureWebPushConfigured()) return;
  const subscriptions = await db.pushSubscription.findMany({ where: { userId } });
  if (subscriptions.length === 0) return;

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/notifications',
  });

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body
        );
      } catch {
        await db.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } }).catch(() => undefined);
      }
    })
  );
}

export async function sendPushToManyUsers(userIds: string[], payload: { title: string; body: string; url?: string }): Promise<void> {
  if (userIds.length === 0) return;
  await Promise.all(userIds.map((id) => sendPushToUser(id, payload)));
}
