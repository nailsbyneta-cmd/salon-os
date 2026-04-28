import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { LoyaltyProgram, LoyaltyStamp, PrismaClient } from '@salon-os/db';
import { Prisma } from '@salon-os/db';
import { PRISMA, WITH_TENANT } from '../db/db.module.js';
import { requireTenantContext } from '../tenant/tenant.context.js';

type WithTenantFn = <T>(
  tenantId: string,
  userId: string | null,
  role: string | null,
  fn: (tx: PrismaClient) => Promise<T>,
) => Promise<T>;

export interface UpsertProgramInput {
  name: string;
  active?: boolean;
  earnRule?: 'per_appointment' | 'per_chf';
  earnPerUnit?: number;
  redeemThreshold?: number;
  rewardValueChf?: number;
  rewardLabel?: string;
}

export interface ClientBalance {
  clientId: string;
  balance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  rewardsAvailable: number; // floor(balance / redeemThreshold)
}

@Injectable()
export class LoyaltyService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(WITH_TENANT) private readonly withTenant: WithTenantFn,
  ) {}

  /** Pro Tenant max 1 Programm. */
  async getProgram(tenantId?: string): Promise<LoyaltyProgram | null> {
    const tid = tenantId ?? requireTenantContext().tenantId;
    const ctx = requireTenantContext();
    return this.withTenant(tid, ctx.userId, ctx.role, async (tx) => {
      return tx.loyaltyProgram.findFirst({ where: { tenantId: tid } });
    });
  }

  async upsertProgram(input: UpsertProgramInput): Promise<LoyaltyProgram> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const existing = await tx.loyaltyProgram.findFirst({
        where: { tenantId: ctx.tenantId },
      });
      const data = {
        name: input.name,
        active: input.active ?? true,
        earnRule: input.earnRule ?? 'per_appointment',
        earnPerUnit: Math.max(1, input.earnPerUnit ?? 1),
        redeemThreshold: Math.max(1, input.redeemThreshold ?? 10),
        rewardValueChf: new Prisma.Decimal(input.rewardValueChf ?? 0),
        rewardLabel: input.rewardLabel ?? 'Gratis-Service',
      };
      if (existing) {
        return tx.loyaltyProgram.update({ where: { id: existing.id }, data });
      }
      return tx.loyaltyProgram.create({
        data: { tenantId: ctx.tenantId, ...data },
      });
    });
  }

  async getClientBalance(clientId: string): Promise<ClientBalance> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const program = await tx.loyaltyProgram.findFirst({
        where: { tenantId: ctx.tenantId },
      });
      const stamps = await tx.loyaltyStamp.findMany({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
        take: 500,
      });
      let balance = 0;
      let lifetimeEarned = 0;
      let lifetimeRedeemed = 0;
      // stamps already DESC — letzter Eintrag hat balanceAfter = aktuelle Summe
      if (stamps.length > 0) {
        balance = stamps[0]!.balanceAfter;
      }
      for (const s of stamps) {
        if (s.delta > 0) lifetimeEarned += s.delta;
        else lifetimeRedeemed += -s.delta;
      }
      const threshold = program?.redeemThreshold ?? 10;
      return {
        clientId,
        balance,
        lifetimeEarned,
        lifetimeRedeemed,
        rewardsAvailable: Math.floor(balance / threshold),
      };
    });
  }

  async listClientStamps(clientId: string, limit = 50): Promise<LoyaltyStamp[]> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      return tx.loyaltyStamp.findMany({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
        take: Math.min(Math.max(1, limit), 200),
      });
    });
  }

  /**
   * Award (Manager-Klick oder auto bei Termin-COMPLETED).
   * Idempotent: bei (programId, appointmentId) UNIQUE-Index verhindert
   * Doppel-Award. Caller behandelt P2002 als "already awarded".
   */
  async awardStamps(input: {
    clientId: string;
    delta: number;
    appointmentId?: string;
    notes?: string;
  }): Promise<LoyaltyStamp> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const program = await tx.loyaltyProgram.findFirst({
        where: { tenantId: ctx.tenantId, active: true },
      });
      if (!program) throw new NotFoundException('Kein aktives Loyalty-Programm.');
      const last = await tx.loyaltyStamp.findFirst({
        where: { clientId: input.clientId, programId: program.id },
        orderBy: { createdAt: 'desc' },
      });
      const balanceAfter = (last?.balanceAfter ?? 0) + input.delta;
      if (balanceAfter < 0) {
        throw new Error('Negativer Saldo nicht erlaubt — nutze REDEEM oder ADJUST.');
      }
      return tx.loyaltyStamp.create({
        data: {
          tenantId: ctx.tenantId,
          programId: program.id,
          clientId: input.clientId,
          delta: input.delta,
          balanceAfter,
          reason: 'AWARD',
          appointmentId: input.appointmentId ?? null,
          performedBy: ctx.userId,
          notes: input.notes ?? null,
        },
      });
    });
  }

  /**
   * Redeem 1 Reward = redeemThreshold Stamps. Wirft wenn Saldo nicht reicht.
   */
  async redeemReward(input: {
    clientId: string;
    notes?: string;
  }): Promise<{ stamp: LoyaltyStamp; rewardLabel: string }> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const program = await tx.loyaltyProgram.findFirst({
        where: { tenantId: ctx.tenantId, active: true },
      });
      if (!program) throw new NotFoundException('Kein aktives Loyalty-Programm.');
      const last = await tx.loyaltyStamp.findFirst({
        where: { clientId: input.clientId, programId: program.id },
        orderBy: { createdAt: 'desc' },
      });
      const balance = last?.balanceAfter ?? 0;
      if (balance < program.redeemThreshold) {
        throw new Error(
          `Saldo ${balance} unter Schwelle ${program.redeemThreshold} — kein Reward verfügbar.`,
        );
      }
      const stamp = await tx.loyaltyStamp.create({
        data: {
          tenantId: ctx.tenantId,
          programId: program.id,
          clientId: input.clientId,
          delta: -program.redeemThreshold,
          balanceAfter: balance - program.redeemThreshold,
          reason: 'REDEEM',
          performedBy: ctx.userId,
          notes: input.notes ?? `Reward eingelöst: ${program.rewardLabel}`,
        },
      });
      return { stamp, rewardLabel: program.rewardLabel };
    });
  }

  async adjustStamps(input: {
    clientId: string;
    delta: number;
    notes?: string;
  }): Promise<LoyaltyStamp> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const program = await tx.loyaltyProgram.findFirst({
        where: { tenantId: ctx.tenantId, active: true },
      });
      if (!program) throw new NotFoundException('Kein aktives Loyalty-Programm.');
      const last = await tx.loyaltyStamp.findFirst({
        where: { clientId: input.clientId, programId: program.id },
        orderBy: { createdAt: 'desc' },
      });
      const newBalance = Math.max(0, (last?.balanceAfter ?? 0) + input.delta);
      const realDelta = newBalance - (last?.balanceAfter ?? 0);
      return tx.loyaltyStamp.create({
        data: {
          tenantId: ctx.tenantId,
          programId: program.id,
          clientId: input.clientId,
          delta: realDelta,
          balanceAfter: newBalance,
          reason: 'ADJUST',
          performedBy: ctx.userId,
          notes: input.notes ?? null,
        },
      });
    });
  }

  /**
   * Cron-/Hook-getrieben: bei Appointment-COMPLETED automatisch awarden.
   * Wird vom Appointments-Service gerufen wenn status auf COMPLETED wechselt.
   * Cross-Tenant-fähig (PRISMA bypass) — siehe call-site context.
   */
  async autoAwardForCompletedAppointment(args: {
    appointmentId: string;
    tenantId: string;
    clientId: string | null;
    revenueChf: number;
  }): Promise<void> {
    if (!args.clientId) return;
    const program = await this.prisma.loyaltyProgram.findFirst({
      where: { tenantId: args.tenantId, active: true },
    });
    if (!program) return;
    // Idempotency-Check: schon AWARD für diesen appointmentId?
    const existing = await this.prisma.loyaltyStamp.findFirst({
      where: {
        programId: program.id,
        appointmentId: args.appointmentId,
        reason: 'AWARD',
      },
      select: { id: true },
    });
    if (existing) return;

    const delta =
      program.earnRule === 'per_chf'
        ? Math.max(0, Math.floor(args.revenueChf / Math.max(1, program.earnPerUnit)))
        : program.earnPerUnit;
    if (delta <= 0) return;

    const last = await this.prisma.loyaltyStamp.findFirst({
      where: { clientId: args.clientId, programId: program.id },
      orderBy: { createdAt: 'desc' },
    });
    const balanceAfter = (last?.balanceAfter ?? 0) + delta;
    try {
      await this.prisma.loyaltyStamp.create({
        data: {
          tenantId: args.tenantId,
          programId: program.id,
          clientId: args.clientId,
          delta,
          balanceAfter,
          reason: 'AWARD',
          appointmentId: args.appointmentId,
        },
      });
    } catch (e) {
      // P2002 — Race-Condition, schon awarded
      if (e instanceof Error && (e as { code?: string }).code === 'P2002') return;
      throw e;
    }
  }
}
