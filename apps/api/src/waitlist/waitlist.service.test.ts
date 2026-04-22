import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WaitlistService } from './waitlist.service.js';

vi.mock('../tenant/tenant.context.js', () => ({
  requireTenantContext: () => ({ tenantId: 'tenant1', userId: 'user1', role: 'ADMIN' }),
}));

function makePrismaPublic() {
  return {
    tenant: {
      findUnique: vi.fn().mockResolvedValue({ id: 'tenant1', status: 'ACTIVE' }),
    },
  };
}

function makePrisma() {
  return {
    client: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'client1' }),
    },
    waitlistEntry: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn(),
      create: vi.fn().mockResolvedValue({ id: 'entry1' }),
      update: vi.fn().mockResolvedValue({ id: 'entry1' }),
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

const FUTURE_EARLIEST = new Date(Date.now() + 86400_000).toISOString();
const FUTURE_LATEST = new Date(Date.now() + 86400_000 * 7).toISOString();

const BASE_ADMIN_INPUT = {
  serviceId: 'svc1',
  locationId: 'loc1',
  earliestAt: FUTURE_EARLIEST,
  latestAt: FUTURE_LATEST,
  clientId: 'client1',
};

describe('WaitlistService', () => {
  let service: WaitlistService;
  let prismaPublic: ReturnType<typeof makePrismaPublic>;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prismaPublic = makePrismaPublic();
    prisma = makePrisma();
    const withTenant = makeWithTenant(prisma);
    service = new WaitlistService(withTenant as never, prismaPublic as never);
  });

  // ── adminAdd() ────────────────────────────────────────────────────────────

  describe('adminAdd()', () => {
    it('throws BadRequestException when latestAt <= earliestAt', async () => {
      await expect(
        service.adminAdd({
          ...BASE_ADMIN_INPUT,
          earliestAt: FUTURE_LATEST,
          latestAt: FUTURE_EARLIEST,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when neither clientId nor newClient given', async () => {
      const { clientId: _c, ...input } = BASE_ADMIN_INPUT;
      await expect(service.adminAdd(input)).rejects.toThrow(BadRequestException);
    });

    it('creates new client when newClient provided without clientId', async () => {
      await service.adminAdd({
        ...BASE_ADMIN_INPUT,
        clientId: undefined,
        newClient: { firstName: 'Anna', lastName: 'Muster' },
      });
      expect(prisma.client.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ source: 'waitlist-admin' }) }),
      );
    });

    it('uses existing clientId without creating new client', async () => {
      await service.adminAdd(BASE_ADMIN_INPUT);
      expect(prisma.client.create).not.toHaveBeenCalled();
    });

    it('creates waitlist entry with correct data', async () => {
      await service.adminAdd(BASE_ADMIN_INPUT);
      expect(prisma.waitlistEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clientId: 'client1',
            serviceId: 'svc1',
            locationId: 'loc1',
            tenantId: 'tenant1',
          }),
        }),
      );
    });
  });

  // ── publicAdd() ───────────────────────────────────────────────────────────

  describe('publicAdd()', () => {
    const BASE_PUBLIC_INPUT = {
      serviceId: 'svc1',
      locationId: 'loc1',
      earliestAt: FUTURE_EARLIEST,
      latestAt: FUTURE_LATEST,
      client: { firstName: 'Anna', lastName: 'Muster', email: 'anna@test.ch' },
    };

    it('throws NotFoundException for unknown tenant', async () => {
      prismaPublic.tenant.findUnique.mockResolvedValue(null);
      await expect(service.publicAdd('unknown', BASE_PUBLIC_INPUT)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException for SUSPENDED tenant', async () => {
      prismaPublic.tenant.findUnique.mockResolvedValue({ id: 'tenant1', status: 'SUSPENDED' });
      await expect(service.publicAdd('demo-salon', BASE_PUBLIC_INPUT)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when latestAt <= earliestAt', async () => {
      await expect(
        service.publicAdd('demo-salon', {
          ...BASE_PUBLIC_INPUT,
          earliestAt: FUTURE_LATEST,
          latestAt: FUTURE_EARLIEST,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('reuses existing client when email matches', async () => {
      prisma.client.findFirst.mockResolvedValue({ id: 'existing1', email: 'anna@test.ch' });
      await service.publicAdd('demo-salon', BASE_PUBLIC_INPUT);
      expect(prisma.client.create).not.toHaveBeenCalled();
    });

    it('creates new client when no match found', async () => {
      prisma.client.findFirst.mockResolvedValue(null);
      await service.publicAdd('demo-salon', BASE_PUBLIC_INPUT);
      expect(prisma.client.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ source: 'waitlist', email: 'anna@test.ch' }),
        }),
      );
    });
  });

  // ── setStatus() ───────────────────────────────────────────────────────────

  describe('setStatus()', () => {
    it('throws NotFoundException when entry not found', async () => {
      prisma.waitlistEntry.findFirst.mockResolvedValue(null);
      await expect(service.setStatus('entry1', 'FULFILLED')).rejects.toThrow(NotFoundException);
    });

    it('updates status to FULFILLED', async () => {
      prisma.waitlistEntry.findFirst.mockResolvedValue({ id: 'entry1', status: 'ACTIVE' });
      await service.setStatus('entry1', 'FULFILLED');
      expect(prisma.waitlistEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'entry1' }, data: { status: 'FULFILLED' } }),
      );
    });

    it('updates status to CANCELLED', async () => {
      prisma.waitlistEntry.findFirst.mockResolvedValue({ id: 'entry1', status: 'ACTIVE' });
      await service.setStatus('entry1', 'CANCELLED');
      expect(prisma.waitlistEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'CANCELLED' } }),
      );
    });
  });

  // ── listActive() ──────────────────────────────────────────────────────────

  describe('listActive()', () => {
    it('queries only ACTIVE entries ordered by earliestAt', async () => {
      await service.listActive();
      expect(prisma.waitlistEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'ACTIVE' },
          orderBy: { earliestAt: 'asc' },
        }),
      );
    });
  });
});
