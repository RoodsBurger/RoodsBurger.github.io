export interface CounterValue {
  count: number;
  resetAt: number;
}

// Storage interface the rate limiter reads and writes through, so Netlify Blobs and an in-memory map can both back it.
export interface CounterStore {
  get(key: string): Promise<CounterValue | null>;
  set(key: string, value: CounterValue): Promise<void>;
}

// An in-memory CounterStore, for local runs and tests where Netlify Blobs isn't available.
export function memoryStore(): CounterStore {
  const map = new Map<string, CounterValue>();
  return {
    async get(key) {
      return map.get(key) ?? null;
    },
    async set(key, value) {
      map.set(key, value);
    },
  };
}

export interface CheckLimitOptions {
  limit: number;
  windowMs: number;
  now: number;
}

export interface CheckLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

// Applies a fixed-window rate limit against the given key, incrementing the counter only on allow.
export async function checkLimit(
  store: CounterStore,
  key: string,
  { limit, windowMs, now }: CheckLimitOptions,
): Promise<CheckLimitResult> {
  const existing = await store.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    await store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }
  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }
  const count = existing.count + 1;
  await store.set(key, { count, resetAt: existing.resetAt });
  return { allowed: true, remaining: limit - count, resetAt: existing.resetAt };
}
