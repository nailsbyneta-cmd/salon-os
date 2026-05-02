-- Migration 0027: Staff Commission
-- Immutable commission record per completed appointment.

CREATE TABLE IF NOT EXISTS staff_commission (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID        NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  staff_id        UUID        NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  appointment_id  UUID        NOT NULL UNIQUE REFERENCES appointment(id) ON DELETE CASCADE,
  revenue_chf     NUMERIC(10,2) NOT NULL,
  rate            NUMERIC(5,2)  NOT NULL,
  commission_chf  NUMERIC(10,2) NOT NULL,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_staff_commission_tenant_staff
  ON staff_commission (tenant_id, staff_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_staff_commission_paid
  ON staff_commission (tenant_id, paid_at)
  WHERE paid_at IS NULL;

-- RLS
ALTER TABLE staff_commission ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_commission_tenant_isolation
  ON staff_commission
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
