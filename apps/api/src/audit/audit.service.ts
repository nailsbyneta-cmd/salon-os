import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@salon-os/db';
import { WITH_TENANT } from '../db/db.module.js';
import { requireTenantContext } from '../tenant/tenant.context.js';

type WithTenantFn = <T>(
  tenantId: string,
  userId: string | null,
  role: string | null,
  fn: (tx: PrismaClient) => Promise<T>,
) => Promise<T>;

export interface AuditRecord {
  entity: string;
  entityId: string;
  action: string;
  diff?: Record<string, unknown> | null;
}

export interface AuditEntry {
  id: string;
  tenantId: string | null;
  actorId: string | null;
  actorType: string | null;
  entity: string;
  entityId: string;
  action: string;
  diff: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
}

/**
 * Audit-Log-Service (Diff #31). Schreibt append-only Einträge in
 * `audit_log`. Zwei Modi:
 *
 * - `withinTx(tx, …)` — aus anderen Services innerhalb ihrer withTenant-TX
 *   (bevorzugt, failing dir TX = TX rollback = Log nicht geschrieben).
 * - `record(…)` — eigener withTenant-Wrapper, z. B. für Standalone-Events.
 */
@Injectable()
export class AuditService {
  constructor(@Inject(WITH_TENANT) private readonly withTenant: WithTenantFn) {}

  async withinTx(
    tx: PrismaClient,
    tenantId: string,
    actorId: string | null,
    rec: AuditRecord,
  ): Promise<void> {
    await tx.auditLog.create({
      data: {
        tenantId,
        actorId,
        actorType: actorId ? 'USER' : 'SYSTEM',
        entity: rec.entity,
        entityId: rec.entityId,
        action: rec.action,
        ...(rec.diff ? { diff: rec.diff } : {}),
      },
    });
  }

  async record(rec: AuditRecord): Promise<void> {
    const ctx = requireTenantContext();
    await this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      await this.withinTx(tx, ctx.tenantId, ctx.userId, rec);
    });
  }

  async list(opts: {
    entity?: string;
    entityId?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ entries: AuditEntry[]; nextCursor: string | null }> {
    const ctx = requireTenantContext();
    const take = Math.min(Math.max(opts.limit ?? 50, 1), 200);
    return this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      const entries = await tx.auditLog.findMany({
        where: {
          ...(opts.entity ? { entity: opts.entity } : {}),
          ...(opts.entityId ? { entityId: opts.entityId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: take + 1,
        ...(opts.cursor
          ? { skip: 1, cursor: { id: opts.cursor } }
          : {}),
      });
      const hasMore = entries.length > take;
      const page = hasMore ? entries.slice(0, take) : entries;
      return {
        entries: page as AuditEntry[],
        nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
      };
    });
  }
}
