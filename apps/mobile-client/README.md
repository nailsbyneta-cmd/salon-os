# @salon-os/mobile-client

Consumer-App (iOS + Android) für Endkundinnen. React Native + Expo.
Dient als Basis sowohl für den **Consumer-Marketplace** (`salon-os.com`-App)
als auch für **White-Label Branded-Apps** pro Salon.

## Status: Phase 0 — noch nicht initialisiert

Init (später):

```bash
pnpm dlx create-expo-app@latest --template blank-typescript apps/mobile-client
```

## Stack

- Expo SDK 52+ (New Architecture)
- NativeWind (Tailwind für RN)
- TanStack Query
- Expo Router (File-based)
- `react-native-reanimated` + Gesture Handler
- Perfect Corp / ModiFace SDK für AR Try-On (Phase 3)

## Features (Phase 2+)

- Geo-Suche, Service-Filter, Bewertungen
- Buchung (mit + ohne Account via Magic-Link)
- Wallet + Loyalty-Punkte (salon-übergreifend)
- AR Try-On (Hair Color, Makeup, Nail Art)
- Gift-Cards kaufen/verschenken
- Push-Reminder
- In-App-Chat mit Salon

## White-Label Pipeline

Automatischer EAS-Build pro Tenant mit dynamischer `app.config.js` (Logo, Farben,
App-Name, Bundle-ID). Wird in Phase 3 aufgesetzt — siehe
[specs/mobile-apps.md](../../specs/mobile-apps.md).
