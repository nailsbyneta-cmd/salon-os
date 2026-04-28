-- Google Ads Acquisition-Tracking auf Client.
-- GCLID kommt vom URL-Param ?gclid=, wird im localStorage 90 Tage gehalten,
-- beim ersten Booking-Submit ans Backend übergeben und auf der Kundinnen-
-- Row gespeichert. Server-Side uploadClickConversions nutzt das später.

ALTER TABLE "client"
  ADD COLUMN "acquisitionGclid" TEXT,
  ADD COLUMN "acquisitionGclidTs" TIMESTAMPTZ,
  ADD COLUMN "acquisitionSource" TEXT;

-- Index für künftige "wieviele Buchungen kamen aus Google Ads"-Queries
CREATE INDEX "client_acquisition_source_idx" ON "client" ("acquisitionSource")
  WHERE "acquisitionSource" IS NOT NULL;
