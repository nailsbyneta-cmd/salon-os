-- Variant-Labels auf Appointment-Items (z.B. ["Mittel", "Gel"]).
-- Stylistin sieht im Kalender ohne Klick was die Kundin gewählt hat.
-- Forward-only: bestehende Items bekommen leeres Array per Default.

ALTER TABLE "appointment_item"
  ADD COLUMN "optionLabels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
