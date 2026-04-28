import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { PrismaClient } from '@salon-os/db';
import { PRISMA } from '../db/db.module.js';

const TOKEN_BYTES = 32;
const LINK_TTL_MIN = 30;
/** Rate-Limit: max 3 Links pro Client pro Stunde. */
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60_000;

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
   * Verifiziert ein Token. Setzt usedAt damit es nicht wiederverwendbar ist.
   * Returnt clientId+tenantId für Cookie-Setup.
   */
  async verifyToken(token: string): Promise<VerifyResult | VerifyFailure> {
    const tokenHash = this.hash(token);
    const link = await this.prisma.clientMagicLink.findUnique({
      where: { tokenHash },
    });
    if (!link) return { ok: false, reason: 'invalid' };
    if (link.usedAt) return { ok: false, reason: 'used' };
    if (link.expiresAt.getTime() < Date.now()) return { ok: false, reason: 'expired' };

    await this.prisma.clientMagicLink.update({
      where: { id: link.id },
      data: { usedAt: new Date() },
    });

    return { ok: true, clientId: link.clientId, tenantId: link.tenantId };
  }
}
