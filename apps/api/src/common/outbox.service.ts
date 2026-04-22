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

export type OutboxEventType =
  | 'reminder.confirmation'
  | 'reminder.24h'
  | 'reminder.cancel'
  | 'marketing.rebook'
  | 'marketing.winback'
  | 'marketing.birthday';

export interface OutboxPayload {
  appointmentId?: string;
  tenantId: string;
  startAt?: string;
  clientId?: string;
  leadTimeMs?: number;
}

@Injectable()
export class OutboxService {
  constructor(@Inject(WITH_TENANT) private readonly withTenant: WithTenantFn) {}

  /** Schreibt Event in Outbox — INNERHALB einer bestehenden withTenant-TX. */
  async writeWithinTx(
    tx: PrismaClient,
    type: OutboxEventType,
    payload: OutboxPayload,
  ): Promise<void> {
    await tx.outboxEvent.create({
      data: {
        tenantId: payload.tenantId,
        type,
        // Prisma InputJsonValue akzeptiert jedes JSON-serialisierbare Objekt,
        // aber die Types sind enger als unser OutboxPayload-Union. Double
        // cast via unknown ist der dokumentierte Escape für komplexe Unions.
        payload: payload as unknown as object,
      },
    });
  }

  /** Eigener TX-Wrapper für Standalone-Events (z. B. aus Cron). */
  async write(type: OutboxEventType, payload: OutboxPayload): Promise<void> {
    const ctx = requireTenantContext();
    await this.withTenant(ctx.tenantId, ctx.userId, ctx.role, async (tx) => {
      await this.writeWithinTx(tx, type, payload);
    });
  }
}
