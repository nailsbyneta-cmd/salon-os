# CLAUDE.md — Anweisungen für Claude Code

Du baust **SALON OS**, eine globale All-in-One-Plattform für Beauty- und Wellness-Salons, die Phorest, Fresha, Treatwell, Booksy, Mangomint, Vagaro, GlossGenius, Boulevard, Zenoti und Timely in einem Produkt vereint und übertrifft.

## Cowork-Bridge (Async-Coordination mit Cowork-Mode)

**Bei jedem Session-Start:** Lies `~/Documents/Beautycenter-Brain/cc-cowork-bridge.md` und beachte alle ungelesenen `COWORK:` Messages — das sind Anweisungen oder Status-Updates von Cowork-Mode (der Mac-Desktop-Claude, der DB/Postgres/Watcher/Cloudflare/Telegram administriert).

**Wenn du eine Aufgabe abschliesst** (Commit gepusht, PR aufgemacht, Tests green/red, neuer Migration-Status): logge das in die Bridge mit:

```bash
bash ~/Documents/cowork-bridge/cc-helpers.sh cc-tell "<status>"
```

Cowork sieht's beim nächsten 5-min-Tick und reagiert (Telegram-Push, Auto-Health-Check der API/DB, etc.).

**Verfügbare Helpers:**

- `cc-tell <msg>` — Schreib an Cowork (löst Telegram-Push aus)
- `bridge-tail [n]` — Letzte n Zeilen der Bridge lesen

**Wichtig:** Cowork überwacht via `salon-status` LaunchAgent ob API/Web/Postgres laufen, kann sie restarten und hat Telegram-Bot. Wenn du eine DB-Migration startest oder Service-Restart brauchst, bitte Cowork via `cc-tell` darum.

## Leitprinzipien

1. **Lies immer zuerst `SPEC.md` und die relevanten Dateien in `specs/` bevor du Code schreibst.** Die Specs sind die Wahrheit.
2. **Global von Tag 1:** Multi-Tenant, Multi-Currency, Multi-Language (i18n), Multi-Tax, Multi-Timezone.
3. **API-first:** Jedes Feature hat eine dokumentierte REST- _und_ GraphQL-API. UI ist nur _ein_ Client.
4. **Mobile-first UX:** Salonmitarbeiter:innen arbeiten am Tablet/Handy — niemals schlechter als am Desktop.
5. **Multi-Tenant mit Row-Level-Security (RLS):** Jede Tabelle hat `tenant_id`, Postgres RLS erzwingt Isolation.
6. **KI ist eine eigene Schicht, kein Marketing-Gag.** Siehe `specs/ai-layer.md`.
7. **Keine Features ohne Tests.** Unit + Integration + E2E. CI-Gate: grün = mergen, rot = Block.
8. **Keine Abkürzungen bei Compliance.** DSGVO, TSE, PSD2, HIPAA, PCI-DSS. Siehe `specs/compliance.md`.
9. **Ein Monorepo.** Turborepo oder Nx. Pakete klar getrennt (apps/web, apps/api, apps/mobile, packages/ui, packages/db, packages/ai).
10. **Feature-Flags für alles Neue.** Unleash oder GrowthBook. Deploys ≠ Releases.

## Reihenfolge (strikt halten!)

### Phase 0 — Foundation (Woche 1)

1. Monorepo aufsetzen: Turborepo + pnpm + TypeScript + Biome/ESLint + Prettier + Vitest + Playwright.
2. Docker Compose für lokale Entwicklung: Postgres 16, Redis, Mailhog, Minio/S3-kompatibel.
3. CI/CD: GitHub Actions → Build, Test, Lint, Type-check, Security-scan (Trivy, Snyk).
4. `packages/db`: Prisma-Schema mit den Kernentitäten aus `specs/data-model.md`, RLS-Policies als SQL-Migration.
5. `apps/api`: NestJS (oder Hono/Fastify) mit Auth (WorkOS/Clerk/Auth0 oder eigene mit Argon2id + Passkeys), Multi-Tenant-Middleware.
6. `apps/web`: Next.js 15 App Router + Tailwind + shadcn/ui + TanStack Query + tRPC oder GraphQL-Client.
7. E2E-Smoketest: Login → Dashboard rendert → grün in CI.

### Phase 1 — MVP (Woche 2–12) — siehe `specs/roadmap.md`

Der MVP ist **nicht** "alles". Der MVP ist:

- Buchungsmodul (Kalender, Online-Booking, Deposits, Reminders, Waitlist)
- CRM (Kunden, Notizen, Historie, Formulare)
- Services & Personal (Teams, Rollen, Arbeitszeiten, Services, Preise, Dauer)
- POS light (Checkout, Karte via Stripe, Trinkgeld, Rechnung/Beleg)
- Reminders (E-Mail + SMS via Twilio/Vonage/MessageBird)
- Reports v1 (Umsatz, Auslastung, Top-Kunden)
- Multi-Location light
- DSGVO-Basics (Exports, Löschung, Consent)
- Branded Booking-Seite (public.salon-os.com/{slug})

### Phase 2 — V1 (Monat 4–6)

Inventar, Loyalty, Memberships, Gift Cards, Marketing-Kampagnen, Automated Flows, Reviews-Automation, Branded Client App (iOS+Android via React Native/Expo), AI Receptionist (Voice+SMS), Precision Scheduling, Payroll, Commissions, Xero/QuickBooks/DATEV-Export, TSE-Anbindung (fiskaly o. ä.).

### Phase 3 — V2 (Monat 7–12)

Marktplatz, Dynamic Pricing, AR Try-On, Multi-Location Enterprise, Franchise-Dashboards, Public API + Webhooks + Partner-Portal, Zapier/Make-App, White-Label für Ketten, Medspa/HIPAA-Modul.

## Wie du mit den Specs arbeitest

- `SPEC.md` = Vision + Produktstrategie + Features-Übersicht (Pflichtlektüre zuerst).
- `specs/*.md` = technische Tiefenspezifikation für jedes Modul.
- `specs/data-model.md` ist die verbindliche Schema-Quelle. Änderungen daran = Migration + ADR.
- `specs/api.md` ist die verbindliche API-Kontrakt-Quelle. Änderungen = Versionssprung.
- Jede nicht-triviale Entscheidung wird als **ADR** (Architecture Decision Record) in `docs/adr/` dokumentiert.

## Coding-Standards

- **TypeScript strict mode überall.** Keine `any`, keine `@ts-ignore` ohne ADR.
- **Zod für alle externen Eingaben.** Validierung an API-Grenzen, nie blindes Vertrauen.
- **Idempotency-Keys** für alle write-APIs (Payments, Bookings).
- **Outbox-Pattern** für Events (kein direktes Publish aus Transaktionen).
- **Ereignisgetrieben intern:** Postgres LISTEN/NOTIFY + BullMQ (Redis) für Background-Jobs.
- **OpenTelemetry** von Anfang an (Traces, Metrics, Logs).
- **Secrets** in Doppler oder Vault, nie in `.env`, nie im Repo.
- **Conventional Commits + semantic-release.** Changelog automatisch.

## Was du NICHT tun sollst

- Keine Neuimplementierung von Zahlungskram. Benutze **Stripe**, **Adyen** oder **Mollie** (Adapter-Muster).
- Kein eigenes E-Mail-Sending. Benutze **Postmark** oder **Resend**.
- Keine eigene Telefonie. Benutze **Twilio** / **Vonage** / **MessageBird**.
- Keine eigene OCR/AR. Benutze **OpenAI/Anthropic** für NLU, **Perfect Corp / ModiFace** (Lizenz) für AR Try-On.
- Kein eigenes Kassengesetz-Krypto. Benutze **fiskaly** (DE), **signatura/SignIT** (AT), **FIK** (DK) für TSE/Fiskalisierung.

## Start-Kommando

```
Lies README.md, CLAUDE.md, SPEC.md, specs/roadmap.md, specs/tech-stack.md und specs/data-model.md.
Erstelle anschließend einen detaillierten Implementierungsplan für Phase 0 (Foundation, 1 Woche).
Frag mich nur bei Abweichungen von den Specs zurück.
```
