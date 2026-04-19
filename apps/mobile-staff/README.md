# @salon-os/mobile-staff

Staff-App (iOS + Android) für Mitarbeitende im Salon. React Native + Expo.

## Status: Phase 0 — noch nicht initialisiert

Dieser Ordner ist noch leer. In Phase 1 wird mit Expo der Projekt-Baum angelegt:

```bash
pnpm dlx create-expo-app@latest --template blank-typescript apps/mobile-staff
```

Danach:
- Expo SDK 52+ (New Architecture)
- NativeWind (Tailwind für RN)
- TanStack Query + Zustand
- MMKV für Local-Storage
- `@stripe/stripe-react-native` für Tap-to-Pay
- `@salon-os/types` + `@salon-os/utils` aus dem Monorepo

Siehe [specs/mobile-apps.md](../../specs/mobile-apps.md) für die komplette Feature-Liste.

## Features (Phase 1)

- Heute-Ansicht (Termine, offene Aufgaben, Nachrichten)
- Kalender mit Drag-Drop
- Check-in + Checkout + Tap-to-Pay
- Client-Profile + Historie
- Nachrichten-Inbox (SMS/Chat)
- Clock-in/out + Pausen
- Formulare im Termin
- Vorher/Nachher-Fotos
