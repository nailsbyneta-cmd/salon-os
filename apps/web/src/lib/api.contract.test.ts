import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { MatchersV3, PactV3 } from '@pact-foundation/pact';
import { describe, expect, it } from 'vitest';

// ─── Consumer-Driven-Contract: web → api ──────────────────────
//
// Jeder Test beschreibt (a) die Anfrage, die `apiFetch()` sendet, und
// (b) die minimale Response-Shape, auf die die UI sich stützt.
// Pact schreibt daraus JSON unter `<repo>/pacts/` — der Provider
// (`apps/api`) verifiziert später, dass er diese Interaktionen liefert.

const PACTS_DIR = (() => {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, '../../../../pacts');
})();

const { eachLike, string, uuid } = MatchersV3;

const TENANT_ID = '11111111-1111-4111-8111-111111111111';

const provider = new PactV3({
  consumer: 'salon-os-web',
  provider: 'salon-os-api',
  dir: PACTS_DIR,
  logLevel: 'warn',
});

describe('GET /v1/clients — Clients-List-Contract', () => {
  it('liefert { clients: Client[] } mit den Feldern, die die UI konsumiert', async () => {
    provider
      .given('tenant has clients')
      .uponReceiving('a request for the first 50 clients of a tenant')
      .withRequest({
        method: 'GET',
        path: '/v1/clients',
        query: { limit: '50' },
        headers: {
          'x-tenant-id': TENANT_ID,
        },
      })
      .willRespondWith({
        status: 200,
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: {
          clients: eachLike({
            id: uuid('c0000000-0000-4000-8000-000000000001'),
            tenantId: uuid(TENANT_ID),
            firstName: string('Alice'),
            lastName: string('Muster'),
          }),
        },
      });

    await provider.executeTest(async (mockServer) => {
      process.env['PUBLIC_API_URL'] = mockServer.url;
      const { apiFetch } = await import('./api.js');

      const res = await apiFetch<{ clients: Array<{ id: string; firstName: string }> }>(
        '/v1/clients?limit=50',
        { tenantId: TENANT_ID },
      );

      expect(Array.isArray(res.clients)).toBe(true);
      expect(res.clients.length).toBeGreaterThan(0);
      const [first] = res.clients;
      expect(first).toMatchObject({
        id: expect.any(String),
        firstName: expect.any(String),
      });
    });
  });
});
