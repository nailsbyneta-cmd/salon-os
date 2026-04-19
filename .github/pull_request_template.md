# PR — SALON OS

## Was / Warum

<!-- 1-3 Sätze: was ändert der PR, warum. -->

## Betroffene Module / Packages

- [ ] apps/api
- [ ] apps/web
- [ ] apps/worker
- [ ] apps/mobile-staff
- [ ] apps/mobile-client
- [ ] packages/db
- [ ] packages/auth
- [ ] packages/ui
- [ ] packages/types
- [ ] packages/utils
- [ ] packages/config

## Self-Review-Checkliste

- [ ] TypeScript strict: kein neues `any`, kein `@ts-ignore` ohne Kommentar
- [ ] Zod-Validation an neuen API-Grenzen
- [ ] Idempotency-Key unterstützt (bei Writes)
- [ ] RLS-Policy ergänzt (bei neuer tenant-skoped Tabelle)
- [ ] i18n-Keys statt hardcoded Strings in UI
- [ ] Tests: Unit (Logik) + Integration (API) + E2E (falls user-visible Flow)
- [ ] README oder `docs/modules/<name>.md` aktualisiert
- [ ] WEEKLY.md ergänzt (Status)
- [ ] Feature-Flag eingehängt (bei neuem User-visible Feature)
- [ ] Keine neuen hardcoded Secrets (alles via env/Doppler)
- [ ] Schweizer Hochdeutsch in UI-Strings (ss, Du)

## Migration / Rollback

<!-- Wenn DB-Schema oder Breaking API: Migration-Schritte + Rollback-Plan. -->

## Screenshots / Demos

<!-- Bei UI-Changes. -->
