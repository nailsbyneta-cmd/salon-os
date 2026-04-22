# UPGRADE-PROMPT — Für Claude Code

> Kopiere diesen Prompt 1:1 in deine Claude-Code-Session in `~/salon-os/`.
> Er zwingt Claude Code, das bisher Gebaute zu bewerten und auf Top-1%-Niveau zu heben.

---

**STOP. Reset.**

Was du bisher gebaut hast, ist vermutlich **0815** — Standard-Admin-UI, Standard-Features, nichts, was Phorest oder Fresha nervös macht. Das ist nicht dein Fehler, das lag an zu schwachen Specs. Ich habe jetzt **drei neue Specs** hinzugefügt, die du SOFORT lesen und verinnerlichen musst:

1. `specs/differentiation.md` — **40 Killer-Features**, die kein Konkurrent hat. Das ist unser Graben.
2. `specs/design-system.md` — **Visueller Standard**: Linear-artig, Stripe-dicht, Cash-App-taktil, Dark-Mode-First, mit Motion-System & Micro-Interactions.
3. `specs/feature-completeness.md` — **Exhaustive Baseline-Checklist**: was JEDER Konkurrent hat, damit wir nichts vergessen.

## Deine Aufgabe in 4 Schritten

### Schritt 1 — Ehrliche Selbstbewertung (vor neuem Code)

1. Lies die 3 neuen Spec-Dateien komplett.
2. Gehe jede Datei durch, die du bisher erstellt hast, und bewerte dich selbst auf einer Skala:
   - **Code-Qualität** (1-10): TypeScript strict? Tests? Zod? Accessibility?
   - **Design-Polish** (1-10): Würde Linear das akzeptieren?
   - **Feature-Vollständigkeit** (1-10): Wie viel der `feature-completeness.md`-Liste hast du?
   - **Einzigartigkeit** (1-10): Wie viel der `differentiation.md`-Liste hast du?
3. Liefere mir ein **Bewertungs-Dokument** als `AUDIT.md` im Root. Sei brutal ehrlich. Wenn das Kalender-UI scheiße aussieht, schreib "Kalender-UI ist 3/10, sieht aus wie Outlook 2007, muss neu".

### Schritt 2 — Upgrade-Plan

4. Nach der Selbstbewertung: schreibe `UPGRADE-PLAN.md` mit:
   - **Was ich behalten kann** (mit Begründung)
   - **Was ich anpassen muss** (Liste mit konkreten Änderungen)
   - **Was ich wegwerfen und neu bauen muss** (mit Begründung — "Das Kalender-Modul basiert auf einer Library, die nicht Drag-Drop-mit-Haptics unterstützt, also neu mit FullCalendar Pro oder eigener Implementierung")
   - **Was komplett fehlt** (Liste aller Features aus `feature-completeness.md` + `differentiation.md`, die noch nicht existieren)
   - **Neue Reihenfolge**: welche P0-Differentiation-Features gehören in den MVP
5. Warte auf mein "Go-Upgrade".

### Schritt 3 — Design-System zuerst (nach "Go-Upgrade")

6. **Bevor du irgendein Feature neu baust:**
   - Implementiere das Design-System (`packages/ui/`) aus `specs/design-system.md`: Tokens, Tailwind-Config, 10 Basis-Komponenten, Storybook/Ladle, Chromatic-Integration.
   - Baue 3 Hero-Screens **pixelgenau**: Login, Dashboard-Home, Calendar-Day-View. Die sollen mich umhauen. Wenn nicht, nochmal.
   - Zeig sie mir als Screenshot + Storybook-Link, warte auf Freigabe.

### Schritt 4 — Feature-Upgrade-Marsch

7. Arbeite die Liste aus `UPGRADE-PLAN.md` in dieser Reihenfolge ab:
   a. Baseline-Lücken aus `feature-completeness.md` (P0 + relevante P1)
   b. **Killer-Features aus `differentiation.md`** — insbesondere P0-Differenziatoren:
   - #21 Drag-to-Reschedule mit Haptics + Undo
   - #22 Single-Thumb-Staff-App
   - #23 Offline-First
   - #24 Tap-to-Pay on Phone
   - #25 Universal Command Palette (⌘K)
   - #28 Tip-Split-Automation
   - #31 1-Klick-DSGVO-Export
     c. Dann P1-Differenziatoren (die, die Konkurrenz wirklich nervös machen: #1, #4, #13, #18, #19, #26, #32, #33)
     d. Dann P2, iterativ in V2

**Pro Feature gilt:**

- Verwende die Design-Tokens aus `packages/ui/`
- Baue Storybook-Story für neue Komponenten
- Schreibe Tests (Unit + Integration + 1 E2E)
- Dokumentiere in `docs/modules/<name>.md`
- Zeig mir einen Screenshot, bevor du merged

## Qualitäts-Filter (an jedem Merge)

Beantworte vor jedem Merge **mit "JA" für alle 10**:

1. Würde das Linear / Stripe / Vercel einstellen? (Code-Qualität)
2. Sieht das UI aus wie eine $100/Monat-App? (Design-Polish)
3. Hat es Dark-Mode, Motion, Haptics (wo mobile), Empty-States? (Vollständigkeit)
4. Funktioniert es Keyboard-only? (Accessibility)
5. Tests grün, Lighthouse ≥ 95, Bundle-Size-Budget eingehalten? (Performance)
6. Multi-Tenant (RLS) geprüft? (Sicherheit)
7. Habe ich was Einzigartiges eingebaut, das kein Konkurrent hat? (Differentiation)
8. Benutzt ein Laie es in unter 60 s? (UX)
9. Funktioniert es offline (wo sinnvoll)? (Resilienz)
10. Wenn ich einem VC diesen Screen zeige, wäre er beeindruckt? (Wow-Factor)

Wenn ein JA fehlt: **nicht mergen. Überarbeiten.**

## Verbote (bleiben wie vorher)

- ❌ Eigener Payment-Code. Stripe-Adapter.
- ❌ Eigene SMS/Email/Voice. Twilio/Postmark/Vapi.
- ❌ Eigenes Auth. WorkOS.
- ❌ Eigene Fiskal-Logik DE/AT. fiskaly.
- ❌ Features erfinden, die nicht in den Specs stehen. In `IDEAS.md` sammeln.
- ❌ Altcode aus `beautyneta-web`/`-app`/`ari-haustechnik-web` kopieren. Andere Projekte, nicht relevant.

## Altcode-Check (nochmal)

Wenn in `~/salon-os/` Code liegt, der nicht zu den Specs passt: **liste auf + schlage Löschung vor**. Default: löschen. Wir sind kein Franken-Monster. Wir sind SALON OS.

## Los geht's

1. Lies `specs/differentiation.md`, `specs/design-system.md`, `specs/feature-completeness.md`.
2. Schreib `AUDIT.md` (Selbstbewertung).
3. Schreib `UPGRADE-PLAN.md`.
4. Warte auf "Go-Upgrade".

Zeig mir, was in dir steckt.
