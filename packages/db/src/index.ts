/**
 * SALON OS DB package — typed Prisma client + tenant-aware helpers.
 */
import { PrismaClient } from '@prisma/client';

export type { Tenant, Location, User, TenantMembership, AuditLog } from '@prisma/client';
export { Plan, TenantStatus, UserStatus, StaffRole } from '@prisma/client';

/**
 * Singleton Prisma client (avoid pool exhaustion in dev hot-reload).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env['NODE_ENV'] === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env['NODE_ENV'] !== 'production') globalForPrisma.prisma = prisma;

/**
 * Run a callback with tenant-scoped session settings.
 * Every DB access inside `fn` will see RLS policies applied.
 */
export async function withTenant<T>(
  tenantId: string,
  userId: string | null,
  role: string | null,
  fn: (tx: PrismaClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
    if (userId) await tx.$executeRawUnsafe(`SET LOCAL app.current_user_id = '${userId}'`);
    if (role) await tx.$executeRawUnsafe(`SET LOCAL app.current_role = '${role}'`);
    return fn(tx as unknown as PrismaClient);
  });
}
