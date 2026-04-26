/**
 * Test Tenant Fixture
 * Sets up a fresh test tenant + admin user in the database (via Prisma direct)
 */

import { PrismaClient } from "@salon-os/db";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

export interface TestTenant {
  id: string;
  slug: string;
  name: string;
  adminId: string;
  adminEmail: string;
}

/**
 * Creates a fresh test tenant with:
 * - Unique slug (salon-os-test-{uuid})
 * - Admin user
 * - Default location
 * - Sample staff & services (optional)
 */
export async function createTestTenant(
  options?: Partial<TestTenant>
): Promise<TestTenant> {
  const slug = `salon-os-test-${uuidv4().split("-")[0]}`;
  const adminEmail = options?.adminEmail || `admin-${uuidv4()}@test.salon-os.dev`;

  // Create Tenant
  const tenant = await prisma.tenant.create({
    data: {
      slug,
      name: options?.name || "Test Salon",
      countryCode: "CH",
      currency: "CHF",
      timezone: "Europe/Zurich",
      locale: "de-CH",
      tagline: "Test Salon für Playwright E2E",
      brandColor: "#0a0a0a",
      settings: {
        booking: { requireDeposit: false, depositPercentage: 0 },
        notifications: { enableEmail: true, enableSms: false },
      },
    },
  });

  // Create default Location
  await prisma.location.create({
    data: {
      tenantId: tenant.id,
      name: "St. Gallen",
      address: "Kräzernstrasse 79, 9015 St. Gallen",
      city: "St. Gallen",
      postalCode: "9015",
      country: "CH",
      phone: "+41791003366",
      email: "test@salon-os.dev",
      isDefault: true,
    },
  });

  // Create Admin User (TenantMembership)
  const adminId = uuidv4();
  await prisma.tenantMembership.create({
    data: {
      id: adminId,
      tenantId: tenant.id,
      email: adminEmail,
      role: "OWNER",
      status: "ACTIVE",
      authProvider: "workos", // or local for tests
      externalUserId: `user_${uuidv4()}`,
    },
  });

  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    adminId,
    adminEmail,
  };
}

/**
 * Cleans up a test tenant (soft delete via deletedAt)
 */
export async function cleanupTestTenant(tenantId: string): Promise<void> {
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { deletedAt: new Date() },
  });
}

/**
 * Creates sample staff for a tenant (for calendar/booking tests)
 */
export async function createSampleStaff(
  tenantId: string,
  locationId: string,
  options?: { name?: string; color?: string }
) {
  return await prisma.staff.create({
    data: {
      tenantId,
      locationId,
      name: options?.name || "Neta Nails",
      email: `${options?.name || "neta"}@test.salon-os.dev`,
      color: options?.color || "#C8A96E",
      status: "ACTIVE",
      // Default opening hours (Mo-Fr 9-18, Sa 10-17)
      openingHours: {
        monday: { start: "09:00", end: "18:00" },
        tuesday: { start: "09:00", end: "18:00" },
        wednesday: { start: "09:00", end: "18:00" },
        thursday: { start: "09:00", end: "18:00" },
        friday: { start: "09:00", end: "18:00" },
        saturday: { start: "10:00", end: "17:00" },
        sunday: null,
      },
    },
  });
}

/**
 * Creates a sample service for a tenant
 */
export async function createSampleService(
  tenantId: string,
  options?: { name?: string; duration?: number; price?: number }
) {
  return await prisma.service.create({
    data: {
      tenantId,
      name: options?.name || "Gel Nails",
      description: "Professional gel nail application",
      durationMinutes: options?.duration || 60,
      priceChf: options?.price || 7500, // CHF in cents
      status: "ACTIVE",
    },
  });
}

/**
 * Creates a test client for a tenant
 */
export async function createSampleClient(
  tenantId: string,
  options?: { email?: string; firstName?: string; lastName?: string }
) {
  return await prisma.client.create({
    data: {
      tenantId,
      email: options?.email || `client-${uuidv4()}@test.salon-os.dev`,
      firstName: options?.firstName || "Test",
      lastName: options?.lastName || "Client",
      phone: "+41791234567",
      status: "ACTIVE",
    },
  });
}

/**
 * Gets the first location for a tenant
 */
export async function getTestLocation(tenantId: string) {
  return await prisma.location.findFirst({
    where: { tenantId },
  });
}

export { prisma };
