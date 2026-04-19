# @salon-os/worker

Background workers auf Basis von BullMQ + Redis.

## Was hier läuft

Phase 1 Queues:
- `reminders` — Termin-Erinnerungen per SMS + E-Mail (24h / 2h vor Termin)
- `emails` — Transactional + Marketing via Postmark/Resend
- `exports` — DSGVO-Exports + Reports (async generiert, R2-Upload)
- `webhook-deliveries` — Outbound-Webhooks mit Retry-Ladder
- `outbox` — Pollt outbox-Tabelle (Outbox-Pattern, siehe CLAUDE.md)

## Lokal

```bash
pnpm db:up                         # Redis muss laufen
pnpm --filter @salon-os/worker dev
```

## Deploy

Getrennter Fly.io-Machine-Type (langlebige Prozesse) oder Railway-Worker-Service.
Kein HTTP-Port nach aussen, nur Redis-Verbindung.
