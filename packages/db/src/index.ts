/**
 * SALON OS DB package — typed Prisma client + tenant-aware helpers.
 */
import { PrismaClient } from '@prisma/client';

export type {
  Tenant,
  Location,
  Room,
  User,
  TenantMembership,
  Staff,
  StaffLocation,
  ServiceCategory,
  Service,
  ServiceVariant,
  StaffService,
  Client,
  Appointment,
  AppointmentItem,
  Shift,
  TimeOff,
  AuditLog,
} from '@prisma/client';

export {
  Plan,
  TenantStatus,
  UserStatus,
  StaffRole,
  EmploymentType,
  Gender,
  AppointmentStatus,
  BookingChannel,
  TimeOffStatus,
} from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env['NODE_ENV'] === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env['NODE_ENV'] !== 'production') globalForPrisma.prisma = prisma;

// ─── SQL-Injection-Schutz ──────────────────────────────────────
// withTenant() setzt Session-Variablen via $executeRawUnsafe. Postgres
// erlaubt keine Parameter-Bindings für SET LOCAL, deshalb MUSS der Input
// vor Interpolation strikt validiert werden.

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-7][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_ROLES: ReadonlySet<string> = new Set([
  'OWNER',
  'MANAGER',
  'FRONT_DESK',
  'STYLIST',
  'BOOTH_RENTER',
  'TRAINEE',
  'ASSISTANT',
]);

function assertUuid(value: string, field: string): void {
  if (!UUID_REGEX.test(value)) {
    throw new Error(`withTenant: ${field} is not a valid UUID`);
  }
}

function assertRole(value: string): void {
  if (!ALLOWED_ROLES.has(value)) {
    throw new Error(`withTenant: role "${value}" is not an allowed StaffRole`);
  }
}

/**
 * Run a callback with tenant-scoped session settings.
 * Every DB access inside `fn` sees RLS policies applied to the given tenant.
 *
 * Alle Argumente werden strikt validiert vor der String-Interpolation in
 * `SET LOCAL` — Postgres erlaubt dort keine Parameter-Bindings, daher ist
 * die Regex-/Whitelist-Prüfung unser einziger Schutz gegen SQL-Injection.
 */
export async function withTenant<T>(
  tenantId: string,
  userId: string | null,
  role: string | null,
  fn: (tx: PrismaClient) => Promise<T>,
): Promise<T> {
  assertUuid(tenantId, 'tenantId');
  if (userId !== null) assertUuid(userId, 'userId');
  if (role !== null) assertRole(role);

  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
    if (userId) await tx.$executeRawUnsafe(`SET LOCAL app.current_user_id = '${userId}'`);
    if (role) await tx.$executeRawUnsafe(`SET LOCAL app.current_role = '${role}'`);
    return fn(tx as unknown as PrismaClient);
  });
}
