import { Redis } from 'ioredis';

// ─── Idempotency-Store — abstrakt, austauschbar ────────────────
// Der Interceptor kennt nur dieses Interface; in Tests wird ein In-Memory-
// Store injiziert, in Production die Redis-Implementierung.

export interface CachedResponse {
  status: number;
  body: unknown;
}

export interface IdempotencyStore {
  get(key: string): Promise<CachedResponse | null>;
  set(key: string, value: CachedResponse, ttlSec: number): Promise<void>;
}

export class RedisIdempotencyStore implements IdempotencyStore {
  constructor(private readonly redis: Redis) {}

  async get(key: string): Promise<CachedResponse | null> {
    const raw = await this.redis.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CachedResponse;
    } catch {
      return null;
    }
  }

  async set(key: string, value: CachedResponse, ttlSec: number): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttlSec);
  }
}

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly data = new Map<string, { value: CachedResponse; expiresAt: number }>();

  async get(key: string): Promise<CachedResponse | null> {
    const entry = this.data.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.data.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: CachedResponse, ttlSec: number): Promise<void> {
    this.data.set(key, { value, expiresAt: Date.now() + ttlSec * 1000 });
  }
}
