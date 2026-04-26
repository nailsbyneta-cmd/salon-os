import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import type { PrismaClient } from '@salon-os/db';
import { createStaffSchema, updateStaffSchema } from '@salon-os/types';
import { StaffService } from '../../src/staff/staff.service.js';
import { AuditService } from '../../src/audit/audit.service.js';
import { startTestPostgres, type TestPostgresHandle } from '../test-postgres.js';

describe('StaffService (behavior)', () => {
  let h: TestPostgresHandle;
  let service: StaffService;
  let audit: AuditService;
  let prisma: PrismaClient;

  beforeAll(async () => {
    h = await startTestPostgres();
    prisma = h.prisma;
    audit = new AuditService(h.withTenant);
    service = new StaffService(h.withTenant, audit);
  });

  afterAll(async () => {
    if (h) await h.stop();
  });

  beforeEach(async () => {
    await h.truncateAll();
  });

  function baseInput(
    overrides: Record<string, unknown> = {},
  ): Parameters<StaffService['create']>[0] {
    return createStaffSchema.parse({
      firstName: 'Neta',
      lastName: 'Muster',
      email: 'neta@test-salon.ch',
      role: 'STYLIST',
      employmentType: 'EMPLOYEE',
      locationIds: [h.seed.locationId],
      serviceIds: [],
      ...overrides,
    });
  }

  describe('create()', () => {
    it('persists staff with tenant_id and links to user via email', async () => {
      const created = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.create(baseInput()),
      );
      expect(created.id).toBeDefined();
      expect(created.tenantId).toBe(h.seed.tenantId);
      expect(created.role).toBe('STYLIST');
      const dbRow = await prisma.staff.findUnique({ where: { id: created.id } });
      expect(dbRow!.email).toBe('neta@test-salon.ch');
    });

    it('marks first locationId as primary, others as non-primary', async () => {
      // 2. Location anlegen
      const loc2Id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
      await prisma.location.create({
        data: {
          id: loc2Id,
          tenantId: h.seed.tenantId,
          name: 'Filiale 2',
          slug: 'filiale-2',
          countryCode: 'CH',
          timezone: 'Europe/Zurich',
          currency: 'CHF',
          taxConfig: { vatRate: 7.7 },
          openingHours: {},
          publicProfile: false,
          marketplaceListed: false,
        },
      });

      const created = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.create(baseInput({ locationIds: [h.seed.locationId, loc2Id] })),
      );
      const assignments = await prisma.staffLocation.findMany({
        where: { staffId: created.id },
        orderBy: { isPrimary: 'desc' },
      });
      expect(assignments.length).toBe(2);
      expect(assignments[0]!.isPrimary).toBe(true);
      expect(assignments[0]!.locationId).toBe(h.seed.locationId);
      expect(assignments[1]!.isPrimary).toBe(false);
    });

    it('writes audit log on create', async () => {
      const created = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.create(baseInput()),
      );
      const logs = await prisma.auditLog.findMany({
        where: { entity: 'Staff', entityId: created.id, action: 'create' },
      });
      expect(logs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('list()', () => {
    it('only returns own-tenant staff (RLS isolation)', async () => {
      await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.create(baseInput({ email: 'in@test.ch' })),
      );

      // Sekundärer Tenant + Staff direkt
      const otherTenantId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
      const otherUserId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
      await prisma.tenant.create({
        data: {
          id: otherTenantId,
          name: 'Other',
          slug: 'other',
          countryCode: 'CH',
          currency: 'CHF',
          timezone: 'Europe/Zurich',
          locale: 'de-CH',
        },
      });
      await prisma.user.create({
        data: { id: otherUserId, email: 'out@test.ch', status: 'ACTIVE' },
      });
      await prisma.staff.create({
        data: {
          tenantId: otherTenantId,
          userId: otherUserId,
          firstName: 'Out',
          lastName: 'Tenant',
          email: 'out@test.ch',
          role: 'STYLIST',
          employmentType: 'EMPLOYEE',
          active: true,
        },
      });

      const list = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.list(),
      );
      const emails = list.map((s) => s.email);
      expect(emails).toContain('in@test.ch');
      expect(emails).not.toContain('out@test.ch');
    });

    it('filters by active=true by default (excludes inactive)', async () => {
      const created = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.create(baseInput({ email: 'inactive@test.ch' })),
      );
      await prisma.staff.update({ where: { id: created.id }, data: { active: false } });

      const result = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.list(),
      );
      expect(result.find((s) => s.id === created.id)).toBeUndefined();
    });

    it('filters by locationId via locationAssignments', async () => {
      const loc2Id = '12345678-1234-4567-8123-123456789abc';
      await prisma.location.create({
        data: {
          id: loc2Id,
          tenantId: h.seed.tenantId,
          name: 'Filiale 3',
          slug: 'filiale-3',
          countryCode: 'CH',
          timezone: 'Europe/Zurich',
          currency: 'CHF',
          taxConfig: { vatRate: 7.7 },
          openingHours: {},
          publicProfile: false,
          marketplaceListed: false,
        },
      });
      await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', async () => {
        await service.create(baseInput({ email: 'a@test.ch' }));
        await service.create(baseInput({ email: 'b@test.ch', locationIds: [loc2Id] }));
      });

      const onlyLoc2 = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.list({ locationId: loc2Id }),
      );
      const emails = onlyLoc2.map((s) => s.email);
      expect(emails).toEqual(['b@test.ch']);
    });
  });

  describe('update()', () => {
    it('throws NotFoundException for unknown id', async () => {
      await expect(
        h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
          service.update(
            'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            updateStaffSchema.parse({ firstName: 'X' }),
          ),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates role and persists', async () => {
      const created = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.create(baseInput()),
      );
      const updated = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.update(created.id, updateStaffSchema.parse({ role: 'MANAGER' })),
      );
      expect(updated.role).toBe('MANAGER');
    });
  });

  describe('softDelete()', () => {
    it('sets deletedAt and excludes from list', async () => {
      const created = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.create(baseInput()),
      );
      await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.softDelete(created.id),
      );
      const list = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.list(),
      );
      expect(list.find((s) => s.id === created.id)).toBeUndefined();
      const raw = await prisma.staff.findUnique({ where: { id: created.id } });
      expect(raw!.deletedAt).not.toBeNull();
    });
  });
});
