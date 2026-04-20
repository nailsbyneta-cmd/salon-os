-- 0004_pos_payment
-- Zahlungs- und Trinkgeld-Felder auf Appointment.
-- POS-Grundgerüst: Kassierung markiert Termin als bezahlt und merkt
-- Trinkgeld + Methode. Echte Stripe-Integration läuft parallel über
-- /v1/payments/checkout (siehe PaymentsController).

ALTER TABLE "appointment"
  ADD COLUMN "tipAmount"     DECIMAL(10, 2),
  ADD COLUMN "paidAt"        TIMESTAMPTZ,
  ADD COLUMN "paymentMethod" TEXT;

COMMENT ON COLUMN "appointment"."tipAmount"
  IS 'Trinkgeld in Tenant-Währung. Split-Regeln entstehen in Phase 2 als
      separate Payment/TipDistribution-Tabelle.';
COMMENT ON COLUMN "appointment"."paymentMethod"
  IS 'CASH | CARD | TWINT | STRIPE_CHECKOUT — enum später in Phase 2.';
