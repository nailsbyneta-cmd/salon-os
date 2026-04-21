import { Injectable, Logger } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@salon-os/db';
import { prisma } from '@salon-os/db';

/**
 * Transaktions-sichere Event-Veröffentlichung (Outbox-Pattern).
 *
 * Business-Operationen rufen `emit()` INNERHALB ihrer Prisma-Transaktion auf
 * (`tx` kommt aus `prisma.$transaction()` oder `withTenant()`). Dadurch ist
 * garantiert: Event existiert ⟺ Business-Change ist committed.
 *
 * Der Poller in `apps/worker` (`outbox-poller.ts`) liest regelmäßig
 * unpublished Rows und routet sie auf die passende BullMQ-Queue.
 *
 * Cancellation: Events mit `correlationKey` können via `cancel()` nachträglich
 * invalidiert werden — der Poller überspringt `cancelledAt != null` durch
 * den Partial-Index (Migration 0010).
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
        correlationKey: event.correlationKey ?? null,
      },
    });
    this.logger.debug(
      `emit ${event.eventType} tenant=${event.tenantId ?? '-'} at=${event.availableAt?.toISOString() ?? 'now'} corr=${event.correlationKey ?? '-'}`,
    );
  }

  /**
   * Markiert alle noch nicht publizierten Events mit passendem
   * `correlationKey` als cancelled. Liefert die Zahl der betroffenen Rows.
   *
   * Idempotent: wiederholte Aufrufe ändern nichts an bereits cancelled
   * Rows.
   */
  async cancel(correlationKey: string): Promise<number> {
    const result = await prisma.outboxEvent.updateMany({
      where: {
        correlationKey,
        publishedAt: null,
        cancelledAt: null,
      },
      data: { cancelledAt: new Date() },
    });
    if (result.count > 0) {
      this.logger.log(
        `cancelled ${result.count} outbox event(s) for correlationKey=${correlationKey}`,
      );
    }
    return result.count;
  }
}

export interface OutboxEventInput {
  eventType: string;
  tenantId?: string | null;
  payload: Record<string, unknown>;
  /** Optional: frühester Zeitpunkt, ab dem der Poller das Event sehen darf. */
  availableAt?: Date;
  /**
   * Optional: Business-Identifier, über den dieses Event später per
   * `cancel()` invalidiert werden kann (z.B. `reminder:<appointmentId>`).
   */
  correlationKey?: string;
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
        correlationKey: string | null;
      };
    }) => Promise<unknown>;
  };
}
