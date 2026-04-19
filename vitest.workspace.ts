/**
 * Turborepo führt Vitest pro Package aus (jedes hat eigene vitest.config.ts).
 * Diese Workspace-Datei ist für `vitest` im Root-Modus (z. B. IDE-Runner), damit
 * alle Configs automatisch erkannt werden.
 */
export default [
  'packages/*/vitest.config.ts',
  'apps/api/vitest.config.ts',
];
