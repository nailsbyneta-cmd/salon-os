import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import type { PrismaClient } from '@salon-os/db';
import { createClientSchema, updateClientSchema } from '@salon-os/types';
import { ClientsService } from '../../src/clients/clients.service.js';
import { AuditService } from '../../src/audit/audit.service.js';
import { startTestPostgres, type TestPostgresHandle } from '../test-postgres.js';

/**
 * Behavior-Tests für ClientsService gegen echtes Postgres (Testcontainers).
 * Keine Mocks für Prisma — Tests verifizieren echte Persistenz, RLS-Setup,
 * Audit-Spuren und Tenant-Isolation.
 */
describe('ClientsService (behavior)', () => {
  let h: TestPostgresHandle;
  let service: ClientsService;
  let audit: AuditService;
  let prisma: PrismaClient;

  beforeAll(async () => {
    h = await startTestPostgres();
    prisma = h.prisma;
    audit = new AuditService(h.withTenant);
    service = new ClientsService(h.withTenant, audit);
  });

  afterAll(async () => {
    if (h) await h.stop();
  });

  beforeEach(async () => {
    await h.truncateAll();
  });

  describe('create()', () => {
    it('persists client with tenant_id from context', async () => {
      const created = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.create(
          createClientSchema.parse({
            firstName: 'Anna',
            lastName: 'Müller',
            email: 'anna@example.com',
          }),
        ),
      );
      expect(created.id).toBeDefined();
      expect(created.firstName).toBe('Anna');
      expect(created.tenantId).toBe(h.seed.tenantId);

      const dbRow = await prisma.client.findUnique({ where: { id: created.id } });
      expect(dbRow).not.toBeNull();
      expect(dbRow!.email).toBe('anna@example.com');
    });

    it('writes audit log on create', async () => {
      const c = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.create(
          createClientSchema.parse({
            firstName: 'Lea',
            lastName: 'Keller',
          }),
        ),
      );
      const logs = await prisma.auditLog.findMany({
        where: { entity: 'Client', entityId: c.id },
      });
      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0]!.action).toBe('create');
      expect(logs[0]!.tenantId).toBe(h.seed.tenantId);
    });

    it('normalizes phone to E.164 when provided', async () => {
      const c = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.create(
          createClientSchema.parse({
            firstName: 'Maja',
            lastName: 'Telefon',
            phone: '079 123 45 67',
          }),
        ),
      );
      expect(c.phoneE164).toMatch(/^\+417/);
    });
  });

  describe('list()', () => {
    it('returns only clients of the active tenant — RLS isolation', async () => {
      // Tenant A (Seed)
      await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.create(createClientSchema.parse({ firstName: 'In', lastName: 'Tenant-A' })),
      );

      // Sekundärer Tenant — direkt eingebogen
      const otherTenantId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
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
      await prisma.client.create({
        data: { tenantId: otherTenantId, firstName: 'Out', lastName: 'Tenant-B' },
      });

      const list = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.list(),
      );
      const lastNames = list.map((c) => c.lastName);
      expect(lastNames).toContain('Tenant-A');
      expect(lastNames).not.toContain('Tenant-B');
    });

    it('filters by query (firstName/lastName/phone substring)', async () => {
      await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', async () => {
        await service.create(createClientSchema.parse({ firstName: 'Anna', lastName: 'Schmidt' }));
        await service.create(createClientSchema.parse({ firstName: 'Bea', lastName: 'Bauer' }));
      });

      const result = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.list('Schmid'),
      );
      expect(result.length).toBe(1);
      expect(result[0]!.lastName).toBe('Schmidt');
    });
  });

  describe('update()', () => {
    it('updates email and persists', async () => {
      const created = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.create(createClientSchema.parse({ firstName: 'Up', lastName: 'Date' })),
      );
      const updated = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.update(created.id, updateClientSchema.parse({ email: 'new@x.ch' })),
      );
      expect(updated.email).toBe('new@x.ch');
      const dbRow = await prisma.client.findUnique({ where: { id: created.id } });
      expect(dbRow!.email).toBe('new@x.ch');
    });

    it('throws NotFoundException for unknown id', async () => {
      await expect(
        h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
          service.update(
            'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            updateClientSchema.parse({ firstName: 'X' }),
          ),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('softDelete()', () => {
    it('sets deletedAt and excludes from list()', async () => {
      const created = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.create(createClientSchema.parse({ firstName: 'To', lastName: 'Delete' })),
      );
      await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.softDelete(created.id),
      );
      const listed = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.list(),
      );
      expect(listed.find((c) => c.id === created.id)).toBeUndefined();
      const raw = await prisma.client.findUnique({ where: { id: created.id } });
      expect(raw!.deletedAt).not.toBeNull();
    });
  });

  describe('exportPersonalData() — DSGVO Art. 15', () => {
    it('returns client + appointments + totals as structured JSON', async () => {
      const c = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.create(createClientSchema.parse({ firstName: 'Export', lastName: 'Me' })),
      );
      const dump = (await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.exportPersonalData(c.id),
      )) as {
        exportedAt: string;
        basisGdpr: string;
        client: { id: string };
        appointments: unknown[];
        totals: { totalAppointments: number };
      };
      expect(dump.client.id).toBe(c.id);
      expect(dump.basisGdpr).toContain('GDPR');
      expect(dump.totals.totalAppointments).toBe(0);
      expect(typeof dump.exportedAt).toBe('string');
    });
  });

  describe('requestDeletion() — DSGVO Art. 17', () => {
    it('sets deletedAt + writes gdpr-forget audit log', async () => {
      const c = await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.create(createClientSchema.parse({ firstName: 'Forget', lastName: 'Me' })),
      );
      await h.asTenant(h.seed.tenantId, h.seed.staffUserId, 'OWNER', () =>
        service.requestDeletion(c.id, 'user-request'),
      );
      const dbRow = await prisma.client.findUnique({ where: { id: c.id } });
      expect(dbRow!.deletedAt).not.toBeNull();
      expect(dbRow!.notesInternal).toContain('DSGVO-Löschung');

      const audits = await prisma.auditLog.findMany({
        where: { entity: 'Client', entityId: c.id, action: 'gdpr-forget' },
      });
      expect(audits.length).toBe(1);
    });
  });
});
