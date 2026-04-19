-- SALON OS — Postgres Extensions bootstrap
-- Wird beim ersten Container-Start ausgeführt.

-- Für UUIDs (wir verwenden @default(uuid()) in Prisma, aber Postgres-side
-- kann bei Bedarf gen_random_uuid() aufgerufen werden).
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Für Embeddings (AI-Layer — siehe specs/ai-layer.md).
CREATE EXTENSION IF NOT EXISTS "vector";

-- Trigram-Indizes für schnelle „contains"-Suche auf Namen, Services, etc.
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Unaccented Suche (Müller → muller, für Kunden-Suche).
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Row-Level-Security ist Teil von Postgres core, aber wir dokumentieren hier,
-- dass jede tenant-skoped Tabelle RLS aktiviert haben MUSS. Policies sind
-- in packages/db/prisma/migrations/*.sql zu finden.
