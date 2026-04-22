import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { createHash } from 'node:crypto';

// ioredis ist optional (Redis-only feature); Typings minimal genug
// definieren damit es ohne installiertes Package kompiliert.
interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: string, seconds: number): Promise<unknown>;
}

/**
 * Idempotency-Middleware für schreibende Public-Endpoints.
 * Schützt gegen Doppel-Buchungen durch Netzwerk-Retries.
 *
 * Strategie: Redis-Key aus (IP + Body-Hash), TTL 24h.
 * Ohne Redis → Middleware ist No-Op (fail-open).
 *
 * Client kann explizit `Idempotency-Key` Header setzen;
 * sonst wird ein Hash aus IP + Request-Body generiert.
 */
@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(IdempotencyMiddleware.name);
  private redis: RedisLike | null = null;

  constructor() {
    const redisUrl = process.env['REDIS_URL'];
    if (!redisUrl) return;
    // Dynamic import damit ioredis kein Hard-Dep ist — wenn Redis fehlt,
    // läuft api ohne Idempotenz (fail-open).
    // ioredis wird nur installiert wenn NODE_OPTIONS oder ENV das möchte —
    // im Salon-os-Standard-Stack haben wir direct-imports ausgeschaltet.
    // @ts-expect-error optional peer dep, Modul-Name zur Laufzeit aufgelöst
    (import('ioredis') as Promise<{ default: new (url: string, opts?: unknown) => RedisLike }>)
      .then(({ default: Redis }) => {
        this.redis = new Redis(redisUrl, { lazyConnect: true, enableReadyCheck: false });
      })
      .catch(() => {
        this.logger.warn('ioredis not available — idempotency disabled');
      });
  }

  async use(
    req: FastifyRequest['raw'] & { body?: unknown },
    res: FastifyReply['raw'],
    next: (err?: unknown) => void,
  ): Promise<void> {
    if (!this.redis || req.method !== 'POST') {
      next();
      return;
    }

    try {
      const explicit = (req.headers as Record<string, string | string[] | undefined>)[
        'idempotency-key'
      ];
      const keySource = explicit
        ? String(Array.isArray(explicit) ? explicit[0] : explicit)
        : `${req.socket.remoteAddress}:${hashBody(req.body)}`;

      const redisKey = `idempotency:${createHash('sha256').update(keySource).digest('hex')}`;
      const existing = await this.redis.get(redisKey);

      if (existing) {
        this.logger.log(`[idempotency] duplicate request → 409 key=${redisKey.slice(-8)}`);
        res.statusCode = 409;
        res.setHeader('Content-Type', 'application/problem+json');
        res.end(
          JSON.stringify({
            type: 'https://salon-os.com/problems/duplicate-request',
            title: 'Duplicate request',
            status: 409,
            detail:
              'This request was already processed. Retry with a new Idempotency-Key if intentional.',
          }),
        );
        return;
      }

      // Mark as in-flight for 24h. Value irrelevant.
      await this.redis.set(redisKey, '1', 'EX', 86400);
    } catch (err) {
      // Redis errors → fail-open (don't block the request).
      this.logger.warn(`[idempotency] Redis error — fail-open: ${(err as Error).message}`);
    }

    next();
  }
}

function hashBody(body: unknown): string {
  if (!body) return 'empty';
  const str = typeof body === 'string' ? body : JSON.stringify(body);
  return createHash('sha256').update(str).digest('hex').slice(0, 16);
}
