import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { GiftCard, PrismaClient } from '@salon-os/db';
import { WITH_TENANT } from '../db/db.module.js';
import { requireTenantContext } from '../tenant/tenant.context.js';

type WithTenantFn = <T>(
  tenantId: string,
  userId: string | null,
  role: string | null,
  fn: (tx: PrismaClient) => Promise<T>,
) => Promise<T>;

function randomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
    if (i === 3 || i === 7) code += '-';
  }
  return code;
}

@Injectable()
export class GiftCardsService {
  constructor(
    @Inject(WITH_TENANT) private readonly withTenant: WithTenantFn,
    @Inject('PRISMA_PUBLIC') private readonly prismaPublic: PrismaClient,
  ) {}

  async list(): Promise<GiftCard[]> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      return tx.giftCard.findMany({
        orderBy: { purchasedAt: 'desc' },
        take: 100,
      });
    });
  }

  async issue(input: {
    amount: number;
    currency?: string;
    recipientName?: string;
    recipientEmail?: string;
    message?: string;
    expiresInDays?: number;
  }): Promise<GiftCard> {
    const ctx = requireTenantContext();
    if (input.amount <= 0) throw new BadRequestException('Betrag muss positiv sein.');

    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      let code = randomCode();
      // 3 Versuche falls Kollision (praktisch unmöglich bei 32^10)
      for (let i = 0; i < 3; i++) {
        const exists = await tx.giftCard.findUnique({ where: { code } });
        if (!exists) break;
        code = randomCode();
      }
      const expiresAt = input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // default 1 Jahr

      return tx.giftCard.create({
        data: {
          tenantId: ctx.tenantId,
          code,
          amount: input.amount,
          balance: input.amount,
          currency: input.currency ?? 'CHF',
          recipientName: input.recipientName ?? null,
          recipientEmail: input.recipientEmail ?? null,
          message: input.message ?? null,
          expiresAt,
        },
      });
    });
  }

  /** Öffentliche Abfrage per Code — nutzt Admin-Connection, kein Tenant-Context. */
  async verify(code: string): Promise<{
    code: string;
    balance: string;
    currency: string;
    recipientName: string | null;
    message: string | null;
    expiresAt: Date | null;
    tenantName: string;
  } | null> {
    const normalized = code.trim().toUpperCase();
    const card = await this.prismaPublic.giftCard.findUnique({
      where: { code: normalized },
      include: { tenant: { select: { name: true } } },
    });
    if (!card) return null;
    if (card.expiresAt && card.expiresAt < new Date()) return null;
    return {
      code: card.code,
      balance: card.balance.toString(),
      currency: card.currency,
      recipientName: card.recipientName,
      message: card.message,
      expiresAt: card.expiresAt,
      tenantName: card.tenant.name,
    };
  }

  async redeem(code: string, amountToDeduct: number): Promise<GiftCard> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const normalized = code.trim().toUpperCase();
      const card = await tx.giftCard.findUnique({ where: { code: normalized } });
      if (!card) throw new NotFoundException('Gutschein nicht gefunden.');
      if (card.expiresAt && card.expiresAt < new Date()) {
        throw new BadRequestException('Gutschein abgelaufen.');
      }
      const newBalance = Number(card.balance) - amountToDeduct;
      if (newBalance < 0) throw new BadRequestException('Nicht genug Guthaben.');

      return tx.giftCard.update({
        where: { id: card.id },
        data: {
          balance: newBalance,
          redeemedAt: newBalance === 0 ? new Date() : card.redeemedAt,
        },
      });
    });
  }
}
