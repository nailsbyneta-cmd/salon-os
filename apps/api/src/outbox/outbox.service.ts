import { Injectable, Logger } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@salon-os/db';

/**
 * Transaktions-sichere Event-Veröffentlichung (Outbox-Pattern).
 *
 * Business-Operationen rufen `emit()` INNERHALB ihrer Prisma-Transaktion auf
 * (`tx` kommt aus `prisma.$transaction()` oder `withTenant()`). Dadurch ist
 * garantiert: Event existiert ⟺ Business-Change ist committed.
 *
 * Der Poller in `apps/worker` (`outbox-poller.ts`) liest regelmäßig
 * unpublished Rows und routet sie auf die passende BullMQ-Queue.
 */
@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  /**
   * Schreibt ein Event in die Outbox. MUSS mit dem gleichen `tx` aufgerufen
   * werden, in dem auch die Business-Änderung passiert — sonst verlierst du
   * die Atomarität.
   */
  async emit(
    tx: PrismaClient | OutboxTransactionClient,
    event: OutboxEventInput,
  ): Promise<void> {
    await tx.outboxEvent.create({
      data: {
        tenantId: event.tenantId ?? null,
        eventType: event.eventType,
        payload: event.payload as Prisma.InputJsonValue,
        availableAt: event.availableAt ?? new Date(),
      },
    });
    this.logger.debug(
      `emit ${event.eventType} tenant=${event.tenantId ?? '-'} at=${event.availableAt?.toISOString() ?? 'now'}`,
    );
  }
}

export interface OutboxEventInput {
  eventType: string;
  tenantId?: string | null;
  payload: Record<string, unknown>;
  /** Optional: frühester Zeitpunkt, ab dem der Poller das Event sehen darf. */
  availableAt?: Date;
}

// Minimales Interface — reicht aus, damit Service-Methoden `tx` aus einer
// Prisma-`$transaction()`-Callback annehmen können, ohne den kompletten
// PrismaClient-Typ weiterzuschleifen.
export interface OutboxTransactionClient {
  outboxEvent: {
    create: (args: {
      data: {
        tenantId: string | null;
        eventType: string;
        payload: Prisma.InputJsonValue;
        availableAt: Date;
      };
    }) => Promise<unknown>;
  };
}
