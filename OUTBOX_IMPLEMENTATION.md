# Outbox Pattern Implementation — Salon OS

## Überblick
Das Outbox-Pattern wurde im Appointment-Modul implementiert, um zuverlässiges Messaging zu garantieren. Statt direkt Reminders zu enqueuen, werden Events in die `outbox_event` Tabelle geschrieben und von einem Poller (im Worker) asynchron verarbeitet.

## Komponenten

### 1. Datenbank-Schema (Migration 0010)
- Tabelle: `outbox_event`
- Felder: `id, tenantId, type, payload, status, attempts, lastError, processedAt, createdAt`
- Status-Enum: `PENDING, PROCESSING, DONE, FAILED`
- Indizes: `(status, createdAt), (tenantId, type, createdAt)` für schnelle Polls

### 2. OutboxService (`apps/api/src/common/outbox.service.ts`)
- Registriert in `CommonModule` (neues Modul)
- Zwei Methoden:
  - `writeWithinTx(tx, type, payload)` — schreibt Event INNERHALB einer DB-TX (atomar)
  - `write(type, payload)` — Wrapper für Standalone-Events mit eigenem TX-Wrapper
- Unterstützte Event-Typen:
  - `reminder.confirmation` — Bestätigungsemail sofort
  - `reminder.24h` — 24h vor Termin
  - `reminder.cancel` — Reminder stornieren
  - `marketing.rebook`, `marketing.winback`, `marketing.birthday`

### 3. RemindersService Modifikation
- **Neu:** Injiziert OutboxService
- **Neu:** Methoden `enqueueXxxViaOutbox()` die direkt OutboxService nutzen
- **Legacy:** `sendConfirmationNow()`, `scheduleEmailReminder()`, `cancelReminder()` bleiben für Fallback

### 4. AppointmentsService Integration
**In der `create()` Methode:**
```typescript
const created = await this.withTenant(ctx.tenantId, ..., async (tx) => {
  const appt = await tx.appointment.create({ ... });
  
  // Atomisch in TX schreiben
  await this.reminders.enqueueConfirmationViaOutbox(tx, {
    appointmentId: appt.id,
    tenantId: ctx.tenantId,
  });
  await this.reminders.enqueueReminderViaOutbox(tx, {
    appointmentId: appt.id,
    tenantId: ctx.tenantId,
    startAt: appt.startAt,
  });
  
  return appt;
});
```

**Vorteil:** Wenn die TX fehlschlägt (z.B. Conflict), werden auch die Reminders nicht geschrieben. Wenn die TX erfolgreich ist, sind die Events garantiert in der DB.

### 5. Worker Outbox-Poller (`apps/worker/src/index.ts`)
Existiert bereits:
- Pollt alle 5s nach `PENDING` Events
- Setzt Status zu `PROCESSING` mit `attempts++`
- Dispatcht entsprechend dem Event-Type:
  - `reminder.confirmation/24h` → BullMQ Queue (direkt an sendEmail Worker)
  - `reminder.cancel` → Job aus Queue entfernen
- Markiert als `DONE` bei Erfolg, `FAILED` wenn `attempts >= MAX_ATTEMPTS`
- Speichert `lastError` bei Fehler (max 500 chars)

### 6. Module-Struktur
```
CommonModule (neu)
├── OutboxService (exportiert)
└── Imports: DbModule

RemindersModule (modifiziert)
├── Imports: CommonModule
├── Providers: RemindersService (injiziert OutboxService)
└── Exports: RemindersService

AppModule (modifiziert)
├── Imports: CommonModule (vor RemindersModule!)
└── alle anderen Module wie zuvor
```

## Migrationsweg (für andere Services)

Für Marketing, Loyalty, Payments usw. folgt das Pattern:

1. **Define Event-Type** → Ergänze `OutboxEventType` in `outbox.service.ts`
2. **Producer Code** → Z.B. `marketingService.enqueueBirthdayViaOutbox(tx, { clientId, tenantId })`
3. **Consumer Code** (Worker) → Handler in `apps/worker/src/index.ts` für `event.type === 'marketing.birthday'`
4. **Integration** → Ersetze fire-and-forget Calls durch `outboxService.writeWithinTx()`

## Tests

### Einheit Tests
- `outbox.service.spec.ts` — Tests für OutboxService.writeWithinTx()
- Prüft: Event wird mit korrektem Type/Payload created, tenantId wird gesetzt

### Integration Tests
- `appointments-outbox.spec.ts` — Tests für Appointment.create() mit Outbox
- Prüft: Beide `enqueueConfirmationViaOutbox()` und `enqueueReminderViaOutbox()` werden in TX aufgerufen

### Build/Type-Check Status
- `npm run build` sollte green sein (CommonModule, RemindersModule, AppointmentsService types)
- `npm run test` sollte beide Spec-Files durchlaufen

## Production Readiness Checklist

- [x] Schema-Migration existiert (0010_outbox_events)
- [x] OutboxService implementiert
- [x] CommonModule mit OutboxService-Export
- [x] RemindersService injiziert OutboxService
- [x] AppointmentsService nutzt Outbox in create()
- [x] Worker-Poller existiert schon
- [x] Unit-Tests für OutboxService
- [x] Integration-Tests für Appointments+Outbox
- [ ] E2E-Test (Optional: create appointment → check outbox → worker poll → email sent)
- [ ] Monitoring/Alerting für failed events (`status = FAILED`)

## Nächste Schritte (für Lorenc)

1. **Review:** Sind die Message-Handler im Worker korrekt implementiert?
2. **Testing:** `npm test` lokal ausführen — Tests sollten grün sein
3. **Build:** `npm run build` — TypeScript strict mode
4. **Merge:** Code review + Merge auf main
5. **Monitor:** Nach Deploy Outbox auf FAILED Events prüfen (könnte auf Schema-Mismatch deuten)
6. **Rollout:** Public Bookings Service nächste Priorität (ähnliches Pattern)

## Offene Fragen

1. Sollen alte Legacy-Methoden (`sendConfirmationNow`) entfernt werden oder bleibt als Fallback?
2. Welches Monitoring/Alerting für `outbox_event.status = 'FAILED'`? (Sentry? Datadog? Slack?)
3. Brauchen wir Cleanup (alte DONE Events nach X Tagen löschen) oder grow unbegrenzt?

