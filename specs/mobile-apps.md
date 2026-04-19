# Mobile Apps — Staff + Client + White-Label

## Drei Apps, ein Codebase

Ein einziger React-Native-Monorepo-Workspace (`apps/mobile-staff`, `apps/mobile-client`, Template für White-Label):

### 1. Staff App (Mitarbeiter)
- **Primär Tablet + Smartphone**
- Funktionen:
  - Eigener Kalender (Day/Week)
  - Check-in Kunden
  - Checkout + Zahlung (Tap-to-Pay on iPhone/Android)
  - Formulare im Termin
  - Client-Profile mit History
  - Vorher/Nachher-Fotos aufnehmen
  - Nachrichten (SMS/Chat) Inbox
  - Time-Clock (Clock-in/out)
  - Trinkgeld-Summary
  - Push-Notifs für neue Buchungen/Nachrichten
- Auth: Passkeys + Biometrics
- Offline-Modus: Termine + Checkout, Sync wenn online

### 2. Consumer Marketplace App
- **Nur Smartphone (iOS + Android)**
- Konsumenten-App für Marktplatz
- Features:
  - Geo-Suche, Service-Filter, Bewertungen
  - Buchung, Wallet (Credits), Loyalty-Punkte salon-übergreifend
  - AR Try-On (Hair-Color, Make-up, Nail-Art)
  - Gift-Cards kaufen/verschenken
  - Push für Termin-Erinnerungen
  - In-App-Chat mit Salon

### 3. White-Label Branded App (Salon-spezifisch)
- **iOS + Android, pro Tenant automatisch gebaut**
- Technologie: **Expo EAS** + dynamisches Config-Generation
- Pipeline:
  1. Salon konfiguriert Logo, Farben, App-Name, Icon, Splash im Admin-Panel
  2. Backend triggert EAS-Build mit generierter `app.config.js`
  3. Fastlane auto-uploads an App Store + Play Store über Anthropic-Account (Apple Enterprise-Account, Google Developer-Account)
  4. Wir sind „Publisher", Salon ist die Marke
- Features (identisch zu Consumer-Marketplace-App, aber nur 1 Salon):
  - Buchen, Rebuchen, Historie
  - Loyalty + Gift-Cards
  - Push-Reminder
  - Store (eCom)
  - AR Try-On
  - Biometrics-Login

## Tech-Details

### Stack
- **React Native** 0.75+ (New Architecture)
- **Expo SDK 52+** (Expo Router, EAS Build, EAS Submit)
- **NativeWind** (Tailwind für RN)
- **TypeScript strict**
- **Zustand** (State)
- **TanStack Query**
- **React Native Reanimated 3**
- **react-native-gesture-handler**
- **MMKV** (statt AsyncStorage, 30× schneller)
- **Sentry** + **PostHog**
- **react-native-calendars**
- **@stripe/stripe-react-native** (Tap-to-Pay)
- **Expo-Camera + AR-SDK** (Perfect Corp React-Native-Bridge)

### CI/CD für Branded-Apps
- Master-Template im Repo
- CI-Job: `new-branded-app` → Config generieren → EAS Build → Artefakt → Admin-Notification
- Zertifikat-Verwaltung: wir betreiben einen Fastlane-„Match"-Repo
- App-Store-Update-Pipeline: Push-Update-Dienst (OTA) via Expo Updates für JS-Bugfixes ohne Store-Freigabe

### Performance
- Cold Start < 2,5 s
- Warm Start < 1 s
- Kalender-Scroll 60 fps
- Bilder: lazy-loaded, blurhash-placeholder, CDN-optimiert

## UI-Prinzipien
- Single-Thumb-Bedienung (Bottom-Tabs + untere Bedienleisten)
- Große Touch-Targets (≥ 44 pt iOS, ≥ 48 dp Android)
- Haptics bei wichtigen Aktionen
- Dark Mode Auto
- Accessibility: VoiceOver + TalkBack vollständig

## Staff-App-UX-Highlights
- „Heute"-Startbildschirm: alle Termine + offene Aufgaben + unbeantwortete Nachrichten
- Drag-to-Reschedule im Kalender
- Swipe-Aktionen (Check-in / Cancel / No-Show)
- Split-Screen: links Termin-Detail, rechts Kunden-Historie (Tablet)

## Client-App-UX-Highlights
- „3-Tap-Rebook": Tab Home → letzte Dienstleistung antippen → Zeit wählen → Fertig
- Smart-Search beim Buchen: „Haar-Farbe nächste Woche nach 17 Uhr"
- AR-Try-On mit Teilen zu Instagram/TikTok
- Loyalty-Tab als zentrale Motivation („Noch 2 Besuche bis zum Gratis-Schnitt")
