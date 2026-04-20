# Blockers

## 🔴 Kritisch (stoppen Fortschritt)

_Keine aktuell._

## 🟡 Wichtig (verzögern)

### BLK-001: WorkOS-API-Key fehlt
Für Block A (Härtung) brauche ich Magic-Link-Auth via WorkOS.
Tenant-Middleware hängt derzeit an HTTP-Headern — Phase-0-Shortcut, muss
ersetzt werden, sobald der Key da ist.
→ Lorenc: Account auf workos.com erstellen, `WORKOS_API_KEY` +
`WORKOS_CLIENT_ID` in Doppler eintragen.
**Blockiert seit:** 2026-04-20 (Session-Start)
**Blockiert:** WorkOS-Umstellung in Block A; alles andere geht weiter ohne.

### BLK-002: Stripe-Terminal-Konto für Tap-to-Pay
Für Diff #24 echt implementieren (Stripe Terminal iOS/Android SDK)
brauche ich: Stripe-Account im Live-Mode + Terminal-Reader-Registrierung
oder Tap-to-Pay-Freischaltung (US/EU).
→ Lorenc: kann warten bis Block D. Für jetzt: reicht Test-Mode für
UI-Arbeit.
**Blockiert seit:** 2026-04-20
**Blockiert:** Block D #24 echt. Dry-Run-Stub läuft weiter.

### BLK-003: fiskaly-TSE-Account (DE)
Für Diff #32 (TSE-Live-Monitoring) brauche ich einen fiskaly-Account
(Sandbox reicht vorerst).
→ Lorenc: kann auf Block E warten.
**Blockiert seit:** 2026-04-20
**Blockiert:** Block E #32/#33.

### BLK-004: Postmark-Server-Token (produktiv)
24h-Reminder + Confirmation-Email laufen aktuell als Dry-Run-Log, bis
`POSTMARK_SERVER_TOKEN` gesetzt ist. Für Alpha-Launch beim Beautycenter
brauchen wir echten Versand.
→ Lorenc: Postmark-Account + Domain-Verification + Token in Doppler.
**Blockiert seit:** 2026-04-20
**Blockiert:** echte Email-Zustellung. Funktional ist alles fertig.

## 🟢 Gelöst

_Noch keine gelöst in dieser Session._
