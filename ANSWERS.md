# Answers from Lorenc

> Lorenc pflegt diese Datei. Claude Code liest sie zu Session-Start.
> Beantwortete Fragen werden in `QUESTIONS.md` als ✅ markiert.

## 2026-04-26 — Lorenc (via Telegram)

### Q-001: Test-Strategie
**A) Reine Behavior-Tests** mit Testcontainers-Postgres. Kein Snapshot-Testing für DTOs — zu fragil bei häufigen Schema-Änderungen im MVP.

### Q-002: Staff-Expo-App oder Capacitor-Wrapper
**A) Echte React-Native-App via Expo + EAS.** Der Differenziator lebt davon, dass es sich nativ anfühlt. Share-Layer via Tamagui oder Solito ist OK. → Starte Block D mit Expo.

### Q-003: Loyalty — €-Verhältnis
**1 € = 10 Punkte**, Anzeige als Euro-Value ("100 Pkt = 10 €"). Grosszügig + transparent. Default bestätigt.

### Q-004: WorkOS — Magic-Link oder Enterprise-SSO
**MVP nur Magic-Link.** SSO-Toggle als Feature-Flag für Enterprise-Tier vorbereiten. Default bestätigt.

### Q-005: Tip-Split Konfiguration
**B + C — Pro-Service-Default in Settings, pro Termin override durch Stylist im POS-Checkout.** Default bestätigt.
