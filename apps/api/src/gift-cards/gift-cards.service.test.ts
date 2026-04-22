import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GiftCardsService } from './gift-cards.service.js';

vi.mock('../tenant/tenant.context.js', () => ({
  requireTenantContext: () => ({ tenantId: 'tenant1', userId: 'user1', role: 'ADMIN' }),
}));

function makePrismaPublic() {
  return {
    giftCard: {
      findUnique: vi.fn(),
    },
  };
}

function makePrisma() {
  return {
    giftCard: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
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

const BASE_CARD = {
  id: 'gc1',
  code: 'ABCD-EFGH-IJKL',
  amount: 100,
  balance: 100,
  currency: 'CHF',
  tenantId: 'tenant1',
  recipientName: null,
  recipientEmail: null,
  message: null,
  expiresAt: new Date(Date.now() + 365 * 86400_000),
  redeemedAt: null,
  purchasedAt: new Date(),
};

describe('GiftCardsService', () => {
  let service: GiftCardsService;
  let prismaPublic: ReturnType<typeof makePrismaPublic>;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prismaPublic = makePrismaPublic();
    prisma = makePrisma();
    const withTenant = makeWithTenant(prisma);
    service = new GiftCardsService(withTenant as never, prismaPublic as never);
  });

  // ── issue() ───────────────────────────────────────────────────────────────

  describe('issue()', () => {
    it('throws BadRequestException for amount <= 0', async () => {
      await expect(service.issue({ amount: 0 })).rejects.toThrow(BadRequestException);
      await expect(service.issue({ amount: -50 })).rejects.toThrow(BadRequestException);
    });

    it('creates gift card with balance equal to amount', async () => {
      prisma.giftCard.create.mockResolvedValue(BASE_CARD);
      await service.issue({ amount: 100 });
      const call = prisma.giftCard.create.mock.calls[0]![0] as {
        data: { amount: number; balance: number };
      };
      expect(call.data.amount).toBe(100);
      expect(call.data.balance).toBe(100);
    });

    it('defaults currency to CHF', async () => {
      prisma.giftCard.create.mockResolvedValue(BASE_CARD);
      await service.issue({ amount: 50 });
      const call = prisma.giftCard.create.mock.calls[0]![0] as { data: { currency: string } };
      expect(call.data.currency).toBe('CHF');
    });

    it('uses custom currency when provided', async () => {
      prisma.giftCard.create.mockResolvedValue({ ...BASE_CARD, currency: 'EUR' });
      await service.issue({ amount: 50, currency: 'EUR' });
      const call = prisma.giftCard.create.mock.calls[0]![0] as { data: { currency: string } };
      expect(call.data.currency).toBe('EUR');
    });

    it('defaults expiry to 1 year when expiresInDays not given', async () => {
      prisma.giftCard.create.mockResolvedValue(BASE_CARD);
      const before = Date.now();
      await service.issue({ amount: 100 });
      const after = Date.now();
      const call = prisma.giftCard.create.mock.calls[0]![0] as { data: { expiresAt: Date } };
      const exp = call.data.expiresAt.getTime();
      expect(exp).toBeGreaterThanOrEqual(before + 364 * 86400_000);
      expect(exp).toBeLessThanOrEqual(after + 366 * 86400_000);
    });

    it('uses custom expiresInDays when provided', async () => {
      prisma.giftCard.create.mockResolvedValue(BASE_CARD);
      const before = Date.now();
      await service.issue({ amount: 100, expiresInDays: 30 });
      const call = prisma.giftCard.create.mock.calls[0]![0] as { data: { expiresAt: Date } };
      const exp = call.data.expiresAt.getTime();
      expect(exp).toBeGreaterThanOrEqual(before + 29 * 86400_000);
      expect(exp).toBeLessThanOrEqual(before + 31 * 86400_000);
    });

    it('generates a code matching XXXX-XXXX-XXXX format', async () => {
      prisma.giftCard.create.mockResolvedValue(BASE_CARD);
      await service.issue({ amount: 100 });
      const call = prisma.giftCard.create.mock.calls[0]![0] as { data: { code: string } };
      expect(call.data.code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    });

    it('retries code generation on collision', async () => {
      prisma.giftCard.findUnique.mockResolvedValueOnce({ id: 'existing' }).mockResolvedValue(null);
      prisma.giftCard.create.mockResolvedValue(BASE_CARD);
      await service.issue({ amount: 100 });
      expect(prisma.giftCard.create).toHaveBeenCalledOnce();
    });
  });

  // ── verify() ─────────────────────────────────────────────────────────────

  describe('verify()', () => {
    it('returns null for unknown code', async () => {
      prismaPublic.giftCard.findUnique.mockResolvedValue(null);
      const result = await service.verify('XXXX-XXXX-XXXX');
      expect(result).toBeNull();
    });

    it('returns null for expired card', async () => {
      prismaPublic.giftCard.findUnique.mockResolvedValue({
        ...BASE_CARD,
        expiresAt: new Date(Date.now() - 86400_000),
        tenant: { name: 'Demo' },
      });
      const result = await service.verify(BASE_CARD.code);
      expect(result).toBeNull();
    });

    it('returns card info for valid non-expired card', async () => {
      prismaPublic.giftCard.findUnique.mockResolvedValue({
        ...BASE_CARD,
        tenant: { name: 'Demo Salon' },
      });
      const result = await service.verify(BASE_CARD.code);
      expect(result).not.toBeNull();
      expect(result!.tenantName).toBe('Demo Salon');
      expect(result!.currency).toBe('CHF');
    });

    it('normalises code to uppercase before lookup', async () => {
      prismaPublic.giftCard.findUnique.mockResolvedValue(null);
      await service.verify('abcd-efgh-ijkl');
      expect(prismaPublic.giftCard.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { code: 'ABCD-EFGH-IJKL' } }),
      );
    });
  });

  // ── redeem() ─────────────────────────────────────────────────────────────

  describe('redeem()', () => {
    it('throws NotFoundException for unknown code', async () => {
      prisma.giftCard.findUnique.mockResolvedValue(null);
      await expect(service.redeem('XXXX-XXXX-XXXX', 50)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for expired card', async () => {
      prisma.giftCard.findUnique.mockResolvedValue({
        ...BASE_CARD,
        expiresAt: new Date(Date.now() - 86400_000),
      });
      await expect(service.redeem(BASE_CARD.code, 50)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when amount exceeds balance', async () => {
      prisma.giftCard.findUnique.mockResolvedValue({ ...BASE_CARD, balance: 30 });
      await expect(service.redeem(BASE_CARD.code, 50)).rejects.toThrow(BadRequestException);
    });

    it('deducts amount from balance', async () => {
      prisma.giftCard.findUnique.mockResolvedValue({ ...BASE_CARD, balance: 100 });
      prisma.giftCard.update.mockResolvedValue({ ...BASE_CARD, balance: 60 });
      await service.redeem(BASE_CARD.code, 40);
      expect(prisma.giftCard.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ balance: 60 }) }),
      );
    });

    it('sets redeemedAt when balance reaches zero', async () => {
      prisma.giftCard.findUnique.mockResolvedValue({ ...BASE_CARD, balance: 50, redeemedAt: null });
      prisma.giftCard.update.mockResolvedValue({ ...BASE_CARD, balance: 0 });
      await service.redeem(BASE_CARD.code, 50);
      expect(prisma.giftCard.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ redeemedAt: expect.any(Date) }),
        }),
      );
    });

    it('does not overwrite redeemedAt when balance remains > 0', async () => {
      const existingRedeemedAt = null;
      prisma.giftCard.findUnique.mockResolvedValue({
        ...BASE_CARD,
        balance: 100,
        redeemedAt: existingRedeemedAt,
      });
      prisma.giftCard.update.mockResolvedValue({ ...BASE_CARD, balance: 60 });
      await service.redeem(BASE_CARD.code, 40);
      const call = prisma.giftCard.update.mock.calls[0]![0] as { data: { redeemedAt: null } };
      expect(call.data.redeemedAt).toBeNull();
    });

    it('normalises code to uppercase', async () => {
      prisma.giftCard.findUnique.mockResolvedValue({
        ...BASE_CARD,
        balance: 100,
        redeemedAt: null,
      });
      prisma.giftCard.update.mockResolvedValue(BASE_CARD);
      await service.redeem('abcd-efgh-ijkl', 10);
      expect(prisma.giftCard.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { code: 'ABCD-EFGH-IJKL' } }),
      );
    });
  });
});
