import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { PrismaClient } from '@salon-os/db';
import { PRISMA } from '../db/db.module.js';

const TOKEN_BYTES = 32;
const LINK_TTL_MIN = 30;
/** Rate-Limit: max 3 Links pro Client pro Stunde. */
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60_000;
/** Customer-Session: 30 Tage Sliding-Window nach Magic-Link-Verify. */
const SESSION_TTL_DAYS = 30;

interface VerifyResult {
  ok: true;
  clientId: string;
  tenantId: string;
}
interface VerifyFailure {
  ok: false;
  reason: 'invalid' | 'expired' | 'used';
}

/**
 * Magic-Link für Customer-Self-Service.
 * - Token = 32 random bytes, base64url. Wird in Mail als Link-Param geschickt.
 * - In DB nur sha256-Hash gespeichert — Token-Leak in DB-Dump wäre nicht
 *   ausnutzbar.
 * - 30 Min TTL, einmalig verwendbar (usedAt-Stempel beim Verify).
 * - Rate-limit 3 Links/Stunde pro Client, gegen Brute-Force.
 */
@Injectable()
export class CustomerAuthService {
  private readonly logger = new Logger(CustomerAuthService.name);

  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Findet den Client per email+tenant. Wenn vorhanden: erstellt Link-Token
   * und gibt es zurück (Caller verschickt Mail). Wenn nicht vorhanden:
   * gibt null zurück — KEINE Indikation an User dass Email unbekannt ist
   * (Privacy: Email-Existenz nicht enumerable).
   */
  async createLinkForEmail(
    tenantId: string,
    email: string,
  ): Promise<{ token: string; clientId: string; firstName: string } | null> {
    const client = await this.prisma.client.findFirst({
      where: { tenantId, email: email.toLowerCase(), deletedAt: null },
      select: { id: true, firstName: true },
    });
    if (!client) return null;

    // Rate-Limit
    const recentCount = await this.prisma.clientMagicLink.count({
      where: {
        clientId: client.id,
        createdAt: { gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) },
      },
    });
    if (recentCount >= RATE_LIMIT_MAX) {
      this.logger.warn(`Rate-limit hit for client ${client.id}`);
      return null;
    }

    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    const tokenHash = this.hash(token);
    const expiresAt = new Date(Date.now() + LINK_TTL_MIN * 60_000);

    await this.prisma.clientMagicLink.create({
      data: {
        tokenHash,
        clientId: client.id,
        tenantId,
        email: email.toLowerCase(),
        expiresAt,
      },
    });

    return { token, clientId: client.id, firstName: client.firstName };
  }

  /**
   * Verifiziert Magic-Link-Token + erstellt direkt eine 30-Tage-Session.
   * Atomic: usedAt + Session-Insert in einer Transaction.
   * Returnt das Session-Token (Plaintext, kommt nur 1× hier raus für Cookie).
   */
  async verifyAndCreateSession(
    token: string,
    userAgent: string | null,
  ): Promise<
    { ok: true; sessionToken: string; clientId: string; tenantId: string } | VerifyFailure
  > {
    const tokenHash = this.hash(token);
    const link = await this.prisma.clientMagicLink.findUnique({ where: { tokenHash } });
    if (!link) return { ok: false, reason: 'invalid' };
    if (link.usedAt) return { ok: false, reason: 'used' };
    if (link.expiresAt.getTime() < Date.now()) return { ok: false, reason: 'expired' };

    const sessionPlain = randomBytes(TOKEN_BYTES).toString('base64url');
    const sessionHash = this.hash(sessionPlain);
    const sessionExpires = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60_000);

    await this.prisma.$transaction([
      this.prisma.clientMagicLink.update({
        where: { id: link.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.clientSession.create({
        data: {
          tokenHash: sessionHash,
          clientId: link.clientId,
          tenantId: link.tenantId,
          expiresAt: sessionExpires,
          lastSeenAt: new Date(),
          userAgent: userAgent?.slice(0, 500) ?? null,
        },
      }),
    ]);

    return {
      ok: true,
      sessionToken: sessionPlain,
      clientId: link.clientId,
      tenantId: link.tenantId,
    };
  }

  /**
   * Validiert Session-Token bei jedem authentifizierten API-Call.
   * Aktualisiert lastSeenAt (Sliding-Window-Renewal nicht — nur Audit).
   */
  async verifySession(token: string): Promise<{ clientId: string; tenantId: string } | null> {
    const tokenHash = this.hash(token);
    const session = await this.prisma.clientSession.findUnique({ where: { tokenHash } });
    if (!session) return null;
    if (session.revokedAt) return null;
    if (session.expiresAt.getTime() < Date.now()) return null;
    // Fire-and-forget lastSeenAt update — kein await damit Endpoint schnell bleibt
    this.prisma.clientSession
      .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
      .catch(() => undefined);
    return { clientId: session.clientId, tenantId: session.tenantId };
  }

  /**
   * Customer storniert eigenen Termin. Erlaubt nur wenn:
   * - Termin gehört dieser Kundin
   * - Status ist BOOKED oder CONFIRMED (nicht IN_SERVICE oder COMPLETED)
   * - Mindestens 2h vor Termin-Start (verhindert Last-Minute-No-Shows)
   */
  async cancelOwnAppointment(
    clientId: string,
    tenantId: string,
    appointmentId: string,
  ): Promise<{ ok: true } | { ok: false; reason: 'not-found' | 'too-late' | 'wrong-status' }> {
    const appt = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, clientId, tenantId },
    });
    if (!appt) return { ok: false, reason: 'not-found' };
    if (appt.status !== 'BOOKED' && appt.status !== 'CONFIRMED') {
      return { ok: false, reason: 'wrong-status' };
    }
    const minLeadMs = 2 * 60 * 60_000;
    if (appt.startAt.getTime() - Date.now() < minLeadMs) {
      return { ok: false, reason: 'too-late' };
    }
    await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: 'Customer self-service cancellation via /me',
      },
    });
    return { ok: true };
  }

  /**
   * DSGVO Art. 15 — Recht auf Auskunft.
   * Customer kann ihre eigenen Daten als JSON-Dump herunterladen.
   * Tenant-scoped: die Session validiert clientId+tenantId, deshalb sicher.
   */
  async exportPersonalData(clientId: string, tenantId: string): Promise<unknown> {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, tenantId },
    });
    if (!client) throw new Error('Client not found');
    const appointments = await this.prisma.appointment.findMany({
      where: { clientId, tenantId },
      orderBy: { startAt: 'desc' },
      include: {
        items: { include: { service: { select: { name: true, slug: true } } } },
        staff: { select: { firstName: true, lastName: true } },
        location: { select: { name: true } },
      },
    });
    const totalSpent = appointments
      .filter((a) => a.status !== 'CANCELLED' && a.status !== 'NO_SHOW')
      .reduce((sum, a) => sum + a.items.reduce((s, i) => s + Number(i.price), 0), 0);
    return {
      exportedAt: new Date().toISOString(),
      basisGdpr: 'EU GDPR Art. 15 / Swiss DSG Art. 25',
      client,
      appointments,
      totals: {
        totalAppointments: appointments.length,
        totalVisits: client.totalVisits,
        totalSpent,
        lastVisitAt: client.lastVisitAt,
      },
    };
  }

  /**
   * DSGVO Art. 17 — Recht auf Löschung.
   * Soft-Delete: deletedAt setzen, alle Sessions revoken, alle Magic-Links
   * invalidieren. Cron-Job (specs/compliance.md) macht harte Löschung in 30d.
   */
  async requestDeletion(clientId: string, tenantId: string): Promise<void> {
    const existing = await this.prisma.client.findFirst({
      where: { id: clientId, tenantId },
    });
    if (!existing) throw new Error('Client not found');
    await this.prisma.$transaction([
      this.prisma.client.update({
        where: { id: clientId },
        data: {
          deletedAt: new Date(),
          notesInternal: `[DSGVO-Löschung angefragt ${new Date().toISOString()} via /me]\n${existing.notesInternal ?? ''}`,
        },
      }),
      // Alle Sessions revoken
      this.prisma.clientSession.updateMany({
        where: { clientId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      // Alle Magic-Links als used markieren
      this.prisma.clientMagicLink.updateMany({
        where: { clientId, usedAt: null },
        data: { usedAt: new Date() },
      }),
    ]);
  }

  /** Logout — markiert Session als revoked. */
  async revokeSession(token: string): Promise<void> {
    const tokenHash = this.hash(token);
    await this.prisma.clientSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Customer-Profil + ihre Termine (sliding 90 days). */
  async getProfile(
    clientId: string,
    tenantId: string,
  ): Promise<{
    client: { firstName: string; lastName: string; email: string | null; phone: string | null };
    appointments: Array<{
      id: string;
      startAt: string;
      endAt: string;
      status: string;
      staff: { firstName: string };
      location: { name: string };
      items: Array<{
        price: string;
        duration: number;
        service: { name: string };
        optionLabels: string[];
      }>;
    }>;
  }> {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, tenantId },
      select: { firstName: true, lastName: true, email: true, phone: true },
    });
    if (!client) {
      throw new Error('Client not found');
    }
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60_000);
    const appts = await this.prisma.appointment.findMany({
      where: { clientId, tenantId, startAt: { gte: ninetyDaysAgo } },
      orderBy: { startAt: 'desc' },
      take: 50,
      select: {
        id: true,
        startAt: true,
        endAt: true,
        status: true,
        staff: { select: { firstName: true } },
        location: { select: { name: true } },
        items: {
          select: {
            price: true,
            duration: true,
            optionLabels: true,
            service: { select: { name: true } },
          },
        },
      },
    });
    return {
      client,
      appointments: appts.map((a) => ({
        id: a.id,
        startAt: a.startAt.toISOString(),
        endAt: a.endAt.toISOString(),
        status: a.status,
        staff: a.staff,
        location: a.location,
        items: a.items.map((i) => ({
          price: String(i.price),
          duration: i.duration,
          optionLabels: i.optionLabels ?? [],
          service: i.service,
        })),
      })),
    };
  }
}
