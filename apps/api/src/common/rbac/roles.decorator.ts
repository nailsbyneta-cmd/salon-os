import { SetMetadata } from '@nestjs/common';

// ─── @RequireRole ─────────────────────────────────────────────
//
// Decorator zum Schutz von Controller-Methoden / -Klassen. Läuft
// gegen die Rolle aus dem TenantContext (gesetzt vom TenantMiddleware).
//
// Usage:
//   @RequireRole('OWNER', 'MANAGER')
//   @Post('merge')
//   async mergeClients(...) { ... }

export const ROLES_METADATA_KEY = 'salon-os:required-roles';

export const ROLE_HIERARCHY = [
  'OWNER',
  'MANAGER',
  'FRONT_DESK',
  'STYLIST',
  'ASSISTANT',
  'BOOTH_RENTER',
  'TRAINEE',
] as const;

export type StaffRoleName = (typeof ROLE_HIERARCHY)[number];

export const RequireRole = (...roles: StaffRoleName[]): ClassDecorator & MethodDecorator =>
  SetMetadata(ROLES_METADATA_KEY, roles);
