import { Redis } from "ioredis";
import type { CacheStore } from "./types.js";

export class RedisCacheStore implements CacheStore {
  private readonly redis: Redis;
  private readonly prefix: string;

  constructor(options?: { url?: string; prefix?: string; redis?: Redis }) {
    this.prefix = options?.prefix ?? process.env.CACHE_PREFIX ?? "aibase:cache:";
    this.redis =
      options?.redis ??
      new Redis(options?.url ?? process.env.REDIS_URL ?? "redis://localhost:6379", {
        maxRetriesPerRequest: 2,
        lazyConnect: true,
      });
  }

  private k(key: string) {
    return `${this.prefix}${key}`;
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(this.k(key));
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds && ttlSeconds > 0) {
      await this.redis.set(this.k(key), value, "EX", ttlSeconds);
      return;
    }
    await this.redis.set(this.k(key), value);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(this.k(key));
  }
}
