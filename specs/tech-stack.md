# Tech-Stack & Architektur

## Leitbild

- **Start simpel, aber skalierbar.** Ein Monolith mit klaren Modulen, der sich später in Services zerlegt, wenn nötig.
- **Nur Managed-Services außerhalb der Kernlogik.** (DB, Auth, Email, Messaging, Payments, AI.)
- **TypeScript überall.** Frontend, Backend, Mobile — gleiche Sprache, Shared-Types.

## Stack-Übersicht

### Frontend Web

- **Next.js 15** (App Router, React Server Components)
- **TypeScript 5.5+** (strict)
- **Tailwind CSS 4** + **shadcn/ui** als Design-System
- **TanStack Query** für Server-State
- **Zustand** für UI-State
- **tRPC** für intern (zwischen Next-Frontend und NestJS-API) oder GraphQL via Yoga für offene API
- **Zod** für Validierung
- **React Hook Form** für Formulare
- **date-fns-tz** für Zeitzonen
- **Recharts/ECharts** für Dashboards
- **Framer Motion** für Animationen
- **Socket.io-client** oder **Server-Sent Events** für Realtime

### Frontend Mobile

- **React Native** + **Expo** (EAS Build + EAS Submit)
- **NativeWind** (Tailwind für RN)
- **React Native Reanimated**, **React Native Gesture Handler**
- **Expo-Router** (File-based Routing)
- **MMKV** für lokales Storage
- **Fastlane** für Store-Auto-Deployment (White-Label-Apps generiert)

### Backend

- **NestJS** (oder **Hono**/**Fastify** für leichtere Services)
- **TypeScript strict**
- **Prisma ORM** (oder **Drizzle** — ADR treffen)
- **PostgreSQL 16** (Primär-DB, mit pgvector für Embeddings)
- **Redis 7** (Cache, Sessions, Rate-Limits, BullMQ-Queue)
- **BullMQ** für Background-Jobs
- **tRPC + REST + GraphQL** (tRPC intern; REST + GraphQL extern)
- **OpenAPI 3.1** automatisch generiert
- **Socket.io** oder **Supabase Realtime**-artiges Postgres-LISTEN
- **OpenTelemetry** (Traces+Metrics+Logs)
- **Helmet, csurf, express-rate-limit** für Security
- **Argon2id** für Passwörter (falls keine externe Auth)

### Auth

- **WorkOS** (Passkeys + SSO + Directory Sync für Enterprise)
  _oder_ **Clerk** (schneller Start, aber weniger Enterprise)
  _oder_ **Auth0** (Klassiker)
  Entscheidung: **WorkOS** für Enterprise-Ready von Tag 1.
- Rollen-System: RBAC + Row-Level-Security, Policies in Postgres + Service-Layer.

### Payments

- **Stripe** (primär)
  - Stripe Connect (Marketplace-Modell → Stylist-Payouts, Booth-Renter getrennt)
  - Stripe Terminal (Hardware)
  - Stripe Billing (Memberships)
  - Stripe Issuing (optional: Salon-Karten)
- **Adyen** (Enterprise, Mega-Ketten, global)
- **Mollie** (EU-lokale Methoden wie iDEAL, Bancontact, BLIK)
- Adapter-Muster: `IPaymentProvider`-Interface, Provider-Auswahl je Tenant.

### Messaging

- **Twilio Programmable Messaging** + **Voice** + **WhatsApp Business API**
- **Vonage** als Fallback
- **Postmark** für Transactional E-Mail
- **Resend** für Marketing-E-Mail
- **OneSignal** für Push (Branded Apps)

### AI

- **OpenAI GPT-4.1/4o** (primär)
- **Anthropic Claude Opus/Sonnet 4** (Fallback / Fachwissen / lange Kontexte)
- **Cohere Embed v3** oder OpenAI text-embedding-3-large (Embeddings)
- **pgvector** in Postgres (Vector-Store)
- **LangSmith** (Eval + Observability)
- **Perfect Corp** oder **ModiFace** (AR Try-On Lizenz)
- **Deepgram / AssemblyAI** (Voice-to-Text für Call-Recording)
- **ElevenLabs** (Voice-Synthesis für AI Receptionist) oder **Vapi**
- **Vapi** oder **Retell** für Voice-Agent-Infrastruktur (sparen Monate Arbeit)

### Search

- **Meilisearch** (selbstgehostet) oder **Typesense** Cloud
- Use-Cases: Service-Suche, Kunde-Suche, Marketplace-Suche

### Storage

- **AWS S3** oder **Cloudflare R2** (kostengünstiger)
- **Cloudinary** oder **Imgix** für Bild-CDN + Transformationen

### Infra

- **AWS** primär:
  - **ECS Fargate** oder **EKS** für Services
  - **RDS for Postgres** (Multi-AZ, mit Read-Replicas)
  - **ElastiCache** (Redis)
  - **S3** (Storage)
  - **Route 53** + **CloudFront** (DNS+CDN)
  - **SES** für E-Mail-Reputation (sekundär zu Postmark)
- **Cloudflare** für DNS, CDN, R2, Workers (Edge-Logik wie Booking-Widget)
- **Terraform** (HCL) für alles Infra-as-Code
- Alternative: **Fly.io** für schnellen Start, später Migration zu AWS wenn > 1000 Tenants

### CI/CD

- **GitHub Actions**
- **Turborepo Remote Cache** (Vercel-Hosting oder eigener S3-Cache)
- **Changesets** für Versionierung
- **semantic-release**
- **Trivy** + **Snyk** für Security-Scans
- **Playwright** E2E
- **Vitest** Unit+Integration
- **k6** Load-Testing

### Observability & Ops

- **Grafana Cloud** oder **Datadog** für Metrics/Traces/Logs
- **Sentry** für Error-Tracking
- **PagerDuty** oder **Opsgenie** für Incident-Response
- **Better Uptime** für Status-Page + Uptime-Checks
- **Linear** oder **Height** für Issue-Tracking (nicht Jira!)

### Security

- **Doppler** oder **HashiCorp Vault** für Secrets
- **Cloudflare Zero Trust** + WAF
- **ModSecurity** / AWS WAF
- **SOC 2 Type II** als Ziel für Monat 12 (via Vanta oder Drata)
- **PCI-DSS**: reines Stripe-Hosted, wir berühren keine Kartendaten (SAQ-A)
- **Pen-Tests** jährlich (z. B. Cure53, NCC Group)
- **Bug-Bounty** via HackerOne nach Launch

### Feature Flags

- **GrowthBook** (selbstgehostet, kostenlos) oder **Statsig** (Cloud)
- Feature-Flags per Tenant, User, %-Rollout

## Monorepo-Struktur

```
salon-os/
├─ apps/
│  ├─ api/                  # NestJS-Backend
│  ├─ web/                  # Next.js-Frontend (SaaS-Dashboard + Booking-Pages)
│  ├─ mobile-staff/         # React Native Staff-App
│  ├─ mobile-client/        # React Native Client-App (Consumer + White-Label-Template)
│  ├─ marketplace/          # Next.js Consumer-Marktplatz (eigene Domain)
│  ├─ worker/               # BullMQ-Background-Worker
│  └─ ai-agent/             # AI Receptionist + Flow-Engine
├─ packages/
│  ├─ db/                   # Prisma-Schema + Migrations + Seeds
│  ├─ ui/                   # shared shadcn-Komponenten
│  ├─ config/               # Shared configs (tailwind, eslint, tsconfig)
│  ├─ types/                # Shared TypeScript-Types (tRPC + Zod)
│  ├─ utils/                # Shared Utils (date, money, phone, validation)
│  ├─ ai/                   # AI-Layer-Abstraktionen
│  ├─ payments/             # Payments-Adapter
│  ├─ messaging/            # Messaging-Adapter (SMS/E-Mail/WhatsApp)
│  ├─ fiscal/               # TSE/Fiskal-Adapter
│  ├─ integrations/         # Google, Meta, TikTok, QBO, DATEV Clients
│  └─ sdk/                  # Offizielles Public SDK (npm publish)
├─ docs/
│  ├─ adr/                  # Architecture Decision Records
│  └─ api/                  # Generierte OpenAPI-Docs
├─ infra/
│  ├─ terraform/
│  ├─ docker/
│  └─ scripts/
├─ turbo.json
├─ pnpm-workspace.yaml
└─ package.json
```

## Multi-Tenant-Architektur

**Ansatz: Shared-DB + Schema, tenant_id auf jeder Tabelle + RLS.**

```sql
-- Beispiel für RLS
ALTER TABLE appointment ENABLE ROW LEVEL SECURITY;

CREATE POLICY appointment_tenant_isolation ON appointment
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

Jeder Request setzt `SET app.current_tenant_id = '…'` via Middleware.

**Vorteile:**

- Günstig (eine DB)
- Einfache Cross-Tenant-Analytics (z. B. Marketplace-Statistiken)
- Migration zu Schema-per-Tenant später möglich für Enterprise

**Grenzen:**

- Enterprise-Kunden verlangen evtl. eigene DB → dann Schema-per-Tenant oder eigene Instanz.
- Plan: ab 20 Locations + spezieller Compliance-Anfrage → dedizierter Tenant auf eigener Instanz.

## API-Oberflächen

| Typ                | Zweck                                        | Technologie               |
| ------------------ | -------------------------------------------- | ------------------------- |
| **Internal tRPC**  | zwischen Next-Frontend und Backend           | tRPC + Zod                |
| **Public REST**    | Partner, Zapier, Make, externe Integrationen | NestJS + OpenAPI 3.1      |
| **Public GraphQL** | Mobile-Apps, komplexe Queries                | GraphQL-Yoga + Dataloader |
| **Webhooks**       | Events an externe Systeme                    | signed (HMAC), retry      |
| **Realtime**       | Kalender-Updates, Chat, Queue                | Socket.io + Pg-LISTEN     |

Siehe `specs/api.md` für Endpunkte.

## Skalierungs-Roadmap

| Nutzer-Stufe      | Architektur                                                |
| ----------------- | ---------------------------------------------------------- |
| 0–1 k Salons      | Monolith, 1 ECS-Service, 1 RDS-Postgres (Multi-AZ)         |
| 1 k–10 k Salons   | Monolith + Read-Replicas, BullMQ mit Redis-Cluster         |
| 10 k–50 k Salons  | CQRS für Reporting (Postgres → ClickHouse/Materialize)     |
| 50 k–200 k Salons | Service-Zerlegung: Booking-Service, Payments, AI getrennt  |
| 200 k+            | Region-basierte Shards, Multi-Region-Deployment (EU/US/AP) |

## Sicherheits-Checkliste

- [ ] TLS 1.3 + HSTS überall
- [ ] Passkeys + optionales 2FA
- [ ] OAuth 2.0 + OIDC für Partner
- [ ] CSRF-Token für Web
- [ ] Rate-Limiting per Tenant + per IP
- [ ] Secrets-Rotation alle 90 Tage
- [ ] DB-Encryption-at-Rest (AWS KMS)
- [ ] Backup: tägliche Snapshots + PITR (7 Tage) + monatliche Offsite
- [ ] Disaster-Recovery-Test quartalsweise
- [ ] Audit-Log unveränderlich (append-only, kryptographisch signiert)
- [ ] PII-Scan (z. B. Nightfall, Macie) in Logs und Prompts
- [ ] Dependency-Scanning (Dependabot + Snyk)

## Performance-Budgets

| Endpoint                   | P95-Ziel |
| -------------------------- | -------- |
| `GET /bookings`            | 150 ms   |
| `POST /bookings`           | 300 ms   |
| `GET /calendar/day`        | 250 ms   |
| `GET /client/:id`          | 200 ms   |
| Web Startseite (TTI)       | 1,5 s    |
| Online-Booking-Seite (TTI) | 2,0 s    |
| Mobile-App Cold Start      | 2,5 s    |
| Mobile-App Warm Start      | 1,0 s    |

Monatliche Performance-Reports, Regressions-Alert über PR-Checks.
