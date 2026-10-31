import crypto from 'node:crypto';
import { Redis } from '@upstash/redis';

export const KEY = 'fargo:content';
export const HIST = 'fargo:history';
export const COOKIE = 'fargo_admin';

// Works with both Upstash's own variable names and the ones Vercel's marketplace adds.
export function redis() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

const secret = () => process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || '';
const hmac = v => crypto.createHmac('sha256', secret()).update(String(v)).digest('hex');

export const sign = exp => `${exp}.${hmac(exp)}`;

export function safeEqual(a, b) {
  const A = crypto.createHash('sha256').update(String(a)).digest();
  const B = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(A, B);
}

export function authed(req) {
  if (!secret()) return false;
  const m = (req.headers.cookie || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m) return false;
  const [exp, sig] = decodeURIComponent(m[1]).split('.');
  if (!exp || !sig || Date.now() > Number(exp)) return false;
  return safeEqual(sig, hmac(exp));
}

export function cookie(value, maxAge) {
  return `${COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}
