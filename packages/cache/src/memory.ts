import type { CacheStore } from "./types.js";

export class MemoryCacheStore implements CacheStore {
  private readonly data = new Map<string, { value: string; expiresAt?: number }>();

  async get(key: string): Promise<string | null> {
    const row = this.data.get(key);
    if (!row) return null;
    if (row.expiresAt && row.expiresAt <= Date.now()) {
      this.data.delete(key);
      return null;
    }
    return row.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.data.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  }

  async del(key: string): Promise<void> {
    this.data.delete(key);
  }
}
