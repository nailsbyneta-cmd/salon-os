-- Tenant-Branding-Felder für öffentliche Salon-Homepage
ALTER TABLE "tenant"
  ADD COLUMN "tagline"            TEXT,
  ADD COLUMN "description"        TEXT,
  ADD COLUMN "logoUrl"            TEXT,
  ADD COLUMN "heroImageUrl"       TEXT,
  ADD COLUMN "brandColor"         TEXT,
  ADD COLUMN "instagramUrl"       TEXT,
  ADD COLUMN "facebookUrl"        TEXT,
  ADD COLUMN "tiktokUrl"          TEXT,
  ADD COLUMN "whatsappE164"       TEXT,
  ADD COLUMN "googleBusinessUrl"  TEXT;

-- Salon FAQ
CREATE TABLE "salon_faq" (
  "id"        UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "tenantId"  UUID        NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "question"  TEXT        NOT NULL,
  "answer"    TEXT        NOT NULL,
  "order"     INTEGER     NOT NULL DEFAULT 0,
  "active"    BOOLEAN     NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "salon_faq_tenantId_order_idx" ON "salon_faq"("tenantId", "order");
ALTER TABLE "salon_faq" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "salon_faq_tenant_isolation" ON "salon_faq"
  USING ("tenantId" = app_current_tenant_id());

-- Salon Reviews
CREATE TABLE "salon_review" (
  "id"         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "tenantId"   UUID        NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "authorName" TEXT        NOT NULL,
  "rating"     INTEGER     NOT NULL CHECK ("rating" BETWEEN 1 AND 5),
  "text"       TEXT        NOT NULL,
  "sourceUrl"  TEXT,
  "featured"   BOOLEAN     NOT NULL DEFAULT false,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "salon_review_tenantId_featured_createdAt_idx"
  ON "salon_review"("tenantId", "featured", "createdAt");
ALTER TABLE "salon_review" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "salon_review_tenant_isolation" ON "salon_review"
  USING ("tenantId" = app_current_tenant_id());

-- Salon Gallery Images (URLs — kein File-Upload, Neta pastet CDN-URL)
CREATE TABLE "salon_gallery_image" (
  "id"        UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "tenantId"  UUID        NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "imageUrl"  TEXT        NOT NULL,
  "caption"   TEXT,
  "order"     INTEGER     NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "salon_gallery_image_tenantId_order_idx"
  ON "salon_gallery_image"("tenantId", "order");
ALTER TABLE "salon_gallery_image" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "salon_gallery_image_tenant_isolation" ON "salon_gallery_image"
  USING ("tenantId" = app_current_tenant_id());
