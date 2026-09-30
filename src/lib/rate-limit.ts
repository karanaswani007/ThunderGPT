type Bucket = { timestamps: number[] };

const store = new Map<string, Bucket>();

const WINDOW_MS = 60 * 60 * 1000;

export const LIMITS = {
  guestChat: 8,
  authChat: 80,
  authImage: 12,
  guestImage: 2,
  title: 40,
} as const;

function prune(bucket: Bucket, now: number) {
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < WINDOW_MS);
}

export function rateLimit(
  key: string,
  limit: number,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const bucket = store.get(key) ?? { timestamps: [] };
  prune(bucket, now);
  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((WINDOW_MS - (now - oldest)) / 1000));
    store.set(key, bucket);
    return { ok: false, retryAfterSec };
  }
  bucket.timestamps.push(now);
  store.set(key, bucket);
  return { ok: true };
}

export function clientKey(userId: string | null, request: Request): string {
  if (userId) return `user:${userId}`;
  const fwd = request.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "anon";
  return `ip:${ip}`;
}
