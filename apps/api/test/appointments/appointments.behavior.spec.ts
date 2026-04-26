import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import type { PrismaClient } from '@salon-os/db';
import {
  createAppointmentSchema,
  cancelAppointmentSchema,
  rescheduleAppointmentSchema,
} from '@salon-os/types';
import { AppointmentsService } from '../../src/appointments/appointments.service.js';
import { AuditService } from '../../src/audit/audit.service.js';
import { RemindersService } from '../../src/reminders/reminders.service.js';
import { OutboxService } from '../../src/common/outbox.service.js';
import { startTestPostgres, type TestPostgresHandle } from '../test-postgres.js';

describe('AppointmentsService (behavior)', () => {
  let h: TestPostgresHandle;
  let service: AppointmentsService;
  let prisma: PrismaClient;
  let serviceRowId: string;
  let clientRowId: string;

  beforeAll(async () => {
    h = await startTestPostgres();
    prisma = h.prisma;
    const audit = new AuditService(h.withTenant);
    const outbox = new OutboxService(h.withTenant);
    const reminders = new RemindersService(outbox);
    service = new AppointmentsService(h.withTenant, reminders, audit);
  });

  afterAll(async () => {
    if (h) await h.stop();
  });

  beforeEach(async () => {
    await h.truncateAll();
    // Service + Client für jeden Test (passend zum Tenant)
    const svcRow = await prisma.service.create({
      data: {
        tenantId: h.seed.tenantId,
        categoryId: h.seed.serviceCategoryId,
        name: 'Shellac',
        slug: 'shellac',
        durationMinutes: 60,
        basePrice: 80,
      },
    });
    serviceRowId = svcRow.id;
    const clientRow = await prisma.client.create({
      data: { tenantId: h.seed.tenantId, firstName: 'Anna', lastName: 'Test' },
    });
    clientRowId = clientRow.id;
  });

  function input(
    overrides: Record<string, unknown> = {},
  ): Parameters<AppointmentsService['create']>[0] {
    const startAt = '2026-05-01T09:00:00+02:00';
    const endAt = '2026-05-01T10:00:00+02:00';
    return createAppointmentSchema.parse({
      locationId: h.seed.locationId,
      clientId: clientRowId,
      staffId: h.seed.staffId,
      startAt,
      endAt,
      bookedVia: 'STAFF_INTERNAL',
      items: [
        {
          serviceId: serviceRowId,
          staffId: h.seed.staffId,
          price: 80,
          duration: 60,
        },
      ],
      ...overrides,
    });
  }

  describe('create()', () => {
    it('persists appointment + items', async () => {
      const created = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.create(input()),
      );
      expect(created.id).toBeDefined();
      expect(created.tenantId).toBe(h.seed.tenantId);
      const items = await prisma.appointmentItem.findMany({
        where: { appointmentId: created.id },
      });
      expect(items.length).toBe(1);
      expect(items[0]!.serviceId).toBe(serviceRowId);
    });

    it('rejects overlap on same staff (DB exclusion-constraint)', async () => {
      await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () => service.create(input()));
      await expect(
        h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
          service.create(
            input({
              startAt: '2026-05-01T09:30:00+02:00',
              endAt: '2026-05-01T10:30:00+02:00',
            }),
          ),
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('list()', () => {
    it('returns appointments in date-range, only own-tenant', async () => {
      await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () => service.create(input()));

      const inRange = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.list({
          from: new Date('2026-05-01T00:00:00Z'),
          to: new Date('2026-05-02T00:00:00Z'),
        }),
      );
      expect(inRange.length).toBe(1);

      const outOfRange = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.list({
          from: new Date('2026-06-01T00:00:00Z'),
          to: new Date('2026-06-02T00:00:00Z'),
        }),
      );
      expect(outOfRange.length).toBe(0);
    });
  });

  describe('reschedule()', () => {
    it('moves startAt/endAt and persists', async () => {
      const created = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.create(input()),
      );
      const updated = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.reschedule(
          created.id,
          rescheduleAppointmentSchema.parse({
            startAt: '2026-05-01T14:00:00+02:00',
            endAt: '2026-05-01T15:00:00+02:00',
          }),
        ),
      );
      expect(updated.startAt.toISOString()).toBe(
        new Date('2026-05-01T14:00:00+02:00').toISOString(),
      );
    });
  });

  describe('cancel()', () => {
    it('sets status=CANCELLED and clears items in DB', async () => {
      const created = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.create(input()),
      );
      const cancelled = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.cancel(created.id, cancelAppointmentSchema.parse({ noShow: false })),
      );
      expect(cancelled.status).toBe('CANCELLED');
      expect(cancelled.cancelledAt).not.toBeNull();
    });

    it('sets status=NO_SHOW when noShow=true', async () => {
      const created = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.create(input()),
      );
      const result = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.cancel(created.id, cancelAppointmentSchema.parse({ noShow: true })),
      );
      expect(result.status).toBe('NO_SHOW');
      expect(result.noShow).toBe(true);
    });

    it('throws NotFoundException for unknown id', async () => {
      await expect(
        h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
          service.cancel(
            'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            cancelAppointmentSchema.parse({ noShow: false }),
          ),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('is idempotent: cancelled→cancelled keeps state', async () => {
      const created = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.create(input()),
      );
      await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.cancel(created.id, cancelAppointmentSchema.parse({ noShow: false })),
      );
      const second = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.cancel(created.id, cancelAppointmentSchema.parse({ noShow: false })),
      );
      expect(second.status).toBe('CANCELLED');
    });
  });

  describe('transition()', () => {
    it('moves CONFIRMED → CHECKED_IN with checkedInAt timestamp', async () => {
      const created = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.create(input()),
      );
      const result = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.transition(created.id, 'CHECKED_IN'),
      );
      expect(result.status).toBe('CHECKED_IN');
      expect(result.checkedInAt).not.toBeNull();
    });

    it('increments client.totalVisits on COMPLETED', async () => {
      const created = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.create(input()),
      );
      const before = await prisma.client.findUnique({ where: { id: clientRowId } });
      await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', async () => {
        await service.transition(created.id, 'CHECKED_IN');
        await service.transition(created.id, 'IN_SERVICE');
        await service.transition(created.id, 'COMPLETED');
      });
      const after = await prisma.client.findUnique({ where: { id: clientRowId } });
      expect(after!.totalVisits).toBe(before!.totalVisits + 1);
    });
  });
});
