-- Migration 0010: Outbox Events (reliable messaging)
-- Append-only event log polled by the worker.
-- RLS not applied — worker reads via service role (admin connection).

CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

CREATE TABLE "outbox_event" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenantId"    UUID,
  "type"        TEXT        NOT NULL,
  "payload"     JSONB       NOT NULL,
  "status"      "OutboxStatus" NOT NULL DEFAULT 'PENDING',
  "attempts"    INTEGER     NOT NULL DEFAULT 0,
  "lastError"   TEXT,
  "processedAt" TIMESTAMPTZ,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "outbox_event_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "outbox_event_status_createdAt_idx"  ON "outbox_event" ("status", "createdAt");
CREATE INDEX "outbox_event_tenantId_type_createdAt_idx" ON "outbox_event" ("tenantId", "type", "createdAt");
