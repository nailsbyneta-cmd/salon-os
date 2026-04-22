import './otel.js';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { AppModule } from './app.module.js';

/**
 * Production-Guard: In Production MUSS WorkOS konfiguriert sein.
 * TenantMiddleware ist in Phase 0 ein Header-Placeholder — ohne echten
 * Session-Check-Mechanismus darf der Server nicht public laufen.
 */
function assertProductionSafety(): void {
  if (process.env['NODE_ENV'] !== 'production') return;
  const required = ['WORKOS_API_KEY', 'WORKOS_CLIENT_ID', 'WORKOS_COOKIE_PASSWORD'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `[api] Production-Abbruch: Auth nicht konfiguriert. Fehlende env vars: ${missing.join(', ')}. ` +
        `TenantMiddleware im Header-Modus ist NICHT production-safe.`,
    );
  }
}

async function bootstrap(): Promise<void> {
  assertProductionSafety();

  // trustProxy: 1 = genau 1 Hop vertrauen (Railway-Edge). `true` würde
  // beliebig viele XFF-Hops akzeptieren und damit Client-seitiges Spoofing
  // der Rate-Limit-Key erlauben. Lokal (NODE_ENV≠production) bleibt der
  // Rechner sowieso direkt erreichbar — hier ist `true` akzeptabel.
  const trustProxy = process.env['NODE_ENV'] === 'production' ? 1 : true;
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false, trustProxy }),
  );

  await app.register(helmet, {
    contentSecurityPolicy: process.env['NODE_ENV'] === 'production' ? undefined : false,
  });
  await app.register(cors, {
    origin: (process.env['ALLOWED_ORIGINS'] ?? 'http://localhost:3000').split(','),
    credentials: true,
  });

  // Rate-Limit: grosszügig default, hart nur auf schreibenden Public-
  // Endpoints (via skip-Funktion). Admin + Webhooks + Health sind exempt.
  // Wichtig: Booking-SSR aus Next-Pod trifft /v1/public/:slug/info hoch-
  // frequent beim Render — deshalb 600/min global, damit das nicht breakt.
  // Writes auf /v1/public/bookings|waitlist sind eng limitiert durch zusätz-
  // liche serverseitige Zod-Validierung + GiST-Conflict; 600/min reicht.
  await app.register(rateLimit, {
    global: true,
    max: 600,
    timeWindow: '1 minute',
    hook: 'preHandler',
    skip: (req) => {
      const url = req.url;
      // Health + Stripe-Webhooks (HMAC-signiert, kein IP-basiertes DoS-
      // Risiko — Retries würden unnötig geblockt).
      if (url.startsWith('/health')) return true;
      if (url.startsWith('/v1/payments/webhook')) return true;
      return false;
    },
    errorResponseBuilder: (_req, ctx) => ({
      type: 'https://salon-os.com/problems/rate-limit',
      title: 'Zu viele Anfragen',
      status: 429,
      detail: `Bitte warte ${Math.ceil(ctx.ttl / 1000)}s und versuch es erneut.`,
    }),
  });
  // Problem+JSON-Content-Type für 429-Responses setzen, damit das Format
  // zum Rest der API passt (Plugin-Filter liegt ausserhalb der Nest-
  // ExceptionFilter-Chain).
  const fastify = app.getHttpAdapter().getInstance();
  fastify.addHook('onSend', async (_req, reply, payload) => {
    if (reply.statusCode === 429) {
      reply.type('application/problem+json');
    }
    return payload;
  });

  const port = Number(process.env['PORT'] ?? 4000);
  await app.listen({ port, host: '0.0.0.0' });
  // eslint-disable-next-line no-console
  console.log(`[api] listening on :${port}`);
}

void bootstrap();
