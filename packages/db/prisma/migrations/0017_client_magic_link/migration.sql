-- Magic-Link für Customer-Self-Service. Token-Hash (sha256) statt Plaintext
-- in DB. Wird einmal verwendet, dann usedAt gesetzt. Default-Expiry 30 Min.

CREATE TABLE "client_magic_link" (
  "id"        UUID NOT NULL DEFAULT gen_random_uuid(),
  "tokenHash" TEXT NOT NULL,
  "clientId"  UUID NOT NULL,
  "tenantId"  UUID NOT NULL,
  "email"     TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "usedAt"    TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "client_magic_link_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "client_magic_link_tokenHash_key" UNIQUE ("tokenHash"),
  CONSTRAINT "client_magic_link_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE,
  CONSTRAINT "client_magic_link_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE
);

CREATE INDEX "client_magic_link_tokenHash_idx" ON "client_magic_link" ("tokenHash");
CREATE INDEX "client_magic_link_clientId_createdAt_idx"
  ON "client_magic_link" ("clientId", "createdAt");
