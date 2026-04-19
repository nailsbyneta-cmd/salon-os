# ADR 0003 — NestJS mit Fastify-Adapter (statt Express)

**Status:** Accepted
**Datum:** 2026-04-19
**Kontext:** Phase 0 — apps/api

## Entscheidung

`apps/api` nutzt **NestJS 11** mit dem **Fastify-Adapter** (nicht Express).

## Warum

- Fastify ist 2–3× schneller als Express bei gleichem NestJS-DX.
- NestJS unterstützt Fastify als First-Class-Citizen; DI, Interceptors,
  Guards, Pipes funktionieren identisch.
- Performance-Budget aus `specs/tech-stack.md` (P95 < 150 ms für
  `GET /bookings`) ist mit Fastify eher erreichbar.
- Plugin-Ökosystem: `@fastify/helmet`, `@fastify/cors`, `@fastify/rate-limit`
  sind alle maintainted.

## Konsequenzen

- `type: "module"` in `apps/api/package.json` — NestJS läuft komplett ESM.
- HTTP-Server-Hooks werden über Fastify's Signatur geschrieben, nicht Express.
- Wo es wirklich um Middleware-Kompatibilität mit Express-Only-Packages geht,
  greifen wir auf Fastify-Adapter-Wrappers zurück oder implementieren als
  NestJS-Interceptor.
