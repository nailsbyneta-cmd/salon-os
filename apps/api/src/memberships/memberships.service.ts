import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { BillingCycle, ClientMembership, MembershipPlan, PrismaClient } from '@salon-os/db';
import { Prisma } from '@salon-os/db';
import { PRISMA, WITH_TENANT } from '../db/db.module.js';
import { requireTenantContext } from '../tenant/tenant.context.js';

type WithTenantFn = <T>(
  tenantId: string,
  userId: string | null,
  role: string | null,
  fn: (tx: PrismaClient) => Promise<T>,
) => Promise<T>;

function requireAdmin(role: string | null): void {
  if (role !== 'OWNER' && role !== 'MANAGER') {
    throw new ForbiddenException('Nur OWNER oder MANAGER dürfen Mitgliedschafts-Pläne verwalten.');
  }
}

function nextBillingDate(startedAt: Date, cycle: BillingCycle): Date {
  const d = new Date(startedAt);
  if (cycle === 'MONTHLY') d.setDate(d.getDate() + 30);
  else if (cycle === 'QUARTERLY') d.setDate(d.getDate() + 90);
  else d.setDate(d.getDate() + 365);
  return d;
}

export interface CreatePlanInput {
  name: string;
  description?: string;
  priceChf: number;
  billingCycle: BillingCycle;
  sessionCredits?: number | null;
  discountPct?: number | null;
  active?: boolean;
}

export interface UpdatePlanInput {
  name?: string;
  description?: string | null;
  priceChf?: number;
  billingCycle?: BillingCycle;
  sessionCredits?: number | null;
  discountPct?: number | null;
  active?: boolean;
}

export interface ClientMembershipWithPlan extends ClientMembership {
  plan: MembershipPlan;
}

@Injectable()
export class MembershipsService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(WITH_TENANT) private readonly withTenant: WithTenantFn,
  ) {}

  // ─── Plans ─────────────────────────────────────────────────────────────────

  async listPlans(): Promise<MembershipPlan[]> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      return tx.membershipPlan.findMany({
        where: { tenantId: ctx.tenantId },
        orderBy: { createdAt: 'asc' },
      });
    });
  }

  async createPlan(input: CreatePlanInput): Promise<MembershipPlan> {
    const ctx = requireTenantContext();
    requireAdmin(ctx.role);
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      return tx.membershipPlan.create({
        data: {
          tenantId: ctx.tenantId,
          name: input.name,
          description: input.description ?? null,
          priceChf: new Prisma.Decimal(input.priceChf),
          billingCycle: input.billingCycle,
          sessionCredits: input.sessionCredits ?? null,
          discountPct: input.discountPct ?? null,
          active: input.active ?? true,
        },
      });
    });
  }

  async updatePlan(id: string, input: UpdatePlanInput): Promise<MembershipPlan> {
    const ctx = requireTenantContext();
    requireAdmin(ctx.role);
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const plan = await tx.membershipPlan.findFirst({
        where: { id, tenantId: ctx.tenantId },
      });
      if (!plan) throw new NotFoundException(`Plan ${id} nicht gefunden.`);
      const data: Prisma.MembershipPlanUpdateInput = {};
      if (input.name !== undefined) data.name = input.name;
      if (Object.prototype.hasOwnProperty.call(input, 'description'))
        data.description = input.description ?? null;
      if (input.priceChf !== undefined) data.priceChf = new Prisma.Decimal(input.priceChf);
      if (input.billingCycle !== undefined) data.billingCycle = input.billingCycle;
      if (Object.prototype.hasOwnProperty.call(input, 'sessionCredits'))
        data.sessionCredits = input.sessionCredits ?? null;
      if (Object.prototype.hasOwnProperty.call(input, 'discountPct'))
        data.discountPct = input.discountPct ?? null;
      if (input.active !== undefined) data.active = input.active;
      return tx.membershipPlan.update({ where: { id }, data });
    });
  }

  async deactivatePlan(id: string): Promise<MembershipPlan> {
    const ctx = requireTenantContext();
    requireAdmin(ctx.role);
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const plan = await tx.membershipPlan.findFirst({
        where: { id, tenantId: ctx.tenantId },
      });
      if (!plan) throw new NotFoundException(`Plan ${id} nicht gefunden.`);
      return tx.membershipPlan.update({ where: { id }, data: { active: false } });
    });
  }

  // ─── Client Memberships ────────────────────────────────────────────────────

  async getClientMembership(clientId: string): Promise<ClientMembershipWithPlan | null> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      return tx.clientMembership.findFirst({
        where: { clientId, tenantId: ctx.tenantId, status: 'ACTIVE' },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  }

  async listActiveMemberships(): Promise<
    Array<
      ClientMembership & {
        plan: MembershipPlan;
        client: { id: string; firstName: string; lastName: string };
      }
    >
  > {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      return tx.clientMembership.findMany({
        where: { tenantId: ctx.tenantId },
        include: {
          plan: true,
          client: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
    });
  }

  async subscribe(input: { clientId: string; planId: string }): Promise<ClientMembershipWithPlan> {
    const ctx = requireTenantContext();
    requireAdmin(ctx.role);
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const plan = await tx.membershipPlan.findFirst({
        where: { id: input.planId, tenantId: ctx.tenantId, active: true },
      });
      if (!plan) throw new NotFoundException(`Plan ${input.planId} nicht gefunden oder inaktiv.`);

      const client = await tx.client.findFirst({
        where: { id: input.clientId, tenantId: ctx.tenantId },
        select: { id: true },
      });
      if (!client) throw new NotFoundException(`Kundin ${input.clientId} nicht gefunden.`);

      const existing = await tx.clientMembership.findFirst({
        where: { clientId: input.clientId, tenantId: ctx.tenantId, status: 'ACTIVE' },
      });
      if (existing) {
        throw new BadRequestException(
          'Kundin hat bereits eine aktive Mitgliedschaft. Bitte erst kündigen.',
        );
      }

      const now = new Date();
      const nextBillingAt = nextBillingDate(now, plan.billingCycle);

      return tx.clientMembership.create({
        data: {
          tenantId: ctx.tenantId,
          clientId: input.clientId,
          planId: input.planId,
          status: 'ACTIVE',
          startedAt: now,
          nextBillingAt,
          creditsUsed: 0,
        },
        include: { plan: true },
      });
    });
  }

  async cancel(id: string): Promise<ClientMembership> {
    const ctx = requireTenantContext();
    requireAdmin(ctx.role);
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const membership = await tx.clientMembership.findFirst({
        where: { id, tenantId: ctx.tenantId },
      });
      if (!membership) throw new NotFoundException(`Mitgliedschaft ${id} nicht gefunden.`);
      if (membership.status === 'CANCELLED') {
        throw new BadRequestException('Mitgliedschaft ist bereits gekündigt.');
      }
      return tx.clientMembership.update({
        where: { id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });
    });
  }

  async useCredit(id: string): Promise<ClientMembership> {
    const ctx = requireTenantContext();
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const membership = await tx.clientMembership.findFirst({
        where: { id, tenantId: ctx.tenantId },
        include: { plan: true },
      });
      if (!membership) throw new NotFoundException(`Mitgliedschaft ${id} nicht gefunden.`);
      if (membership.status !== 'ACTIVE') {
        throw new BadRequestException(
          `Mitgliedschaft ist nicht aktiv (Status: ${membership.status}).`,
        );
      }
      if (membership.plan.sessionCredits === null) {
        throw new BadRequestException(
          'Dieser Plan hat unbegrenzte Credits — kein manuelles Abbuchen nötig.',
        );
      }
      if (membership.creditsUsed >= membership.plan.sessionCredits) {
        throw new BadRequestException(
          `Alle ${membership.plan.sessionCredits} Credits aufgebraucht.`,
        );
      }
      return tx.clientMembership.update({
        where: { id },
        data: { creditsUsed: { increment: 1 } },
      });
    });
  }
}
