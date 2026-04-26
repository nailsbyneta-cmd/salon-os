# Übergabe von Cowork an Claude Code — 2026-04-26

Cowork (Claude in der Sandbox) hat das Setup angefangen aber kommt nicht weiter weil keine direkte Bash-Ausführung auf dem Mac möglich ist. Claude Code übernimmt.

## Aktueller Zustand

### ✅ Was läuft

- **Postgres@17** läuft (homebrew service, port 5432)
- **Redis** läuft (homebrew service, port 6379)
- **DB `salon_os`** existiert mit User `salon` (Passwort `salon`, SUPERUSER)
- **pgvector + pgcrypto + pg_trgm + unaccent** Extensions aktiv
- **15 Prisma Migrations** angewendet (`0001_init` bis `0015_appointment_series`)
- **`.env` Datei** existiert mit DATABASE_URL + DIRECT_URL auf localhost:5432
- **Symlink** `packages/db/.env -> ../../.env` damit Prisma die env findet

### ⚠️ Was noch nicht klappt

- **`pnpm db:seed`** scheitert weil `tsx` die `.env` nicht automatisch lädt
  - Workaround: `DATABASE_URL="..." DIRECT_URL="..." pnpm db:seed`
  - Besser: `seed.ts` mit `dotenv/config` import erweitern oder seed-script in package.json mit dotenv-cli wrappen
- **`pnpm dev`** läuft, aber Browser zeigt "Unerwarteter Fehler" (Ref 3227098399)
  - API hat noch 3 TS-Errors die Cowork gefixt hat (siehe unten)
  - Web kann API noch nicht erreichen → fetch failed
- **Docker Desktop** ist installiert aber **startet nicht** (kein Wal-Symbol nach `open /Applications/Docker.app`)
  - Wir haben bewusst native Postgres/Redis statt Docker verwendet (siehe oben)
  - Docker kann später für Mailpit nachgezogen werden, aktuell unwichtig

### 🛠 Code-Änderungen die Cowork bereits committed/staged hat

In `git status` siehst Du diese Files (alle uncommitted, ready für Review):

**Outbox-Pattern (vom Outbox-Agent):**
- `apps/api/src/common/common.module.ts` (neu)
- `apps/api/src/common/outbox.service.ts` (neu)
- `apps/api/src/common/outbox.service.spec.ts` (neu)
- `apps/api/src/appointments/appointments-outbox.spec.ts` (neu)
- `apps/api/src/appointments/appointments.service.ts` (modifiziert — Outbox enqueue in TX)
- `apps/api/src/reminders/reminders.service.ts` (modifiziert)
- `apps/api/src/reminders/reminders.module.ts` (modifiziert)
- `apps/api/src/app.module.ts` (modifiziert — CommonModule + 3 neue Module imported)
- `OUTBOX_IMPLEMENTATION.md` (Doku)

**Playwright E2E (vom Playwright-Agent):**
- `playwright.config.ts` (neu)
- `playwright/tests/01-public-booking.spec.ts` bis `05-audit-dsgvo.spec.ts` (neu, 5 Specs)
- `playwright/fixtures/test-tenant.ts` + `api-mocks.ts` (neu)
- `.github/workflows/e2e.yml` (neu)
- `playwright/README.md` + `PLAYWRIGHT_SETUP.md` (Doku)
- `package.json` (modifiziert — playwright scripts + dependency)

**3 Killer-Feature-Module (Stubs):**
- `apps/api/src/branding/` — White-Label Branding (Stub ohne DB, README für später)
- `apps/api/src/voice-ai/` — Voice-AI Receptionist (Vapi Stub mit Twilio-Webhook)
- `apps/api/src/whatsapp/` — WhatsApp-Booking (Meta Cloud API Stub)
- Cowork hat diese Files mit TS-Fixes bereits gepatched (PrismaService → reine Stub, Null-Checks für message)

**UX Quick-Wins:**
- `apps/web/src/components/mobile-shell.tsx` (Touch-Target 32→44px iOS-Standard)
- `packages/ui/src/input.tsx` (Inline-Error-Icon support)
- `apps/web/src/hooks/use-debounced-value.ts` (neu, für Command-Palette)

### 📋 Specs / Strategie

- **`specs/ULTIMATE-FEATURE-MATRIX.md`** — 754 Zeilen, 150+ Features priorisiert P0/P1/P2/P3, 12-Wochen-MVP-Roadmap. Konsolidiert aus 4 Deep-Research-Reports (Phorest/Fresha/Booksy/Treatwell + Mangomint/Vagaro/GlossGenius/Boulevard + Zenoti/Timely/Square/Mindbody + Innovation-Scan).
- **`SPEC.md` + `specs/*.md`** — bestehende Architektur-Specs

### 🎯 Nächste konkrete Schritte (was Lorenc will)

Lorenc will die App im Browser durchklicken können. Konkret:

1. **API zum Laufen bringen** — `pnpm dev` läuft, aber Web → API fetch failed.
   - Check: läuft `apps/api` auf Port 3001 (oder welchen Port spec sagt)?
   - Check: `tsc --noEmit` in apps/api — sind die 3 TS-Errors die Cowork gefixt hat wirklich weg?
   - Check: API health endpoint manuell testen (`curl http://localhost:3001/health`)

2. **Seed-Daten reinladen** — sonst leeres Dashboard:
   - Fix: `seed.ts` mit `import 'dotenv/config'` als erste Zeile, oder `db:seed` script in `packages/db/package.json` zu `dotenv -e ../../.env -- tsx prisma/seed.ts` ändern
   - Dann: `pnpm db:seed` durchläuft und legt Test-Tenant + Services + Staff an

3. **App durchklicken** — Lorenc soll auf http://localhost:3000 rendern + Demo-Booking durchführen können.

4. **Code-Review der 3 Sub-Agent-Outputs** (Outbox, Playwright, 3 Module) — Cowork hat sie geschrieben aber nicht im echten Build verifiziert. Lorenc will reviewen + entscheiden was committed wird.

5. **Frontend-Polish nach Cowork-Audit** — siehe `~/Documents/Beautycenter-Brain/salon-os-ux-audit-2026-04-25.md`:
   - Onboarding-Reife: 2/10 (kein Trial-Flow)
   - Empty-States generisch
   - Form-Validation ad-hoc
   - 3 Quick-Wins identifiziert in dem File

### 🚫 Was Cowork NICHT mehr macht

- Docker Desktop debuggen (nutzlos, native Postgres reicht)
- Setup-Scripts für DB (alles done)
- Weitere Sub-Agents dispatchen ohne Lorenc-Briefing

### 💡 Lorenc-Operating-Regeln (kritisch zu wissen)

- **Niemals fragen "soll ich X oder Y"** — entscheiden + ausführen, dann reporten
- **Top-1%-Niveau** in jeder Disziplin
- **Kein Geschwafel** — kurz, ehrlich, Operator-Klartext
- **Niemals auto-push** — Lorenc reviewt jeden Push manuell
- **CLAUDE.md im Repo-Root** ist Master-Regel-Datei

---

**Lorenc-Anweisung an Claude Code:**

> Lies dieses File + CLAUDE.md + STATUS.md + DISPATCH.md. Dann fix die seed.ts dotenv-Issue, validiere dass die App auf localhost:3000 ohne "Unerwarteter Fehler" rendert, und sag mir wenn ich durchklicken kann. Bei Problemen entscheidest du selbst — kein Multiple-Choice an mich.
