import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const hasUpstash = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

const redis = hasUpstash
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

const fallback = new Map<string, { count: number; resetAt: number }>();

export async function limitRequest(key: string, limit = 20, windowSeconds = 60): Promise<boolean> {
  if (redis) {
    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(limit, `${windowSeconds}s`),
      analytics: true,
    });
    const result = await ratelimit.limit(key);
    return result.success;
  }

  const now = Date.now();
  const item = fallback.get(key);
  if (!item || item.resetAt < now) {
    fallback.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return true;
  }
  if (item.count >= limit) return false;
  item.count += 1;
  fallback.set(key, item);
  return true;
}
