-- Reviews-Automation: SalonReview kriegt optional Appointment + Client.
-- Wird gefüllt wenn die Review aus dem auto-Email-Flow kommt (Kundin
-- klickt 24h-nach-COMPLETED Email, gibt Sterne+Text ab → Review wird mit
-- ihrem Appointment verknüpft). Manuelle Reviews vom Admin (z.B. Google-
-- Imports) bleiben unverknüpft.
--
-- Partial-Unique-Index verhindert Doppel-Submission pro Appointment.

ALTER TABLE "salon_review"
  ADD COLUMN "appointmentId" UUID,
  ADD COLUMN "clientId"      UUID,
  ADD COLUMN "submittedVia"  TEXT,
  ADD CONSTRAINT "salon_review_appointmentId_fkey"
    FOREIGN KEY ("appointmentId") REFERENCES "appointment"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "salon_review_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE SET NULL;

CREATE UNIQUE INDEX "salon_review_appointment_unique"
  ON "salon_review" ("tenantId", "appointmentId")
  WHERE "appointmentId" IS NOT NULL;

CREATE INDEX "salon_review_clientId_createdAt_idx"
  ON "salon_review" ("tenantId", "clientId", "createdAt" DESC)
  WHERE "clientId" IS NOT NULL;
