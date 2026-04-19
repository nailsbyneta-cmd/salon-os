# Modul: Calendar & Scheduling

Teil von [specs/features.md §Modul 1](../../specs/features.md). Phase 1 Woche 4–5.

## Was das Modul tut

Die Kalender-Seele des Systems: Tages-/Wochen-/Monatsansicht mit Staff-Spalten,
Drag & Drop, Blockzeiten, Buffer-Zeiten, Raum-Zuweisung, Konflikt-Prävention.

## Datenmodell (Phase 1 Start)

Alle in `packages/db/prisma/schema.prisma` (Stand: Migration 0002):
- `Staff` + `StaffLocation` + `StaffService`
- `Room`
- `ServiceCategory` + `Service` + `ServiceVariant`
- `Appointment` + `AppointmentItem` + `AppointmentStatus` + `BookingChannel`
- `Shift` + `TimeOff`
- `Client` (geteilt mit Client-CRM-Modul)

**Schutz gegen Doppelbuchung:**
`appointment_no_overlap_per_staff` ist ein **GiST-Exclusion-Constraint** auf
`appointment`-Tabelle. Postgres verhindert atomar, dass ein Staff-Member zwei
aktive (nicht-cancelled/no-show/waitlist) Termine mit überlappenden Zeiten hat.
Schlägt auf DB-Ebene fehl → API mapped auf HTTP 409 Conflict.

## API-Endpoints

Siehe [specs/api.md §Appointments](../../specs/api.md).

**Phase 1 MVP (Woche 4–6):**

| Method | Path                                        | Zweck                     |
|--------|---------------------------------------------|---------------------------|
| GET    | `/v1/appointments?from=&to=&locationId=&staffId=` | Kalender-Feed     |
| POST   | `/v1/appointments`                          | Neu (intern)              |
| GET    | `/v1/appointments/:id`                      | Detail                    |
| PATCH  | `/v1/appointments/:id`                      | Partial update            |
| POST   | `/v1/appointments/:id/reschedule`           | Drag&Drop / resize        |
| POST   | `/v1/appointments/:id/check-in`             | Kunde eingetroffen        |
| POST   | `/v1/appointments/:id/start`                | Behandlung begonnen       |
| POST   | `/v1/appointments/:id/complete`             | Abgeschlossen → POS-Flow  |
| POST   | `/v1/appointments/:id/cancel`               | Storno (mit Reason)       |
| POST   | `/v1/appointments/:id/no-show`              | No-Show                   |

Alle Writes: `Idempotency-Key` empfohlen.

## UI-Seiten

- `/calendar` — Tages- + Wochenansicht. Staff-Spalten, Now-Line, Drag&Drop, Resize.
- `/calendar/settings` — Block-Zeiten verwalten, Buffer-Defaults pro Service.

## Zod-Schemas

`createAppointmentSchema`, `rescheduleAppointmentSchema`, `cancelAppointmentSchema`
in [`packages/types/src/domain.ts`](../../packages/types/src/domain.ts).

## RLS

Alle relevanten Tabellen haben `*_tenant_isolation`-Policy. `appointment` hat
zusätzlich `appointment_staff_scope` für SELECT: Stylisten sehen nur eigene
Termine, OWNER/MANAGER/FRONT_DESK sehen alle (siehe Migration 0002).

## Integrationen

- **Google Calendar / Outlook / Apple Calendar** bidirektional (Phase 2).
- **Meta Book-Now / Google Reserve / TikTok** (Phase 2).
- **Waitlist + Smart-Gap-Filling (AI)** (Phase 3).

## Tests

- **Unit (noch offen):** Overlap-Check-Logik, Buffer-Time-Berechnung.
- **Integration (offen):** HTTP-Tests gegen echte Postgres, RLS verifizieren.
- **E2E (offen):** Playwright — Kalender rendert, Drag&Drop verschiebt Termin,
  Konflikt wirft Toast.

## Open Questions

- Gruppen-Termine (Bridal-Party): als 1 Appointment mit N Items oder N
  verknüpfte Appointments? **Entscheidung:** 1 Appointment mit mehreren
  `AppointmentItem` + optionaler `rescheduledFromId`-Chain.
- Room-Konflikte: aktuell nicht in GiST-Constraint. **TODO:** zweiter Exclusion-
  Constraint für `roomId` (wenn nicht NULL).
- Recurring-Termine: eigener `RecurrenceRule`-Model (RRULE-Format) in Phase 2.
