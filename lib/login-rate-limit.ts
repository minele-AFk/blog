import { isIP } from 'node:net';
import { getLoginRateLimiter, isCloudflare } from './storage';

const WINDOW = 15 * 60 * 1000;
const MAX_ENTRIES = 10000;
const attempts = new Map<string, { count: number; expires: number }>();

export function getLoginClientKey(request: Request): string {
  // Only trust CF-Connecting-IP in Workers. Node operators must explicitly configure
  // a header that their reverse proxy overwrites on every request.
  const header = isCloudflare() ? 'cf-connecting-ip' : process.env.TRUSTED_CLIENT_IP_HEADER;
  const ip = header ? request.headers.get(header)?.trim() : undefined;
  return ip && isIP(ip) ? ip : 'untrusted-proxy';
}

export async function allowLoginAttempt(request: Request, now = Date.now()): Promise<boolean> {
  const key = getLoginClientKey(request);
  if (isCloudflare()) {
    const limiter = getLoginRateLimiter();
    // Fail closed if the shared edge binding is missing or unavailable.
    if (!limiter || !(await limiter.limit({ key: `admin-login:${key}` })).success) return false;
  }
  for (const [ip, entry] of attempts) if (entry.expires <= now) attempts.delete(ip);
  const entry = attempts.get(key);
  if (entry) {
    if (entry.count >= 5) return false;
    entry.count++;
  } else {
    if (attempts.size >= MAX_ENTRIES) return false;
    attempts.set(key, { count: 1, expires: now + WINDOW });
  }
  return true;
}
