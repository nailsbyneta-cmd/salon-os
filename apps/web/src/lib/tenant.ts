/**
 * Phase-0-Platzhalter — hardcoded Demo-Tenant.
 * Ersetzt durch Session-Cookie-Reader, sobald WorkOS integriert ist.
 */
export function getCurrentTenant(): { tenantId: string; userId: string; role: string } {
  // Muss mit `prisma/seed.ts` zusammenpassen: Beautycenter by Neta.
  // Nach `pnpm --filter @salon-os/db db:seed` sind diese IDs stabil,
  // weil upsert mit slug / email als Key läuft.
  // TODO: aus Env/Cookie lesen, nicht hardcoden.
  const tenantId = process.env['DEMO_TENANT_ID'] ?? '00000000-0000-0000-0000-000000000000';
  const userId = process.env['DEMO_USER_ID'] ?? '00000000-0000-0000-0000-000000000000';
  return { tenantId, userId, role: 'OWNER' };
}
