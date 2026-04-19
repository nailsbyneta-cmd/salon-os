# ADR 0001 — Turborepo + pnpm als Monorepo-Basis

**Status:** Accepted
**Datum:** 2026-04-19
**Kontext:** Phase 0 — Foundation

## Entscheidung

SALON OS ist ein Monorepo aus `apps/*` (api, web, worker, mobile-staff, mobile-client)
und `packages/*` (db, auth, ui, types, utils, config). Orchestriert mit **Turborepo 2**
und **pnpm 9 Workspaces**.

## Warum

- `specs/tech-stack.md` schreibt Turborepo + pnpm vor.
- `pnpm`-Content-Addressable-Store ist 2-3× schneller beim Install und beim
  CI-Cache als npm oder yarn, und unterstützt strikte Dependency-Isolation
  (keine Phantom-Deps).
- `Turborepo` bringt Remote-Cache out-of-the-box (Vercel-Hosted oder S3) und
  task-Pipelines mit `dependsOn` — wichtig sobald `apps/api` gegen
  `packages/db` und `packages/auth` baut.
- Alternative `nx` hätte gleichwertige Power, aber Turborepo ist simpler
  und der Vercel/Next-Integration-Weg ist für uns leichter.

## Konsequenzen

- Alle Apps/Packages folgen `"name": "@salon-os/<name>"`-Konvention.
- `packageManager`-Feld in Root-package.json pinned pnpm-Version.
- Workspace-intern referenziert mit `"workspace:*"`, nicht Versionsnummer.
- CI muss pnpm installieren (via `pnpm/action-setup@v4`).
