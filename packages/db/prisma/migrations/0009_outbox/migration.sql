-- SALON OS — Outbox-Pattern (Block A #3)
-- Ereignisse werden in der SELBEN Transaktion wie die Business-Änderung
-- geschrieben. Ein Poller im `apps/worker` liest unpublished Rows, publiziert
-- sie auf BullMQ und markiert sie als `publishedAt`.
--
-- Keine RLS: System-interne Tabelle, darf NICHT direkt von Client-APIs
-- gelesen werden. Zugriff nur über OutboxService + Worker-Poller.

CREATE TABLE "outbox_event" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId"      UUID,
  "eventType"     TEXT NOT NULL,
  "payload"       JSONB NOT NULL,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "availableAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "publishedAt"   TIMESTAMPTZ,
  "failedAt"      TIMESTAMPTZ,
  "lastError"     TEXT,
  "attempts"      INTEGER NOT NULL DEFAULT 0
);

-- Partial-Index auf unpublished rows: Poller scannt extrem effizient, auch
-- wenn Millionen von publizierten Events liegen bleiben.
CREATE INDEX "outbox_event_unpublished_idx"
  ON "outbox_event" ("availableAt")
  WHERE "publishedAt" IS NULL;

-- Retention-Hilfe: periodisches Löschen von `publishedAt < now() - 14 days`
-- via Cron-Job (wird später eingebaut).
CREATE INDEX "outbox_event_published_idx"
  ON "outbox_event" ("publishedAt")
  WHERE "publishedAt" IS NOT NULL;
