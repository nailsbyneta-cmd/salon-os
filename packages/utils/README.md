# @salon-os/utils

Framework-unabhängige Utilities.

## Aktuell

- `money.ts` — Rundung, Formatierung (Intl-basiert, locale-aware).
- `logger.ts` — minimaler strukturierter Logger. Wird später durch pino + OTel ersetzt.

## Kommt später

- `date.ts` — Timezone-aware Helper (via `date-fns-tz`).
- `phone.ts` — E.164-Normalisierung (libphonenumber-js).
- `id.ts` — nanoid / ULID Helper für non-uuid IDs (Invoice-Number, Receipt-Number).
