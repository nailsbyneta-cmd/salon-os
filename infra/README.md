# Infrastructure

## Lokal

```bash
pnpm db:up     # Postgres + Redis + Mailhog + Minio
pnpm db:down
pnpm db:logs
pnpm db:reset  # ⚠️ wipe volumes
```

## Deploy-Targets

| Service         | Host     | Config                              |
| --------------- | -------- | ----------------------------------- |
| `apps/web`      | Vercel   | `apps/web/vercel.json`              |
| `apps/api`      | Fly.io   | `apps/api/fly.toml` + Dockerfile    |
| `apps/worker`   | Fly.io   | `apps/worker/fly.toml` + Dockerfile |
| `apps/mobile-*` | Expo EAS | (nach Phase 1)                      |

Alle in **Zürich (zrh)** als Primärregion für Swiss FADP + DSGVO-Konformität.

## Secrets

- **Lokal:** `.env` (nicht in git — `.env.example` ist die Vorlage).
- **Production:** Doppler (Projekt `salon-os-prod`, Environment `production`).
  In Fly-Apps eingehängt via `doppler run -- fly deploy`.
- **Rotation:** alle 90 Tage. Doppler triggert Audit-Log-Eintrag bei jeder
  Änderung.

## Terraform

Kommt in Phase 2 dazu — sobald AWS-Anteile (RDS, Elasticache, S3, Route53)
über Fly.io hinaus gebraucht werden. Siehe `infra/terraform/` (aktuell leer).

## Datenstandort

- **EU / DACH / CH:** Primär Fly.io `zrh` + (wenn AWS kommt) `eu-central-2`
  (Zürich) für Storage + DB.
- **UK / US / APAC:** Erweiterung in Phase 3, dann per-Tenant Region-Routing.
