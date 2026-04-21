-- SALON OS — Outbox Cancellation Support (Block A #3 follow-up)
-- Erweitert outbox_event um einen Cancellation-Zustand, damit Producer
-- ein Event nachträglich abbrechen können (z.B. wenn ein Termin vor dem
-- geplanten `availableAt` des 24h-Reminders storniert wird).
--
-- Der Poller überspringt Rows mit `cancelledAt IS NOT NULL`.

ALTER TABLE "outbox_event"
  ADD COLUMN "cancelledAt" TIMESTAMPTZ,
  ADD COLUMN "correlationKey" TEXT;

-- Producer setzen `correlationKey` (z.B. `reminder:<appointmentId>`), damit
-- `OutboxService.cancel(correlationKey)` zielgenau abbrechen kann ohne den
-- Event-ID zu kennen.
CREATE INDEX "outbox_event_correlation_idx"
  ON "outbox_event" ("correlationKey")
  WHERE "correlationKey" IS NOT NULL AND "publishedAt" IS NULL AND "cancelledAt" IS NULL;

-- Partial-Index für unpublished erweitern: Poller soll nur Rows sehen,
-- die weder published noch cancelled sind.
DROP INDEX IF EXISTS "outbox_event_unpublished_idx";
CREATE INDEX "outbox_event_unpublished_idx"
  ON "outbox_event" ("availableAt")
  WHERE "publishedAt" IS NULL AND "cancelledAt" IS NULL;
