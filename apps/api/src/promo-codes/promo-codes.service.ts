import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaClient, PromoCode } from '@salon-os/db';
import { PRISMA, WITH_TENANT } from '../db/db.module.js';
import { requireTenantContext } from '../tenant/tenant.context.js';

type WithTenantFn = <T>(
  tenantId: string,
  userId: string | null,
  role: string | null,
  fn: (tx: PrismaClient) => Promise<T>,
) => Promise<T>;

export interface ValidateResult {
  valid: boolean;
  type?: 'PERCENT' | 'FIXED';
  value?: string;
  discountChf?: number;
  reason?: string;
}

function requireManagerOrOwner(role: string | null): void {
  if (role !== 'OWNER' && role !== 'MANAGER') {
    throw new ForbiddenException('Nur OWNER oder MANAGER können Rabattcodes verwalten.');
  }
}

@Injectable()
export class PromoCodesService {
  constructor(
    @Inject(WITH_TENANT) private readonly withTenant: WithTenantFn,
    @Inject(PRISMA) private readonly prisma: PrismaClient,
  ) {}

  async list(): Promise<PromoCode[]> {
    const ctx = requireTenantContext();
    requireManagerOrOwner(ctx.role);
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      return tx.promoCode.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
    });
  }

  async create(input: {
    code: string;
    type: 'PERCENT' | 'FIXED';
    value: number;
    currency?: string;
    minOrderChf?: number;
    maxUsages?: number;
    expiresAt?: string;
    note?: string;
  }): Promise<PromoCode> {
    const ctx = requireTenantContext();
    requireManagerOrOwner(ctx.role);

    const code = input.code.trim().toUpperCase();

    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const existing = await tx.promoCode.findUnique({
        where: { tenantId_code: { tenantId: ctx.tenantId, code } },
      });
      if (existing) {
        throw new BadRequestException(`Code "${code}" existiert bereits für diesen Salon.`);
      }

      return tx.promoCode.create({
        data: {
          tenantId: ctx.tenantId,
          code,
          type: input.type,
          value: input.value,
          currency: input.currency ?? 'CHF',
          minOrderChf: input.minOrderChf ?? null,
          maxUsages: input.maxUsages ?? null,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          note: input.note ?? null,
        },
      });
    });
  }

  async update(
    id: string,
    patch: {
      active?: boolean;
      expiresAt?: string | null;
      note?: string | null;
    },
  ): Promise<PromoCode> {
    const ctx = requireTenantContext();
    requireManagerOrOwner(ctx.role);

    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const existing = await tx.promoCode.findFirst({ where: { id } });
      if (!existing) throw new NotFoundException(`PromoCode ${id} nicht gefunden.`);

      return tx.promoCode.update({
        where: { id },
        data: {
          ...(patch.active !== undefined ? { active: patch.active } : {}),
          ...(patch.expiresAt !== undefined
            ? { expiresAt: patch.expiresAt ? new Date(patch.expiresAt) : null }
            : {}),
          ...(patch.note !== undefined ? { note: patch.note } : {}),
        },
      });
    });
  }

  /** Soft-delete via active=false */
  async deactivate(id: string): Promise<PromoCode> {
    const ctx = requireTenantContext();
    requireManagerOrOwner(ctx.role);

    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const existing = await tx.promoCode.findFirst({ where: { id } });
      if (!existing) throw new NotFoundException(`PromoCode ${id} nicht gefunden.`);
      return tx.promoCode.update({ where: { id }, data: { active: false } });
    });
  }

  /**
   * Validate a promo code against an order amount and — if valid —
   * atomically increment usages in the same transaction.
   */
  async validate(input: {
    code: string;
    orderAmountChf: number;
  }): Promise<ValidateResult> {
    const ctx = requireTenantContext();
    const code = input.code.trim().toUpperCase();

    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const promo = await tx.promoCode.findUnique({
        where: { tenantId_code: { tenantId: ctx.tenantId, code } },
      });

      if (!promo || !promo.active) {
        return { valid: false, reason: 'Code ungültig oder inaktiv.' };
      }

      if (promo.expiresAt && promo.expiresAt < new Date()) {
        return { valid: false, reason: 'Code ist abgelaufen.' };
      }

      if (promo.maxUsages !== null && promo.usages >= promo.maxUsages) {
        return { valid: false, reason: 'Code wurde bereits zu oft eingelöst.' };
      }

      const minOrder = promo.minOrderChf !== null ? Number(promo.minOrderChf) : null;
      if (minOrder !== null && input.orderAmountChf < minOrder) {
        return {
          valid: false,
          reason: `Mindestbestellwert ${minOrder.toFixed(2)} CHF nicht erreicht.`,
        };
      }

      const promoValue = Number(promo.value);
      const discountChf =
        promo.type === 'PERCENT'
          ? Math.min(
              +((input.orderAmountChf * promoValue) / 100).toFixed(2),
              input.orderAmountChf,
            )
          : Math.min(promoValue, input.orderAmountChf);

      // Atomically increment usages in the same transaction
      await tx.promoCode.update({
        where: { id: promo.id },
        data: { usages: { increment: 1 } },
      });

      return {
        valid: true,
        type: promo.type,
        value: promo.value.toString(),
        discountChf,
      };
    });
  }
}
