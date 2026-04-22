import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ClientsService } from './clients.service.js';

vi.mock('../tenant/tenant.context.js', () => ({
  requireTenantContext: () => ({ tenantId: 'tenant1', userId: 'user1', role: 'ADMIN' }),
}));

function makePrisma() {
  return {
    client: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
  };
}

function makeWithTenant(prisma: ReturnType<typeof makePrisma>) {
  return vi.fn(
    (
      _tid: string,
      _uid: string | null,
      _role: string | null,
      fn: (tx: unknown) => Promise<unknown>,
    ) => fn(prisma),
  );
}

function makeAudit() {
  return { withinTx: vi.fn().mockResolvedValue(undefined) };
}

const BASE_INPUT = {
  firstName: 'Anna',
  lastName: 'Muster',
  marketingOptIn: false,
  smsOptIn: false,
  emailOptIn: false,
  allergies: [],
  tags: [],
};

describe('ClientsService', () => {
  let service: ClientsService;
  let prisma: ReturnType<typeof makePrisma>;
  let withTenant: ReturnType<typeof makeWithTenant>;
  let audit: ReturnType<typeof makeAudit>;

  beforeEach(() => {
    prisma = makePrisma();
    withTenant = makeWithTenant(prisma);
    audit = makeAudit();
    service = new ClientsService(withTenant as never, audit as never);
  });

  // ── get() ─────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('throws NotFoundException when client not found', async () => {
      prisma.client.findFirst.mockResolvedValue(null);
      await expect(service.get('c1')).rejects.toThrow(NotFoundException);
    });

    it('returns client when found', async () => {
      const client = { id: 'c1', firstName: 'Anna' };
      prisma.client.findFirst.mockResolvedValue(client);
      const result = await service.get('c1');
      expect(result).toEqual(client);
    });
  });

  // ── create() / normalizePhone ──────────────────────────────────────────────

  describe('create() — phone normalisation', () => {
    it('normalises Swiss 07x number to +417x', async () => {
      prisma.client.create.mockResolvedValue({ id: 'c1', ...BASE_INPUT });
      await service.create({ ...BASE_INPUT, phone: '079 123 45 67' });
      const createCall = prisma.client.create.mock.calls[0]![0] as { data: { phoneE164: string } };
      expect(createCall.data.phoneE164).toBe('+41791234567');
    });

    it('passes through already-normalised +41 number unchanged', async () => {
      prisma.client.create.mockResolvedValue({ id: 'c1', ...BASE_INPUT });
      await service.create({ ...BASE_INPUT, phone: '+41791234567' });
      const createCall = prisma.client.create.mock.calls[0]![0] as { data: { phoneE164: string } };
      expect(createCall.data.phoneE164).toBe('+41791234567');
    });

    it('sets phoneE164 to null when no phone provided', async () => {
      prisma.client.create.mockResolvedValue({ id: 'c1', ...BASE_INPUT });
      await service.create({ ...BASE_INPUT });
      const createCall = prisma.client.create.mock.calls[0]![0] as { data: { phoneE164: null } };
      expect(createCall.data.phoneE164).toBeNull();
    });

    it('sets language to de-CH by default', async () => {
      prisma.client.create.mockResolvedValue({ id: 'c1', ...BASE_INPUT });
      await service.create({ ...BASE_INPUT });
      const createCall = prisma.client.create.mock.calls[0]![0] as { data: { language: string } };
      expect(createCall.data.language).toBe('de-CH');
    });

    it('writes audit log on create', async () => {
      prisma.client.create.mockResolvedValue({
        id: 'c1',
        firstName: 'Anna',
        lastName: 'Muster',
        source: null,
      });
      await service.create({ ...BASE_INPUT });
      expect(audit.withinTx).toHaveBeenCalledOnce();
    });
  });

  // ── softDelete() ──────────────────────────────────────────────────────────

  describe('softDelete()', () => {
    it('sets deletedAt on the client', async () => {
      await service.softDelete('c1');
      expect(prisma.client.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
      );
    });

    it('writes audit log on soft-delete', async () => {
      await service.softDelete('c1');
      expect(audit.withinTx).toHaveBeenCalled();
    });
  });

  // ── importBulk() ──────────────────────────────────────────────────────────

  describe('importBulk()', () => {
    it('creates clients and returns correct count', async () => {
      prisma.client.findMany.mockResolvedValue([]);
      prisma.client.create.mockResolvedValue({});
      const result = await service.importBulk([BASE_INPUT, { ...BASE_INPUT, firstName: 'Bea' }]);
      expect(result.created).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('skips rows with duplicate emails', async () => {
      prisma.client.findMany.mockResolvedValue([{ email: 'anna@test.ch' }]);
      const result = await service.importBulk([{ ...BASE_INPUT, email: 'anna@test.ch' }]);
      expect(result.skipped).toBe(1);
      expect(result.created).toBe(0);
      expect(prisma.client.create).not.toHaveBeenCalled();
    });

    it('email comparison is case-insensitive', async () => {
      prisma.client.findMany.mockResolvedValue([{ email: 'ANNA@TEST.CH' }]);
      const result = await service.importBulk([{ ...BASE_INPUT, email: 'anna@test.ch' }]);
      expect(result.skipped).toBe(1);
    });

    it('collects errors per row without aborting the rest', async () => {
      prisma.client.findMany.mockResolvedValue([]);
      prisma.client.create.mockRejectedValueOnce(new Error('DB error')).mockResolvedValue({});
      const result = await service.importBulk([
        { ...BASE_INPUT, firstName: 'Bad' },
        { ...BASE_INPUT, firstName: 'Good' },
      ]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.row).toBe(1);
      expect(result.created).toBe(1);
    });

    it('deduplicates within the batch itself', async () => {
      prisma.client.findMany.mockResolvedValue([]);
      prisma.client.create.mockResolvedValue({});
      const result = await service.importBulk([
        { ...BASE_INPUT, email: 'same@test.ch' },
        { ...BASE_INPUT, email: 'same@test.ch' },
      ]);
      expect(result.created).toBe(1);
      expect(result.skipped).toBe(1);
    });

    it('sets source to csv-import when not provided', async () => {
      prisma.client.findMany.mockResolvedValue([]);
      prisma.client.create.mockResolvedValue({});
      await service.importBulk([BASE_INPUT]);
      const createCall = prisma.client.create.mock.calls[0]![0] as { data: { source: string } };
      expect(createCall.data.source).toBe('csv-import');
    });
  });

  // ── requestDeletion() ─────────────────────────────────────────────────────

  describe('requestDeletion()', () => {
    it('throws NotFoundException when client not found', async () => {
      prisma.client.findFirst.mockResolvedValue(null);
      await expect(service.requestDeletion('c1')).rejects.toThrow(NotFoundException);
    });

    it('sets deletedAt and appends DSGVO note', async () => {
      prisma.client.findFirst.mockResolvedValue({ id: 'c1', notesInternal: null });
      await service.requestDeletion('c1', 'Kundin hat gebeten');
      const updateCall = prisma.client.update.mock.calls[0]![0] as {
        data: { deletedAt: Date; notesInternal: string };
      };
      expect(updateCall.data.deletedAt).toBeInstanceOf(Date);
      expect(updateCall.data.notesInternal).toContain('DSGVO-Löschung');
      expect(updateCall.data.notesInternal).toContain('Kundin hat gebeten');
    });

    it('writes audit log with gdpr-forget action', async () => {
      prisma.client.findFirst.mockResolvedValue({ id: 'c1', notesInternal: null });
      await service.requestDeletion('c1');
      expect(audit.withinTx).toHaveBeenCalledWith(
        expect.anything(),
        'tenant1',
        'user1',
        expect.objectContaining({ action: 'gdpr-forget' }),
      );
    });
  });
});
