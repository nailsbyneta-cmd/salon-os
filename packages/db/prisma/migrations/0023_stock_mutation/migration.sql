-- Stock-Mutation: Audit-Trail für jede Stock-Änderung am Produkt.
-- Reasons: PURCHASE (Wareneingang), SALE (POS-Verkauf), USAGE (Backbar
-- Verbrauch im Service), ADJUSTMENT (Inventur-Korrektur), RETURN (Retoure).
-- Delta kann +/- sein. Nach Mutation = stockLevel des Produkts nach diesem
-- Eintrag (Snapshot — vereinfacht "wer hat wann auf welchen Wert
-- gesetzt"-Queries ohne SUM-Replay).

CREATE TYPE "StockMutationReason" AS ENUM (
  'PURCHASE',
  'SALE',
  'USAGE',
  'ADJUSTMENT',
  'RETURN',
  'INITIAL'
);

CREATE TABLE "stock_mutation" (
  "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenantId"        UUID NOT NULL,
  "productId"       UUID NOT NULL,
  "delta"           INTEGER NOT NULL,
  "stockAfter"      INTEGER NOT NULL,
  "reason"          "StockMutationReason" NOT NULL,
  "notes"           TEXT,
  "performedBy"     UUID,
  "appointmentId"   UUID,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "stock_mutation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_mutation_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE,
  CONSTRAINT "stock_mutation_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE,
  CONSTRAINT "stock_mutation_performedBy_fkey"
    FOREIGN KEY ("performedBy") REFERENCES "user"("id") ON DELETE SET NULL,
  CONSTRAINT "stock_mutation_appointmentId_fkey"
    FOREIGN KEY ("appointmentId") REFERENCES "appointment"("id") ON DELETE SET NULL
);

CREATE INDEX "stock_mutation_tenantId_productId_createdAt_idx"
  ON "stock_mutation" ("tenantId", "productId", "createdAt" DESC);

CREATE INDEX "stock_mutation_tenantId_createdAt_idx"
  ON "stock_mutation" ("tenantId", "createdAt" DESC);

ALTER TABLE "stock_mutation" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_mutation_isolation" ON "stock_mutation"
  USING ("tenantId" = current_setting('app.tenant_id', TRUE)::uuid);

CREATE POLICY "stock_mutation_service_role" ON "stock_mutation"
  USING (current_setting('app.tenant_id', TRUE) IS NULL
         OR current_setting('app.tenant_id', TRUE) = '');
