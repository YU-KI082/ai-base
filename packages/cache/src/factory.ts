import type { CacheStore } from "./types.js";
import { MemoryCacheStore } from "./memory.js";
import { RedisCacheStore } from "./redis.js";

let singleton: CacheStore | null = null;

/**
 * Cache factory — memory by default; Redis when CACHE_BACKEND=redis.
 */
export function createCacheStore(): CacheStore {
  if (singleton) return singleton;
  const backend = process.env.CACHE_BACKEND ?? "memory";
  singleton =
    backend === "redis" ? new RedisCacheStore() : new MemoryCacheStore();
  return singleton;
}

export function resetCacheStoreForTests(): void {
  singleton = null;
}

export async function cachedJson<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
  store: CacheStore = createCacheStore(),
): Promise<T> {
  const hit = await store.get(key);
  if (hit) return JSON.parse(hit) as T;
  const value = await loader();
  await store.set(key, JSON.stringify(value), ttlSeconds);
  return value;
}
