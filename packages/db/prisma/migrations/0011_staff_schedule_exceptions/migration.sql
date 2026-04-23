-- Ausnahme-Tage pro Stylistin: überschreibt weeklySchedule für einzelne
-- Daten (Arzt-Termin, kürzere Schicht, Zusatzarbeit am Samstag etc).
-- Shape: { 'YYYY-MM-DD': { closed: true } | { intervals: [{open,close}] } }

ALTER TABLE "staff" ADD COLUMN "scheduleExceptions" JSONB DEFAULT '{}'::jsonb;
