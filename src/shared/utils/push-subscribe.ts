import { getSettings } from '@/core/config/settings';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export async function ensurePushSubscription(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
  const settings = getSettings();
  if (!settings.notifications) return;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  const keyRes = await fetch('/api/push/subscribe', { credentials: 'include' });
  if (!keyRes.ok) return;
  const keyData = (await keyRes.json()) as { publicKey?: string; enabled?: boolean };
  if (!keyData.enabled || !keyData.publicKey) return;

  const registration = await navigator.serviceWorker.register('/sw.js');
  const existing = await registration.pushManager.getSubscription();
  if (existing) return;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(keyData.publicKey) as unknown as BufferSource,
  });

  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(subscription),
  });
}
