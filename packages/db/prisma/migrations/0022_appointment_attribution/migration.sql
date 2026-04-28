-- Attribution-Felder auf Appointment. Werden beim Buchungs-Submit
-- gefüllt aus der Frontend-GCLID-Capture (90d localStorage TTL).
--
-- attributionGclid ≠ NULL  → Server-Side uploadClickConversion benutzt
-- ihn direkt. Andernfalls Fallback auf Hashed-Email/Phone (EnhancedConv).
--
-- conversionUploadedAt + conversionUploadResponse werden vom Outbox-
-- Handler 'google_ads.upload_conversion' geschrieben (idempotent).

ALTER TABLE "appointment"
  ADD COLUMN "attributionGclid"          TEXT,
  ADD COLUMN "attributionSource"         TEXT,
  ADD COLUMN "conversionUploadedAt"      TIMESTAMPTZ,
  ADD COLUMN "conversionUploadResponse"  JSONB;

-- Worker-Query "give me bookings to upload" muss schnell sein
CREATE INDEX "appointment_conversionUploadedAt_idx"
  ON "appointment" ("tenantId", "conversionUploadedAt")
  WHERE "conversionUploadedAt" IS NULL
    AND "attributionGclid" IS NOT NULL;

-- Dashboard "bookings by source" Query
CREATE INDEX "appointment_attributionSource_idx"
  ON "appointment" ("tenantId", "attributionSource", "createdAt" DESC)
  WHERE "attributionSource" IS NOT NULL;
