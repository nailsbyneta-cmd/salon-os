import { Inject, Injectable, Logger } from '@nestjs/common';
import type { PrismaClient } from '@salon-os/db';
import { PRISMA } from '../db/db.module.js';

const REACTIVATION_DAYS = 90;
/** Don't re-spam the same client more often than this. */
const REACTIVATION_COOLDOWN_DAYS = 60;

interface ReactivationResult {
  candidates: number;
  enqueued: number;
  skippedRecent: number;
  byTenant: Array<{ tenantId: string; tenantName: string; count: number }>;
}

interface ReactivationPreview {
  total: number;
  byTenant: Array<{ tenantId: string; tenantName: string; eligible: number }>;
}

/**
 * Marketing-Service. Cross-Tenant cron-driven via PRISMA (RLS-bypass).
 * Findet Kundinnen die lange nicht da waren + opted in + nicht erst kürzlich
 * angeschrieben → schreibt marketing.winback events. Outbox-Worker sendet.
 */
@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name);

  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  /** Tenant-scoped Preview für Admin-UI. */
  async previewReactivationForTenant(
    tenantId: string,
  ): Promise<{ eligible: number; lastRunAt: string | null; lastRunCount: number }> {
    const cutoff = this.cutoff();
    const eligibleCount = await this.prisma.client.count({
      where: { tenantId, ...this.eligibleWhere(cutoff) },
    });
    // Zähle auch Outbox-History: letzter Run + Anzahl Events (Erfolgs-Indikator)
    const last = await this.prisma.outboxEvent.findFirst({
      where: { tenantId, type: 'marketing.winback' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const lastRunCount =
      last != null
        ? await this.prisma.outboxEvent.count({
            where: {
              tenantId,
              type: 'marketing.winback',
              createdAt: { gte: new Date(last.createdAt.getTime() - 60 * 60_000) },
            },
          })
        : 0;
    return {
      eligible: eligibleCount,
      lastRunAt: last?.createdAt.toISOString() ?? null,
      lastRunCount,
    };
  }

  /** Tenant-scoped Manual-Run für Admin (Owner/Manager triggert per Klick). */
  async runReactivationForTenant(
    tenantId: string,
  ): Promise<{ enqueued: number; skippedRecent: number }> {
    const cutoff = this.cutoff();
    const cooldownCutoff = new Date(Date.now() - REACTIVATION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
    const eligible = await this.prisma.client.findMany({
      where: { tenantId, ...this.eligibleWhere(cutoff) },
      select: { id: true },
    });

    let enqueued = 0;
    let skippedRecent = 0;
    for (const c of eligible) {
      const recent = await this.prisma.outboxEvent.findFirst({
        where: {
          tenantId,
          type: 'marketing.winback',
          createdAt: { gte: cooldownCutoff },
          payload: { path: ['clientId'], equals: c.id },
        },
        select: { id: true },
      });
      if (recent) {
        skippedRecent += 1;
        continue;
      }
      await this.prisma.outboxEvent.create({
        data: {
          tenantId,
          type: 'marketing.winback',
          payload: { tenantId, clientId: c.id },
          status: 'PENDING',
        },
      });
      enqueued += 1;
    }
    return { enqueued, skippedRecent };
  }

  /** Read-only: zeigt wie viele Kundinnen gerade reactivation-eligible sind. */
  async previewReactivation(): Promise<ReactivationPreview> {
    const cutoff = this.cutoff();
    const groups = await this.prisma.client.groupBy({
      by: ['tenantId'],
      where: this.eligibleWhere(cutoff),
      _count: { _all: true },
    });
    if (groups.length === 0) return { total: 0, byTenant: [] };
    const tenants = await this.prisma.tenant.findMany({
      where: { id: { in: groups.map((g) => g.tenantId) } },
      select: { id: true, name: true },
    });
    const nameById = new Map(tenants.map((t) => [t.id, t.name]));
    const byTenant = groups.map((g) => ({
      tenantId: g.tenantId,
      tenantName: nameById.get(g.tenantId) ?? '(unknown)',
      eligible: g._count._all,
    }));
    return {
      total: groups.reduce((s, g) => s + g._count._all, 0),
      byTenant,
    };
  }

  async runReactivation(): Promise<ReactivationResult> {
    const cutoff = this.cutoff();
    const cooldownCutoff = new Date(Date.now() - REACTIVATION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

    const eligible = await this.prisma.client.findMany({
      where: this.eligibleWhere(cutoff),
      select: { id: true, tenantId: true },
    });

    let enqueued = 0;
    let skippedRecent = 0;
    const tenantCounts = new Map<string, number>();

    for (const c of eligible) {
      // Cooldown: schon eine Reactivation in den letzten 60 Tagen?
      const recent = await this.prisma.outboxEvent.findFirst({
        where: {
          tenantId: c.tenantId,
          type: 'marketing.winback',
          createdAt: { gte: cooldownCutoff },
          payload: { path: ['clientId'], equals: c.id },
        },
        select: { id: true },
      });
      if (recent) {
        skippedRecent += 1;
        continue;
      }
      await this.prisma.outboxEvent.create({
        data: {
          tenantId: c.tenantId,
          type: 'marketing.winback',
          payload: {
            tenantId: c.tenantId,
            clientId: c.id,
          },
          status: 'PENDING',
        },
      });
      enqueued += 1;
      tenantCounts.set(c.tenantId, (tenantCounts.get(c.tenantId) ?? 0) + 1);
    }

    const tenants =
      tenantCounts.size > 0
        ? await this.prisma.tenant.findMany({
            where: { id: { in: Array.from(tenantCounts.keys()) } },
            select: { id: true, name: true },
          })
        : [];
    const nameById = new Map(tenants.map((t) => [t.id, t.name]));

    return {
      candidates: eligible.length,
      enqueued,
      skippedRecent,
      byTenant: Array.from(tenantCounts.entries()).map(([tenantId, count]) => ({
        tenantId,
        tenantName: nameById.get(tenantId) ?? '(unknown)',
        count,
      })),
    };
  }

  private cutoff(): Date {
    return new Date(Date.now() - REACTIVATION_DAYS * 24 * 60 * 60 * 1000);
  }

  private eligibleWhere(cutoff: Date) {
    return {
      deletedAt: null,
      blocked: false,
      marketingOptIn: true,
      emailOptIn: true,
      email: { not: null },
      OR: [{ lastVisitAt: { lt: cutoff } }, { lastVisitAt: null, totalVisits: { gt: 0 } }],
    };
  }
}
