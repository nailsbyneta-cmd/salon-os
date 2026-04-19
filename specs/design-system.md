# Design-System & UX-Exzellenz

> Warum SALON OS wie eine **$100/Monat-App** aussieht, nicht wie ein $9/Monat-Tool.

## Referenz-Apps (unsere Messlatte)

Claude Code: **wenn du jemals unsicher bist, wie ein UI-Element aussehen soll, schau auf diese Referenzen**:

| Bereich                | Referenz                        | Warum                                                     |
| ---------------------- | ------------------------------- | --------------------------------------------------------- |
| Gesamt-Ästhetik        | **Linear**                      | Minimal, schnell, tastatur-first, dunkle Eleganz          |
| Dashboard & Charts     | **Stripe Dashboard**            | Klar, datenreich ohne Unordnung, lesbar auch bei 100 Rows |
| Mobile-Feel            | **Cash App**                    | Groß, taktil, Haptics, Einhand-bedienbar                  |
| Kalender               | **Cron / Notion Calendar**      | Dragging fühlt sich natürlich an, Conflict-Detection live |
| Onboarding             | **Superhuman / Raycast**        | Geführt, schnell produktiv, nie bevormundend              |
| Booking-Flow           | **Resy / OpenTable**            | 3 Schritte max, nie unterbrochen, immer klar wo du bist   |
| Empty States           | **Basecamp / Intercom**         | Nie leer, immer hilfreiche Illustration + nächste Aktion  |
| Kommandozeile (⌘K)     | **Linear / Raycast**            | Alles in 3 Keystrokes                                     |
| Marktplatz             | **Airbnb**                      | Bilder groß, Filter smooth, Trust-Signale prominent       |
| Formulare              | **Typeform**                    | Eine Frage pro Screen, freundliche Sprache, Progress-Bar  |
| Benachrichtigungen     | **Slack**                       | Unterscheidung Rauschen vs. wichtig, Bündelung            |
| Settings               | **Notion / Vercel**             | Suchbar, kategorisiert, nie überladen                     |

## Brand-Voice

- **Direkt, warm, kompetent.** Wir erklären nie zu viel.
- **Keine Management-Sprache** ("optimieren Sie Ihre Workflows"). Stattdessen: "Termine, die nicht kommen, kosten dich 12 % Umsatz. Wir reduzieren das."
- **Second-person, aber höflich** (DE: "du", EN: "you").
- **Zahlen statt Adjektive.** "Schnell" ist wertlos. "0,8 s Lade-Zeit" ist klar.
- **Humor sparsam, aber vorhanden.** Fehler-Screens dürfen lächeln.

## Design-Tokens (Start-Werte, frei iterierbar)

### Farben

```
--color-background:     #FAFAF9  (warm off-white)
--color-surface:        #FFFFFF
--color-surface-raised: #FFFFFF with shadow
--color-border:         #E7E5E4
--color-text-primary:   #0A0A0A
--color-text-secondary: #57534E
--color-text-muted:     #A8A29E

--color-brand:          #0F172A  (deep slate — professionell, nicht verspielt)
--color-brand-accent:   #D4A574  (warm gold, premium-feel, beauty-passend)
--color-success:        #16A34A
--color-warning:        #EAB308
--color-danger:         #DC2626
--color-info:           #0284C7

--color-dark-bg:        #0A0A0A
--color-dark-surface:   #171717
--color-dark-border:    #262626
```

**Dark-Mode ist First-Class**, nicht "auch verfügbar". Beauty-Branche arbeitet oft bei gedämpftem Licht.

### Typografie

```
--font-display: "Inter Display", -apple-system, system-ui
--font-body:    "Inter", -apple-system, system-ui
--font-mono:    "JetBrains Mono", ui-monospace
```

Größen via Fluid-Typography (clamp):
```
--text-xs:   clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem)
--text-sm:   clamp(0.875rem, 0.8rem + 0.3vw, 1rem)
--text-base: clamp(1rem, 0.95rem + 0.25vw, 1.125rem)
--text-lg:   clamp(1.25rem, 1.1rem + 0.5vw, 1.5rem)
--text-xl:   clamp(1.5rem, 1.3rem + 1vw, 2rem)
--text-2xl:  clamp(2rem, 1.75rem + 1.5vw, 3rem)
--text-3xl:  clamp(2.5rem, 2rem + 2vw, 4rem)
```

Line-height IMMER ≥ 1.5 für Fließtext. Font-Feature-Settings: `"cv11", "ss01"` (Inter-Lining-Numbers für Tabellen).

### Spacing

```
--space-1:  4px
--space-2:  8px
--space-3:  12px
--space-4:  16px
--space-5:  20px
--space-6:  24px
--space-8:  32px
--space-10: 40px
--space-12: 48px
--space-16: 64px
--space-20: 80px
--space-24: 96px
```

8-Punkt-Grid überall, nie halb-irrgendwas.

### Radius

```
--radius-sm: 6px   (Inputs, Tags)
--radius-md: 10px  (Cards, Buttons)
--radius-lg: 14px  (Modals, Large Cards)
--radius-xl: 20px  (Feature-Cards, Marketing)
--radius-full: 9999px (Avatars, Pills)
```

Kein 4-Pixel-Button neben 12-Pixel-Card — immer konsistent pro Kontext.

### Schatten

```
--shadow-sm:   0 1px 2px rgba(0,0,0,0.05)
--shadow-md:   0 2px 8px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)
--shadow-lg:   0 8px 24px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)
--shadow-xl:   0 16px 40px rgba(0,0,0,0.10), 0 4px 12px rgba(0,0,0,0.04)
--shadow-glow: 0 0 0 4px rgba(212, 165, 116, 0.12) (brand-focus-ring)
```

Schatten haben immer *zwei Layer* (große weiche + kleine harte) für physischen Look.

## Motion-System

### Timing-Funktionen

```
--ease-out-expo:  cubic-bezier(0.16, 1, 0.3, 1)     (smooth exit)
--ease-in-out:    cubic-bezier(0.4, 0, 0.2, 1)
--ease-spring:    cubic-bezier(0.34, 1.56, 0.64, 1)  (delightful snap)
--duration-fast:    150ms
--duration-medium:  250ms
--duration-slow:    400ms
--duration-modal:   300ms
```

### Regeln

- **Alles bewegt sich, nichts springt.** Layout-Changes animieren, keine Snap-Cuts.
- **Haptic-Feedback auf Mobile:** leichtes `selection` bei Tap, `impactMedium` bei Bestätigung, `success` bei abgeschlossener Aktion.
- **Sound-Design:** Kassensystem hat Tap-Sound beim Checkout (abstellbar). Neuer Termin → sanfter Ping. Nicht mehr.
- **Respect `prefers-reduced-motion`.**

### Signature-Moves

- **Drag-to-Reschedule im Kalender:** Termin hebt sich an (shadow-lg), folgt dem Cursor mit spring-ease, andere Termine weichen sanft aus, beim Drop: scale 1 → 1.02 → 1 bounce.
- **Checkout-Erfolg:** grüner Haken, der erst klein einfliegt, dann einen Kreis zeichnet, Haptic-Success, Konfetti-Variante bei > 50 € Trinkgeld.
- **Neue Buchung:** Toast slidet von oben-rechts rein, Push auf alle betroffenen Geräte, Calendar-Cell pulst 1× sanft.
- **Empty-State-Illustrations:** simpel, monochrom, keine Corporate-Grafik. Immer mit "was-jetzt"-Aktion.

## Komponenten-Bibliothek

**Basis:** **shadcn/ui** + **Radix UI** + **Tailwind CSS** + eigene Salon-spezifische Komponenten.

**Muss vom ersten Tag:**
- Button (5 Varianten: primary, secondary, ghost, danger, link; 3 Größen)
- Input, Textarea, Select, Combobox, DatePicker, TimePicker
- Badge, Tag, Chip
- Card, Modal, Drawer, Popover, Tooltip
- Toast (mit Swipe-to-Dismiss)
- Avatar, AvatarGroup
- Skeleton (für Loading-States — nicht Spinner!)
- DataTable (mit Sorting, Filtering, Pagination, Row-Selection, Actions)
- Command Palette (⌘K)
- EmptyState (mit Illustration-Slot)
- ErrorBoundary (mit "Copy to Clipboard"-Fehler-ID)

**Salon-spezifisch (eigene Komponenten):**
- `<AppointmentCard />` (Kalender-Item, drag-bar, status-color)
- `<ClientAvatar />` (mit Initialen-Fallback + VIP-Ring)
- `<ServiceBadge />` (Farbe pro Service-Kategorie)
- `<PriceDisplay />` (Währung, Rabatt, Tips)
- `<StaffScheduleGrid />` (Wochenansicht aller Stylists)
- `<TreatmentTimer />` (Count-up für laufende Behandlung)
- `<BeforeAfterSlider />` (interaktiver Vorher/Nachher)

## Layout-Prinzipien

### Web-Admin
- **Sidebar links, 240 px** (einklappbar auf 56 px mit Icons)
- **Oben: Global-Search (⌘K), User-Menu, Benachrichtigungen**
- **Main-Area max-width 1440 px** (bei größeren Screens zentriert)
- **Bottom-Status-Bar:** aktuelle Timezone, Sync-Status, Connection-Status

### Staff-Mobile
- **Bottom-Tab-Navigation** (5 Tabs max: Heute, Kalender, Kunden, Messages, Mehr)
- **Floating-Action-Button** unten rechts für Schnell-Aktionen
- **Top-Bar minimal**, nur Seiten-Titel + Kontext-Actions

### Consumer-App + Marketplace
- **Ergebnis-Ansicht: Karte oben (collapsible) + Liste darunter**
- **Buchungs-Flow als Bottom-Sheet** (nicht Full-Screen, damit Kontext sichtbar bleibt)
- **Preis & CTA IMMER sichtbar** (sticky footer)

## UX-Prinzipien

### Die 10 Gesetze

1. **Optimistic-Updates überall.** Jede Aktion reagiert sofort visuell, Server bestätigt im Hintergrund. Bei Fehler: Rollback mit Toast.
2. **Undo für alles** (auch Zahlungen innerhalb 60 s, auch Termin-Löschungen innerhalb 10 s).
3. **Smart-Defaults.** System merkt sich: letzten Tip-%, letzten Service, letzte Notiz-Struktur pro Stylist. Tippt der Nutzer je weniger, desto besser.
4. **Keyboard-Shortcuts für alles** (sichtbar via `?`-Hilfe). Power-User muss nie Maus anfassen.
5. **Ein-Finger-Mobile.** Alles im unteren Drittel erreichbar. Große Buttons (min 44×44 pt).
6. **Progressive Disclosure.** Einfache Nutzer sehen 80 % der Features nicht. Power-User finden sie via Search/Shortcut.
7. **Immer Wohin-jetzt.** Nach jeder abgeschlossenen Aktion: klarer Next-Step-CTA.
8. **Vertrauens-Signale überall.** "Zuletzt gebucht vor 3 Min", "94 % Kunden kommen wieder", "2 freie Plätze diese Woche".
9. **Fehlermeldungen sind Menschensprache.** Nie "Error 403". Immer "Du bist nicht eingeloggt — hier klicken zum Anmelden."
10. **Performance ist ein Feature.** Lighthouse ≥ 95 in allen Web-Flows. Mobile: 60 fps scrollen, cold-start < 2,5 s.

## Dichte vs. Weite

- **Admin-UI = dicht** (mehr Daten pro Screen, für Profis)
- **Consumer-UI = weit** (mehr Weiß, mehr Bilder, für Käufer im Freizeit-Mode)
- **Staff-Mobile-UI = mittel** (klar aber taktil für 8h-Schichten)

## Micro-Interactions-Katalog (Pflicht)

Claude Code muss für jedes dieser Momente eine durchdachte Interaktion bauen:

- Login-Success (Haptics + soft Pop + Redirect)
- Neuer Termin gebucht (Pulse auf Calendar-Cell + Toast)
- Kunde eingechecked (grüner Ring um Avatar + Confirm-Sound)
- Zahlung erfolgreich (Checkmark-Animation + Haptic-Success)
- Großer Trinkgeld (≥ 20 €): Konfetti 1 s
- Trennen Connection (Banner slidet rein, Status-Dot wird grau)
- Sync wieder da (Banner slidet raus, Status-Dot pulsiert grün 1×)
- Formular-Validation-Error (kurzes Shake + Field-Highlight)
- Swipe-Delete (roter Hintergrund erscheint, Icon wächst, Bestätigung via Tap)
- Drag-Drop (Haptic am Anfang + am Drop)
- Empty-State (Illustration fadet ein, Text tippt in 1 s rein)
- Loading > 1 s (Skeleton statt Spinner)
- Error-Screen (freundlich, "Kopieren-Button" für Error-ID, Button "Zurück" groß)

## Accessibility (verhandelbar = nicht)

- **WCAG 2.2 AA Pflicht.** AAA wo möglich.
- Farb-Kontrast IMMER getestet (axe-core in CI).
- Focus-Ring sichtbar (brand-glow-shadow), niemals `outline: none`.
- VoiceOver + TalkBack auf Mobile vollständig.
- Tab-Reihenfolge logisch, nie verlieren.
- Keyboard-trap niemals.
- Alt-Text für jedes Bild (KI-generiert mit Review).
- Reduced-Motion respektieren.

## Was Claude Code JETZT tun muss

1. **Design-Tokens als Tailwind-Config** in `packages/ui/tailwind.config.ts` einrichten.
2. **shadcn/ui initialisieren** mit diesem Config.
3. **10 Basis-Komponenten** aus der Liste oben bauen (Button, Input, Card, Modal, Toast, Skeleton, DataTable, CommandPalette, EmptyState, ErrorBoundary).
4. **Storybook** (oder Ladle, schneller) aufsetzen und jede Komponente dokumentieren.
5. **Chromatic** (oder Percy) für visuelle Regressions-Tests.
6. **Erst danach** mit Feature-Code anfangen.

**Faustregel:** Wenn etwas in Linear nicht aussehen würde wie es ist, bau es nochmal.
