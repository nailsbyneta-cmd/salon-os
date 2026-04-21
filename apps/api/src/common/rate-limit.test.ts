import { randomUUID } from 'node:crypto';

import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// Smoke-Test für die Rate-Limit-Konfiguration aus main.ts: public-Pfade
// werden limitiert, Admin-Pfade laufen durch. Minimaler Fastify-Mount
// ohne Nest, damit der Test schnell und isoliert bleibt.

async function buildApp(max = 2): Promise<ReturnType<typeof Fastify>> {
  const app = Fastify({ logger: false });
  await app.register(rateLimit, {
    max,
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
  app.get('/v1/public/ping', async () => ({ ok: true }));
  app.get('/v1/clients', async () => ({ ok: true }));
  return app;
}

describe('Rate-Limit-Konfiguration', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp(2);
  });

  afterEach(async () => {
    await app.close();
  });

  it('limitiert /v1/public/* nach max Requests pro IP', async () => {
    const headers = { 'x-forwarded-for': `203.0.113.${Math.floor(Math.random() * 255)}` };

    const ok1 = await app.inject({ method: 'GET', url: '/v1/public/ping', headers });
    const ok2 = await app.inject({ method: 'GET', url: '/v1/public/ping', headers });
    const blocked = await app.inject({ method: 'GET', url: '/v1/public/ping', headers });

    expect(ok1.statusCode).toBe(200);
    expect(ok2.statusCode).toBe(200);
    expect(blocked.statusCode).toBe(429);
    const problem = blocked.json() as { title: string; status: number };
    expect(problem.title).toBe('Too Many Requests');
    expect(problem.status).toBe(429);
  });

  it('lässt Admin-/Non-Public-Pfade unbegrenzt durch', async () => {
    const headers = { 'x-forwarded-for': `198.51.100.${Math.floor(Math.random() * 255)}` };

    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        app.inject({ method: 'GET', url: '/v1/clients', headers }),
      ),
    );

    for (const res of results) {
      expect(res.statusCode).toBe(200);
    }
  });

  it('liefert RFC-7807-kompatibles ProblemDetails-Payload', async () => {
    const headers = { 'x-forwarded-for': `192.0.2.${randomUUID().slice(0, 2)}` };
    await app.inject({ method: 'GET', url: '/v1/public/ping', headers });
    await app.inject({ method: 'GET', url: '/v1/public/ping', headers });
    const blocked = await app.inject({ method: 'GET', url: '/v1/public/ping', headers });

    const body = blocked.json() as Record<string, unknown>;
    expect(body).toMatchObject({
      type: expect.stringContaining('rate-limit'),
      title: 'Too Many Requests',
      status: 429,
      detail: expect.stringContaining('Rate limit exceeded'),
    });
  });
});
