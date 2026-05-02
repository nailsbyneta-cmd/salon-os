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

  async previewBirthdayForTenant(
    tenantId: string,
  ): Promise<{ eligible: number; lastRunAt: string | null }> {
    const today = new Date();
    const month = today.getUTCMonth() + 1;
    const day = today.getUTCDate();
    const yearKey = today.getUTCFullYear();

    const matches = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "client"
      WHERE "tenantId" = ${tenantId}::uuid
        AND "deletedAt" IS NULL AND blocked = FALSE
        AND "emailOptIn" = TRUE AND email IS NOT NULL AND birthday IS NOT NULL
        AND EXTRACT(MONTH FROM birthday) = ${month}::int
        AND EXTRACT(DAY FROM birthday) = ${day}::int
    `;
    const last = await this.prisma.outboxEvent.findFirst({
      where: { tenantId, type: 'marketing.birthday' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    const yearStart = new Date(Date.UTC(yearKey, 0, 1));
    const alreadySentIds = new Set(
      (
        await this.prisma.outboxEvent.findMany({
          where: { tenantId, type: 'marketing.birthday', createdAt: { gte: yearStart } },
          select: { payload: true },
        })
      ).map((e) => (e.payload as Record<string, unknown>)['clientId'] as string),
    );
    return {
      eligible: matches.filter((m) => !alreadySentIds.has(m.id)).length,
      lastRunAt: last?.createdAt.toISOString() ?? null,
    };
  }

  async runBirthdayForTenant(tenantId: string): Promise<{ enqueued: number }> {
    const today = new Date();
    const month = today.getUTCMonth() + 1;
    const day = today.getUTCDate();
    const yearKey = today.getUTCFullYear();

    const matches = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "client"
      WHERE "tenantId" = ${tenantId}::uuid
        AND "deletedAt" IS NULL AND blocked = FALSE
        AND "emailOptIn" = TRUE AND email IS NOT NULL AND birthday IS NOT NULL
        AND EXTRACT(MONTH FROM birthday) = ${month}::int
        AND EXTRACT(DAY FROM birthday) = ${day}::int
    `;

    let enqueued = 0;
    const yearStart = new Date(Date.UTC(yearKey, 0, 1));
    for (const c of matches) {
      const existing = await this.prisma.outboxEvent.findFirst({
        where: {
          tenantId,
          type: 'marketing.birthday',
          createdAt: { gte: yearStart },
          payload: { path: ['clientId'], equals: c.id },
        },
        select: { id: true },
      });
      if (existing) continue;
      await this.prisma.outboxEvent.create({
        data: {
          tenantId,
          type: 'marketing.birthday',
          payload: { tenantId, clientId: c.id, year: yearKey },
          status: 'PENDING',
        },
      });
      enqueued += 1;
    }
    return { enqueued };
  }

  async previewRebookForTenant(
    tenantId: string,
  ): Promise<{ eligible: number; lastRunAt: string | null }> {
    const days = Number(process.env['REBOOK_WINDOW_DAYS'] ?? 42);
    const reactivationCutoff = new Date(Date.now() - REACTIVATION_DAYS * 24 * 60 * 60 * 1000);
    const rebookCutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const eligible = await this.prisma.client.count({
      where: {
        tenantId,
        deletedAt: null,
        blocked: false,
        marketingOptIn: true,
        emailOptIn: true,
        email: { not: null },
        lastVisitAt: { lt: rebookCutoff, gte: reactivationCutoff },
      },
    });
    const last = await this.prisma.outboxEvent.findFirst({
      where: { tenantId, type: 'marketing.rebook' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    return { eligible, lastRunAt: last?.createdAt.toISOString() ?? null };
  }

  async runRebookForTenant(tenantId: string): Promise<{ enqueued: number }> {
    const days = Number(process.env['REBOOK_WINDOW_DAYS'] ?? 42);
    const reactivationCutoff = new Date(Date.now() - REACTIVATION_DAYS * 24 * 60 * 60 * 1000);
    const rebookCutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const cooldown = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const eligible = await this.prisma.client.findMany({
      where: {
        tenantId,
        deletedAt: null,
        blocked: false,
        marketingOptIn: true,
        emailOptIn: true,
        email: { not: null },
        lastVisitAt: { lt: rebookCutoff, gte: reactivationCutoff },
      },
      select: { id: true },
    });

    let enqueued = 0;
    for (const c of eligible) {
      const recent = await this.prisma.outboxEvent.findFirst({
        where: {
          tenantId,
          type: 'marketing.rebook',
          createdAt: { gte: cooldown },
          payload: { path: ['clientId'], equals: c.id },
        },
        select: { id: true },
      });
      if (recent) continue;
      await this.prisma.outboxEvent.create({
        data: {
          tenantId,
          type: 'marketing.rebook',
          payload: { tenantId, clientId: c.id },
          status: 'PENDING',
        },
      });
      enqueued += 1;
    }
    return { enqueued };
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

  /**
   * Birthday-Sweep. Findet Clients deren `birthday` (DATE) heute entspricht
   * (Monat+Tag, Jahr egal) UND emailOptIn=true UND lastBirthdayMessageYear ≠
   * heute. Idempotent: cooldown via marketing.birthday Outbox-Event mit Year.
   */
  async runBirthdaySweep(today: Date = new Date()): Promise<{
    enqueued: number;
    tenants: number;
  }> {
    const month = today.getUTCMonth() + 1;
    const day = today.getUTCDate();
    const yearKey = today.getUTCFullYear();

    // Postgres EXTRACT für month/day match. Wir nutzen $queryRaw weil
    // Prisma kein date_part-Filter hat.
    const matches = await this.prisma.$queryRaw<Array<{ id: string; tenantId: string }>>`
      SELECT id, "tenantId"
      FROM "client"
      WHERE "deletedAt" IS NULL
        AND blocked = FALSE
        AND "emailOptIn" = TRUE
        AND email IS NOT NULL
        AND birthday IS NOT NULL
        AND EXTRACT(MONTH FROM birthday) = ${month}::int
        AND EXTRACT(DAY FROM birthday) = ${day}::int
      LIMIT 500
    `;

    if (matches.length === 0) return { enqueued: 0, tenants: 0 };

    let enqueued = 0;
    const tenants = new Set<string>();

    for (const c of matches) {
      // Skip wenn schon dieses Jahr gesendet
      const start = new Date(Date.UTC(yearKey, 0, 1));
      const end = new Date(Date.UTC(yearKey + 1, 0, 1));
      const recent = await this.prisma.outboxEvent.findFirst({
        where: {
          tenantId: c.tenantId,
          type: 'marketing.birthday',
          createdAt: { gte: start, lt: end },
          payload: { path: ['clientId'], equals: c.id },
        },
        select: { id: true },
      });
      if (recent) continue;

      await this.prisma.outboxEvent.create({
        data: {
          tenantId: c.tenantId,
          type: 'marketing.birthday',
          payload: { tenantId: c.tenantId, clientId: c.id, year: yearKey },
          status: 'PENDING',
        },
      });
      enqueued += 1;
      tenants.add(c.tenantId);
    }
    return { enqueued, tenants: tenants.size };
  }

  /**
   * Rebook-Reminder. Findet Clients deren letzter Termin >= "Rebook-Window-Days"
   * her ist (default 6 Wochen für Coiffeur/Nägel-Salons), aber < 90d
   * (sonst kommt der Reactivation-Sweep dran). Cooldown 30d pro Client.
   */
  async runRebookSweep(): Promise<{ enqueued: number; tenants: number }> {
    const days = Number(process.env['REBOOK_WINDOW_DAYS'] ?? 42);
    const reactivationCutoff = new Date(Date.now() - REACTIVATION_DAYS * 24 * 60 * 60 * 1000);
    const rebookCutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const cooldown = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const eligible = await this.prisma.client.findMany({
      where: {
        deletedAt: null,
        blocked: false,
        marketingOptIn: true,
        emailOptIn: true,
        email: { not: null },
        lastVisitAt: { lt: rebookCutoff, gte: reactivationCutoff },
      },
      select: { id: true, tenantId: true },
      take: 500,
    });

    let enqueued = 0;
    const tenants = new Set<string>();

    for (const c of eligible) {
      const recent = await this.prisma.outboxEvent.findFirst({
        where: {
          tenantId: c.tenantId,
          type: 'marketing.rebook',
          createdAt: { gte: cooldown },
          payload: { path: ['clientId'], equals: c.id },
        },
        select: { id: true },
      });
      if (recent) continue;

      await this.prisma.outboxEvent.create({
        data: {
          tenantId: c.tenantId,
          type: 'marketing.rebook',
          payload: { tenantId: c.tenantId, clientId: c.id },
          status: 'PENDING',
        },
      });
      enqueued += 1;
      tenants.add(c.tenantId);
    }
    return { enqueued, tenants: tenants.size };
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
