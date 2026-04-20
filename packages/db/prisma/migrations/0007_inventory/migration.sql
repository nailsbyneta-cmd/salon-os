-- 0007_inventory
-- Produkte (Backbar + Retail) mit Lagerbestand, Reorder-Regeln und
-- Low-Stock-Detection.

CREATE TABLE "product" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId"      UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "name"          TEXT NOT NULL,
  "sku"           TEXT,
  "brand"         TEXT,
  "category"      TEXT,
  "barcode"       TEXT,
  "type"          TEXT NOT NULL DEFAULT 'RETAIL',  -- RETAIL | BACKBAR | BOTH
  "unit"          TEXT,                             -- ml, Stk, g
  "costCents"     INTEGER NOT NULL DEFAULT 0,
  "retailCents"   INTEGER NOT NULL DEFAULT 0,
  "currency"      CHAR(3) NOT NULL DEFAULT 'CHF',
  "stockLevel"    INTEGER NOT NULL DEFAULT 0,
  "reorderAt"     INTEGER NOT NULL DEFAULT 0,      -- Low-Stock-Schwelle
  "reorderQty"    INTEGER NOT NULL DEFAULT 0,
  "supplier"      TEXT,
  "active"        BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt"     TIMESTAMPTZ
);

CREATE INDEX "product_tenantId_idx" ON "product"("tenantId");
CREATE INDEX "product_tenantId_active_idx" ON "product"("tenantId", "active");
CREATE INDEX "product_tenantId_stock_idx"
  ON "product"("tenantId", "stockLevel", "reorderAt");

ALTER TABLE "product" ENABLE ROW LEVEL SECURITY;
CREATE POLICY product_tenant_isolation ON "product"
  FOR ALL
  USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

COMMENT ON COLUMN "product"."type"
  IS 'RETAIL: Verkauf an Kundin. BACKBAR: Arbeitsmittel. BOTH: beides.';
COMMENT ON COLUMN "product"."reorderAt"
  IS 'Bei stockLevel <= reorderAt erscheint das Produkt in Low-Stock-Reports.';
