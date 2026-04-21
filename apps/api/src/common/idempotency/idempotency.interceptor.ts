import {
  BadRequestException,
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Observable, from, of, switchMap, tap } from 'rxjs';

import { getTenantContext } from '../../tenant/tenant.context.js';

import type { IdempotencyStore } from './idempotency.store.js';

export const IDEMPOTENCY_STORE = 'IDEMPOTENCY_STORE';
const TTL_SECONDS = 24 * 60 * 60;
const MAX_KEY_LEN = 255;
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Idempotency-Key-Dedupe für Write-Endpoints.
 *
 * Verhalten:
 *   - Header `Idempotency-Key` fehlt    → Request wird normal ausgeführt
 *   - Key passt NICHT zu Scope-Regex    → 400 BadRequest
 *   - Kein Store injiziert              → fail-open (log+durchlassen),
 *                                          damit lokale Dev ohne Redis läuft
 *   - Key bekannt, Cache-Hit            → gecachter Status+Body, kein Re-Run
 *   - Key neu                           → Handler läuft, Antwort wird
 *                                          für 24h gespeichert
 *
 * Scope: `idempotency:{tenantId}:{key}:{METHOD}:{URL}` — gleicher Key
 * in einem anderen Tenant oder auf einem anderen Endpoint kollidiert
 * NICHT.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(
    @Inject(IDEMPOTENCY_STORE)
    private readonly store: IdempotencyStore | null,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<FastifyReply>();

    if (IDEMPOTENT_METHODS.has(req.method)) {
      return next.handle();
    }

    const rawKey = headerValue(req.headers['idempotency-key']);
    if (!rawKey) {
      return next.handle();
    }
    if (rawKey.length > MAX_KEY_LEN || !/^[A-Za-z0-9_\-:.]+$/.test(rawKey)) {
      throw new BadRequestException(
        'Idempotency-Key enthält unzulässige Zeichen oder ist zu lang',
      );
    }

    if (!this.store) {
      this.logger.warn(
        'IDEMPOTENCY_STORE nicht konfiguriert — Dedupe deaktiviert.',
      );
      return next.handle();
    }

    const tenantId = getTenantContext()?.tenantId ?? 'anon';
    const cacheKey = `idempotency:${tenantId}:${rawKey}:${req.method}:${req.url}`;
    const store = this.store;

    return from(store.get(cacheKey)).pipe(
      switchMap((cached) => {
        if (cached) {
          reply.status(cached.status);
          return of(cached.body);
        }
        return next.handle().pipe(
          tap((body: unknown) => {
            const status = reply.statusCode || 200;
            // fire-and-forget; Fehler hier dürfen den Request nicht brechen
            void store
              .set(cacheKey, { status, body }, TTL_SECONDS)
              .catch((err) =>
                this.logger.warn(`Idempotency-Cache-Write fehlgeschlagen: ${String(err)}`),
              );
          }),
        );
      }),
    );
  }
}

function headerValue(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}
