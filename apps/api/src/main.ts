// OTel-Bootstrap MUSS vor allem anderen geladen werden, damit die
// Auto-Instrumentierung fastify/pg/ioredis/bullmq patchen kann.
import './otel.js';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import cookie from '@fastify/cookie';
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

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false, trustProxy: true }),
  );

  await app.register(helmet, {
    contentSecurityPolicy: process.env['NODE_ENV'] === 'production' ? undefined : false,
  });
  await app.register(cors, {
    origin: (process.env['ALLOWED_ORIGINS'] ?? 'http://localhost:3000').split(','),
    credentials: true,
  });

  // Cookies für signierte Session-Tokens (WorkOS-Magic-Link-Flow).
  await app.register(cookie, {
    secret: process.env['WORKOS_COOKIE_PASSWORD'],
    parseOptions: { signed: false },
  });

  // Rate-Limiting auf Public-Endpoints (Booking, Waitlist, Self-Service).
  // 60 Requests / Minute / IP. Skippt Non-Public-Routen, sodass
  // authenticated Admin-Pfade ihr eigenes Budget haben (→ kommt später).
  // Rate-Limiting auf Public-Endpoints (Booking, Waitlist, Self-Service).
  // 60 Requests / Minute / IP. `allowList` als Funktion liefert `true`
  // für Pfade, die NICHT rate-limited werden sollen — Admin-Routen haben
  // dadurch eigenes Budget (kommt später via scoped Plugin).
  await app.register(rateLimit, {
    max: Number(process.env['PUBLIC_RATE_LIMIT_MAX'] ?? 60),
    timeWindow: '1 minute',
    hook: 'preHandler',
    allowList: (req) =>
      !req.url.startsWith('/v1/public/') && !req.url.startsWith('/public/'),
    errorResponseBuilder: (_req, ctx) => ({
      type: 'https://salon-os.dev/errors/rate-limit',
      title: 'Too Many Requests',
      status: 429,
      detail: `Rate limit exceeded. Try again in ${Math.ceil(ctx.ttl / 1000)}s.`,
    }),
  });

  const port = Number(process.env['PORT'] ?? 4000);
  await app.listen({ port, host: '0.0.0.0' });
  // eslint-disable-next-line no-console
  console.log(`[api] listening on :${port}`);
}

void bootstrap();
