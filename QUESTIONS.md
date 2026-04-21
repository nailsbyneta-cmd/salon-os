# Open Questions

## Q-001: Test-Strategie — Snapshot-Tests oder reine Behavior-Tests?
Bei Block A (Härtung) baue ich Unit-Tests für alle API-Module. Zwei
Ansätze:
- **A) Reine Behavior-Tests** (was die Methode tut, gegen fixture-DB mit Testcontainers)
- **B) Snapshot-Tests für DTOs + Behavior für Logik**
→ **Vorschlag / Default:** A) — Snapshots in diesem Domain-Modell laden
zur Fragilität ein. Testcontainers-Postgres für Integration.
**Blockiert:** nein (Default verwendet, wenn keine Antwort bis Block-A-Start)

## ✅ Beantwortet

### Q-002: Staff-App → Expo + EAS (2026-04-21)
Native RN-App via Expo/EAS, Share-Layer via Tamagui oder Solito.

### Q-003: Loyalty → 1 Punkt = 1 € (2026-04-21)
Fresha/Treatwell-Style 1:1. Anzeige als Euro-Value.

### Q-004: WorkOS → MVP nur Magic-Link, SAML hinter Feature-Flag (2026-04-21)
Kein Live-SSO im MVP. SAML-Hook für Enterprise-Tier vorbereitet.

### Q-005: Tip-Split → B+C (2026-04-21)
Pro-Service-Default in Settings + Pro-Termin-Override durch Stylist im POS.
