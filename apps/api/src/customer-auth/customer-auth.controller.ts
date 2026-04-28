import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import type { PrismaClient } from '@salon-os/db';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { PRISMA } from '../db/db.module.js';
import { OutboxService } from '../common/outbox.service.js';
import { CustomerAuthService } from './customer-auth.service.js';

const slugParamSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9-]+$/);

const requestLinkSchema = z.object({
  email: z.string().email().max(255),
});

const verifyQuerySchema = z.string().min(20).max(255);

/**
 * Public Endpoints für Customer-Self-Service-Login via Magic-Link.
 *
 * Flow:
 * 1. POST /v1/public/{slug}/me/request-link {email}
 *    → erstellt Token wenn Email-Match, sonst silent (Privacy).
 *    → IMMER 200 zurück — sonst kann ein Angreifer Email-Existenz enumerieren.
 *    → Mail mit Link wird via Outbox versendet (sobald POSTMARK_TOKEN gesetzt).
 *
 * 2. GET /v1/public/me/verify?token=X
 *    → setzt einen sealed Cookie (todo: integrate iron-session) und leitet
 *      auf /me weiter. Aktuell returnt es JSON für Frontend-Verarbeitung.
 */
@Controller('v1/public')
export class CustomerAuthController {
  constructor(
    private readonly svc: CustomerAuthService,
    private readonly outbox: OutboxService,
    @Inject(PRISMA) private readonly prisma: PrismaClient,
  ) {}

  @Post(':tenantSlug/me/request-link')
  @HttpCode(HttpStatus.OK)
  async requestLink(
    @Param('tenantSlug', new ZodValidationPipe(slugParamSchema)) slug: string,
    @Body(new ZodValidationPipe(requestLinkSchema))
    body: { email: string },
  ): Promise<{ ok: true }> {
    // Tenant lookup ohne RLS (cron-style — login muss ohne tenant-context gehen)
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) {
      // Privacy: kein 404, gleiche Response wie wenn Email unbekannt
      return { ok: true };
    }

    const link = await this.svc.createLinkForEmail(tenant.id, body.email);
    if (link) {
      // Token NIE im Response zurückgeben — geht ausschliesslich per Mail
      // raus (Authentication-Bypass-Schutz, Audit Pass 12 hat den
      // devToken-Production-Leak gefunden).
      await this.outbox.writeForTenant(tenant.id, 'auth.magic_link', {
        tenantId: tenant.id,
        clientId: link.clientId,
        magicToken: link.token,
        tenantSlug: slug,
      });
    }
    // IMMER 200 + ok:true — Privacy: keine Email-Enumeration.
    return { ok: true };
  }

  @Get('me/verify')
  async verify(
    @Query('token', new ZodValidationPipe(verifyQuerySchema)) token: string,
  ): Promise<{ ok: true; clientId: string; tenantId: string } | { ok: false; reason: string }> {
    const res = await this.svc.verifyToken(token);
    if (!res.ok) {
      throw new BadRequestException(`Token ${res.reason}`);
    }
    return res;
  }
}
