-- Customer-Session-Tabelle: 30-Tage-Token nach Magic-Link-Verify.
-- Token-Hash statt Plaintext (sha256). Sliding-Window via lastSeenAt.

CREATE TABLE "client_session" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "tokenHash"  TEXT NOT NULL,
  "clientId"   UUID NOT NULL,
  "tenantId"   UUID NOT NULL,
  "expiresAt"  TIMESTAMPTZ NOT NULL,
  "lastSeenAt" TIMESTAMPTZ,
  "revokedAt"  TIMESTAMPTZ,
  "userAgent"  TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "client_session_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "client_session_tokenHash_key" UNIQUE ("tokenHash"),
  CONSTRAINT "client_session_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE,
  CONSTRAINT "client_session_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE
);

CREATE INDEX "client_session_tokenHash_idx" ON "client_session" ("tokenHash");
CREATE INDEX "client_session_clientId_idx" ON "client_session" ("clientId");
