# Open Questions

## ✅ Q-001: Test-Strategie — Snapshot-Tests oder reine Behavior-Tests?

Bei Block A (Härtung) baue ich Unit-Tests für alle API-Module. Zwei
Ansätze:

- **A) Reine Behavior-Tests** (was die Methode tut, gegen fixture-DB mit Testcontainers)
- **B) Snapshot-Tests für DTOs + Behavior für Logik**
  → **Vorschlag / Default:** A) — Snapshots in diesem Domain-Modell laden
  zur Fragilität ein. Testcontainers-Postgres für Integration.
  **Blockiert:** nein (Default verwendet, wenn keine Antwort bis Block-A-Start)

## ✅ Q-002: Staff-Expo-App oder Capacitor-Wrapper um PWA?

Diff #22 verlangt „Single-Thumb-Staff-App". Zwei Wege:

- **A) Echte React-Native-App** via Expo + EAS → native-feel, aber
  eigene Code-Basis + Share-Layer nötig
- **B) Capacitor/PWA-Wrapper** um bestehende `/m/*`-Routes → minimal
  Aufwand, aber weniger nativ-feel, kein Haptic-Feedback-API
  → **Vorschlag / Default:** A) — Differenziator lebt davon, dass es sich
  nativ anfühlt. Share-Layer via Tamagui oder Solito.
  **Blockiert:** Block D kann mit A starten, wenn keine Antwort bis dann.

## ✅ Q-003: Loyalty — €-Verhältnis final?

Aktuell deriviert Loyalty-Tier aus Lifetime-Spend. Für Punkte:
Wie viele Punkte pro Euro? Fresha = 1, Mangomint = 10, Treatwell = 1.
→ **Vorschlag / Default:** 1 € = 10 Punkte, mit Anzeige als Euro-Value
(„100 Pkt = 10 €"). Großzügig + transparent.
**Blockiert:** nein (aktuell nur Tier derived, keine Punkte in UI)

## ✅ Q-004: WorkOS — brauchen wir Enterprise-SSO (SAML) im MVP?

WorkOS kann Magic-Link (alle Pläne) oder SSO (Enterprise). Für Salon-MVP
reicht Magic-Link. Für zukünftige Ketten-Kunden brauchen wir SSO.
→ **Vorschlag / Default:** MVP nur Magic-Link. SSO-Toggle als Feature-
Flag vorbereiten für Enterprise-Tier.
**Blockiert:** nein

## ✅ Q-005: Tip-Split — wer konfiguriert die Regeln?

Diff #28 sagt „prozentual an Assistent/Shampoo". Wer stellt das pro
Salon ein?

- **A)** Salon-Owner in Settings → gilt für alle Termine
- **B)** Pro Service konfigurierbar (Farbe = Assistent 20%, Schnitt = 0%)
- **C)** Pro Termin override-bar durch Stylist
  → **Vorschlag / Default:** B+C — Pro-Service-Default in Settings, pro
  Termin override durch Stylist im POS-Checkout. A wäre zu grob.
  **Blockiert:** Block D #28 — kann mit Default starten

## ✅ Beantwortet

Alle 5 Fragen am 2026-04-26 von Lorenc beantwortet (siehe ANSWERS.md).
