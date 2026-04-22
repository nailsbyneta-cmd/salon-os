import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditService } from './audit.service.js';

vi.mock('../tenant/tenant.context.js', () => ({
  requireTenantContext: () => ({ tenantId: 'tenant1', userId: 'user1', role: 'ADMIN' }),
}));

function makePrisma() {
  return {
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: 'log1' }),
      findMany: vi.fn().mockResolvedValue([]),
    },
  };
}

function makeWithTenant(prisma: ReturnType<typeof makePrisma>) {
  return vi.fn((_tid: string, _uid: string | null, _role: string | null, fn: (tx: unknown) => Promise<unknown>) =>
    fn(prisma),
  );
}

const BASE_RECORD = {
  entity: 'Client',
  entityId: 'c1',
  action: 'update',
  diff: { firstName: { from: 'Anna', to: 'Anna Maria' } },
};

describe('AuditService', () => {
  let service: AuditService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new AuditService(makeWithTenant(prisma) as never);
  });

  // ── withinTx() ────────────────────────────────────────────────────────────

  describe('withinTx()', () => {
    it('creates audit log entry with correct fields', async () => {
      await service.withinTx(prisma as never, 'tenant1', 'user1', BASE_RECORD);
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant1',
            actorId: 'user1',
            actorType: 'USER',
            entity: 'Client',
            entityId: 'c1',
            action: 'update',
          }),
        }),
      );
    });

    it('sets actorType to SYSTEM when actorId is null', async () => {
      await service.withinTx(prisma as never, 'tenant1', null, BASE_RECORD);
      const call = prisma.auditLog.create.mock.calls[0]![0] as { data: { actorType: string } };
      expect(call.data.actorType).toBe('SYSTEM');
    });

    it('includes diff when provided', async () => {
      await service.withinTx(prisma as never, 'tenant1', 'user1', BASE_RECORD);
      const call = prisma.auditLog.create.mock.calls[0]![0] as { data: { diff: unknown } };
      expect(call.data.diff).toEqual(BASE_RECORD.diff);
    });

    it('omits diff key when diff is not provided', async () => {
      const { diff: _d, ...recWithoutDiff } = BASE_RECORD;
      await service.withinTx(prisma as never, 'tenant1', 'user1', recWithoutDiff);
      const call = prisma.auditLog.create.mock.calls[0]![0] as { data: Record<string, unknown> };
      expect(call.data).not.toHaveProperty('diff');
    });
  });

  // ── record() ─────────────────────────────────────────────────────────────

  describe('record()', () => {
    it('writes audit log via withTenant context', async () => {
      await service.record(BASE_RECORD);
      expect(prisma.auditLog.create).toHaveBeenCalledOnce();
    });
  });

  // ── list() ───────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('returns entries with nextCursor null when no more pages', async () => {
      prisma.auditLog.findMany.mockResolvedValue([{ id: 'log1' }, { id: 'log2' }]);
      const result = await service.list({ limit: 50 });
      expect(result.nextCursor).toBeNull();
      expect(result.entries).toHaveLength(2);
    });

    it('returns nextCursor when more pages exist', async () => {
      const entries = Array.from({ length: 11 }, (_, i) => ({ id: `log${i}` }));
      prisma.auditLog.findMany.mockResolvedValue(entries);
      const result = await service.list({ limit: 10 });
      expect(result.entries).toHaveLength(10);
      expect(result.nextCursor).toBe('log9');
    });

    it('filters by entity when provided', async () => {
      await service.list({ entity: 'Client' });
      const where = (prisma.auditLog.findMany.mock.calls[0]![0] as { where: Record<string, unknown> }).where;
      expect(where).toMatchObject({ entity: 'Client' });
    });

    it('filters by entityId when provided', async () => {
      await service.list({ entityId: 'c1' });
      const where = (prisma.auditLog.findMany.mock.calls[0]![0] as { where: Record<string, unknown> }).where;
      expect(where).toMatchObject({ entityId: 'c1' });
    });

    it('caps limit at 200 max', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      await service.list({ limit: 999 });
      const take = (prisma.auditLog.findMany.mock.calls[0]![0] as { take: number }).take;
      expect(take).toBe(201); // 200 + 1 for hasMore check
    });

    it('defaults to limit 50 when not provided', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      await service.list({});
      const take = (prisma.auditLog.findMany.mock.calls[0]![0] as { take: number }).take;
      expect(take).toBe(51);
    });

    it('uses cursor for pagination when provided', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      await service.list({ cursor: 'log5' });
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 1, cursor: { id: 'log5' } }),
      );
    });
  });
});
