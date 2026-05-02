-- Consultation Forms + Submissions
-- Intake-Formulare für Pre-Appointment: Allergien, Einverständnisse, Voranamnese.
-- fields: JSONB Array<{ id, label, type, required, options? }>
-- answers: JSONB { fieldId: value }

CREATE TABLE "consultation_form" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenantId"    UUID        NOT NULL,
  "name"        TEXT        NOT NULL,
  "description" TEXT,
  "fields"      JSONB       NOT NULL DEFAULT '[]',
  "active"      BOOLEAN     NOT NULL DEFAULT TRUE,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "consultation_form_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "consultation_form_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE
);

CREATE INDEX "consultation_form_tenantId_active_idx"
  ON "consultation_form" ("tenantId", "active");

ALTER TABLE "consultation_form" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "consultation_form"
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);

-- ──────────────────────────────────────────────────────────────────

CREATE TABLE "consultation_submission" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenantId"      UUID        NOT NULL,
  "formId"        UUID        NOT NULL,
  "clientId"      UUID,
  "appointmentId" UUID,
  "answers"       JSONB       NOT NULL DEFAULT '{}',
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "consultation_submission_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "consultation_submission_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE,
  CONSTRAINT "consultation_submission_formId_fkey"
    FOREIGN KEY ("formId") REFERENCES "consultation_form"("id") ON DELETE CASCADE,
  CONSTRAINT "consultation_submission_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE SET NULL,
  CONSTRAINT "consultation_submission_appointmentId_fkey"
    FOREIGN KEY ("appointmentId") REFERENCES "appointment"("id") ON DELETE SET NULL
);

CREATE INDEX "consultation_submission_tenantId_formId_createdAt_idx"
  ON "consultation_submission" ("tenantId", "formId", "createdAt" DESC);

CREATE INDEX "consultation_submission_tenantId_clientId_idx"
  ON "consultation_submission" ("tenantId", "clientId");

ALTER TABLE "consultation_submission" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "consultation_submission"
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);
